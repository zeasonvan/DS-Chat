# DS Chat

基于 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) 开发的 Android 客户端。
该项目受这个开源 Web Demo 启发，在其基础上用 Capacitor 封装成 App，并做了移动端改造。

> 非官方项目，与 DeepSeek 无关联。

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
