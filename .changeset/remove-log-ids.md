---
'@feizk/logger': minor
'@feizk/logger-discord': minor
---

Remove log entry ID functionality

- Removed `id` and `references` fields from `LogEntry`
- Removed `LogMeta` interface
- Removed `EntryIdOptions` interface
- Removed ID display from Discord embeds
- Simplified logger by removing log association features
