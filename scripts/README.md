# Scripts

Utility scripts for database management, media processing, and development.

## Directory Structure

```
scripts/
├── db/           # Database operations
├── media/        # GIF/image processing
├── analysis/     # Code analysis & reporting
├── dev/          # Development utilities
├── lib/          # Shared utilities
├── data/         # Generated data files
└── deprecated/   # Old scripts (review before deleting)
```

---

## Database Scripts (`scripts/db/`)

| Script | Description |
|--------|-------------|
| `seed-exercises.ts` | Seed exercise database from ExerciseDB API |
| `audit-schema.ts` | Audit database schema for issues |
| `check-database.ts` | Check database connectivity and health |
| `assign-measurement-types.ts` | Assign measurement types to exercises |
| `set-measurement-types.ts` | Set specific measurement types |
| `verify-measurement-types.ts` | Verify measurement type assignments |

**SQL Files:**
- `broken-exercises.sql` - Fix broken exercise records
- `check-pr-settings.sql` - Verify PR settings
- `clear-user-prs.sql` - Clear user personal records
- `update-remaining-37-urls.sql` - Update remaining GIF URLs

---

## Media Scripts (`scripts/media/`)

### Downloading
| Script | Description |
|--------|-------------|
| `download-gifs.ts` | Main GIF download script |
| `download-exercise-gifs.ts` | Download exercise-specific GIFs |
| `download-missing-gifs.ts` | Download only missing GIFs |
| `download-new-gifs.ts` | Download newly added exercise GIFs |
| `download-and-upscale-gifs.ts` | Download and upscale GIF quality |

### Uploading
| Script | Description |
|--------|-------------|
| `upload-to-supabase.ts` | Upload files to Supabase storage |
| `upload-to-supabase-storage.ts` | Batch upload to storage |
| `upload-thumbnails.ts` | Upload thumbnail images |
| `upload-local-gifs.ts` | Upload local GIF files |
| `upload-new-gifs.ts` | Upload newly processed GIFs |

### Thumbnails
| Script | Description |
|--------|-------------|
| `generate-thumbnails.ts` | Generate thumbnail images |
| `generate-all-thumbnails.ts` | Generate all thumbnails |
| `generate-hq-thumbnails.ts` | Generate high-quality thumbnails |

### Verification
| Script | Description |
|--------|-------------|
| `verify-gif-coverage.ts` | Verify all exercises have GIFs |
| `verify-all-gifs-and-thumbnails.ts` | Full media verification |
| `verify-thumbnail-sizes.ts` | Check thumbnail dimensions |
| `verify-supabase-quality.ts` | Verify uploaded media quality |

### Maintenance
| Script | Description |
|--------|-------------|
| `cleanup-storage.ts` | Clean up unused storage files |
| `fix-gif-urls.ts` | Fix broken GIF URLs |
| `fix-broken-urls.ts` | Fix all broken URLs |
| `find-missing-gifs.ts` | Find exercises without GIFs |
| `find-orphaned-gifs.ts` | Find GIFs not linked to exercises |

---

## Analysis Scripts (`scripts/analysis/`)

| Script | Description |
|--------|-------------|
| `find-console-logs.ts` | Find all console.log statements |
| `analyze-exercises.ts` | Analyze exercise library |
| `analyze-inactive-exercises.ts` | Find inactive/unused exercises |
| `analyze-remaining-exercises.ts` | Analyze remaining work |
| `export-exercises.ts` | Export exercise data |
| `export-exercises-report.ts` | Generate exercise report |
| `compare-files.ts` | Compare file differences |
| `compare-with-strong.ts` | Compare with Strong app data |
| `smart-comparison.ts` | Smart exercise comparison |

---

## Development Scripts (`scripts/dev/`)

| Script | Description |
|--------|-------------|
| `test-exercisedb-api.ts` | Test ExerciseDB API connectivity |
| `verify-exercise-library.ts` | Verify exercise data integrity |
| `find-exercise-ids.ts` | Find specific exercise IDs |
| `get-accurate-counts.ts` | Get accurate exercise counts |
| `detailed-diagnostic.ts` | Run detailed diagnostics |
| `aggressive-logger-fix.ts` | Fix logger issues |

---

## Running Scripts

### Using npx tsx (recommended)
```bash
# Database
npx tsx scripts/db/seed-exercises.ts
npx tsx scripts/db/audit-schema.ts

# Media
npx tsx scripts/media/download-gifs.ts
npx tsx scripts/media/verify-gif-coverage.ts

# Analysis
npx tsx scripts/analysis/find-console-logs.ts
npx tsx scripts/analysis/analyze-exercises.ts

# Development
npx tsx scripts/dev/test-exercisedb-api.ts
```

### Using npm scripts
```bash
npm run db:seed
npm run db:audit
npm run media:verify
npm run analyze:logs
```

---

## Environment Variables

Required in `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Server-side only
```

---

## Adding New Scripts

1. Place in appropriate directory (`db/`, `media/`, `analysis/`, `dev/`)
2. Use `lib/supabase-admin.ts` for Supabase operations
3. Add entry to this README
4. Add npm script if commonly used

---

## Deprecated Scripts

Scripts in `deprecated/` are scheduled for removal. Before deleting:
1. Check git history for last usage
2. Ensure functionality is covered elsewhere
3. Backup if needed for reference
