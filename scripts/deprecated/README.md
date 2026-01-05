# Deprecated Scripts

These scripts are no longer actively used and are kept for reference only.
Review periodically and delete if confirmed not needed.

## Why Deprecated

| Script | Reason |
|--------|--------|
| `verify-batch3-ids.ts` | One-time batch verification - already completed |
| `verify-batch4-ids.ts` | One-time batch verification - already completed |
| `add-truly-missing.ts` | One-time exercise addition - already completed |
| `match-renamed-exercises.ts` | One-time exercise matching - already completed |
| `select-400-exercises.ts` | One-time selection script - already completed |
| `generate-remaining-urls-sql.ts` | One-time SQL generation - already completed |
| `aggressive-logger-fix.ts` | One-time logger fix - replaced by proper logger |
| `replace-console-logs.ps1` | One-time cleanup - replaced by ESLint rules |
| `upload-remaining-37.ts` | One-time upload - already completed |
| `quick-update-gifs.ts` | Superseded by `media/update-gif-urls.ts` |
| `update-gif-urls-new.ts` | Superseded by `media/update-gif-urls.ts` |
| `check-website-for-gifs.ts` | One-time website check - already completed |

## Before Deleting

1. Check if any other scripts depend on these
2. Verify functionality is covered elsewhere
3. Check git history for context
4. Backup if potentially useful for reference

## Safe to Delete After

- 30 days with no usage
- Confirmation that functionality exists elsewhere
- No dependencies from other scripts

