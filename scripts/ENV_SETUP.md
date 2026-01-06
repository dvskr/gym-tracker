# Environment Variables Setup Guide

## Quick Summary

Your codebase uses **3 environment variable contexts**:

### 1. **Client App** → `gym-tracker/.env`
```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# Optional
EXPO_PUBLIC_EXERCISEDB_API_KEY=...
EXPO_PUBLIC_SENTRY_DSN=...
```

### 2. **Scripts (Admin Tools)** → `gym-tracker/scripts/.env.local`
```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Optional
EXPO_PUBLIC_EXERCISEDB_API_KEY=...
```

### 3. **Edge Functions** → Supabase Dashboard Secrets
```bash
# Set in Supabase Dashboard → Edge Functions → Secrets
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RAPID_API_KEY
```

---

## What Goes Where?

| Variable | Client `.env` | Scripts `.env.local` | Edge Functions | Notes |
|----------|---------------|---------------------|----------------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | ✅ Required | ✅ Required | ✅ Auto-injected | Public, safe to expose |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ✅ Required | ❌ Not needed | ✅ Auto-injected | Public, RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔴 **NEVER** | ✅ Required | ✅ Required | Full DB access - keep secret! |
| `EXPO_PUBLIC_EXERCISEDB_API_KEY` | ⚠️ Optional | ⚠️ Optional | ⚠️ Optional | For exercise library sync |
| `EXPO_PUBLIC_SENTRY_DSN` | ⚠️ Optional | ❌ Not needed | ❌ Not needed | Error tracking for client app |
| `OPENAI_API_KEY` | ❌ Not needed | ❌ Not needed | ✅ Required | AI features in Edge Functions |
| `RAPID_API_KEY` | ❌ Not needed | ❌ Not needed | ⚠️ Optional | Alternative to ExerciseDB key |

---

## Setup Instructions

### Step 1: Client App Setup

```bash
# 1. Copy the template
cd gym-tracker
cp env.template .env

# 2. Edit .env and add your keys
# REQUIRED:
EXPO_PUBLIC_SUPABASE_URL=https://zhsmmqaworfqffsadjsm.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...

# OPTIONAL:
EXPO_PUBLIC_EXERCISEDB_API_KEY=your-api-key
EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# 3. Start the app
npm start
```

### Step 2: Scripts Setup (Only if Running Admin Tasks)

```bash
# 1. Copy the template
cd gym-tracker/scripts
cp env.template .env.local

# 2. Edit .env.local and add your keys
EXPO_PUBLIC_SUPABASE_URL=https://zhsmmqaworfqffsadjsm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# 3. Run scripts
cd ..
npm run db:seed
npm run media:upload
```

### Step 3: Edge Functions Setup (Supabase Dashboard)

```bash
# 1. Go to Supabase Dashboard
https://app.supabase.com/project/YOUR_PROJECT/functions

# 2. Click "Edge Functions" → "Secrets"

# 3. Add these secrets:
OPENAI_API_KEY=sk-...your-openai-key...
RAPID_API_KEY=your-rapidapi-key

# Note: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY 
# are auto-injected by Supabase
```

---

## Security Rules

### ✅ DO:
- Use `EXPO_PUBLIC_` prefix for client-exposed variables
- Keep service role key in scripts/.env.local (gitignored)
- Rotate service role key if ever exposed
- Use EAS secrets for production builds
- Check .gitignore includes `.env*`

### 🔴 DON'T:
- **NEVER** put service role key in client app's .env
- **NEVER** commit .env files to git
- **NEVER** expose service role key in client code
- **NEVER** log sensitive keys to console
- **NEVER** share .env files with others

---

## Verification Checklist

```bash
# ✅ Check .gitignore contains .env
grep ".env" .gitignore

# ✅ Verify .env is not in git
git ls-files | grep .env
# Should return nothing

# ✅ Test client app loads
npm start
# Should start without errors

# ✅ Test scripts work (optional)
npm run db:check
# Should connect to database
```

---

## Troubleshooting

### "Missing environment variable" error
```bash
# Solution: Make sure .env exists and has required variables
cp env.template .env
# Edit .env and add your keys
```

### Scripts can't find SUPABASE_SERVICE_ROLE_KEY
```bash
# Solution: Create scripts/.env.local
cd scripts
cp env.template .env.local
# Edit .env.local and add service role key
```

### "Unauthorized" errors in app
```bash
# Check: Using correct anon key (not service role key)
# Check: RLS policies are set up in Supabase
```

### Changes not taking effect
```bash
# Restart Expo with cache clear
npx expo start -c
```

---

## Where to Get Keys

### Supabase Keys
1. Go to https://app.supabase.com
2. Select project
3. Settings → API
4. Copy keys:
   - URL: Copy "Project URL"
   - Anon Key: Copy "anon public"
   - Service Role: Copy "service_role" (⚠️ scripts only!)

### ExerciseDB API Key
1. Go to https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
2. Sign up / Log in
3. Subscribe (free tier available)
4. Copy API key from dashboard

### Sentry DSN
1. Go to https://sentry.io
2. Create project
3. Settings → Client Keys (DSN)
4. Copy DSN

### OpenAI API Key
1. Go to https://platform.openai.com
2. API Keys → Create new key
3. Copy and save (shown only once)

---

## Template Files

- **Client App Template:** `gym-tracker/env.template`
- **Scripts Template:** `gym-tracker/scripts/env.template`
- **Both are committed to git** (safe, no actual keys)
- **Actual .env files are gitignored** (contain real keys)

---

## Quick Commands

```bash
# Setup client app
cp env.template .env && nano .env

# Setup scripts
cd scripts && cp env.template .env.local && nano .env.local && cd ..

# Check if .env exists
ls -la | grep .env

# Verify gitignore
cat .gitignore | grep env

# Start app
npm start

# Test scripts
npm run db:check
```

