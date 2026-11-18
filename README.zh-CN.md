# DS Chat

[English](README.md) | **简体中文**

基于 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) 开发的
Android 客户端，在其基础上用 Capacitor 封装成 App，并做了移动端改造。

> 非官方项目，与 DeepSeek 无关联。

## 功能

- 流式对话，支持 Markdown、代码高亮、KaTeX 公式和 Mermaid 图表
- 图片与文件附件、分享为图片、表格与图表导出
- 导入/导出 DeepSeek 历史对话 ZIP 包
- 语音输入与文本朗读
- API Key 保存在 Android Keystore（AES-GCM），对话只留在本机
- 浅色 / 深色 / 跟随系统主题，中英文界面

## 结构

| 路径 | 说明 |
| --- | --- |
| `app/` | 基于 chat-demo 改造的 Web 前端（React + TypeScript + rspack） |
| `poc/` | Capacitor 8 Android 壳与原生插件 |
| `branding/` | 应用图标、启动页与吉祥物素材 |

## 构建

```bash
cd app && npm install && npm run build
cd ../poc && rsync -a --delete ../app/dist/ www/ && npx cap sync android
cd android && ./gradlew assembleDebug
```

## 许可

MIT License，见 [LICENSE](LICENSE)。上游版权声明与修改说明见 [NOTICE](NOTICE)。
