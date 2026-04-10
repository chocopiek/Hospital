# Hospital IoT Monitoring - Deployment Guide

This guide walks you through deploying the Hospital IoT Monitoring application to **Vercel** (frontend + serverless API) and **Supabase** (database).

## Prerequisites

- Node.js 18+ installed
- GitHub account
- Vercel account (free tier available)
- Supabase account (free tier available)

## Step 1: Create Supabase Project

### 1.1 Create a new Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Enter project name: `hospital-iot-monitoring`
4. Choose region closest to your hospital
5. Create a secure password for the database
6. Wait for project creation (2-3 minutes)

### 1.2 Get your API Keys

1. In Supabase dashboard, go to **Project Settings → API**
2. Copy these keys:
   - **Project URL** (SUPABASE_URL) - looks like `https://xxxx.supabase.co`
   - **Service Role Key** (SUPABASE_SERVICE_KEY) - use for backend only
   - **Anon Key** (VITE_SUPABASE_ANON_KEY) - use for frontend

### 1.3 Create database schema

1. In Supabase, go to **SQL Editor** on the left sidebar
2. Click "New Query"
3. Copy the entire content from `supabase-schema.sql` in this repository
4. Paste it into the SQL editor
5. Click "Run" to create all tables, indexes, and RLS policies

**Expected output:**
```
Query executed successfully. Created 44 rows.
```

## Step 2: Set Up Vercel Deployment

### 2.1 Push code to GitHub

1. Initialize git (if not already done):
   ```bash
   cd d:/Document/Project/Hospital
   git init
   git add .
   git commit -m "Initial Hospital IoT Monitoring project"
   ```

2. Create a new GitHub repository:
   - Go to [github.com/new](https://github.com/new)
   - Name it `hospital-iot-monitoring`
   - Click "Create repository"

3. Push to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/hospital-iot-monitoring.git
   git branch -M main
   git push -u origin main
   ```

### 2.2 Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Select "Import Git Repository"
4. Search for `hospital-iot-monitoring`
5. Click "Import"

### 2.3 Set Environment Variables in Vercel

1. In Vercel project settings, go to **Environment Variables**
2. Add these variables:

```
Name: SUPABASE_URL
Value: https://your-project.supabase.co

Name: SUPABASE_SERVICE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI...

Name: VITE_SUPABASE_URL
Value: https://your-project.supabase.co

Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI...

Name: NODE_ENV
Value: production
```

**Important:** Don't share these keys! They're sensitive!

### 2.4 Deploy

1. After adding environment variables, click "Deploy"
2. Wait for build to complete (2-5 minutes)
3. You'll get a live URL like: `https://hospital-iot-xxx.vercel.app`

## Step 3: Test the Deployment

### 3.1 Test API endpoints

Open your browser and test these URLs:

```
# Check if API is working
GET https://your-vercel-url.app/api/devices

# Should return empty array initially []

# Get stats
GET https://your-vercel-url.app/api/stats

# Should return:
{
  "totalBeds": 0,
  "onlineDevices": 0,
  "criticalAlerts": 0,
  "warningAlerts": 0,
  "uptime": "NaN%"
}
```

### 3.2 Test frontend

Open your browser: `https://your-vercel-url.app`

You should see the Hospital IoT Dashboard with:
- Empty device list (no ESP32 connected yet)
- Dashboard showing "0 beds", "0 online"
- Alert management page (empty)
- Settings page for managing patients

## Step 4: Migrate Data (Optional)

If you have existing data in SQLite, export it:

```bash
# Export devices from SQLite
sqlite3 hospital.db "SELECT * FROM devices;" > devices.csv

# Then import to Supabase using psql or the UI
```

## Step 5: Connect ESP32 Devices

### 5.1 Update ESP32 firmware

In your ESP32 code, update the API endpoint:

```cpp
// OLD (local development)
// String url = "http://192.168.x.x:3001/api/data";

// NEW (production on Vercel)
String url = "https://your-vercel-url.app/api/data";

// Send vital data
HTTPClient http;
http.begin(url);
http.addHeader("Content-Type", "application/json");

String payload = "{\"device_id\":\"BED-A1-1\",\"building\":\"A\",\"floor\":\"1\",\"room\":\"101\",\"bed\":\"1\",\"battery\":95,\"vitals\":{\"heart_rate\":72,\"spo2\":98,\"temperature\":36.5,\"bp_sys\":120,\"bp_dia\":80}}";
int httpCode = http.POST(payload);
http.end();
```

### 5.2 Test data ingestion

Once ESP32 is sending data, check:

```bash
# Should show your device
curl https://your-vercel-url.app/api/devices

# Should show latest vitals
curl https://your-vercel-url.app/api/buildings

# Should show stats
curl https://your-vercel-url.app/api/stats
```

## Step 6: Enable Supabase Realtime (Optional)

For real-time push notifications (automatic with our setup):

1. In Supabase dashboard, go to **Replication** → **Publications**
2. Confirm `supabase_realtime` publication includes:
   - ✅ vitals
   - ✅ alerts
   - ✅ patients

This is already configured in `supabase-schema.sql`.

## Troubleshooting

### Build fails on Vercel

**Problem:** `npm ERR! code ERESOLVE`

**Solution:** Update your local dependencies first:
```bash
npm install
cd frontend && npm install
cd ..
```

### API endpoint returns 500 error

**Problem:** `{"error":"Internal Server Error"}`

**Cause:** Missing environment variables in Vercel

**Solution:**
1. Check Vercel **Settings → Environment Variables**
2. Make sure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are set
3. Redeploy: `vercel --prod`

### Supabase connection timeout

**Problem:** `Error: getaddrinfo ENOTFOUND your-project.supabase.co`

**Cause:** Wrong Supabase URL

**Solution:**
1. Check your URL in Supabase **Project Settings → API**
2. URLs must include `https://` and `.supabase.co`
3. Should look like: `https://xxxxxxxxxxxx.supabase.co`

### RLS Policy Blocking Queries

**Problem:** Queries work locally but fail on Vercel

**Cause:** RLS policies too restrictive for service role key

**Solution:**
1. In Supabase SQL Editor, run:
   ```sql
   ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
   ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
   ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
   ```

2. Create permissive policies:
   ```sql
   CREATE POLICY "Allow service role full access" ON devices
   FOR ALL USING (true) WITH CHECK (true);
   ```

## Post-Deployment Checklist

- ✅ Verify all environment variables are set in Vercel
- ✅ Test API endpoints return data
- ✅ Frontend dashboard loads without errors
- ✅ ESP32 devices can connect and send data
- ✅ Real-time updates work (check browser console)
- ✅ Alerts are created and displayed
- ✅ Patient management works (Settings page)

## Security Notes

⚠️ **Important**: Never commit `.env` files to GitHub!

Files that should be in `.gitignore`:
```
.env
.env.local
.env.production.local
node_modules/
frontend/node_modules/
.vercel/
```

The keys in Vercel are encrypted and secure. Only expose the **Anon Key** to frontend (it's read-only and safe).

## Local Development

To run this locally:

```bash
# 1. Create .env file
cp .env.example .env

# 2. Add your Supabase keys to .env

# 3. Install dependencies
npm run install-all

# 4. Run frontend dev server
npm run dev

# 5. Frontend will be at http://localhost:5173
```

Your local frontend will connect to the cloud Supabase database, but API calls go to `/api/*` which will fail locally (those are Vercel functions).

For local API testing:
```bash
# Set up a local Node server (requires backend/index.js with Express)
# Or use the ESP32 simulator to generate test data
```

## Support

For issues:
1. Check Vercel logs: Dashboard → Project → Deployments → Logs
2. Check Supabase logs: Project → Logs
3. Check browser console: F12 → Console tab
4. Check network requests: F12 → Network tab

## Next Steps

- 📊 Set up monitoring/alerting on Vercel
- 🔒 Implement Supabase Auth for user login
- 📱 Add mobile app using React Native
- 🔔 Set up email/SMS alerts for critical vitals
- 📈 Add analytics dashboard with Metabase

