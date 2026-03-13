---
"@feizk/logger": minor
"@feizk/logger-discord": minor
---

Add a changeset for the new optional log entry ID/reference feature and Discord transport support.

## @feizk/logger

- Add optional `id` and `references` metadata on log entries.
- Add opt-in entry ID configuration and helpers for metadata-aware logging and ID lookup.
- Include ID/reference metadata in logger output formatting paths.

## @feizk/logger-discord

- Expose log ID/reference metadata in Discord transport formatting/custom payload typing.
- Render ID/reference fields in Discord embeds when metadata is present.
