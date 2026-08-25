# Universal AI Chat Exporter

Export your ChatGPT and Gemini conversations to Markdown, HTML, JSON, or plain text — directly from your browser.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)
![License](https://img.shields.io/badge/license-MIT-yellow)
![Privacy](https://img.shields.io/badge/privacy-local--only-brightgreen)
![Browsers](https://img.shields.io/badge/browsers-Chrome%20%7C%20Edge-orange)

Universal AI Chat Exporter is a free and open-source browser extension for saving the conversation currently open in ChatGPT or Gemini. It runs the export locally, requires no backend, and does not upload your conversations.

## Preview

![Universal AI Chat Exporter preview](./ss.png)

The popup detects the supported conversation open in the active tab and lets you choose an export format.

## Features

- Export the current conversation.
- Support for ChatGPT and Gemini.
- Markdown export.
- Standalone HTML export for offline viewing.
- JSON export for structured data.
- Plain-text export.
- Local-only processing.
- Simple popup interface.
- Safe cross-platform filename generation.
- No backend or additional login.

## Supported platforms

| Platform | Status |
| --- | --- |
| ChatGPT | ✅ Supported |
| Gemini | ✅ Supported |
| Claude | 🚧 Coming soon |

AI platforms change their page structure over time. If an update breaks conversation extraction, please report it through [GitHub Issues](https://github.com/Agelakz/universal-ai-chat-exporter/issues).

## Export formats

| Format | Best for |
| --- | --- |
| Markdown | Notes, Obsidian, documentation, and version control |
| HTML | Standalone offline viewing |
| JSON | Structured data, integrations, and further processing |
| Plain text | Simple and portable archives |

## Installation

### Install from a GitHub release

1. Download the ZIP from the [latest release](https://github.com/Agelakz/universal-ai-chat-exporter/releases/latest).
2. Extract the ZIP.
3. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extracted folder that directly contains `manifest.json`—not its parent folder.
7. Refresh any ChatGPT or Gemini tabs that were already open.

> The extension is not yet published on the Chrome Web Store or Microsoft Edge Add-ons.

## Usage

1. Open a conversation in ChatGPT or Gemini.
2. Make sure the messages you want to save are loaded on the page.
3. Click the extension icon.
4. Choose an export format.
5. Click **Export percakapan**.
6. Choose where to save the file when prompted by your browser.

## Privacy

- Conversation content is processed locally in your browser.
- The project has no backend.
- No analytics or telemetry is collected.
- The extension does not read or collect passwords, cookies, or authentication tokens.
- Chat content is not sent to a project or third-party server.
- An export file is created only after you click the export button.

For more details, see [PRIVACY.md](./PRIVACY.md).

## Permissions

Universal AI Chat Exporter requests only the permissions used by its current architecture:

| Permission | Why it is needed |
| --- | --- |
| `activeTab` | Lets the popup communicate with the currently active supported tab after you open the extension. |
| `downloads` | Saves the generated export file through the browser's download system. |
| `storage` | Remembers your selected export format locally. |
| `https://chatgpt.com/*` | Runs the conversation extractor on ChatGPT. |
| `https://chat.openai.com/*` | Supports the legacy ChatGPT domain. |
| `https://gemini.google.com/*` | Runs the conversation extractor on Gemini. |

There is no `<all_urls>` access, and Claude is not included in the active host permissions for v0.1.0.

## Known limitations

- Only the currently open conversation is exported.
- Only messages loaded on the page can be captured.
- Binary attachments are not downloaded.
- Complex interactive content may use a text fallback.
- Provider UI updates can temporarily break extraction.
- Claude is not supported in v0.1.0.

## Roadmap

- [x] ChatGPT support
- [x] Gemini support
- [x] Markdown, HTML, JSON, and plain-text exports
- [ ] Claude support
- [ ] Improved rich-content preservation
- [ ] Additional AI providers

## Development

The extension uses plain JavaScript and Chrome Extension Manifest V3. It has no backend and requires no build step.

```bash
git clone https://github.com/Agelakz/universal-ai-chat-exporter.git
cd universal-ai-chat-exporter
```

Open `chrome://extensions` or `edge://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the cloned repository folder. Refresh the supported provider page after changing a content script.

## Contributing

Issues and pull requests are welcome. For selector bugs, include the platform, browser version, extension version, reproduction steps, and—if useful—a screenshot with personal information removed. Never include cookies, tokens, credentials, or sensitive conversation content.

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting a pull request.

## Acknowledgements

The local development baseline used the MIT-licensed ChatGPT Exporter by pionxzh as an upstream research reference. Universal AI Chat Exporter uses a separate, minimal implementation; the upstream reference source is not included in repository commits or release packages.

## License

Released under the [MIT License](./LICENSE).
