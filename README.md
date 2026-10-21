# A股行情 Git 连接包

本仓库提供可由 Codex / ChatGPT 支持的 Git marketplace 安装的行情连接包。
行情仍由已有的 **A股实时行情 App** 提供；安装者需要该 App 的访问权限并完成连接。
Git 包不会授予私有 App 访问权，也不会部署服务。

## 安装当前候选版本

修复在独立分支 `codex/fix-git-plugin-install-20261021`，尚未合并默认分支。
只输入仓库地址并沿用默认 `main` 仍无法安装，必须明确指定分支。

### Codex CLI

需要支持 `codex plugin marketplace add` 的客户端。

```powershell
codex plugin marketplace add https://github.com/Suqi854/A-.git --ref codex/fix-git-plugin-install-20261021
codex plugin add ashare-live-quotes@ashare-quotes
```

也可用一行 GitHub 简写添加来源：

```powershell
codex plugin marketplace add Suqi854/A-@codex/fix-git-plugin-install-20261021
```

安装后在新会话中选择 **A股实时行情 · Git连接包**。按客户端提示连接已有行情 App。
先读取一次 `get_diagnostics`（`probe:false`）；有读取需求时再查一个明确标的的报价。
只有安装记录不能证明 App 已连接或行情调用成功。

### ChatGPT 的 Git 导入表单

若界面有 **Import marketplace / 导入 marketplace**：

- Source：`https://github.com/Suqi854/A-`，填仓库地址，不填 `/tree/…`。
- Path：留空。清单位于仓库根目录下的 `.agents/plugins/marketplace.json`。
- Branch, tag, or commit：`codex/fix-git-plugin-install-20261021`。

该管理入口需要相应工作区管理权限与 GitHub 授权。本包未声明 workspace `pluginId`，
不会把已有个人云端插件改成 Git 管理或替换其发布。若入口不提供分支字段，不能假设
GitHub `/tree/分支` URL 有效；可在支持的 CLI 上指定分支，或待另行授权合并后使用默认分支。

### 从本地目录验证

```powershell
git clone --branch codex/fix-git-plugin-install-20261021 --single-branch https://github.com/Suqi854/A-.git
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

公开内容仅为安装清单、连接声明、读取说明及合成结构测试。
本仓库不包含私有源码、策略、账户、密钥、会话、原始行情或自动交易逻辑。
已有云端行情服务和线上网页由其原发布流程维护。

官方格式依据：[插件打包](https://developers.openai.com/plugins/build/plugins)、
[GitHub marketplace 导入](https://learn.chatgpt.com/docs/enterprise/plugin-management)。
