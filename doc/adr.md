# 架构决策记录

## 技术栈

| 层级 | 选型 | 原因 |
|------|------|------|
| 运行时 | Bun / Cloudflare Workers | 双目标：Bun 用于 VPS，Workers 用于 cloudflare 部署 |
| 框架 | Hono | 轻量级，同时运行于 Bun 和 CF Workers，内置 JSX |
| 渲染 | Hono JSX (SSR) | 服务端渲染，零客户端框架 |
| 数据库 | SQLite (bun:sqlite) / Cloudflare D1 | 适配器模式，两个平台共用同一套 schema |
| 样式 | Tailwind CSS (CDN) | 无需构建步骤，快速原型开发 |
| 认证 | Hono Basic Auth | 简单，从环境变量读取（process.env 或 CF bindings） |

## 项目结构

```
src/
├── index.ts                          # Bun 入口
├── worker.ts                         # Cloudflare Workers 入口
├── app.ts                            # 共享 Hono 应用工厂（路由、中间件、认证）
├── db/
│   ├── adapter.ts                    # DbAdapter 接口（统一异步 API）
│   ├── sqlite-adapter.ts             # bun:sqlite 实现
│   ├── d1-adapter.ts                 # Cloudflare D1 实现
│   ├── schema.ts                     # 共享 schema 初始化 + 迁移
│   └── seed.ts                       # 种子数据（示例活动类型）
├── services/
│   ├── entities.ts                   # 共享类型定义（EventType、Booking 等）
│   ├── event-types.service.ts        # EventType + Availability CRUD
│   ├── bookings.service.ts           # Booking CRUD + 冲突检测 + 列表/过滤/分页
│   ├── tencent-meeting.service.ts    # 腾讯会议 API 客户端（JSONRPC 2.0）
│   └── google-meet.service.ts       # Google Meet 客户端（Google Calendar API + OAuth2）
├── lib/
│   ├── availability.ts               # 时间槽计算逻辑
│   ├── datetime.ts                   # 时间/日期/星期工具（时区、UTC 构造、星期索引转换）
│   └── hooks.ts                      # 数据库生命周期钩子（onAfterCreate、onAfterUpdate）
├── routes/
│   ├── home.tsx                      # 公开活动列表页
│   ├── booking.tsx                   # 公开预约流程（日历 → 时间 → 表单 → 确认）
│   ├── admin.tsx                     # 管理路由入口（挂载子路由）
│   └── admin/
│       ├── dashboard.tsx             # GET /admin — 概览
│       ├── events.tsx                # /admin/events/* — 活动类型 CRUD
│       └── bookings.tsx              # /admin/events/:id/bookings/* — RESTful 预约管理
├── components/
│   ├── Layout.tsx                    # HTML 外壳（head、Tailwind CDN）
│   ├── Calendar.tsx                  # 月历组件，高亮可用日期
│   ├── TimeSlots.tsx                 # 可用时间槽列表
│   ├── AvailabilityEditor.tsx        # 每日多时段可用性编辑器
│   ├── CustomFieldsEditor.tsx        # 动态键值自定义字段编辑器
│   └── MeetingBrand.tsx              # 会议品牌图标与按钮（Google Meet/腾讯会议）
wrangler.toml                         # Cloudflare Workers 配置
db/
└── data.db                           # SQLite 数据库文件（已 gitignore）
```

## 分层架构（NestJS 风格）

```
Routes (routes/*.tsx)        ← HTTP 处理、请求解析、JSX 渲染
  ↓
Services (services/*.ts)     ← 数据访问、业务逻辑（接收 DbAdapter）
  ↓
DbAdapter (db/adapter.ts)    ← 统一异步接口
  ↓
SQLite / D1                  ← 平台特定实现
```

- **Routes** 从 Hono context 获取 `db`（`c.get("db")`），调用 services，返回 JSX
- **Services** 接收 `DbAdapter` 作为第一个参数，封装所有 SQL
- **Hooks**（`lib/hooks.ts`）在 create/update 后执行 — 自动设置 `updated_at`
- **Entities** 定义跨层共享的 TypeScript 接口

路由层不直接写 SQL。服务层不返回 HTTP 响应。

## RESTful URL 设计

```
公开页面：
  GET  /                                    活动列表
  GET  /:slug                               预约页面（日历）
  GET  /:slug/book                          预约表单
  POST /:slug/book                          提交预约
  GET  /:slug/confirmed                     确认页面
  GET  /:slug/manage/:token                 预约管理页（公开，凭 token 访问）
  POST /:slug/manage/:token/cancel          取消预约

管理后台（Basic Auth）：
  GET  /admin                               仪表盘
  GET  /admin/events/new                    新建活动表单
  POST /admin/events                        创建活动
  GET  /admin/events/:id                    编辑活动表单
  POST /admin/events/:id                    更新活动
  POST /admin/events/:id/delete             删除活动
  GET  /admin/events/:id/bookings           活动预约列表（过滤、分页）
  POST /admin/events/:id/bookings/export.csv  导出 CSV
  GET  /admin/events/:id/bookings/:bid      预约详情
  POST /admin/events/:id/bookings/:bid/cancel   取消并填写原因
  GET  /admin/events/:id/bookings/:bid/confirm  重新确认
  GET  /admin/bookings                      全部预约（跨活动）
```

## 数据模型

```
event_types（活动类型）
├── id, slug, name, host_name
├── duration_minutes, description
├── custom_fields (JSON)        ← 动态表单字段配置
├── meeting_provider            ← 'none' | 'static' | 'tencent' | 'google'
├── meeting_url                 ← 静态会议链接
├── published                   ← 1=已发布 0=草稿（默认已发布）
├── start_date, end_date        ← 预约日期范围限制
├── created_at, updated_at

availability（可用时段）
├── id, event_type_id
├── day_of_week (0=周一..6=周日)
├── start_time, end_time        ← 每天可有多行（上午/下午时段）
├── created_at, updated_at

bookings（预约）
├── id, event_type_id
├── invitee_name, invitee_email
├── start_time, end_time, timezone
├── notes, cancel_reason
├── status                      ← CHECK('confirmed','cancelled')
├── meeting_id                  ← 会议标识符（腾讯会议 ID / Google Calendar event ID）
├── meeting_code                ← 腾讯会议号（仅腾讯会议使用）
├── meeting_url                 ← 加入链接（自动生成或静态）
├── custom_data (JSON)          ← 自定义字段的填写值
├── created_at, updated_at
```

## 关键决策

### 双平台适配（DbAdapter）
`DbAdapter` 是一个异步接口，包含 `run`、`get`、`all`、`exec` 方法。两个实现：
- `sqlite-adapter.ts` 将 `bun:sqlite` 的同步 API 包装为异步
- `d1-adapter.ts` 包装 Cloudflare D1 原生异步 API

Services 通过 Hono context 接收 `DbAdapter` — 切换平台无需修改任何代码。

### 应用层钩子代替数据库触发器
`lib/hooks.ts` 提供 `onAfterCreate` / `onAfterUpdate` 钩子。`updated_at` 由内置钩子设置，而非 SQLite 触发器。这种方式与数据库无关，同时适用于 SQLite 和 D1。

### 纯 SSR，极少客户端 JS
页面全部服务端渲染。客户端 JS 仅限于：
- AvailabilityEditor：动态添加/移除时间段
- CustomFieldsEditor：动态添加/移除自定义字段
- 取消预约：原生 `<dialog>` 弹窗
- 管理后台复制链接按钮

无 SPA 框架，无 hydration，无客户端路由。

### 时间与星期约定
所有日期/时间逻辑统一通过 `src/lib/datetime.ts` 处理：
- **默认时区** `Asia/Singapore` (UTC+8)，`nowInDefaultTZ()` 获取当前时间
- **日期构造** 使用 `parseYmdToUTCDate()` 和 `getDaysInMonthUTC()` 避免本地时区偏移
- **星期索引** 全局约定 0=周一..6=周日（非 JS 原生的 0=周日），通过 `jsDayToMonFirstIndex()` 转换
- **日期格式化** 使用 `formatYmdLabel()` 统一处理 locale 和 timeZone

### 每日多时段可用性
一条 `availability` 记录 = 一个时间段。一天可以有多条记录（如 09:00-12:00 + 13:00-17:00），支持午休和间隔。

### 自定义字段存储为 JSON
`event_types.custom_fields` 以 JSON 数组存储字段定义。
`bookings.custom_data` 以 JSON 对象存储提交的值。
新增活动字段无需修改数据库 schema。

### 内联迁移
`db/schema.ts` 启动时通过 `PRAGMA table_info` 检查并执行 `ALTER TABLE` 迁移。这个规模无需迁移工具。

### Hono 非严格模式
`new Hono({ strict: false })`，使 `/admin` 和 `/admin/` 都能正确解析。

### RESTful 嵌套资源
预约嵌套在活动下：`/admin/events/:id/bookings/:bid`。同时提供全局 `/admin/bookings` 视图用于跨活动查询。两个视图共享渲染函数，避免代码重复。

### 会议提供商集成
活动类型支持 `meeting_provider` 字段，四种模式：
- `none` — 无会议链接
- `google` — 每次预约时通过 Google Calendar API 自动创建带 Meet 链接的日历事件，取消预约时自动删除
- `tencent` — 每次预约时通过 API 自动创建腾讯会议，取消预约时自动取消会议
- `static` — 管理员设置固定 URL（Zoom 等），所有预约复用

确认页和管理页根据 `meeting_provider` 显示不同品牌样式（图标、颜色、按钮文字）。

#### Google Meet
通过 Google Calendar API v3 创建日历事件并附带 `conferenceData`（hangoutsMeet），自动生成 Meet 链接。使用 OAuth2 refresh token 流程获取 access token。环境变量：`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`GOOGLE_REFRESH_TOKEN`。

**设置步骤：**
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) 创建 OAuth 2.0 Client ID，应用类型选 **Web application**
2. Authorized redirect URIs 添加 `https://developers.google.com/oauthplayground`
3. 启用 **Google Calendar API**（APIs & Services → Enabled APIs）
4. OAuth consent screen 状态若为 Testing，需将使用的 Google 账号加入 **Test users** 列表

**获取 refresh token：**
1. 打开 [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)
2. 右上角齿轮 → **必须勾选 "Use your own OAuth credentials"** → 填入 Client ID 和 Client Secret
3. 左侧选 Google Calendar API v3 → `https://www.googleapis.com/auth/calendar.events` → Authorize APIs → 登录授权
4. Step 2 点 "Exchange authorization code for tokens" → 复制 `refresh_token`

**注意事项：**
- refresh token 必须与 client id/secret 配对使用，用 Playground 默认凭据生成的 token 不能用于自己的 client（会报 `unauthorized_client`）
- OAuth consent screen 处于 Testing 状态时，refresh token **7 天过期**，需重新获取。发布到 Production 后无此限制
- 本地开发需配置 `https_proxy` 环境变量

#### 腾讯会议
使用 JSONRPC 2.0 API，通过 `TENCENT_MEETING_TOKEN` 环境变量认证。
Token 来自 `https://meeting.tencent.com/ai-skill` 。
会议信息（meeting_id、meeting_code、join_url）按预约存储，显示在确认页和管理后台预约详情中。

API 响应格式：JSONRPC 2.0 → `result.content[0].text` → JSON 字符串 `{ status_code, headers, body }` → `body` 为 JSON 字符串，包含 `meeting_info_list[0].{meeting_id, meeting_code, join_url}`。

### 发布状态
活动类型支持 `published` 字段（默认已发布）。未发布的活动不会出现在首页列表中，访问其预约链接会跳转首页。
编辑活动时 **URL Slug 为只读，创建时校验唯一性并在同页面提示错误**。

### 代理
Bun 的 `fetch` 不会自动读取 `http_proxy`/`https_proxy` 环境变量。
腾讯会议和 Google Meet 服务均从环境变量读取代理配置，通过 Bun 的 `fetch({ proxy })` 选项传递。Cloudflare Workers 不需要代理 — 此配置仅适用于本地/VPS 部署。

## 部署

### VPS（Bun + SQLite）
```bash
bun install && bun run seed && bun run dev
```
入口：`src/index.ts` → `sqlite-adapter.ts` → 本地 `db/data.db`

通过 `.env` 文件设置环境变量（Bun 自动加载）：
```
TENCENT_MEETING_TOKEN=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REFRESH_TOKEN=xxx
ADMIN_USER=admin
ADMIN_PASS=admin
```

### Cloudflare Workers (D1)
```bash
wrangler d1 create mini-calendly-db    # 创建 D1 数据库
# 在 wrangler.toml 中填写 database_id
wrangler deploy                         # 部署到 cloudflare
```
入口：`src/worker.ts` → `d1-adapter.ts` → Cloudflare D1

---

https://cloud.tencent.com/document/product/1095/42407
