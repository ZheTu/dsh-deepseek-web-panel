# dsh-deepseek-web-panel

English | [中文](#中文说明)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) desktop plugin that adds a
**Web Chat** entry to the left sidebar. Clicking it embeds <https://chat.deepseek.com/> in the
central panel, so the DeepSeek web chat runs inside the harness window instead of a separate
browser.

> **Unofficial community plugin.** It uses the same desktop `<webview>` guest bridge as the shipped
> right-Sidebar Browser. That bridge is internal to the DSH desktop shell and may change in future
> releases. This project is not affiliated with DeepSeek.

## Requirements

- **DeepSeek Harness Desktop** app. A normal browser Web GUI cannot embed the page: DeepSeek
  serves `Content-Security-Policy: frame-ancestors 'none'`, so an iframe is refused.
- Tested with DSH `0.2.1-rc.2` on Windows.

## Install

1. Clone this repository (or download its source).
2. Install it as a bundle into the current DSH profile, for example with the `plugin_manager` tool:

   ```text
   plugin_manager install_bundle <absolute path to this repository>
   ```

   The same can be done from **Settings → Plugins**, choosing to install from a directory.
3. A **Web Chat** entry appears in the left sidebar below the global panel entries
   (“Automations” / 自动化任务). If it does not appear, restart the desktop app.

## Usage

- Click **Web Chat**; log in inside the page on first use.
- A slim toolbar above the page has a reload button.
- Click a session in the left sidebar to return to the conversation.

## Limitations

- Desktop app only.
- The guest uses a process-lifetime storage partition, so **you have to log in again after
  restarting DSH**.
- Popups, downloads, device permissions, and navigation to the DSH host address are blocked by the
  desktop guest policy.
- Selecting the entry again remounts the panel, which reloads the page.
- DeepSeek's web app is not covered by this plugin's compatibility promise and may change at any
  time.

## How it works

- Registers a `main` panel key (`deepseek-web`) and a matching `sidebar.panellist` entry, so the
  host sidebar renders the row and the layout service switches the central panel.
- Creates an Electron `<webview>` guest with a lease obtained from the desktop preload bridge
  `globalThis.dshDesktop.browser` — the same bridge the shipped Sidebar Browser uses.
- Loads `https://chat.deepseek.com/`; the desktop main process applies its fixed guest sandbox
  policy (HTTP(S) only, no downloads, no permission grants, no DSH-origin navigation).

## License

[MIT](LICENSE)

---

## 中文说明

一个 DeepSeek Harness **桌面版**插件：在左侧栏增加常驻的「网页对话」入口，点击后在中间主区域
嵌入 <https://chat.deepseek.com/>，不用再单独打开浏览器。

> 非官方社区插件。它使用 DSH 桌面壳内置的 `<webview>` guest 桥（与自带右侧栏 Browser 相同的
> 机制），该接口属于桌面壳内部实现，未来版本可能变化。本项目与 DeepSeek 官方无关。

### 安装

1. 克隆本仓库（或下载源码）。
2. 用 `plugin_manager` 把它装进当前 DSH profile：

   ```text
   plugin_manager install_bundle <本仓库的绝对路径>
   ```

   也可以在 **设置 → 插件** 中从目录安装。
3. 左侧栏「自动化任务」下方会出现「网页对话」。如果没有出现，重启桌面应用。

### 使用

- 点击「网页对话」，首次进入时在页面内登录 DeepSeek。
- 页面上方有一条细工具栏，右侧是刷新按钮，可随时重新加载。
- 点击左侧栏的会话即可切回「对话」。

### 限制

- 仅桌面版可用。
- guest 使用进程内存储分区：**重启 DSH 后需要重新登录**。
- 桌面 guest 策略会禁止弹窗、下载、设备权限，以及导航到 DSH 自身地址。
- 每次点选入口都会重新挂载面板并重新加载页面。
- DeepSeek 网页端不在本插件的兼容承诺内，可能随时变化。

### 实现

- 注册 `main` 面板 key（`deepseek-web`）和对应的 `sidebar.panellist` 条目，左侧栏行由 DSH
  自己渲染，点击由布局服务切换主面板。
- 通过桌面窗口的 preload 桥 `globalThis.dshDesktop.browser` 申请 guest 租约，创建 Electron
  `<webview>`；加载 `https://chat.deepseek.com/`，沙箱策略由桌面主进程统一施加。

### 许可

[MIT](LICENSE)
