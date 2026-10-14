# Salesforce Quick Navigator — V2

WXT + React + TypeScript 的本地 Chrome Manifest V3 扩展。实现 spec.md 的 V1 功能和 F-101 至 F-107 的全部 V2 功能。无需后端、Salesforce API、OAuth 或 Session 共享。

## 安装与更新

需要 Chrome 127+；本地构建需要 Node.js 22.12+ 和 npm。

```sh
npm ci
npm run build
```

在 `chrome://extensions` 开启开发者模式，选择“加载已解压的扩展程序”，加载 `dist/chrome-mv3` 文件夹。已安装 V1 的用户重新加载同一文件夹；原链接 ID、分类、收藏、排序和时间戳会保留，归入 **Default** 项目。首次成功写入时将本地存储持久化为 schemaVersion 2。

V2 新增 `contextMenus` 权限以及下列限定 Salesforce 域名的主机权限，用于后台识别访问过的 Org。更新后可能需要在 Chrome 中确认新增权限：

- `https://*.lightning.force.com/*`
- `https://*.my.salesforce-setup.com/*`
- `https://*.my.salesforce.com/*`

这些匹配覆盖标准 Production 和 Sandbox 域名。解析器再次严格验证完整 hostname，不接受任意嵌套子域名或外部域名。不申请 `<all_urls>`、`cookies`、`scripting`、`webRequest` 或全局 `tabs` 权限；不注入页面脚本，不读取业务数据。域名权限提供读取匹配 Tab URL 的能力，参见 [Chrome Tabs 文档](https://developer.chrome.com/docs/extensions/reference/api/tabs)。

## Popup

- **收藏开关** 在 Settings → Preferences 中开启 **Enable favorites** 才显示星号和收藏编辑选项，默认关闭。关闭后保留已有收藏记录，打开次数继续显示和累计，同次数排序不使用收藏优先；重新开启可恢复收藏。开关随完整备份保存，Merge 保留本地开关。
- **Project** 切换独立的链接和环境分组。只有一个项目时隐藏该选择器。切换项目会关闭已打开的 Org 确认框并清空搜索。
- 点击链接或按第一次 Enter 弹出简洁的 Org 确认框，默认使用当前 Org；没有当前 Org 时使用按最近访问时间排序的第一个已保存 Org。← / → 或鼠标点击左右箭头循环选择，再按 Enter 或点击 Open link 在新 Tab 打开。Esc 取消并恢复原焦点。普通网站也能先搜索链接，再在确认框选择已保存的 Org。打开失败保留选择，可重试；每次打开重新校验存储数据和目标。已选目标被删除或移走时提示，避免静默跳到错误 Org。
- **Open current page ↗** 点击后弹出 Org 确认框，只可选择当前项目中当前 Org 之外的 Org，← / → 选择 Org，再按 Enter 或点击 Open link 打开。将当前页面的原始 Route 打开到确认的 Org，保留 Query 和 Hash，不应用已保存链接的 Override；需要支持的当前 Salesforce 页面，没有其他 Org 时按钮禁用。
- **Add Link** 默认填入当前页面标题与 Route；允许改成任意其他链接，不能提取时打开空白表单。Settings 的 Add Link 始终打开空白表单。
- 名称、Route、分类、描述均可搜索；主页以统一列表按成功打开次数从高到低排序，次数相同按原收藏、分类和手动顺序排列。收藏星号旁显示紧凑计数（大数简写，悬停显示完整次数）；取消或打开失败不计数，旧链接从 0 开始。打开链接与次数写入由后台完成，弹窗因切换标签页关闭后仍会保存；次数保存在本地，并随备份导入导出。编辑/删除仍可从 Popup 执行。
- Popup 打开时自动聚焦搜索框，使用快捷键打开后即可直接输入。刚打开时按 ↑ 聚焦 **Open current page ↗**，Enter 进入 Org 选择框，← / → 选择 Org，再按 Enter 打开。搜索后默认高亮第一个可打开的结果，↑ / ↓ 按实际显示顺序导航：首条按 ↑、末条按 ↓ 都会聚焦 Open current page；在该按钮上按 ↓ 返回首条、按 ↑ 返回末条，焦点回到搜索框。无匹配结果或没有链接时仍可导航到当前页按钮，再按 ↑ / ↓ 返回搜索框；当前页不支持打开时，↑ / ↓ 只在链接中循环。Tab / Shift+Tab 保留普通焦点导航。Enter 确认链接并进入 Org 选择框，第二次 Enter 打开链接；Esc 关闭后恢复触发位置的焦点，搜索内容保留。没有可用 Org 时不能触发键盘跳转。
- 新增/编辑时 Popup 增高至 600px，保存和取消固定于表单底部；环境 Override 折叠显示，保留紧凑导航布局。

## Salesforce 书签自动导入

首次打开 Popup 显示可关闭的 **Enable bookmark links** 提示；选择 **Not now** 或拒绝授权后不反复提示，仍可在 Settings → **Salesforce bookmarks** 开启 **Enable bookmark sync**。`bookmarks` 是可选权限，仅点击开启时申请，未开启时不读取书签。浏览器授权范围覆盖全部书签，插件仅读取书签栏及其递归子文件夹，不修改浏览器书签、不上传数据。

- 开启后直接转为普通 Quick Links，进入开启时选定的项目。Settings 支持选择导入项目；切换目标需先关闭同步，原项目已导入的链接保留。
- 识别现有标准 Org 域名：`*.lightning.force.com`、`*.my.salesforce.com`、`*.my.salesforce-setup.com`，包含 Sandbox。不通过标题关键词识别，不读取 Other/Mobile 文件夹，不包含文档站、通用登录站或自定义/Visualforce 域名。
- 标题作为名称（最多 100 字符），书签栏下的文件夹路径作为分类。同项目相同 Route、域名类型和 Override 配置去重，重复项使用现有链接；不同 Org 的同一路径会合并。对应 Org 自动加入该项目，不把书签导入视为最近访问。
- 保留 Query 和 Hash，标准 Lightning / Setup 路径按原有规则选择域名；首页、Classic、`/apex/` 等其他安全路径额外保存域名类型。编辑这些链接时可选择 Lightning、Setup 或 My Domain / Classic。所有链接仍使用现有 Org 选择框，可跨 Org 打开。
- 书签新增、改名、移动、删除以及浏览器书签导入结束后自动校准；后台启动、浏览器启动及打开 Popup/Settings 时也会校准。Settings 提供 **Refresh now**、最近同步时间与匹配数。
- 自动更新保留 Quick Link ID、收藏、排序和打开次数。已有手动链接不会被重复书签覆盖或删除；用户修改名称、路径、分类、描述、项目或 Override 后，该链接退出自动管理。手动删除 Quick Link 后，同一个书签不会在下次同步重新加入；移除书签再重新添加可重新导入。
- 删除或移出书签栏会移除仍由同步管理且未编辑的对应 Quick Link；重复来源尚存时保留。关闭同步会保留所有已导入 Quick Links 并撤销可选书签权限。权限被外部撤销或目标项目被删除时停止同步；读取失败保留现有链接，显示可重试提示。
- 授权、开关、提示状态及浏览器书签 ID 单独保存在本地，不进入备份。已导入的 Quick Links、Org 和域名类型正常导出、导入；导入备份不会授予书签权限或开启同步。

## Settings：项目与环境

**Projects**：创建和重命名项目。删除前确认，会删除该项目的链接、Org 和 Route Override；Default 可以重命名但不能删除。需要保留时先导出备份。

**Salesforce Orgs**：后台在 Salesforce 标签页 URL 更新、加载完成或激活时记录 Org，Popup 打开也会记录当前 Org。新识别的 Org 进入 Default；只存储 Org Domain、Sandbox 标志、名称、项目和最近访问时间，不保存自动访问的完整 URL、查询参数或标题。

可手动添加或编辑 Org：输入名称及受支持的完整 Salesforce URL，选择所属项目。同一项目内相同 Org 只能出现一次；可以在不同项目分别配置同一 Org。移到其他项目后，旧项目中引用它的 Override 会被清除；后续访问保留手动名称和项目归属。删除 Org 会同时清理 Override，再次访问时会重新记录。

**Quick Links**：按当前项目管理链接、分类、收藏和顺序。↑ / ↓ 仅调整该项目内顺序，搜索期间禁用排序。编辑链接时可以移动项目；移动会清空不适用的 Override。

新建和编辑按同一项目内的 Route 与完整环境 Override 配置去重，重复时提示并阻止保存；名称、分类、备注或收藏不同不会视为新链接。完整 URL 先转换为相对 Route，Query 和 Hash 保留。不同项目、不同 Route 或不同 Override 配置可分别保存。已有重复记录不自动删除，仍可编辑备注等信息。

## 环境专属 Route Override

新增/编辑链接时展开 **Environment routes**，为当前项目中的某个 Org 填入专属 Route 或完整 Salesforce URL，例如环境中不同的 Record ID。空白表示使用默认 Route。所有 Override 都经过相同 URL 验证。

手动指定目标及 Current Org 模式都会使用对应环境的 Override；Current Org 仅匹配当前项目中 Org Domain 和 Sandbox 标志完全相同的环境。默认 Route 不会因跳转被改写。

## 右键与快捷键

在支持的 `/lightning/o/*`、`/lightning/r/*` 或 `/lightning/setup/*` 页面右键，选择 **Save to Salesforce Quick Navigator**。扩展留在当前页面，直接打开插件弹窗并显示填写好标题和 Route 的表单，用户点击 Save 后才永久保存；不打开 Settings 或新 Tab。草稿临时保存在 `chrome.storage.session`，读取后删除，关闭浏览器后清空；可以在表单中指定项目。此功能使用 Chrome 127+ 的 [action.openPopup API](https://developer.chrome.com/docs/extensions/reference/api/action#method-openPopup)。

- **⌘ Shift Y** / **Ctrl Shift Y**：打开插件。
- **⌘ Enter** / **Ctrl Enter**：保存链接表单，包括在多行输入框中。
- **Esc**：取消链接或确认对话框。

打开插件快捷键可在 `chrome://extensions/shortcuts` 修改，冲突时请手动分配，参见 [Chrome Commands 文档](https://developer.chrome.com/docs/extensions/reference/api/commands)。

## 导入导出与迁移

导出 `salesforce-quick-navigator-backup.json`，包含链接、项目、Org 和 Override：

```json
{
  "schemaVersion": 2,
  "quickLinks": [],
  "projects": [{ "id": "default", "name": "Default" }],
  "environments": []
}
```

- 兼容 V1 的 `{ "schemaVersion": 1, "quickLinks": [...] }`，自动归入 Default。
- **Merge** 按 ID 跳过已有链接/项目，合并环境。同项目中相同 Org 若 ID 不同，复用本地环境并重映射新增链接的 Override。重映射后按项目、Route 与 Override 配置再次去重，保留本地记录；文件内部的重复链接保留首次出现的记录，重复项计入 skipped。相同环境 ID 对应不同 Org/项目时拒绝导入，避免指向错误环境。
- **Replace** 验证完整文件并要求确认，再替换全部链接、项目、Org 和 Override。文件内部的相同链接保留首次出现的记录，重复项计入 skipped。导入 V1 的 Replace 也会清空现有 V2 环境和项目，恢复 Default。
- 非法数据、重复 ID、错误版本、无效域名/Route、跨项目或缺失的引用会拒绝整个导入，不产生部分写入。未知字段丢弃，导入文件不能控制权限或执行代码。
- 多页面及后台写入统一通过扩展来源的 Web Locks 串行化，Chrome Storage 事件保持界面同步。读取错误不会重置本地数据。

## 开发和架构

```sh
npm run dev
npm run typecheck
npm test
npm run format:check
npm run build
npm run zip
```

ZIP 位于 `dist/salesforce-quick-navigator-2.0.0-chrome.zip`。

- `entrypoints/`：独立 Popup、Settings 和后台 Service Worker 入口。
- `components/popup/`：当前 Org/目标选择、Popup 页面。
- `components/settings/`：链接、环境、项目、备份、About 分别独立面板。
- `components/links/`：列表行、分组列表、基础字段、Override、链接对话框。
- `hooks/`：读取和订阅设置、活动 Org、异步操作状态、链接编辑、临时草稿。
- `services/`：URL Resolver、导航、链接/项目/环境操作、后台事件、草稿、备份合并、存储各自独立。`validation/` 分开验证字段、链接、环境和关系。
- `services/background/`：消息校验和分发、右键菜单与草稿弹窗、Tab 观察分别独立；`backgroundService.ts` 只编排启动注册。`backgroundClient.ts` 统一 UI 消息请求和错误处理。
- `services/bookmarks/`：`collection.ts` 负责安全提取书签候选；`reconciliation.ts` 负责去重、来源归属及更新删除；`storage.ts` 负责同步状态验证和事务。`bookmarkSyncService.ts` 负责权限检查及同步流程，保持原有数据格式。
- `types/`：项目/环境、链接、Org、设置模型。
- `utils/`：对话框键盘行为、统一错误文本等纯工具。
- `styles/`：基础主题、链接、Popup、Settings、对话框独立样式。
- `tests/`：保留 V1 测试，增加项目隔离、目标与 Override 导航、后台事件、草稿确认、V1 迁移、V2 备份以及错误回滚。

## Chrome 扩展最佳实践检查

- 使用 Manifest V3 Service Worker；监听器在启动时同步注册，异步初始化不会阻塞监听器注册，导航消息通过 `return true` 保持响应通道，等待打开次数持久化完成。[Chrome Service Worker 事件](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/events)
- 必需权限限定为 `activeTab`、`storage`、`contextMenus` 和三个 Salesforce 域名；`bookmarks` 由用户点击开启时申请。后台自动记录 Org 需要持续读取匹配域名的 Tab URL，因此保留主机权限。[Chrome 权限声明](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)
- 后台仅接受本扩展 Popup 和 Options 页面的已知消息，验证发送方、请求字段及存储中的项目/目标关系；拒绝内容脚本和其他来源的特权请求。[Chrome 安全指南](https://developer.chrome.com/docs/extensions/develop/security-privacy/stay-secure)
- 显式 CSP 限制资源和脚本来自扩展自身，禁用对象及基址覆盖；使用打包代码、React 文本渲染，无远程脚本、`eval` 或动态 HTML 注入。原版已受 MV3 默认 CSP 保护，显式策略进一步限制其他资源。[Chrome CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy)
- 本地存储限制为 `TRUSTED_CONTEXTS`，保留 Popup、Options 和后台访问；临时草稿使用默认隔离的 session 存储。链接及书签同步事务共用同一个 Web Lock，避免多个扩展页面和后台并发覆盖数据。[Chrome Storage](https://developer.chrome.com/docs/extensions/reference/api/storage)

重构后仍需执行下面的实际 Chrome 验收；Mock 自动测试无法证明浏览器权限、Worker 挂起恢复、弹窗生命周期及 Salesforce 登录跳转行为。

## 手动验收

自动测试使用 Mock Chrome API，实际浏览器/后台权限和已登录 Sandbox 仍需手动验证：

1. 更新扩展并允许新的 Salesforce 域名权限，分别访问两个 Sandbox，确认自动记录、最近时间和 Popup 名称。
2. 默认 Current Org 与手动目标分别测试 Lightning / Setup 转换、查询编码、Hash、目标 Record 权限及登录重定向。
3. 建立两个项目，在各项目中配置 Org 和链接，验证切换隔离、移动链接、环境 Override 及 Current Org 匹配。
4. 点击 Open current page 后在确认框中选择目标，验证原始 Route、Query 和 Hash 保留；用 ↑、Enter、← / →、Enter 完成全键盘操作，用 Esc 检查焦点恢复。普通网站可打开已保存链接，当前页按钮禁用；失效目标不能导航。
5. 右键准备链接，确认当前页面直接打开插件弹窗、没有 Settings 或新 Tab，保存前无永久写入；测试 Save、Cancel、⌘ Enter、Esc 和打开插件快捷键。关闭后重新点击工具栏图标，应恢复普通弹窗；在多个窗口中测试右键保存的标题和 Route 来自点击的页面。
6. 导入旧 V1 备份，导出并恢复 V2 备份，验证 Merge、Replace 取消、跨浏览器环境 ID 重映射、错误文件不改变现有数据。
7. 同时打开 Settings 和 Popup 修改数据，切换 Salesforce Tab 触发后台记录，确认同步和重新启动 Chrome 后的持久化。
8. 首次打开时选 Not now，确认重新打开不提示；在 Settings 开启书签同步并授权，检查书签栏递归导入、其他书签文件夹排除、同路径去重及对应 Org。测试首页和 Classic 路径仍可编辑、跨 Org 打开。
9. 开启同步后新增、改名、移动和删除书签，确认 Quick Link 更新；收藏、打开次数和手动编辑保留，手动删除不重新导入。关闭同步确认链接保留、权限撤销；重新开启、浏览器重启及外部撤销权限后验证状态。使用多项目时检查导入目标及删除项目后停止同步。

只构建 URL，不保证目标 Record 存在或跨 Org Record ID 相同，不共享登录状态。请勿保存 Session ID、Access Token、密码或其他敏感信息。
