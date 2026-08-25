# Universal AI Chat Exporter

A free and open-source browser extension for exporting the AI conversation currently open in your browser. Processing happens locally on your device.

## Supported platforms

| Platform | Status |
| --- | --- |
| ChatGPT | ✅ Supported |
| Gemini | ✅ Supported |
| Claude | 🚧 Coming Soon |

Claude is planned for a future release and is not active in v0.1.0.

## Export formats

- Markdown
- HTML
- JSON
- Plain text

## Features

- Export the current conversation.
- Local-only processing with no backend.
- No additional login required.
- Does not read cookies or authentication tokens.
- Downloads the generated file directly to your device.

## Installation

1. Download the source or release ZIP.
2. Extract the ZIP.
3. Open `chrome://extensions` (or `edge://extensions`).
4. Enable **Developer mode**.
5. Click **Load unpacked**.
6. Select the extension folder containing `manifest.json`.
7. Refresh the ChatGPT or Gemini page.
8. Open a conversation and use the extension popup.

## Usage

Open a ChatGPT or Gemini conversation, scroll until the messages you need are loaded, open the extension popup, choose a format, and click **Export percakapan**.

## Privacy

All conversation processing happens locally. The extension has no backend or telemetry, sends no chat data elsewhere, and does not read cookies or tokens. See [PRIVACY.md](PRIVACY.md).

## Known limitations

- Only the currently open conversation and messages loaded in the page are exported.
- Platform UI changes can break DOM selectors.
- Binary attachments are not downloaded.
- Claude is not supported in v0.1.0.

## Roadmap

### v0.1.0

- ChatGPT support
- Gemini support
- Markdown, HTML, JSON, and TXT export

### Planned

- Claude support
- Better rich-content preservation
- Additional AI platforms

## Development

The project uses plain JavaScript and Chrome Extension Manifest V3. There is no build step: load the repository folder as an unpacked extension. Test changes on both supported providers and in every export format.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## Acknowledgements

The local baseline includes `source code exported ai.txt` as an upstream research reference to the MIT-licensed ChatGPT Exporter by pionxzh. This extension uses a separate, minimal implementation; the reference file is excluded from release packages and repository commits by default.

## License

Licensed under the [MIT License](LICENSE).
