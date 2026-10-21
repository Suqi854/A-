# A股行情 Git 连接包

本仓库提供连接已有 **私有 A股实时行情 App** 的 Git marketplace 安装包。
安装者需要该 App 的访问权限并完成连接；本包不包含私有站源码，也不会授予 App 访问权或部署服务。

## 从默认仓库安装

默认分支 `main` 已包含 marketplace 和插件清单。以下命令使用仓库默认分支。

### Codex CLI（已验证 0.163.0）

2026-10-21 已在 Windows 的 Codex CLI **0.163.0** 中，使用下列默认仓库 URL
实际完成安装和启用核对；安装结果为 `installed:true`、`enabled:true`。

```powershell
codex plugin marketplace add https://github.com/Suqi854/A-.git
codex plugin add ashare-live-quotes@ashare-quotes
```

安装后在新会话中选择 **A股实时行情 · Git连接包**。按客户端提示连接已有行情 App。
先读取一次 `get_diagnostics`（`probe:false`）；有读取需求时再查一个明确标的的报价。
只有安装记录不能证明 App 已连接或行情调用成功。

### ChatGPT 图形界面导入（尚未验证）

以下填法依据官方文档。图形界面的导入和插件选择流程尚未实测，CLI 验证结果不代表 GUI 已通过。
若界面有 **Import marketplace / 导入 marketplace**：

- Source：`https://github.com/Suqi854/A-`，填仓库地址，不填 `/tree/…`。
- Path：留空。清单位于仓库根目录下的 `.agents/plugins/marketplace.json`。
- Branch, tag, or commit：留空，使用默认分支 `main`。

该管理入口需要相应工作区管理权限与 GitHub 授权。本包未声明 workspace `pluginId`，
不会把已有个人云端插件改成 Git 管理或替换其发布。

### 从本地目录验证

```powershell
git clone https://github.com/Suqi854/A-.git
codex plugin marketplace add ./A-
codex plugin add ashare-live-quotes@ashare-quotes
```

## 包结构

```text
.agents/plugins/marketplace.json
plugins/ashare-live-quotes/
  plugin.json
  .codex-plugin/plugin.json
  .app.json
  skills/ashare-quotes-connection/SKILL.md
```

`source.path` 相对仓库根目录解析。便携清单和 Codex 兼容清单引用同一份 `.app.json`。
App ID 是连接标识，不是凭据；服务端认证及原 App 的访问范围仍然有效。
本包不需要 npm 安装、构建、服务进程、开机启动或运行目录外的文件。
网页组件候选仍在原 Draft PR #1，与本连接包分开审阅。

## 验证与边界

结构和依赖检查：`node --test test/plugin-package.test.mjs`。
实际客户端安装及 App 验证记录见 [验证记录](docs/git-install-verification.md)。
已有登录上下文中的同一连接包已完成加载、App 身份核对及一次实际报价调用；图形界面流程尚未验证。

公开内容仅为安装清单、连接声明、读取说明及合成结构测试。
本仓库不包含私有源码、策略、账户、密钥、会话、原始行情或自动交易逻辑。
已有云端行情服务和线上网页由其原发布流程维护。

官方格式依据：[插件打包](https://developers.openai.com/plugins/build/plugins)、
[GitHub marketplace 导入](https://learn.chatgpt.com/docs/enterprise/plugin-management)。
