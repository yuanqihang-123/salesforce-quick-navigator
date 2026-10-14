# Salesforce Quick Navigator — 产品与技术规格说明书

| 项目 | 内容 |
|---|---|
| Project Name | Salesforce Quick Navigator |
| Document Type | Product Requirements & Technical Specification |
| Version | 1.0.0 |
| Status | Ready for Development |
| Target Platform | Google Chrome |
| Extension Standard | Manifest V3 |
| Technology Stack | WXT + React + TypeScript |
| Data Storage | Chrome Storage API |
| Backend | Not Required |
| Salesforce API | Not Required |

---

# 1. Project Overview

## 1.1 Background

在 Salesforce 开发和测试过程中，开发人员通常需要频繁访问不同 Salesforce Org（例如 PESDEV、UATPES、SIT）中的相同功能页面。

不同 Org 的 Salesforce URL 通常具有以下特点：

- Salesforce Org 的域名不同。
- 相同功能页面的 URL Path 通常一致。
- 部分 Salesforce Record ID 在不同 Sandbox 之间可能相同。
- Salesforce Lightning 页面与 Setup 页面可能使用不同的域名。

例如：

**PESDEV**

```text
https://casecentral--pesdev.sandbox.lightning.force.com/lightning/o/FlowRecord/home
```

**UATPES**

```text
https://casecentral--uatpes.sandbox.lightning.force.com/lightning/o/FlowRecord/home
```

共同部分：

```text
/lightning/o/FlowRecord/home
```

当前工作流程需要开发人员手动维护 URL，或者在不同环境之间复制并修改域名。

这增加了重复操作和导航成本。

## 1.2 Objective

开发一个 Chrome Extension，用于管理 Salesforce 常用页面的快捷链接。

插件应能够：

1. 保存常用 Salesforce 页面的名称和相对 Route。
2. 自动识别当前浏览器标签页所在的 Salesforce Org。
3. 根据目标 Route 自动确定 Salesforce 域名类型。
4. 将当前 Org 的域名与保存的 Route 组合成完整 URL。
5. 在新的浏览器标签页中打开目标页面。
6. 提供快捷链接管理、搜索、分类、收藏等功能。
7. 支持从当前 Salesforce 页面直接创建快捷链接。

## 1.3 Core Principles

### Route Independence

快捷链接的 Route 应与 Salesforce Org 解耦。

同一条快捷链接应能够在多个 Salesforce Org 中复用。

### Environment Awareness

插件自动识别当前 Salesforce Org，默认在当前 Org 中打开快捷链接。

### Lightweight Architecture

插件不依赖：

- Salesforce REST API
- Salesforce Connected App
- OAuth Authentication
- Backend Server
- External Database

### Security First

插件应采用最小权限原则，不读取 Salesforce Session、Cookie 或业务数据。

---

# 2. Scope

## 2.1 V1 — MVP

第一版本包含以下功能。

| ID | Feature | Priority |
|---|---|---|
| F-001 | 自动识别当前 Salesforce Org | P0 |
| F-002 | Salesforce URL 解析与生成 | P0 |
| F-003 | 快捷链接创建 | P0 |
| F-004 | 快捷链接编辑 | P0 |
| F-005 | 快捷链接删除 | P0 |
| F-006 | 新 Tab 打开快捷链接 | P0 |
| F-007 | 粘贴完整 URL 自动提取 Route | P0 |
| F-008 | 从当前页面创建快捷链接 | P0 |
| F-009 | 快捷链接搜索 | P0 |
| F-010 | 快捷链接分类 | P1 |
| F-011 | 收藏常用链接 | P1 |
| F-012 | 快捷链接排序 | P1 |
| F-013 | Chrome Storage 持久化 | P0 |
| F-014 | JSON 导入导出 | P1 |
| F-015 | Popup 和 Settings 双界面 | P0 |

## 2.2 V2 — Future Enhancements

以下功能不属于 V1 开发范围。

| ID | Feature |
|---|---|
| F-101 | 手动选择目标 Salesforce Org |
| F-102 | 自动记录最近访问的 Salesforce Org |
| F-103 | 环境专属 Route Override |
| F-104 | 在其他 Org 打开当前页面 |
| F-105 | 右键菜单保存快捷链接 |
| F-106 | 键盘快捷键 |
| F-107 | 多 Salesforce 项目分组 |

V1 数据结构和 URL Resolver 应考虑 V2 的可扩展性，但不应提前实现尚未需要的业务逻辑。

---

# 3. User Interface

## 3.1 Extension Popup

用户点击 Chrome 工具栏中的插件图标后，打开 Popup。

建议宽度为 400px，内容区最大高度约为 550px。

### UI Layout

```text
┌────────────────────────────────────────┐
│                                        │
│ Salesforce Quick Navigator        ⚙   │
│                                        │
│ Current Org                           │
│ PESDEV                          ●      │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 🔍 Search links...                │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ★ Favorites                            │
│                                        │
│ Flow Orchestration                ↗    │
│ Custom Metadata                  ↗    │
│                                        │
│ ────────────────────────────────────── │
│                                        │
│ Flow                                   │
│                                        │
│ Flow Orchestration Detail         ↗    │
│ Flow Builder                      ↗    │
│                                        │
│ Setup                                  │
│                                        │
│ Permission Sets                   ↗    │
│ Apex Classes                      ↗    │
│ Custom Labels                     ↗    │
│                                        │
│ ────────────────────────────────────── │
│                                        │
│ + Add Link        Save Current Page    │
│                                        │
└────────────────────────────────────────┘
```

### Behavior

- 打开 Popup 时自动识别当前 Org。
- 在顶部显示当前 Org 名称。
- 收藏链接展示在最前面。
- 非收藏链接按 Category 分组。
- 点击链接名称或跳转图标，在新 Tab 中打开页面。
- 搜索结果实时过滤。
- 点击 Settings 图标打开插件设置页面。
- 点击 Add Link 打开新增链接表单。
- 点击 Save Current Page 自动填充当前页面的信息。

### Non-Salesforce Page

如果当前页面不是受支持的 Salesforce 页面：

```text
┌────────────────────────────────────────┐
│ Salesforce Quick Navigator             │
│                                        │
│ Current Org                            │
│ Not Detected                           │
│                                        │
│ Open a Salesforce page to use          │
│ Quick Navigator.                       │
│                                        │
│                 ⚙ Settings             │
└────────────────────────────────────────┘
```

要求：

- 不允许执行依赖当前 Org 的跳转。
- 仍然允许打开 Settings。
- 仍然允许查看和管理已保存的链接。
- 不应尝试使用上一次访问的 Org 作为当前 Org。

---

# 4. Functional Requirements

## 4.1 F-001 — Salesforce Org Detection

### Description

插件应根据当前 Chrome Tab 的 URL 自动识别 Salesforce Org。

### Supported Domains

V1 支持以下标准域名：

**Sandbox Lightning**

```text
{myDomain}.sandbox.lightning.force.com
```

**Sandbox Setup**

```text
{myDomain}.sandbox.my.salesforce-setup.com
```

**Sandbox My Domain**

```text
{myDomain}.sandbox.my.salesforce.com
```

**Production Lightning**

```text
{myDomain}.lightning.force.com
```

**Production Setup**

```text
{myDomain}.my.salesforce-setup.com
```

**Production My Domain**

```text
{myDomain}.my.salesforce.com
```

其中 `{myDomain}` 应完整保留，包括可能存在的 Sandbox 标识。

例如：

```text
casecentral--pesdev
```

### Expected Output

输入：

```text
https://casecentral--pesdev.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/home
```

解析结果：

```typescript
{
  orgDomain: "casecentral--pesdev",
  environmentName: "pesdev",
  isSandbox: true,
  domainType: "setup",
  hostname:
    "casecentral--pesdev.sandbox.my.salesforce-setup.com"
}
```

### Requirements

- 应使用 `URL` API 解析 URL。
- 不允许仅通过字符串包含关系判断 Salesforce 域名。
- 必须使用严格的域名后缀匹配。
- Org Domain 必须保留原始完整值。
- Sandbox Name 仅用于 UI 展示，不作为 URL 构建的唯一依据。
- 无法解析时返回明确错误，而不是构建猜测的 URL。

---

## 4.2 F-002 — Salesforce URL Resolver

### Description

根据当前 Salesforce Org 和目标 Route 自动生成完整 URL。

### Supported Route Types

| Route Pattern | Domain Type |
|---|---|
| `/lightning/o/*` | Lightning |
| `/lightning/r/*` | Lightning |
| `/lightning/setup/*` | Setup |

需要注意：

`/lightning/setup/` 的判断优先级应高于一般 `/lightning/` 路由。

### Example 1 — Lightning to Lightning

Current URL:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/
```

Saved Route:

```text
/lightning/o/FlowRecord/home
```

Expected URL:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/lightning/o/FlowRecord/home
```

### Example 2 — Setup to Lightning

Current URL:

```text
https://casecentral--pesdev.sandbox.my.salesforce-setup.com/
```

Saved Route:

```text
/lightning/r/FlowRecord/2aF85000003RucSEAS/view
```

Expected URL:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/lightning/r/FlowRecord/2aF85000003RucSEAS/view
```

### Example 3 — Lightning to Setup

Current URL:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/
```

Saved Route:

```text
/lightning/setup/CustomMetadata/page?address=%2F01IIW000003q5Bj%3Fsetupid%3DCustomMetadata
```

Expected URL:

```text
https://casecentral--pesdev.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/page?address=%2F01IIW000003q5Bj%3Fsetupid%3DCustomMetadata
```

### Query Parameter Handling

必须保留 Route 中的：

- Path
- Query Parameters
- URL Encoding
- Hash Fragment（如存在）

例如：

```text
?address=%2F01IIW000003q5Bj%3Fsetupid%3DCustomMetadata
```

不得重复编码为：

```text
?address=%252F01IIW000003q5Bj...
```

实现时应避免对完整 Query String 再次执行 `encodeURIComponent()`。

### URL Validation

Route 必须满足：

1. 以单个 `/` 开始。
2. 不允许以 `//` 开始。
3. 属于支持的 Salesforce Lightning 路由。
4. 不允许包含控制字符或反斜杠等可能改变 URL 解析语义的字符。
5. 最终生成的 URL 必须使用 HTTPS。
6. 最终 hostname 必须符合允许的 Salesforce 域名规则。

构建完成后应再次验证最终 URL。

### Limitation

插件只负责构建 URL。

不保证：

- 目标 Record 存在。
- 当前用户有访问权限。
- 目标 Org 已登录。
- Salesforce 不会发生重定向。

---

## 4.3 F-003 — Add Quick Link

### Description

允许用户创建快捷链接。

### UI

```text
┌────────────────────────────────────────┐
│ Add Quick Link                         │
│                                        │
│ Name *                                 │
│ ┌────────────────────────────────────┐ │
│ │ Flow Orchestration                 │ │
│ └────────────────────────────────────┘ │
│                                        │
│ URL / Route *                          │
│ ┌────────────────────────────────────┐ │
│ │ /lightning/o/FlowRecord/home       │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Category                               │
│ ┌────────────────────────────────────┐ │
│ │ Flow                           ▼  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Description                            │
│ ┌────────────────────────────────────┐ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ☆ Add to Favorites                     │
│                                        │
│              Cancel     Save           │
└────────────────────────────────────────┘
```

### Field Definitions

| Field | Type | Required |
|---|---|---|
| Name | String | Yes |
| Route | String | Yes |
| Category | String | No |
| Description | String | No |
| Favorite | Boolean | No |

### Validation

- Name 不能为空或仅包含空格。
- Route 必须通过 URL Validation。
- Name 最大长度为 100 字符。
- Description 最大长度为 500 字符。
- Route 最大长度为 4096 字符。
- 保存前对 Name 和 Description 进行首尾空格清理。
- 相同 Route 允许保存不同名称的快捷链接。
- 相同 Name 也允许存在，但应根据名称与 Route 的组合提示潜在重复。

---

## 4.4 F-004 — Full URL Normalization

### Description

用户粘贴完整 Salesforce URL 时，插件应自动提取 Route。

### Example

Input:

```text
https://casecentral--uatpes.sandbox.lightning.force.com/lightning/o/FlowRecord/home
```

Normalized Route:

```text
/lightning/o/FlowRecord/home
```

### Requirements

- 只接受受支持的 Salesforce 完整 URL。
- 必须校验协议与 hostname。
- 自动去除 Origin。
- 保留 Path、Query 和 Hash。
- 自动识别 Route Type。
- 不保存原始 Org Domain。
- 如果用户输入的是相对 Route，不应进行不必要的修改。

### Error Handling

如果输入：

```text
https://example.com/lightning/o/FlowRecord/home
```

应提示：

```text
Unsupported Salesforce URL.
Please enter a valid Salesforce URL or relative route.
```

---

## 4.5 F-005 — Save Current Page

### Description

用户可以将当前 Salesforce 页面直接保存为快捷链接。

### Workflow

1. 用户访问 Salesforce 页面。
2. 打开插件 Popup。
3. 点击 `Save Current Page`。
4. 插件读取当前 Tab 的 URL 和 Title。
5. 自动提取 Route。
6. 打开 Add Link 表单。
7. 用户修改名称、分类等信息。
8. 点击 Save。

### Default Values

```typescript
{
  name: currentTab.title,
  route: extractedRoute,
  category: "",
  description: "",
  favorite: false
}
```

### Requirements

- 必须允许用户修改自动生成的名称。
- 不得自动保存未经用户确认的链接。
- 如果当前 URL 不符合支持的 Route Pattern，应显示错误。
- 当前页面已保存时，应提示用户可能存在重复链接。

---

## 4.6 F-006 — Quick Link Navigation

### Description

用户点击快捷链接后，插件自动生成目标 URL 并新建 Tab。

### Workflow

```text
User Clicks Link
        │
        ▼
Read Active Tab URL
        │
        ▼
Parse Salesforce Org
        │
        ▼
Read Saved Route
        │
        ▼
Detect Route Type
        │
        ▼
Resolve Target Domain
        │
        ▼
Build Target URL
        │
        ▼
Validate URL
        │
        ▼
chrome.tabs.create()
```

### Requirements

- 默认使用当前 Salesforce Org。
- 每次跳转应重新读取当前 Tab。
- 不依赖 Popup 打开时缓存的 Org。
- 在新标签页打开。
- 默认不关闭原标签页。
- 点击操作不修改保存的 Route。
- URL 构建失败时不应打开新 Tab。

---

## 4.7 F-007 — Search

### Description

支持实时搜索快捷链接。

### Searchable Fields

- Name
- Route
- Category
- Description

### Requirements

- 不区分大小写。
- 忽略搜索关键字首尾空格。
- 输入后实时展示结果。
- 搜索结果为零时显示 Empty State。
- 清除搜索内容后恢复原始列表。

---

## 4.8 F-008 — Category

### Description

支持通过分类组织快捷链接。

例如：

```text
Flow
Setup
Security
Development
Others
```

### Requirements

- 用户可以为链接输入自定义 Category。
- 已使用的 Category 应提供下拉建议。
- 不需要单独维护复杂的 Category 数据表。
- 没有分类的链接显示在 `Others`。
- Category 按字母顺序展示。
- Favorites 独立展示在顶部。

---

## 4.9 F-009 — Favorites

### Description

用户可以将常用链接添加到 Favorites。

### Requirements

- 每条链接有独立的 Favorite 状态。
- 用户可以随时切换 Favorite 状态。
- Favorites 展示在列表顶部。
- Favorites 内部按照 Sort Order 排序。
- 为避免重复显示，收藏链接默认不再出现在下方分类列表中。

---

## 4.10 F-010 — Settings

Settings 使用独立页面，而不是在 Popup 中堆叠所有管理功能。

### Sections

**Quick Links**

- 查看所有快捷链接。
- 添加、编辑、删除。
- 管理分类。
- 调整排序。
- 切换收藏状态。

**Data Management**

- Export JSON。
- Import JSON。

**About**

- Extension Name。
- Version。
- Basic Usage。

### Delete Behavior

删除链接前显示确认：

```text
Delete Quick Link?

Are you sure you want to delete
"Flow Orchestration"?

Cancel / Delete
```

---

## 4.11 F-011 — Import / Export

### Export

以 JSON 格式导出所有快捷链接。

建议文件名：

```text
salesforce-quick-navigator-backup.json
```

### Import

支持选择本地 JSON 文件。

### Requirements

- 校验 JSON Schema。
- 校验各条 Route。
- 拒绝不受支持的 URL。
- 支持 Merge 和 Replace 两种导入模式。
- Merge 时根据 Link ID 识别重复项，已有 ID 采用跳过策略。
- Replace 前需要用户确认。
- 导入过程中如存在非法数据，应展示错误报告。
- 不允许导入文件直接覆盖插件的内部配置或执行代码。
- V1 导入导出仅覆盖 Quick Links 数据。

---

# 5. Data Model

## 5.1 QuickLink

```typescript
export interface QuickLink {
  id: string;

  name: string;

  route: string;

  category: string;

  description?: string;

  favorite: boolean;

  sortOrder: number;

  createdAt: string;

  updatedAt: string;
}
```

### Example

```json
{
  "id": "6e899e3c-5b18-4570-92ac-e4e8e76c4c02",
  "name": "Flow Orchestration",
  "route": "/lightning/o/FlowRecord/home",
  "category": "Flow",
  "description": "Flow Orchestration list page",
  "favorite": true,
  "sortOrder": 0,
  "createdAt": "2026-10-14T02:00:00.000Z",
  "updatedAt": "2026-10-14T02:00:00.000Z"
}
```

ID 使用：

```typescript
crypto.randomUUID()
```

时间使用 ISO 8601 UTC 格式。

---

## 5.2 SalesforceOrg

```typescript
export type SalesforceDomainType =
  | "lightning"
  | "setup"
  | "my-domain";

export interface SalesforceOrg {
  orgDomain: string;

  environmentName?: string;

  isSandbox: boolean;

  domainType: SalesforceDomainType;

  hostname: string;
}
```

V1 中 SalesforceOrg 由当前 Tab 动态解析，不需要持久化。

---

## 5.3 AppSettings

```typescript
export interface AppSettings {
  schemaVersion: number;

  quickLinks: QuickLink[];
}
```

示例：

```json
{
  "schemaVersion": 1,
  "quickLinks": []
}
```

`schemaVersion` 用于未来的数据结构迁移。

---

# 6. Technical Architecture

## 6.1 Technology Stack

| Component | Technology |
|---|---|
| Extension Framework | WXT |
| UI Framework | React |
| Language | TypeScript |
| Build Tool | Vite（由 WXT 集成） |
| Storage | Chrome Storage API |
| Extension Manifest | Manifest V3 |
| Styling | CSS / CSS Modules |
| Unit Testing | Vitest |
| UI Testing | React Testing Library |

V1 不需要引入 Redux、数据库或复杂状态管理框架。

---

## 6.2 Project Structure

建议目录结构：

```text
salesforce-quick-navigator/
│
├── entrypoints/
│   │
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   └── style.css
│   │
│   └── options/
│       ├── index.html
│       ├── main.tsx
│       ├── App.tsx
│       └── style.css
│
├── components/
│   ├── QuickLinkItem.tsx
│   ├── QuickLinkList.tsx
│   ├── QuickLinkForm.tsx
│   ├── SearchBar.tsx
│   ├── OrgIndicator.tsx
│   └── ConfirmDialog.tsx
│
├── services/
│   ├── salesforceUrlResolver.ts
│   ├── quickLinkService.ts
│   ├── storageService.ts
│   ├── tabService.ts
│   └── importExportService.ts
│
├── types/
│   ├── quickLink.ts
│   ├── salesforce.ts
│   └── settings.ts
│
├── utils/
│   ├── urlValidation.ts
│   ├── dateUtils.ts
│   └── idUtils.ts
│
├── tests/
│   ├── salesforceUrlResolver.test.ts
│   ├── quickLinkService.test.ts
│   └── importExportService.test.ts
│
├── public/
│   └── icon/
│
├── wxt.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

# 7. Core Services

## 7.1 SalesforceUrlResolver

负责解析 Salesforce Org 和构建目标 URL。

### Interface

```typescript
interface SalesforceUrlResolver {
  parseOrg(url: string): SalesforceOrg;

  extractRoute(url: string): string;

  resolveUrl(
    org: SalesforceOrg,
    route: string
  ): string;

  detectRouteType(
    route: string
  ): "lightning" | "setup";

  isSalesforceUrl(url: string): boolean;
}
```

### Responsibilities

- Salesforce hostname validation。
- Sandbox / Production detection。
- Domain Type detection。
- Route Type detection。
- Route extraction。
- Target hostname generation。
- Target URL generation。

### Design Notes

不应将 URL 构建逻辑分散到 React 组件中。

所有 URL 构建必须经过 Resolver。

---

## 7.2 QuickLinkService

负责快捷链接业务逻辑。

### Interface

```typescript
interface QuickLinkService {
  getAll(): Promise<QuickLink[]>;

  getById(
    id: string
  ): Promise<QuickLink | undefined>;

  create(
    data: Omit<
      QuickLink,
      "id" | "createdAt" | "updatedAt"
    >
  ): Promise<QuickLink>;

  update(
    id: string,
    changes: Partial<QuickLink>
  ): Promise<QuickLink>;

  delete(id: string): Promise<void>;

  search(query: string): Promise<QuickLink[]>;

  toggleFavorite(
    id: string
  ): Promise<void>;
}
```

所有写入必须进行数据验证。

更新时自动维护 `updatedAt`。

---

## 7.3 StorageService

负责封装 Chrome Storage API。

### Requirements

- 统一处理读取和写入。
- 提供默认配置。
- 处理数据结构版本。
- 处理 Storage API 错误。
- 不允许 UI 组件直接操作底层 Storage。
- 多个页面同时更新时应避免静默丢失数据。

### Storage Strategy

V1 建议使用：

```typescript
chrome.storage.local
```

而不是默认使用 `chrome.storage.sync`。

原因：

Chrome Storage Sync 存在单项容量、总容量及写入频率限制。

对于快捷链接列表，如果将整个列表存储在一个 Key 中，随着 URL 增长，可能触及单项容量限制。

V1 优先保证稳定性。

未来可以增加 Chrome Sync 功能。

对于并发修改问题，可以通过串行化写操作、变更检测或记录级存储策略降低覆盖风险。

---

## 7.4 TabService

负责读取当前 Tab 和创建新 Tab。

### Interface

```typescript
interface TabService {
  getActiveTab(): Promise<{
    url: string;
    title: string;
  }>;

  openNewTab(url: string): Promise<void>;
}
```

### Requirements

- 使用 Chrome Tabs API。
- 必须处理 Tab URL 不可访问的情况。
- 跳转前必须校验生成的 URL。
- 不允许打开任意外部 URL。
- 错误应反馈到 UI。

---

# 8. Chrome Extension Manifest

建议权限：

```json
{
  "manifest_version": 3,
  "name": "Salesforce Quick Navigator",
  "version": "1.0.0",
  "description": "Quick navigation for Salesforce environments.",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "action": {
    "default_title": "Salesforce Quick Navigator",
    "default_popup": "popup.html"
  },
  "options_page": "options.html"
}
```

这是功能层面的 Manifest 示例，实际由 WXT 配置生成。

### Permissions

| Permission | Purpose |
|---|---|
| activeTab | 获取用户主动打开插件时的当前 Tab 信息 |
| storage | 保存快捷链接和设置 |

V1 不要求：

```text
cookies
webRequest
scripting
<all_urls>
```

注意：如果未来引入后台自动识别所有访问过的 Org，可能需要重新评估 Host Permissions。

---

# 9. Error Handling

系统应处理以下异常。

| Scenario | Expected Behavior |
|---|---|
| 当前页面不是 Salesforce | 显示 Not Detected |
| 当前 Tab URL 无法读取 | 显示读取失败提示 |
| 当前 Org 无法解析 | 禁止跳转并提示 |
| Route 格式错误 | 禁止保存 |
| 完整 URL 不是 Salesforce | 拒绝提取 |
| Storage 读取失败 | 显示错误提示 |
| Storage 写入失败 | 保留当前表单并提示 |
| JSON 格式错误 | 拒绝导入 |
| JSON Schema 不兼容 | 提示版本不兼容 |
| Chrome Tab 创建失败 | 显示跳转失败 |
| 链接已存在 | 提示潜在重复 |
| 当前页面 Route 不受支持 | 禁止 Save Current Page |

错误提示应简洁，避免直接展示内部 JavaScript Error Stack。

---

# 10. Security Requirements

## 10.1 URL Security

必须验证：

- URL Protocol。
- Salesforce hostname。
- Route Pattern。
- Target hostname。

不得使用简单的：

```typescript
hostname.includes("salesforce.com")
```

作为域名安全判断。

原因是可能出现：

```text
salesforce.com.attacker.example
```

必须采用严格的 hostname 规则。

## 10.2 Data Security

禁止存储：

- Salesforce Session ID。
- Access Token。
- Refresh Token。
- Salesforce Cookies。
- 用户密码。

## 10.3 UI Security

- 不得将用户输入直接作为 `innerHTML`。
- 用户输入的 Name 和 Description 应作为普通文本渲染。
- 导入 JSON 必须经过 Schema Validation。
- 不允许导入数据控制 Chrome Extension 权限。
- 不需要加载远程 JavaScript。

---

# 11. Testing Specification

## 11.1 URL Resolver Tests

### Test Case 1

Current URL:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/
```

Route:

```text
/lightning/o/FlowRecord/home
```

Expected:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/lightning/o/FlowRecord/home
```

### Test Case 2

Current URL:

```text
https://casecentral--pesdev.sandbox.my.salesforce-setup.com/
```

Route:

```text
/lightning/r/FlowRecord/2aF85000003RucSEAS/view
```

Expected:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/lightning/r/FlowRecord/2aF85000003RucSEAS/view
```

### Test Case 3

Current URL:

```text
https://casecentral--pesdev.sandbox.lightning.force.com/
```

Route:

```text
/lightning/setup/CustomMetadata/page?address=%2F01IIW000003q5Bj%3Fsetupid%3DCustomMetadata
```

Expected:

```text
https://casecentral--pesdev.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/page?address=%2F01IIW000003q5Bj%3Fsetupid%3DCustomMetadata
```

### Test Case 4

Input:

```text
https://example.com/lightning/o/FlowRecord/home
```

Expected:

```text
Invalid Salesforce URL
```

### Test Case 5

Input Route:

```text
//evil.example/path
```

Expected:

```text
Invalid Route
```

### Test Case 6

Current URL:

```text
https://mycompany.lightning.force.com/
```

Route:

```text
/lightning/o/Account/list
```

Expected:

```text
https://mycompany.lightning.force.com/lightning/o/Account/list
```

### Test Case 7

Current URL:

```text
https://mycompany.my.salesforce-setup.com/
```

Route:

```text
/lightning/setup/CustomMetadata/home
```

Expected:

```text
https://mycompany.my.salesforce-setup.com/lightning/setup/CustomMetadata/home
```

### Test Case 8

输入带有 Hash 的 Route：

```text
/lightning/o/FlowRecord/home?filterName=Recent#test
```

Expected:

完整保留 Query 和 Hash，不重复编码。

---

# 12. Acceptance Criteria

V1 开发完成必须满足以下条件。

### AC-001

在受支持的 Salesforce Lightning 页面打开插件时，能够正确识别当前 Org。

### AC-002

在受支持的 Salesforce Setup 页面打开插件时，能够正确识别当前 Org。

### AC-003

点击 Lightning 类型快捷链接，自动使用当前 Org 的 Lightning 域名。

### AC-004

点击 Setup 类型快捷链接，自动使用当前 Org 的 Setup 域名。

### AC-005

能够创建、编辑、删除快捷链接。

### AC-006

能够直接粘贴完整 Salesforce URL，并自动转换为 Route。

### AC-007

能够通过 Save Current Page 保存当前页面。

### AC-008

搜索可以正确过滤快捷链接。

### AC-009

Favorites 能够正确展示在顶部。

### AC-010

重新打开浏览器后，保存的数据仍然存在。

### AC-011

支持成功导出和导入 JSON。

### AC-012

非法 URL 不能触发导航。

### AC-013

Salesforce URL 中的 Query Parameters 不会被错误编码。

### AC-014

插件不需要 Salesforce API 和 OAuth。

### AC-015

所有核心 URL Resolver 单元测试通过。

### AC-016

Settings 和 Popup 之间的数据修改能够正确同步。

---

# 13. Development Plan

建议按照以下顺序开发。

## Phase 1 — Core Infrastructure

实现：

- WXT 项目初始化。
- React + TypeScript。
- 数据类型定义。
- Salesforce URL Resolver。
- URL Validation。
- 单元测试。

**Deliverable：** 能够根据当前 Org 和 Route 正确生成 URL。

## Phase 2 — Quick Link Management

实现：

- StorageService。
- QuickLinkService。
- Add Link。
- Edit Link。
- Delete Link。
- JSON 导入导出。

**Deliverable：** 能够完整管理快捷链接。

## Phase 3 — Popup

实现：

- 当前 Org 检测。
- 链接列表。
- 点击跳转。
- 搜索。
- Favorites。
- Category。
- Save Current Page。

**Deliverable：** 完整的快捷导航功能。

## Phase 4 — Polish & Testing

实现：

- 错误提示。
- Empty State。
- Loading State。
- UI 样式优化。
- 单元测试完善。
- Chrome Extension 打包。
- 实际 Salesforce Sandbox 测试。

**Deliverable：** 可在 Chrome 中加载使用的 V1 插件。

---

# 14. Future Architecture — V2

为了支持未来跨环境导航，建议在设计上保持扩展能力。

## 14.1 Environment Model

```typescript
export interface SalesforceEnvironment {
  id: string;

  name: string;

  orgDomain: string;

  isSandbox: boolean;
}
```

## 14.2 Route Override

未来可将 QuickLink 扩展为：

```typescript
export interface QuickLinkV2
  extends QuickLink {

  environmentOverrides?: Record<
    string,
    string
  >;
}
```

其中 Key 为 Environment ID，Value 为 Route。

## 14.3 Open Current Page in Another Org

未来 URL Resolver 可以支持：

```typescript
resolveUrl(
  targetOrg: SalesforceOrg,
  route: string
): string;
```

V1 的 Resolver 已经采用相同的参数设计，因此 V2 不需要重新设计核心 URL 构建逻辑。

---

# 15. Non-Goals

以下内容不属于本项目目标：

1. 不实现 Salesforce Record 数据查询。
2. 不自动查询其他 Org 中对应的 Record ID。
3. 不实现 Salesforce Session 共享。
4. 不实现 Salesforce 登录自动化。
5. 不修改 Salesforce 页面内容。
6. 不注入 Apex、JavaScript 或其他脚本到 Salesforce 页面。
7. 不实现跨 Org 数据同步。
8. 不提供外部云数据库。
9. 不实现团队共享链接平台。
10. 不保证不同 Org 中相同 Record ID 对应相同数据。

---

# 16. Definition of Done

当以下条件全部满足时，V1 可视为完成：

- 所有 P0 功能完成。
- 所有 P1 功能完成。
- URL Resolver 通过全部单元测试。
- Chrome Extension 能够正常加载。
- Popup 和 Settings 工作正常。
- 至少在两个 Salesforce Sandbox 环境中完成手动测试。
- Lightning 页面与 Setup 页面之间的域名转换正常。
- JSON 导入导出功能正常。
- 未申请不必要的 Chrome Permissions。
- 所有用户输入及导入数据都经过必要验证。
- 项目包含 README，说明开发、构建、安装与使用流程。

---

## 17. Implementation Guidelines for Coding Agents

以下约束适用于使用 Codex 或其他 AI Coding Agent 实现本项目时。

**Architecture**

- 使用 WXT + React + TypeScript。
- 遵循模块化设计。
- UI 与业务逻辑分离。
- URL Resolver 不依赖 React。
- Storage Service 不依赖 UI。
- 不引入不必要的第三方依赖。

**Coding Standards**

- 启用 TypeScript Strict Mode。
- 避免使用 `any`。
- 对外部输入进行 Runtime Validation。
- 所有异步操作正确处理异常。
- 复用类型定义，避免重复定义接口。
- 保持函数职责单一。

**Testing**

- 使用 Vitest 编写 URL Resolver 单元测试。
- 优先覆盖 URL 解析、域名转换和 URL 安全校验。
- 对 Storage 操作使用 Mock。
- 核心业务逻辑必须可以脱离 Chrome 浏览器环境独立测试。

**UI**

- 界面简洁。
- 不需要复杂动画。
- 默认使用浅色主题。
- Popup 的主要操作应在一次点击内完成。
- 避免为简单操作创建多层弹窗。
- 保持命名与用户操作一致。

**Implementation Constraints**

- 不实现 Spec 范围之外的功能。
- 不提前开发 V2。
- 不添加 Backend。
- 不接入 Salesforce API。
- 不在代码中硬编码 `casecentral` 或任何特定 Salesforce Org。
- 所有 Salesforce Org 必须通过当前 URL 动态识别。

---

**最终交付目标：** 一个完全在本地运行、无需 Salesforce API、可在不同 Salesforce Org 中复用相同 Route 的轻量级 Chrome Extension，提供快速导航、链接管理和当前页面收藏功能。

这个 Spec 可以直接作为 Codex 的开发依据。建议将其保存为项目根目录的 `SPEC.md`，并在实施时以第 11 节测试用例和第 12 节验收标准作为功能完成的判断依据。