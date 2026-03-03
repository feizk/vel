# @feizk/logger-discord

## 2.0.1

### Patch Changes

- ebda658: (Changeset Bug / Fix?)
- Updated dependencies [ebda658]
  - @feizk/logger@2.0.1

## 2.0.0

### Minor Changes

- 95425f7: ## @feizk/logger-discord
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

### Patch Changes

- Updated dependencies [95425f7]
  - @feizk/logger@2.1.0
