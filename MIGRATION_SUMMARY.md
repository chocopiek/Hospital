# Hospital IoT Monitoring - Migration Summary

This document describes the migration from Express + SQLite to Vercel Serverless + Supabase PostgreSQL.

## Architecture Comparison

### Before (Local Development)
```
ESP32 Devices
    ↓
Express Server (Node.js)
    ↓ (Socket.io)
Browser (React + React Router)
    ↓
SQLite Database (local file)
```

**Pros:**
- Simple local setup
- Real-time updates via Socket.io
- No cloud costs

**Cons:**
- Not scalable
- Requires backend server always running
- Database locked for concurrent writes
- No built-in authentication/security
- Not suitable for production

### After (Cloud-Based)
```
ESP32 Devices
    ↓
Vercel Functions (Serverless API)
    ↓ + Supabase Client
Browser (React + Vite)
    ↓
Supabase PostgreSQL
    ↓ (Realtime Subscriptions)
Update Notifications back to Browser
```

**Pros:**
- Fully scalable (auto-scales globally)
- Serverless = pay-per-use (cheaper at scale)
- PostgreSQL with proper indexing
- Built-in authentication/RLS
- Automatic backups
- Real-time subscriptions
- Global CDN (Vercel + Supabase)

**Cons:**
- Requires cloud accounts (free tier available)
- Slightly more complex setup
- Cold start delays (~100-500ms first request)

## Code Changes

### 1. Database Layer

**Before (SQLite with better-sqlite3):**
```javascript
const Database = require('better-sqlite3');
const db = new Database('hospital.db');

// Synchronous operations
const stmt = db.prepare('SELECT * FROM devices WHERE device_id = ?');
const device = stmt.get(device_id);  // Blocks until done
```

**After (Supabase PostgreSQL):**
```javascript
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

// Asynchronous operations
const { data, error } = await supabase
  .from('devices')
  .select('*')
  .eq('device_id', device_id);
```

**Changes:**
- ✅ Removed SQLite-specific syntax
- ✅ **SQLite types** (REAL, INTEGER, TEXT) → **PostgreSQL types** (NUMERIC, BIGINT, VARCHAR, TIMESTAMPTZ)
- ✅ **Synchronous** (blocking) → **Asynchronous** (non-blocking with Promises)
- ✅ **File-based** locking → **Server-based** transactions
- ✅ **Manual timestamps** (SQLite3 functions) → **Native database timestamps** (TIMESTAMPTZ)

### 2. Backend API Routes

**Before (Express):**
```javascript
// backend/index.js
const express = require('express');
const app = express();
app.listen(3001);

app.get('/api/devices', (req, res) => {
  const devices = db.prepare('SELECT * FROM devices').all();
  res.json(devices);
});
```

**After (Vercel Functions):**
```javascript
// api/devices.js
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  
  const { data } = await supabase.from('devices').select('*');
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};
```

**Changes:**
- ✅ No running server = stateless functions
- ✅ Each endpoint is a separate file
- ✅ No Socket.io server
- ✅ **Manual CORS headers** (Vercel doesn't auto-handle them)
- ✅ Response object works differently (no middleware chain)
- ✅ **Structured exports** (module.exports function)
- ✅ Timeout: **30 seconds max** (vs unlimited in Express)

### 3. Real-time Communication

**Before (Socket.io):**
```javascript
// Backend
const io = require('socket.io')(3001);
io.emit('new_vitals', vital);  // Broadcast to all clients

// Frontend
const socket = io('http://localhost:3001');
socket.on('new_vitals', (data) => {
  console.log('New vital:', data);
});
```

**After (Supabase Realtime):**
```javascript
// No backend emission needed - database changes auto-broadcast

// Frontend
const { subscribeToChanges } = require('./lib/supabase');
subscribeToChanges('vitals', (eventType, newData) => {
  if (eventType === 'INSERT') {
    console.log('New vital:', newData);
  }
});
```

**Changes:**
- ✅ **No WebSocket server** - uses database publish/subscribe
- ✅ **Event-driven** by database changes (postgres_changes)
- ✅ **Automatic batching** - only subscribed clients receive updates
- ✅ **Reduced bandwidth** - only relevant data transmitted
- ✅ **Better scalability** - doesn't require connection per client

### 4. Frontend Hooks

**Before:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001');
socket.on('new_vitals', callback);
```

**After:**
```javascript
import { subscribeToChanges } from './lib/supabase';

subscribeToChanges('vitals', (eventType, newData) => {
  if (eventType === 'INSERT') callback(newData);
});
```

**Changes:**
- ✅ Removed socket.io-client dependency
- ✅ Added @supabase/supabase-js dependency
- ✅ **Event types** are database change types (INSERT, UPDATE, DELETE)
- ✅ **Same event names** (new_vitals, new_alert) for UI compatibility

### 5. Environment Configuration

**Before (Express):**
```
No .env needed locally
VITE_API_URL = http://localhost:3001
```

**After (Vercel + Supabase):**
```
.env (Backend)
├── SUPABASE_URL
├── SUPABASE_SERVICE_KEY  ⚠️ Secret!
├── VITE_SUPABASE_URL
└── VITE_SUPABASE_ANON_KEY  ✅ Public (safe)

frontend/.env (Frontend)
├── VITE_SUPABASE_URL
└── VITE_SUPABASE_ANON_KEY  ✅ Public (safe)
```

**Changes:**
- ✅ **Service vs Anon keys** - different access levels
- ✅ **Backend keys in server environment only**
- ✅ **Frontend keys can be safely exposed** (read-only)
- ✅ **No hardcoded URLs** anywhere in code
- ✅ **Vercel encrypted environment variables** (secure)

## API Endpoint Mapping

All endpoints preserve the same HTTP interface, just different backend:

| Endpoint | Method | Before | After |
|----------|--------|--------|-------|
| `/api/data` | POST | Express route | `/api/data.js` |
| `/api/devices` | GET | Express route | `/api/devices.js` |
| `/api/buildings` | GET | Express route | `/api/buildings.js` |
| `/api/bed/:id/vitals` | GET | Express route | `/api/bed/[device_id]/vitals.js` |
| `/api/alerts` | GET | Express route | `/api/alerts.js` |
| `/api/alerts/stats` | GET | Express route | `/api/alerts-stats.js` |
| `/api/alerts/:id/acknowledge` | POST | Express route | `/api/alerts/[id]/acknowledge.js` |
| `/api/patients` | GET/POST/DELETE | Express route | `/api/patients.js` |
| `/api/stats` | GET | Express route | `/api/stats.js` |

## Database Schema Changes

### Column Type Migrations

| SQLite | PostgreSQL | Why |
|--------|-----------|-----|
| REAL | NUMERIC(5,2) | Better precision for BP readings |
| INTEGER | BIGINT | More explicit for IDs |
| TEXT | VARCHAR(255) | Size constraints |
| (datetime) | TIMESTAMPTZ | Timezone-aware timestamps |
| NULL | NULL | Same behavior |

### Example Device Record

**SQLite:**
```sql
device_id: "BED-A1-1"
battery: 95
last_seen: "2024-01-15 10:30:45"  -- String!
```

**PostgreSQL:**
```sql
device_id: "BED-A1-1"
battery: 95.0  -- NUMERIC
last_seen: "2024-01-15T10:30:45+00:00"  -- TIMESTAMPTZ
```

### New Features in PostgreSQL

- **Indexes**: On `(device_id, recorded_at DESC)` for fast vital queries
- **Foreign Keys**: With CASCADE delete
- **Constraints**: NOT NULL, UNIQUE where needed
- **Triggers**: Auto-update `updated_at` timestamps
- **Row Level Security (RLS)**: User-based access control
- **Realtime Publication**: Automatic change broadcasts

## File Structure Changes

### Before
```
hospital/
├── backend/
│   ├── index.js (Express server)
│   ├── db.js (SQLite client)
│   ├── routes/ (empty in new setup)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── hooks/useSocket.js (Socket.io)
│   │   └── ...
│   └── package.json
└── hospital.db (SQLite file)
```

### After
```
hospital/
├── api/ (Vercel Functions)
│   ├── _supabase.js (Shared client)
│   ├── data.js
│   ├── devices.js
│   ├── buildings.js
│   ├── bed/[device_id]/vitals.js
│   ├── alerts.js
│   ├── alerts-stats.js
│   ├── alerts/[id]/acknowledge.js
│   ├── patients.js
│   └── stats.js
├── frontend/
│   ├── src/
│   │   ├── lib/supabase.js (Supabase client)
│   │   ├── hooks/useSocket.js (Updated for Realtime)
│   │   └── ...
│   ├── .env.example
│   └── package.json
├── supabase-schema.sql (Schema creation)
├── vercel.json (Deployment config)
├── .env.example (Env template)
├── DEPLOYMENT.md (Deployment guide)
├── MIGRATION_SUMMARY.md (This file)
└── package.json (Root orchestration)
```

## Dependency Changes

### Removed
- ❌ `better-sqlite3` - Requires C++ build tools
- ❌ `sqlite3` - SQLite client
- ❌ `sqlite` - SQLite utility
- ❌ `socket.io` - WebSocket server (4.7.2)
- ❌ `socket.io-client` - Frontend (4.7.2)

### Added
- ✅ `@supabase/supabase-js` - Supabase client (2.38.4)

### Unchanged
- ✅ Express (if used locally, not needed for Vercel)
- ✅ React, React Router, Recharts, Tailwind (frontend)

## Performance Improvements

### Before (SQLite)
- **Cold start**: ~100ms (local)
- **DB query**: 5-50ms (single file-based)
- **Real-time latency**: 100-200ms (Socket.io polling)
- **Scaling**: Not recommended beyond single server
- **Concurrent writes**: Limited (file-based locking)

### After (Vercel + Supabase)
- **Cold start**: ~200-500ms first request (Vercel), ~50ms subsequent (cached)
- **DB query**: 10-100ms (network + PostgreSQL)
- **Real-time latency**: 50-150ms (WebSocket subscriptions)
- **Scaling**: Auto-scales to unlimited
- **Concurrent writes**: PostgreSQL handles transactions

### Result
- ✅ **Slightly slower for local development** (network calls)
- ✅ **Much faster at scale** (distributed + optimized)
- ✅ **Better real-time** (native subscriptions vs polling)

## Security Improvements

### Before (SQLite + Express)
- ❌ No authentication
- ❌ Database file on disk
- ❌ All connections from same backend
- ❌ No permission checks

### After (Supabase + Vercel)
- ✅ Optional JWT auth
- ✅ Database in managed cloud
- ✅ Row Level Security (RLS) policies
- ✅ Service role vs Anon key separation
- ✅ Encrypted environment variables
- ✅ Automatic backups
- ✅ DDoS protection

## Cost Comparison

### Before (Self-hosted)
- ❌ Always running server (power costs)
- ❌ Manual backups
- ❌ No redundancy
- ✅ Free while development

### After (Cloud)
- ✅ Vercel free: 100GB bandwidth/month
- ✅ Supabase free: 500MB database + 1GB egress/month
- ✅ Auto-scales pay-per-use
- ✅ Both have generous free tiers

**Typical costs for production:**
- 1M API requests/month: ~$20-50/month (Vercel)
- 100GB database/month: ~$10-30/month (Supabase)
- **Total**: ~$30-80/month for hospital-scale application

## Troubleshooting Migration

### Issue: API returns 405 Method Not Allowed
**Cause:** Vercel functions must explicitly handle OPTIONS
**Fix:** All api/*.js files include `if (req.method === 'OPTIONS') return handleOptions(res)`

### Issue: CORS errors in frontend
**Cause:** Supabase client not configured
**Fix:** Check `frontend/src/lib/supabase.js` has correct URL and Anon key

### Issue: Real-time updates not working
**Cause:** Supabase RLS policies blocking subscriptions
**Fix:** In Supabase SQL, enable RLS and create permissive policies

### Issue: Queries timeout
**Cause:** Vercel function limit is 30 seconds
**Fix:** Optimize queries, add indexes, pagination

## Next Steps After Migration

1. ✅ **Test locally**: Run frontend with cloud database
2. ✅ **Deploy to Vercel**: Connect GitHub, set env vars
3. ✅ **Update ESP32 firmware**: Change API URLs to Vercel
4. ✅ **Monitor in production**: Check Vercel logs
5. 🔄 **Set up auth**: Implement Supabase Auth (optional)
6. 🔄 **Add backups**: Configure Supabase backup schedule
7. 🔄 **Performance tuning**: Add caching, optimize queries

## Rollback Plan

If you need to revert to Express + SQLite:

1. Keep the `backend/` directory with original Express code
2. Run `npm install` in backend
3. Update `frontend/src/hooks/useSocket.js` to use Socket.io
4. Change frontend API URLs back to `http://localhost:3001`
5. Run `npm run dev` (local)

The git history preserves all original code.

