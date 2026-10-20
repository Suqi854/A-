# 市场状态卡片接入

复用现有页面的市场数据成功及失败回调，新增隔离的市场状态卡片。组件本身不发起请求，不增加后台刷新或持久化。

## 应用

仅在隔离源码副本中应用。自行核对目标副本的提交，以该提交作为第三个参数：

node apply-v97.mjs ./isolated-source <expected-source-commit>

脚本核对调用方提供的40位提交及两个基线文件的SHA-256，再验证所有接入锚点和新增文件。任一条件不符均在写入前停止。脚本仅写入以下四个相对路径，不提交、推送或部署：

- src/page.mjs
- scripts/build.mjs
- src/overview-market-status-page.mjs
- test/overview-market-status.test.mjs

测试文件需要放入上述目标项目的test目录，依赖其src/page.mjs。应用后可在隔离项目中运行：node --test test/overview-market-status.test.mjs

检查覆盖现有回调接入、双时钟、未来时间、过期、失败与最近时段快照；输入均为合成资料。恢复隔离副本中的两个原文件并删除两个新增文件即可撤销本项。

目录名称仅用于兼容性区分。这里不包含运行环境地址、内部部署标识、账户数据或部署记录。
