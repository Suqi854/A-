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

## 验证边界与待完成项

空 `CODEX_HOME` 未复制登录信息。隔离加载器的 `apps` 列表为空，不能据此宣称
新装包已解析出经过认证的行情工具。上述原 App 调用与隔离安装是两个独立验证，
不是从新装 Git 包到行情工具的完整端到端验收。

需要在已有 App 权限的已登录客户端新会话中选择 Git 连接包，完成必要的连接提示，
然后调用一次诊断来闭环。其他账户没有原私有 App 的访问权限时，安装此包仍不能使用行情。
本任务不申请额外账户权限，不复制凭据，也不改变 App 公开范围。

Git 来源的实际拉取、安装结果将在上传分支后追加到本记录。
未验收 ChatGPT 管理界面的 Git 导入，未修改当前用户的客户端全局配置。
默认分支保持原样；无分支选择的安装入口仍需另行授权合并修复后才能直接使用仓库 URL。

## 安装格式依据

- [官方插件打包文档](https://developers.openai.com/plugins/build/plugins)：
  Git marketplace 来源、`--ref`、相对路径、便携清单和兼容清单。
- [官方 GitHub marketplace 导入文档](https://learn.chatgpt.com/docs/enterprise/plugin-management)：
  Source 使用仓库 URL；Path 相对 marketplace 根目录；Branch/tag/commit 单独指定；
  导入并不授予所依赖 App 的权限。
