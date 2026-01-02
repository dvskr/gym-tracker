# Download Missing GIFs from ExerciseDB API

## Overview

This script downloads the 23 missing exercise GIFs from the ExerciseDB API (via RapidAPI) and uploads them to your Supabase storage.

---

## Prerequisites

### 1. Get RapidAPI Key

1. Go to https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
2. Click **Subscribe to Test**
3. Choose **Basic Plan** (FREE - 30 requests/month)
4. Copy your **X-RapidAPI-Key**

### 2. Add API Key to .env

Open your `.env` file and add:

```env
RAPIDAPI_KEY=your_rapidapi_key_here
```

---

## What This Script Does

1. ✅ Downloads 23 GIF files from ExerciseDB API
2. ✅ Uploads them to Supabase `exercise-gifs` bucket
3. ✅ Updates database `gif_url` for each exercise
4. ✅ Uses UUID filenames (`{exercise-id}.gif`)
5. ✅ Rate limits API requests (1 per second)

---

## Exercises That Will Be Fixed

The script will download and fix these 23 exercises:

- barbell lying close-grip triceps extension
- barbell standing front raise over head
- cable cross-over reverse fly
- cable kneeling crunch
- chest press machine
- elbow-to-knee
- handstand push-up
- kettlebell pistol squat
- leg pull in flat bench
- lever kneeling twist
- lever seated reverse fly (parallel grip)
- muscle up
- oblique crunch
- pec deck machine
- rear decline bridge
- resistance band hip thrusts on knees
- reverse fly machine
- reverse hyperextension machine
- seated row machine
- self assisted inverse leg curl
- shoulder press machine
- superman push-up
- t-bar row machine

---

## Exercises That Cannot Be Downloaded

These 3 exercises don't have `external_id` and cannot be downloaded from the API:

- air bike
- belt squat
- rowing machine

**Options for these 3:**
1. Find GIFs manually
2. Deactivate them (recommended)

---

## Run the Script

```bash
npm run gifs:download-missing
```

---

## Expected Output

```
🔽 DOWNLOAD MISSING GIFS FROM EXERCISEDB API
════════════════════════════════════════════════════════════════════════════════

📋 Exercises to process: 23
🔑 API Host: exercisedb.p.rapidapi.com
📦 Supabase bucket: exercise-gifs

════════════════════════════════════════════════════════════════════════════════

[ 1/23] barbell lying close-grip triceps extension
      External ID: 0056
      📡 Fetching from API... ✓
      🔗 GIF URL: https://...
      🔽 Downloading GIF... ✓ (234.5 KB)
      ☁️  Uploading as {uuid}.gif... ✓
      💾 Updating database... ✓
      ✅ SUCCESS

[Continues for all 23 exercises...]

════════════════════════════════════════════════════════════════════════════════
📊 FINAL RESULTS
════════════════════════════════════════════════════════════════════════════════
✅ Success: 23/23
❌ Failed: 0/23

✅ Successfully downloaded and uploaded:
   • 23 GIF files
   • Updated 23 database records

⚠️  REMINDER: 3 exercises cannot be downloaded from API:
   • air bike (no external_id)
   • belt squat (no external_id)
   • rowing machine (no external_id)
   → Consider deactivating these or finding GIFs manually

🎉 Done!
```

---

## After Running

### Result:
- **Before:** 397 exercises with working GIFs
- **After:** 420 exercises with working GIFs ✅
- **Still missing:** 3 exercises (air bike, belt squat, rowing machine)

### Final Status:
- **Total active:** 423 exercises
- **Working GIFs:** 420 (99.3%)
- **Missing GIFs:** 3 (0.7%)

---

## Troubleshooting

### Error: "Missing RAPIDAPI_KEY"
- Add `RAPIDAPI_KEY=your-key` to `.env` file

### Error: "HTTP 403" or "API rate limit"
- You've exceeded the free tier (30 requests/month)
- Wait for next month or upgrade plan

### Error: "No gifUrl in API response"
- The external_id doesn't exist in ExerciseDB
- Consider deactivating that exercise

### Error: "Upload failed"
- Check Supabase storage permissions
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct

---

## What to Do with the 3 Remaining Exercises

Run this SQL to deactivate them:

```sql
UPDATE exercises 
SET is_active = false 
WHERE id IN (
  '45fd4997-1cea-48d2-aab5-90e6ab24602c', -- air bike
  '84328146-9983-4fe8-b6c9-55567fd53d28', -- belt squat
  'a73f0c66-8638-4a12-a0cc-a653623765d8'  -- rowing machine
);
```

**Result: 420 active exercises, all with working GIFs** ✅

---

## Files Created

- `scripts/download-missing-gifs.ts` - Main download script
- `scripts/get-exercise-download-data.ts` - Helper to get exercise data
- `scripts/exercise-download-data.json` - Exercise data for reference
- `scripts/DOWNLOAD_GIFS_README.md` - This file

---

## API Information

- **API:** ExerciseDB (RapidAPI)
- **Endpoint:** `/exercises/exercise/{id}`
- **Free Tier:** 30 requests/month
- **Response:** Exercise data including `gifUrl`

---

## Success! 🎉

After running this script successfully:
1. 23 exercises will have working GIFs
2. Your app will display 420 exercises with images
3. Only 3 exercises remain without GIFs (optional to deactivate)

