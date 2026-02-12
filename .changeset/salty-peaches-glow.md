---
'@feizk/logger': major
---

Complete rewrite of @feizk/logger

- Added 2 new log levels: `trace` and `fatal` (total 6 levels)
- Implemented structured JSON logging mode for production environments
- Created pluggable transport system for custom log outputs
- Added child logger support with prefix and context merging
- Removed Discord transport (moved to separate @feizk/logger-discord package)
- Removed chalk dependency for zero-dependency implementation
- Added silent mode to suppress console while keeping transports active
- Improved TypeScript types with LogEntry and Transport interfaces
- Added destroy() method for cleanup

**BREAKING CHANGE**: The logger API has been redesigned. Removed options `discord`, `formatTimestamp`, and `formatLog`. Added new options `timestamp`, `json`, `transports`, `prefix`, `context`, and `silent`. Discord transport is now available via separate package.
