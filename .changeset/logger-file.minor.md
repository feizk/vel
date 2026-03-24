---
'@feizk/logger-file': minor
---

## @feizk/logger-file

Added new file transport plugin for `@feizk/logger`.

### Features

- **Log Rotation**: Supports both size-based and date-based log rotation
  - Size-based: Rotate when file reaches configured max size (supports K, M, G units)
  - Date-based: Rotate based on date pattern (yyyy-MM-DD format)
- **Format Options**: Supports both text and JSON output formats
- **Custom Formatter**: Allows custom log formatting via callback function
- **Buffered Writing**: Efficient buffered writes with configurable flush intervals
- **Per-level Filtering**: Filter logs by level (trace, debug, info, warn, error, fatal)
- **Configurable Options**:
  - Custom file path
  - Append mode toggle
  - Buffer size configuration
  - Rotation max files limit
