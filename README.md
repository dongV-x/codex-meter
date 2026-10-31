# Codex Meter · dongV

基于 [Lorie7813/codex-usage-card v0.9.4 Beta](https://github.com/Lorie7813/codex-usage-card/releases/tag/v0.9.4-beta.1) 的本机定制版，版本 `0.9.4-dongv.1`，保留原始 MIT 许可证。

显示当前 Codex 登录账号的剩余额度，不需要填写账号、密码或 API Key。读取所安装客户端内置的 Codex CLI，不改登录配置或应用签名。

| 适配项 | 行为 |
| --- | --- |
| Pro 账号 | 仅返回周额度时显示单个周额度圆环；同时返回两种额度时显示双环 |
| 其他账号 | 依据实际返回的窗口显示，不按套餐名字编造不存在的数据 |
| 文字提示 | dongV 标识、剩余百分比、重置卡数量、北京时间重置时间 |
| 自动刷新 | 每 60 秒读取；连接失败或数据超过 150 秒变灰，避免把旧数据当最新数据 |
| 启动 | 安装时保留当前窗口，下次从原应用图标启动时自动加载 |
| 安装隔离 | `~/Library/Application Support/CodexMeter`，后台任务前缀 `com.dongv.codexmeter` |
| 更新 | 永久关闭自动更新，防止定制版被覆盖 |

## 安装

下载本仓库的 ZIP 并完整解压，双击 `安装.command`。也可以通过终端安装：

```sh
git clone https://github.com/dongV-x/codex-meter.git
cd codex-meter
npm run install:local
```

安装需要 macOS 和 Node.js 24+。不需要运行 `npm install`，项目没有第三方 npm 依赖。

## 使用

已安装后，按 **⌘Q 完全退出 Codex，再从原图标打开**，等待约 5–10 秒。圆环在左侧导航栏底部、帮助/账号按钮上方。鼠标停留或键盘聚焦可看详情。启动助手仅在新启动且尚无用户输入的安全条件下尝试一次带本机调试参数的重开，不关闭正在工作的旧窗口。

重新安装可双击 `安装.command`，查看状态可双击 `查看状态.command`，卸载可双击 `卸载.command`。安装和卸载都不修改 Dock 或 Launchpad。

也可在项目目录执行：

```sh
npm test
npm run install:local
npm run status
npm run uninstall:local
```

支持 macOS 和 Node.js 24+，当前适配 `/Applications/ChatGPT.app`（应用 ID `com.openai.codex`）。后台运行文件复制到安装目录，不依赖项目文件一直打开。不要删除安装目录里的运行文件。

## 数据与限制

运行时仅通过 Codex app-server 读取额度，不读取项目、聊天内容或会话数据库；不记录账号 ID、邮箱、令牌或完整接口返回值。状态输出可能包含本机路径和额度，请勿直接公开。

显示依赖客户端内部侧栏结构和仅本机可访问的调试端口 `127.0.0.1:39222`。该端口有较高权限，不应转发或暴露给网络。Codex 更新后可能需要重新适配。本插件不是 OpenAI 官方插件。

本次保留上游安装与启动控制代码，移除历史快捷方式清理入口及卸载时清理其他组件的逻辑，独立命名界面节点和运行目录。原生启动助手来自已校验的上游发布包，保留原始字节；上游未随包提供该二进制的源文件，因此没有声称对其逐行源码审计。

上游归档 SHA256：`e41cbb00fd01b785eb0cac73a946115a35dd2d9a2410c196ec7287ce4b1737f8`。

上游说明保存在 `docs/UPSTREAM-*.md`，原始版权声明见 `LICENSE`。
