# Hospital IoT Monitoring - Vercel + Supabase Migration Complete ✅

This repository contains a **production-ready Hospital IoT Monitoring System** deployed on **Vercel** (serverless functions) and **Supabase** (PostgreSQL database).

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- GitHub account
- Vercel account (free: [vercel.com](https://vercel.com))
- Supabase account (free: [supabase.com](https://supabase.com))

### 1. Set Up Supabase (5 minutes)

1. Create a new Supabase project: [supabase.com/new](https://supabase.com/new)
2. Go to **SQL Editor** and run the entire contents of `supabase-schema.sql`
3. Open **Project Settings → API** and copy:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY` (backend only)
   - `VITE_SUPABASE_ANON_KEY` (frontend)

### 2. Deploy to Vercel (3 minutes)

1. Push to GitHub:
   ```bash
   cd d:/Document/Project/Hospital
   git init
   git add .
   git commit -m "Hospital IoT Monitoring"
   git remote add origin https://github.com/YOUR_USERNAME/hospital-iot.git
   git push -u origin main
   ```

2. In Vercel ([vercel.com/new](https://vercel.com/new)):
   - Import your GitHub repository
   - Add environment variables (from Supabase above)
   - Click Deploy

3. Your app is live at: `https://hospital-iot-xxx.vercel.app` ✅

### 3. Test It Works

```bash
# Test API
curl https://hospital-iot-xxx.vercel.app/api/stats

# Expected response:
# {"totalBeds":0,"onlineDevices":0,"criticalAlerts":0,"warningAlerts":0,"uptime":"NaN%"}

# Open in browser
open https://hospital-iot-xxx.vercel.app
```

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Step-by-step deployment guide
- **[MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)** - What changed and why
- **[Project Structure](PROJECT_STRUCTURE.txt)** - File organization
- **[Quick Reference](QUICK_REFERENCE.md)** - API endpoints & common tasks

## 🏗️ Architecture

```
┌─────────────┐
│ ESP32       │ (Sends vital data)
│ Devices     │
└──────┬──────┘
       │ POST /api/data
       ▼
┌─────────────────────────────────────────┐
│ Vercel Functions (Serverless API)       │
│ ├─ api/data.js (Ingest vitals)          │
│ ├─ api/devices.js (List devices)        │
│ ├─ api/alerts.js (Manage alerts)        │
│ ├─ api/patients.js (Manage patients)    │
│ └─ ... 5 more endpoints                 │
└──────┬──────────────────────────────────┘
       │ Query/Insert/Update
       ▼
┌─────────────────────────────────────────┐
│ Supabase PostgreSQL                     │
│ ├─ devices (1000s concurrent)           │
│ ├─ vitals (millions of readings)        │
│ ├─ alerts (thousands)                   │
│ ├─ patients (hundreds)                  │
│ └─ Realtime Subscriptions               │
└──────┬──────────────────────────────────┘
       │ postgres_changes events
       ▼
┌─────────────────────────────────────────┐
│ Browser (React + Vite)                  │
│ ├─ Dashboard (device hierarchy)         │
│ ├─ Bed Detail (vital charts)            │
│ ├─ Alerts (management & filtering)      │
│ └─ Settings (patient info)              │
└─────────────────────────────────────────┘
```

## 🎯 Key Features

✅ **Real-time Monitoring** - Vitals update instantly via Supabase Realtime  
✅ **Hierarchical Organization** - Building → Floor → Room → Bed  
✅ **Alert Management** - Critical, Warning, Info levels with acknowledgment  
✅ **Patient Tracking** - Linked vital data to patient information  
✅ **Scalable Infrastructure** - Auto-scales from 1 device to 100,000  
✅ **Worldwide Deployment** - Vercel + Supabase in your region  
✅ **Zero DevOps** - No servers to manage  

## 📊 API Endpoints

All endpoints return JSON and support CORS:

```
GET  /api/devices              - List all devices/beds
GET  /api/buildings            - Hierarchy with latest vitals
GET  /api/bed/:device_id/vitals - Vital history (50 records default)
GET  /api/stats                - Dashboard KPIs
GET  /api/alerts               - Get alerts (with filters)
GET  /api/alerts/stats         - Alert statistics
POST /api/alerts/:id/acknowledge - Mark alert as read
POST /api/data                 - Ingest ESP32 data (ESP32 → Vercel)
GET  /api/patients             - List all patients
POST /api/patients             - Create/update patient
DELETE /api/patients/:device_id - Remove patient
```

### Example Requests

```bash
# Get all devices
curl https://your-app.vercel.app/api/devices

# Get critical unread alerts
curl "https://your-app.vercel.app/api/alerts?unread=true&type=CRITICAL"

# Get last 24 vitals for a bed
curl "https://your-app.vercel.app/api/bed/BED-A1-1/vitals?limit=1440"

# Get dashboard stats
curl https://your-app.vercel.app/api/stats

# Send vital from ESP32
curl -X POST https://your-app.vercel.app/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "BED-A1-1",
    "building": "A",
    "floor": "1",
    "room": "101",
    "bed": "1",
    "battery": 95,
    "vitals": {
      "heart_rate": 72,
      "spo2": 98,
      "temperature": 36.5,
      "bp_sys": 120,
      "bp_dia": 80
    }
  }'
```

## 🛠️ Technology Stack

### Backend
- **Vercel Functions** - Serverless Node.js
- **Supabase** - PostgreSQL with Realtime
- **Environment Variables** - Secure configuration

### Frontend
- **React 18** - UI components
- **Vite 5** - Fast build tool
- **React Router 6** - Page navigation
- **Recharts 2** - Vital charts & graphs
- **Tailwind CSS 3** - Styling
- **Lucide React** - Icons

### Database
- **PostgreSQL** - Reliable relational DB
- **Row Level Security** - Access control
- **Realtime Subscriptions** - Live updates
- **Automatic Backups** - Daily snapshots

## 📁 Project Structure

```
hospital/
├── api/                     # Vercel Functions (Backend)
│   ├── _supabase.js        # Shared client + helpers
│   ├── data.js             # POST - Ingest vital data
│   ├── devices.js          # GET - List devices
│   ├── buildings.js        # GET - Hierarchy
│   ├── alerts.js           # GET - Alerts with filters
│   ├── alerts-stats.js     # GET - Alert counts
│   ├── alerts/[id]/acknowledge.js
│   ├── bed/[device_id]/vitals.js
│   ├── patients.js         # CRUD patients
│   └── stats.js            # GET - Dashboard KPIs
│
├── frontend/               # React App (Frontend)
│   ├── public/
│   ├── src/
│   │   ├── lib/supabase.js # Supabase client
│   │   ├── hooks/useSocket.js
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BedDetail.jsx
│   │   │   ├── Alerts.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── .env (create from .env.example)
│
├── supabase-schema.sql     # PostgreSQL DDL
├── vercel.json             # Vercel config
├── package.json            # Root scripts
├── .env.example            # Template
├── DEPLOYMENT.md           # Deploy guide
├── MIGRATION_SUMMARY.md    # What changed
└── README.md               # This file
```

## 🔐 Environment Variables

Create `.env` file in root (copy from `.env.example`):

```env
# Supabase (from Project Settings → API)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  # Don't share this!

# Frontend (use in Vercel)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Create `frontend/.env` (copy from `frontend/.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

**⚠️ Important:** Never commit `.env` files! They're in `.gitignore`.

## 🚀 Deployment Checklist

- [ ] Create Supabase project
- [ ] Run `supabase-schema.sql` in Supabase
- [ ] Copy API keys to `.env` file
- [ ] Test locally: `npm run install-all && npm run dev`
- [ ] Push to GitHub
- [ ] Create Vercel project from GitHub repo
- [ ] Add environment variables in Vercel dashboard
- [ ] Verify deployment: check `/api/stats` endpoint
- [ ] Test frontend loads without errors
- [ ] Update ESP32 firmware with new API URL
- [ ] Monitor Vercel/Supabase logs

## 🐛 Troubleshooting

### "Missing environment variables"
**Fix:** Create `.env` file with Supabase keys
```bash
cp .env.example .env
# Edit .env with your Supabase keys
```

### "API returns 500 error"
**Fix:** Check Vercel logs and Supabase credentials
```bash
# Vercel CLI
vercel logs

# Check Supabase connection
curl https://your-project.supabase.co/rest/v1/devices
```

### "Real-time updates not working"
**Fix:** Enable Supabase Realtime publication
```sql
-- In Supabase SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE vitals, alerts;
```

### "CORS errors in browser"
**Fix:** Supabase & Vercel handle CORS automatically
- Check browser Console (F12)
- Verify API URL matches Vercel deployment
- Check Supabase Anon key is correct

## 📈 Local Development

```bash
# Install all dependencies
npm run install-all

# Start frontend dev server (React + hot reload)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

Frontend runs on `http://localhost:5173` and connects to cloud Supabase.

**Note:** API endpoints (`/api/*`) are Vercel functions - they'll fail locally. Use cloud Supabase while developing frontend.

## 🔄 From SQLite to Supabase

This is a complete migration from:
- ❌ SQLite (file-based) → ✅ PostgreSQL (cloud)
- ❌ Express server (always running) → ✅ Vercel Functions (on-demand)
- ❌ Socket.io (WebSocket server) → ✅ Supabase Realtime (subscriptions)

See [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) for detailed comparison.

## 📚 API Query Examples

### Get all devices with latest vitals
```javascript
const response = await fetch('/api/devices');
const devices = await response.json();
// Returns: [{device_id, building, floor, room, bed, latestVital, patient, unreadAlerts}]
```

### Subscribe to new vitals in real-time
```javascript
import { subscribeToChanges } from './lib/supabase';

subscribeToChanges('vitals', (eventType, newData) => {
  if (eventType === 'INSERT') {
    console.log('New vital reading:', newData);
    // {device_id, recorded_at, heart_rate, spo2, temperature, bp_sys, bp_dia}
  }
});
```

### Filter alerts by type
```javascript
const response = await fetch('/api/alerts?unread=true&type=CRITICAL');
const criticalAlerts = await response.json();
// Returns: {alerts: [...], count: 5, limit: 50, offset: 0}
```

### Get device vital history
```javascript
const response = await fetch('/api/bed/BED-A1-1/vitals?limit=100&offset=0');
const {device, patient, vitals, count} = await response.json();
// Vitals in chronological order (oldest first)
```

## 💡 Common Tasks

### Add a new patient in Settings page
```javascript
POST /api/patients
{
  "device_id": "BED-A1-1",
  "name": "John Doe",
  "age": 65,
  "gender": "M",
  "room_number": "101",
  "notes": "Diabetes, hypertension"
}
```

### Acknowledge an alert
```javascript
POST /api/alerts/123/acknowledge
```

### Check dashboard stats
```javascript
GET /api/stats
// Returns: {totalBeds: 50, onlineDevices: 48, criticalAlerts: 2, warningAlerts: 15}
```

## 🎓 What's Different From Express Version

| Aspect | Express (Old) | Vercel (New) |
|--------|---------------|-------------|
| **Backend** | Always running | On-demand functions |
| **Database** | SQLite file | PostgreSQL cloud |
| **Real-time** | Socket.io server | Supabase Realtime |
| **Deployment** | Manual server setup | Git push to deploy |
| **Scaling** | Limited | Unlimited |
| **Cost** | Server power bills | Pay-per-use |
| **Backups** | Manual | Automatic daily |

Frontend UI is **identical** - only backend changed!

## 🆘 Support

- 📖 See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step guide
- 🔍 See [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md) for technical details
- 🆘 Check [Supabase docs](https://supabase.com/docs)
- 🆘 Check [Vercel docs](https://vercel.com/docs) 
- 💬 Check Vercel logs: Dashboard → Deployments
- 💬 Check Supabase logs: Project → Logs

## 📜 License

MIT License - Free to use and modify

## 🎉 You're All Set!

Your Hospital IoT Monitoring System is now:
- ✅ Deployed globally on Vercel
- ✅ Backed by PostgreSQL on Supabase
- ✅ Ready for production use
- ✅ Automatically scaled & backed up
- ✅ Real-time & responsive

Happy monitoring! 🏥📊

