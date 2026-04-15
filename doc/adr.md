# 架构决策记录

## 技术栈

| 层级 | 选型 | 原因 |
|------|------|------|
| 运行时 | Bun / Cloudflare Workers | 双目标：Bun 用于 VPS，Workers 用于边缘部署 |
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
│   └── tencent-meeting.service.ts    # 腾讯会议 API 客户端（JSONRPC 2.0）
├── lib/
│   ├── availability.ts               # 时间槽计算逻辑
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
│   └── CustomFieldsEditor.tsx        # 动态键值自定义字段编辑器
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
├── duration_minutes, description, color
├── custom_fields (JSON)        ← 动态表单字段配置
├── meeting_provider            ← 'none' | 'static' | 'tencent'
├── meeting_url                 ← 静态会议链接
├── start_date, end_date        ← 预约日期范围限制
├── created_at, updated_at

availability（可用时段）
├── id, event_type_id
├── day_of_week (0=周日..6=周六)
├── start_time, end_time        ← 每天可有多行（上午/下午时段）
├── created_at, updated_at

bookings（预约）
├── id, event_type_id
├── invitee_name, invitee_email
├── start_time, end_time, timezone
├── notes, cancel_reason
├── status                      ← CHECK('confirmed','cancelled')
├── meeting_id, meeting_code    ← 腾讯会议标识符
├── meeting_url                 ← 加入链接（自动生成或静态）
├── custom_data (JSON)          ← 自定义字段的填写值
├── created_at, updated_at
```

## 部署

### VPS（Bun + SQLite）
```bash
bun install && bun run seed && bun run dev
```
入口：`src/index.ts` → `sqlite-adapter.ts` → 本地 `db/data.db`

通过 `.env` 文件设置环境变量（Bun 自动加载）：
```
TENCENT_MEETING_TOKEN=xxx
ADMIN_USER=admin
ADMIN_PASS=admin
```

### Cloudflare Workers (D1)
```bash
wrangler d1 create mini-calendly-db    # 创建 D1 数据库
# 在 wrangler.toml 中填写 database_id
wrangler deploy                         # 部署到边缘
```
入口：`src/worker.ts` → `d1-adapter.ts` → Cloudflare D1

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

无 SPA 框架，无水合，无客户端路由。

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
活动类型支持 `meeting_provider` 字段，三种模式：
- `none` — 无会议链接
- `static` — 管理员设置固定 URL（Google Meet、Zoom 等），所有预约复用
- `tencent` — 每次预约时通过 API 自动创建腾讯会议，取消预约时自动取消会议

腾讯会议集成使用其 JSONRPC 2.0 API（`mcp.meeting.tencent.com`），通过 `TENCENT_MEETING_TOKEN` 环境变量认证。Token 来自 `https://meeting.tencent.com/ai-skill` 。会议信息（meeting_id、meeting_code、join_url）按预约存储，显示在确认页和管理后台预约详情中。

API 响应格式：JSONRPC 2.0 → `result.content[0].text` → JSON 字符串 `{ status_code, headers, body }` → `body` 为 JSON 字符串，包含 `meeting_info_list[0].{meeting_id, meeting_code, join_url}`。

### 代理处理
Bun 的 `fetch` 不会自动读取 `http_proxy`/`https_proxy` 环境变量。腾讯会议服务从环境变量读取代理配置，通过 Bun 的 `fetch({ proxy })` 选项传递。Cloudflare Workers 不需要代理 — 此配置仅适用于本地/VPS 部署。

---

https://cloud.tencent.com/document/product/1095/42407
