# DS Chat

**English** | [简体中文](README.zh-CN.md)

An unofficial Android client for the DeepSeek API, built on top of
[deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo) and wrapped
with Capacitor.

> Not affiliated with, endorsed by, or sponsored by DeepSeek.

## Features

- Streaming chat with Markdown, code highlighting, KaTeX and Mermaid
- Image and file attachments, share-as-image, table and diagram export
- Import/export of DeepSeek history ZIP archives
- Speech input and text-to-speech playback
- API key kept in the Android Keystore (AES-GCM); chats stay on the device
- Light / dark / system theme, Chinese and English UI

## Structure

| Path | Description |
| --- | --- |
| `app/` | Web app based on chat-demo (React + TypeScript + rspack) |
| `poc/` | Capacitor 8 Android shell and native plugins |
| `branding/` | App icon, splash screen and mascot assets |

## Build

```bash
cd app && npm install && npm run build
cd ../poc && rsync -a --delete ../app/dist/ www/ && npx cap sync android
cd android && ./gradlew assembleDebug
```

## License

MIT — see [LICENSE](LICENSE). Upstream copyright and modification notes are in
[NOTICE](NOTICE).
