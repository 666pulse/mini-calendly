# Design System

项目视觉规范，基于 Tailwind CSS

## 字体

- **主字体**: Inter (Google Fonts), 权重 400/500/600/700
- **回退**: system-ui, -apple-system, sans-serif
- 全局 `antialiased` 开启抗锯齿
- `::selection` 选中色 `#c7d2fe` (indigo-200)

## 色彩体系

### 中性色 — Slate (非 Gray)

Slate 比 Gray 更冷调、更精致，适合工具类产品。

| 用途 | Token | 示例 |
|------|-------|------|
| 页面背景 | `bg-slate-50` | body |
| 卡片/容器背景 | `bg-white` | 所有卡片 |
| 主文本 | `text-slate-900` | 标题、正文 |
| 次要文本 | `text-slate-600` | 表单 label |
| 辅助文本 | `text-slate-500` | 描述、说明 |
| 弱文本/图标 | `text-slate-400` | placeholder、图标 |
| 边框（强） | `border-slate-300` | 表单输入框 |
| 边框（弱） | `border-slate-200` | 卡片、分割线 |
| 边框（最弱） | `border-slate-100` | 表格行分割 |
| 浅背景 | `bg-slate-50` | 表头、信息区块 |

### 品牌色 — Indigo (非 Blue)

Indigo 比 Blue 更有辨识度

| 用途 | Token |
|------|-------|
| 主按钮/链接 | `bg-indigo-600` / `text-indigo-600` |
| 主按钮 hover | `hover:bg-indigo-700` |
| 输入框聚焦 | `focus:ring-indigo-500` |
| 日历可选日期 | `text-indigo-600` |
| 日历选中日期 | `bg-indigo-600 text-white` |
| 时间槽边框 | `border-indigo-600` |
| 时间槽 hover | `hover:bg-indigo-600 hover:text-white` |

### 语义色

| 状态 | 背景 | 文本 |
|------|------|------|
| 成功/确认 | `bg-emerald-100` | `text-emerald-700` |
| 错误/取消 | `bg-red-100` | `text-red-700` |
| 警告 | `bg-yellow-50 border-yellow-200` | `text-yellow-800` |

## 圆角

| 组件 | 圆角 |
|------|------|
| 主卡片/容器 | `rounded-xl` |
| 按钮/输入框 | `rounded-lg` |
| 状态标签 (badge) | `rounded-md` 或 `rounded-full` |
| 日历日期 | `rounded-full` |
| 颜色条 | `rounded-full` |
| 小元素（filter 表单控件） | `rounded-md` |

## 按钮

### 主按钮 (Primary)
```
bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium
hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow
```

### 圆形主按钮 (Pill)
```
bg-indigo-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold
hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow
disabled:opacity-50 disabled:cursor-not-allowed
```

### 文本按钮 / 链接
```
text-indigo-600 hover:underline text-sm
```

### 危险按钮
```
bg-red-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-red-700
```

### 次要文本按钮
```
text-slate-500 text-sm hover:text-slate-900 transition-colors
```

## 表单输入

```
w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
text-slate-700 placeholder:text-slate-400
focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
transition-colors
```

标签：

```
block text-sm font-medium text-slate-600 mb-1
```

## 卡片

### 基础卡片
```
bg-white rounded-xl border border-slate-200
```

### 可点击卡片
```
bg-white rounded-xl border border-slate-200 p-5
hover:shadow-md hover:border-slate-300 transition-all duration-200
```

用 `group` 包裹实现内部元素的联动 hover 效果（如箭头变色）。

### 阴影层级
- 无 shadow: 静态内容卡片
- `shadow-sm`: 按钮、选中状态
- `shadow-lg`: 模态弹窗、主内容面板

## 表格

```
bg-white rounded-xl border border-slate-200 overflow-hidden
```

- 表头：`bg-slate-50 border-b border-slate-200`
- 表头文字：`text-left px-4 py-3 font-medium text-slate-600`
- 行分割：`border-b border-slate-100`
- 单元格：`px-4 py-3`

## 状态标签 (Badge)

```
inline-block px-2 py-0.5 rounded-md text-xs font-medium
```

- confirmed: `bg-emerald-100 text-emerald-700`
- cancelled: `bg-red-100 text-red-700`
- 详情页用 `rounded-full px-3 py-1 text-sm`

## 图标

- 尺寸：`w-4 h-4`（内联）或 `w-5 h-5`（列表项）
- 样式：`fill="none" stroke="currentColor"` (outline 风格)
- 颜色：`text-slate-400`（默认）, `text-slate-500`（次要信息旁）
- 布局：`flex items-center gap-2`（内联）或 `flex items-start gap-3`（列表）

## 布局

### 页面容器宽度
| 场景 | 宽度 |
|------|------|
| 公开页面（首页、确认页） | `max-w-lg` |
| 预约页面（双栏） | `max-w-4xl` |
| 管理表单 | `max-w-xl` |
| 管理详情 | `max-w-2xl` |
| 管理列表/仪表盘 | `max-w-5xl` |

### 双栏布局（预约页）
```
flex flex-col md:flex-row
左栏: md:w-72 p-8 border-b md:border-b-0 md:border-r border-slate-200
右栏: flex-1 p-8
```

### 居中布局
```
flex items-center justify-center min-h-screen p-4
```

## 过渡动画

- 颜色变化：`transition-colors`
- 综合效果：`transition-all duration-200`
- 阴影变化：配合 `hover:shadow-md` 或 `hover:shadow`

## Dialog / Modal

```
rounded-lg shadow-xl p-0 backdrop:bg-black/30
```

内容区：`p-6 w-96`

## 间距约定

- 表单字段间：`space-y-4`
- 信息列表项间：`space-y-4`（带图标）或 `space-y-2`
- 区块间：`mb-6` ~ `mb-10`
- label 到输入框：`mb-1`
- 按钮组：`flex gap-3 pt-2`
