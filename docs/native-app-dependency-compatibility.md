# App 依赖与清单优先级

核查日期：2026-10-21。本记录补充打包缺陷及云端检查，不替代既有 CLI 安装和报价证据。

## 确认的打包兼容缺陷

`main` 的 `2593b34308f3533d937212d51b9d8cc2be39ccdd` 同时包含根 `plugin.json`
和 `.codex-plugin/plugin.json`。根清单将该包识别为 Agent Plugins 格式；兼容清单
中的 `apps` 不能让它改按原生格式加载。Codex 0.163.0 对 Agent Plugins 格式
明确跳过 App 声明，即使 `.app.json` 及其 ID、`required:true` 写法正确。

这是源码可确认的依赖声明失活问题。此前原行情 App 已经可调用，以及新包技能可加载，
都不能单独证明该包的 App 声明生效。此前 `plugin/read.apps:[]` 应保留为待解决证据。

依据固定为官方 `rust-v0.163.0` 对应提交
`83086188ae0614bd882818ff1aa23f3194962012`：

- [格式判定与兼容清单加载](https://github.com/openai/codex/blob/83086188ae0614bd882818ff1aa23f3194962012/codex-rs/core-plugins/src/manifest/manifest_cache.rs#L59)：
  根清单存在时，加载兼容清单后仍保留 Agent Plugins 格式。
- [App 加载分支](https://github.com/openai/codex/blob/83086188ae0614bd882818ff1aa23f3194962012/codex-rs/core-plugins/src/loader.rs#L1148)：
  Agent Plugins 格式返回空 App 声明；原生清单进入 `.app.json` 读取路径。
- [官方回归测试](https://github.com/openai/codex/blob/83086188ae0614bd882818ff1aa23f3194962012/codex-rs/core-plugins/src/loader_tests.rs#L31)：
  `agent_plugin_overlay_apps_are_not_runtime_active` 明确覆盖根清单、兼容清单和
  `.app.json` 共存时，App 声明仍为空。

本修复只保留受支持的 `.codex-plugin/plugin.json` 原生入口，并将补丁版本升至 `0.1.1`。
插件名、marketplace 名、App ID、`required:true`、技能和呈现信息保持一致。
没有增加 MCP 服务配置，也没有修改原 App 权限或凭据。

## 本次实际检查

- 公开仓库主分支、PR3 的状态和提交与任务提供的信息一致；PR3 保持 Draft、未修改。
- 本地结构测试 3 项通过；加入根便携清单不存在的回归约束，防止再次遮蔽原生入口。
- 云环境自带 `codex-cli 0.159.0-alpha.3`。在全新匿名临时目录中，通过真实
  `plugin/list` 识别主分支 marketplace、插件标题、`localVersion:0.1.0`，
  `marketplaceLoadErrors:[]`；未安装、未启用插件。
- 匿名 `plugin/read` 正确发现连接技能。原包与移除根清单的副本均返回 `apps:[]`；
  匿名环境缺少正常 App 认证条件，此结果不能验收依赖展示修复。
- 正常 `codex login status` 确认环境已有 ChatGPT 登录，只保留登录类型结论。
  该上下文的 app-server 启动被只读运行目录阻止；即使将临时 SQLite 和日志目录
  指向工作区，也仍在初始化时退出，未完成登录上下文的对照读取。未复制或修改认证资料。
- 依赖解析工具对 `ashare-live-quotes@ashare-quotes` 返回 `plugin_not_found`：
  该工具要求有当前发布的公开全局目录插件，不能据此验收此 Git 私有 App 连接包。
- 一次正常浏览器导航至 `https://admin.openai.com/` 返回
  `net::ERR_TUNNEL_CONNECTION_FAILED`。本环境没有桌面会话；GUI 导入、选择及依赖展示均未验收。
- 未重复 CLI 安装或任何行情调用；没有部署服务、后台任务或公共目录发布。

## 官方支持的 GUI 入口与剩余验收

[官方导入指南](https://help.openai.com/en/articles/20001504-importing-and-syncing-plugin-marketplaces-from-github)
支持工作区管理员在 Admin Console 选择目标 ChatGPT 工作区后，进入
Plugins → Add → Import marketplace：

- Source：`https://github.com/Suqi854/A-`
- Path：留空；不能填 `.agents/plugins/marketplace.json`。
- Branch, tag, or commit：主分支可留空；审阅本修复时应明确填写修复分支
  `codex/fix-native-app-dependency-20261021`，或其固定提交。

本修复未合并 main。主分支仍是 `0.1.0` 的双清单版本；仅导入默认仓库 URL
不会自动得到此依赖修复。仓库内的旧安装说明及合并状态修文由现有 Draft PR3 处理。

[官方原生 App 引用格式](https://learn.chatgpt.com/docs/enterprise/plugin-management#reference-an-existing-app-with-appjson)
支持 `.codex-plugin/plugin.json` 引用根 `.app.json`，使用 App ID 而非插件 ID。
当前仓库采用这一受支持形式，不需要为了导入补出公开 MCP 端点。

剩余必须在可访问的真实已登录客户端完成：查看 Import results 中本插件成功记录；
在插件详情中确认 required App 展示；安装或启用后在新会话中确认插件可选。
依赖 App 访问仍受原账户和工作区权限约束；导入不会授予访问权。已有行情证据无需重跑。

导入与同步不会应用仓库中的 `AVAILABLE` / `ON_INSTALL` 等策略值，工作区策略应在
导入后单独查看；本补丁不修改这些设置。本入口也不将原个人云端插件迁移到 Git 管理。
