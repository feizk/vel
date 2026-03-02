---
'@feizk/logger-discord': minor
'@feizk/logger': minor
---

## @feizk/logger-discord

- Added new Discord transport plugin for logger
  - Supports customizable Discord webhook URL
  - Configurable username and avatar
  - Per-level log filtering with color-coded embeds
  - Custom formatter and payload support
  - Context inclusion in embeds

## @feizk/logger

- Improved argument formatting with special type handling:
  - Error objects now include name, message, and stack trace
  - BigInt values display with 'n' suffix
  - Symbol values display with toString()
  - Circular references handled safely in objects
- Exported utils module for external use

