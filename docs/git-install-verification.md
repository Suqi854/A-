# Git 安装修复与验证

核查日期：2026-10-21。客户端：Codex CLI 0.163.0，Windows。

## 根因

- 默认分支 `main` 核查时为 `f138ed2884c2e0a08fa84eaf8a8fa4885cc58770`，只有 README。
- Draft PR #1 仍开放、未合并，头提交为 `868b8f07e3566082f9550141f64b153a818a75d3`。
  该分支是网页组件，没有 marketplace 清单或可安装插件目录。
- 对默认分支的独立检出实际运行 `codex plugin marketplace add <checkout> --json`，
  退出码 1，错误为 `marketplace root does not contain a supported manifest`。
- 既有行情服务是另行注册的 App。其原插件为 App 连接声明，不是仓库现有的网页组件。

## 最小修复

在 `codex/fix-git-plugin-install-20261021` 分支增加一个 marketplace 和一个连接包。
`source.path` 从仓库根目录解析到 `plugins/ashare-live-quotes`。
便携清单与兼容清单保持相同名称、版本和呈现信息，均引用包根目录的 `.app.json`。
该文件引用已核实的现有行情 App，并设为 `required:true`。
附带一个只负责行情读取与连接诊断的技能；不导入分析技能仓库内容。

本次不创建新的云端插件，不改变原 App 的身份、访问范围或服务部署。
连接声明保留原 App 的权限模型；技能中的只读工作流不是服务端权限裁剪。
此包依赖既有云端服务，不是可脱离云端运行的本地行情服务器。

## 已完成验证

1. `node --test test/plugin-package.test.mjs`：3 项通过。
   覆盖目录解析、清单一致性、必要 App 引用、技能发现路径和包内文件边界。
2. 使用获准工作区内新建的空 `CODEX_HOME` 实际注册本地 marketplace：
   返回 `marketplaceName: ashare-quotes`，`alreadyAdded:false`。
3. 实际运行 `codex plugin add ashare-live-quotes@ashare-quotes --json`：
   返回安装版本 `0.1.0`、安装目录和 `authPolicy:ON_INSTALL`。
   随后 `plugin list` 返回 `installed:true`、`enabled:true`。
4. 在同一隔离目录启动短生命周期的本机 app-server，通过其实际协议加载包：
   `plugin/read` 返回正确的插件标题、版本和已启用的连接技能；
   `skills/list` 也发现 `ashare-quotes-connection`。
   该过程未启动行情服务或后台任务。
5. 通过当前会话已有的原行情 App 连接调用一次 `get_diagnostics`（`probe:false`），
   成功返回服务元数据和工具列表；再用一个明确股票代码调用一次 `get_quotes`，
   成功返回一条报价，时效标记为 `latest_session`。没有把该快照当作实时行情。
   只保留成功、条数与时效结论；不将原始响应、价格、账户或诊断明细写入仓库。
6. 上传后使用第二个全新隔离 `CODEX_HOME`，实际从 GitHub 拉取：

   ```powershell
   codex plugin marketplace add https://github.com/Suqi854/A-.git --ref codex/fix-git-plugin-install-20261021 --json
   codex plugin add ashare-live-quotes@ashare-quotes --json
   codex plugin list --marketplace ashare-quotes --json
   ```

   三步均成功。返回 marketplace 名 `ashare-quotes`，版本 `0.1.0`，
   `installed:true`、`enabled:true`、`marketplaceSource.sourceType:git`。
   Git 检出 HEAD 为 `5a929c3df3254b54d4f94c4b4395cbd3d064012a`。
   对 Git 检出的包再次执行实际 `plugin/read` 与 `skills/list`，正确加载插件呈现信息和连接技能。
   编写目录、Git 检出和安装缓存的四个包内文件逐一比较，统一换行后的 UTF-8 内容完全一致；
   Windows Git 检出将 LF 转为 CRLF，无其他内容差异。

## 现有已登录客户端的补验收

在前述隔离检查之后，通过本机正常 `codex login status` 确认已有 ChatGPT 登录。
正常客户端的 `app/installed` 返回原行情 App `enabled:true`、`callable:true`。
随后在这一现有登录上下文中，从同一 Git 分支正常添加 marketplace 并安装连接包，
没有复制登录资料、配置密钥或发起新授权。

同一宿主的实际协议检查结果：

- `plugin/read` 返回新包 `installed:true`、`enabled:true`；`skills/list` 发现随包连接技能。
- 在无模型推理、无持久化历史的临时测试上下文中，`app/installed` 确认原行情 App 可调用。
- 从该上下文的 `mcpServerStatus/list` 工具目录中取得 `codex_apps` 的 `a.get_quotes`，
  并核对工具元数据中的 App ID 与本包 required App 完全一致。
- 通过同一宿主的 `mcpServer/tool/call` 实际调用一次明确标的的只读报价：
  `isError:false`、返回 1 条，时效为 `recent`。只保存这些验收结论，不保存价格或原始响应。
- 没有出现用户交互或新授权请求；检查进程完成后退出，未启动行情后台服务。

这次结果来自已安装新包的同一已登录宿主及其临时上下文，不使用此前原 App 的独立报价
代替新包加载后的调用证据。`plugin/read` 的呈现用 `apps` 数组仍为空；App 的有效身份
和可调用性以同线程运行快照、实际工具元数据及调用结果核验，未宣称目录依赖展示已经修复。

## 验证边界与待完成项

空 `CODEX_HOME` 的初次检查没有认证能力；不能单独作为端到端证据。
上述补验收已覆盖现有登录、本机 Git 包安装、同宿主加载与一条实际报价调用。
其他账户没有原私有 App 的访问权限时，安装此包仍不能使用行情。
本任务不申请额外账户权限，不复制凭据，也不改变 App 公开范围。

未验收 ChatGPT 管理界面的 Git 导入，未修改当前用户的客户端全局配置。
默认分支保持原样；无分支选择的安装入口仍需另行授权合并修复后才能直接使用仓库 URL。

## 安装格式依据

- [官方插件打包文档](https://developers.openai.com/plugins/build/plugins)：
  Git marketplace 来源、`--ref`、相对路径、便携清单和兼容清单。
- [官方 GitHub marketplace 导入文档](https://learn.chatgpt.com/docs/enterprise/plugin-management)：
  Source 使用仓库 URL；Path 相对 marketplace 根目录；Branch/tag/commit 单独指定；
  导入并不授予所依赖 App 的权限。
