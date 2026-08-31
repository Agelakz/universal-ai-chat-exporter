# Changelog

## [Unreleased]

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
