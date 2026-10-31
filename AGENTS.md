# Codex Meter 项目约定

- 本项目是 dongV 的 macOS 本机侧栏额度插件。上游为 Lorie7813/codex-usage-card，保留 MIT 许可证与来源。
- 额度口径唯一入口是 `agent.cjs` 的 `formatRateLimits`，主窗口、通知和定时刷新统一使用；套餐名不能决定一个不存在的窗口，缺失数据不能视作 100%。
- 重置时间统一为 `Asia/Shanghai`。账号切换清空旧窗口；失败或超过 150 秒的读数必须变灰。
- 安装目录仅使用 `~/Library/Application Support/CodexMeter`，任务前缀 `com.dongv.codexmeter`，界面命名 `__dongvCodexMeter` 和 `dongv-codex-meter-*`。
- 不修改应用包、签名、账号配置、Dock/Launchpad 或其他插件；自动更新永久禁用。
- 安装不得关闭现有工作窗口。启动助手只处理符合安全条件的新启动，不放宽上游输入活动和冷却检查。
- 验证使用 `npm test`；真实额度检查只输出格式化结果，不打印或保存完整账号响应、密钥或登录凭据。安装结果与实际界面显示必须分别报告，未现场验证不得声称已显示。
