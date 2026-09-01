# Changelog

## [Unreleased]

## [0.4.2] - 2026-09-01

### Fixed

- ChatGPT full-history pagination now runs in the page context by cloning the provider's authenticated request; current live HARs showed direct isolated-script requests returning `401` while page requests returned `200`.
- ChatGPT page captures are validated in the isolated bridge and marked full only after all previous-page cursors have completed.
- Gemini extraction now waits for the expanded RPC capture instead of returning the initial ten-turn response during a race.
- Browser regression coverage now reproduces ChatGPT's page-context `200` versus isolated-context `401` behavior.

## [0.4.1] - 2026-09-01

### Fixed

- ChatGPT history requests now use the live provider's ten-turn page size and follow previous-page cursors instead of sending rejected oversized requests.
- Gemini now reuses the page's authenticated RPC payload to request expanded history without scrolling.
- Complete Gemini captures are no longer overwritten by shorter lazy-loaded chunks.
- The popup distinguishes partial structured history from verified full history and DOM fallback.
- Browser regression fixtures now exercise twelve ChatGPT pages and Gemini's initial-short-chunk/expanded-response flow.

## [0.4.0] - 2026-09-01

### Added

- Browser-level Playwright regression fixtures covering 120-message ChatGPT, Gemini, and Claude conversations without scrolling.
- A browser-level DOM-fallback scenario for long conversations when structured extraction fails.
- Normalized code block, citation, attachment, and artifact metadata in JSON capsules and rendered exports.

### Changed

- Markdown, HTML, and plain-text serializers now preserve rich message metadata where the provider exposes it.
- ChatGPT code/canvas messages are associated with the visible assistant response as artifacts instead of becoming fake standalone turns.
- Citation URLs are restricted to safe web protocols, and signed attachment download URLs are not retained.

## [0.3.1] - 2026-09-01

### Fixed

- ChatGPT full-history extraction now uses the current plural conversation endpoint, parses its flat `messages` response, and follows previous-page cursors for long chats.
- Gemini structured captures are no longer discarded by an invalid cross-world `event.source` identity check.
- The popup now reports `full history` or `DOM fallback` so extraction failures are visible during testing.

## [0.3.0] - 2026-09-01

### Added

- Versioned Universal AI Conversation JSON capsules with legacy JSON import support.
- Local capsule import and schema validation.
- Message preview and per-message selection before export or handoff.
- Approximate context token and byte-size estimates.
- Copy for AI with an explicit untrusted-transcript boundary and no automatic submission.
- Full-history ChatGPT and Gemini extraction with DOM fallback.

### Changed

- Redesigned the extension popup with clearer conversation status, visual format selection, improved export feedback, and local-processing guidance.
- JSON exports now use capsule schema version 1.
- Bumped the extension version to 0.3.0.

## [0.2.0] - 2026-08-31

### Added

- Claude current conversation export.
- API-first Claude extraction that does not depend on scrolling when the conversation endpoint is available.
- Active-branch selection for edited or regenerated Claude conversations.
- File-name labels for Claude message attachments.

### Changed

- Content-script extraction now supports asynchronous provider adapters.
- Claude falls back to visible page content if its conversation response cannot be requested.
- Documentation and extension messaging now include Claude support.

## [0.1.0]

### Added

- ChatGPT current conversation export.
- Gemini current conversation export.
- Markdown export.
- HTML export.
- JSON export.
- Plain-text export.
- Local-only browser processing.
