# Hospital IoT Monitoring System

A complete, production-ready real-time hospital IoT monitoring web application. Receives live vital signs data from ESP32 devices installed at patient beds, displays live status on a clean dashboard, and stores all events in a database.

## 📋 Features

- **Real-Time Dashboard**: Monitor all beds across buildings, floors, and rooms with live vital signs
- **Bed Detail View**: Detailed patient information with 24-hour vital sign charts
- **Alerts Center**: Manage critical, warning, and info-level alerts with acknowledgment
- **Patient Management**: Add, edit, and manage patient information linked to devices
- **WebSocket Updates**: Real-time updates via Socket.io for seamless experience
- **Device Hierarchy**: Organized building → floor → room → bed structure
- **Responsive Design**: Works on desktop and tablet with Tailwind CSS
- **Color-Coded Status**: Green (normal), yellow (warning), red (critical), gray (offline)

## 🏗️ Architecture

```
Hospital IoT Monitoring
├── Backend (Node.js + Express)
│   ├── REST API for data ingestion and queries
│   ├── WebSocket via socket.io for real-time updates
│   └── SQLite database with auto-migrations
├── Frontend (React + Vite)
│   ├── React Router for navigation
│   ├── Recharts for vital sign visualization
│   ├── Tailwind CSS for styling
│   └── WebSocket client for live updates
└── IoT Simulator
    └── 12 virtual ESP32 devices sending realistic data
```

## 📊 Data Model

### Devices
```
Building (A, B, C, ...)
└── Floor (1, 2, ...)
    └── Room (201, 202, ...)
        └── Bed (1, 2, ...)
            └── Device (device_id)
                ├── Vitals (heart_rate, spo2, temperature, blood_pressure)
                ├── Alerts (CRITICAL, WARNING, INFO)
                └── Patient (name, age, diagnosis)
```

### Vital Signs
- **Heart Rate**: 60-100 bpm (normal)
- **SpO2**: > 95% (normal)
- **Temperature**: 36.5-37.5°C (normal)
- **Blood Pressure**: 120/80 mmHg (normal)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn package manager

### Installation

#### 1. Clone and Navigate
```bash
cd hospital-iot
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

### Running the Application

#### Terminal 1: Start Backend Server
```bash
cd backend
npm run dev
```
✓ Backend runs on `http://localhost:3001`
✓ SQLite database auto-created at `backend/hospital.db`

#### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```
✓ Frontend runs on `http://localhost:5173`

#### Terminal 3: Start ESP32 Simulator
```bash
cd backend
npm run simulate
```
✓ Creates 12 virtual devices (3 buildings × 2 floors × 2 rooms × 1 bed)
✓ Posts realistic vital signs every 10 seconds
✓ Randomly triggers alerts (WARNING: 2min intervals, CRITICAL: 5min intervals)

### Access the Application
Open browser to: `http://localhost:5173`

Default login not required - system is open access for development

## 🔌 API Endpoints

### Data Ingestion
- **POST /api/data** - ESP32 posts sensor data
  ```json
  {
    "device_id": "ESP32_BA_F2_R201_BED1",
    "building": "A",
    "floor": 2,
    "room": "201",
    "bed": 1,
    "timestamp": "2024-01-15T10:30:00Z",
    "vitals": {
      "heart_rate": 78,
      "spo2": 97,
      "temperature": 36.8,
      "blood_pressure_sys": 120,
      "blood_pressure_dia": 80
    },
    "alerts": [
      {"type": "WARNING", "message": "Heart rate elevated"}
    ],
    "battery": 85
  }
  ```

### Queries
- **GET /api/buildings** - Full hierarchy with latest vitals
- **GET /api/devices** - All devices with status
- **GET /api/bed/:device_id/vitals?limit=50** - Vital history for a bed
- **GET /api/alerts** - All alerts with filters (?type=CRITICAL&unread=true)
- **GET /api/alerts/stats** - Alert statistics
- **POST /api/alerts/:id/acknowledge** - Mark alert as read
- **GET /api/patients** - All patients
- **POST /api/patients** - Create/update patient
- **DELETE /api/patients/:device_id** - Remove patient

### WebSocket Events
- **new_vitals** - Broadcast when new vital data arrives
- **new_alert** - Broadcast when new alert triggered
- **alert_acknowledged** - Broadcast when alert acknowledged

## 📱 Frontend Pages

### 1. Dashboard (/)
- Top stat bar: total beds, online devices, active alerts
- Building selector tabs
- Floor accordion with room cards
- Bed tiles with live vitals and status indicators
- Color-coded alerts with pulsing critical indicators

### 2. Bed Detail (/bed/:device_id)
- Patient information card
- Live vital sign cards (HR, SpO2, Temp, BP)
- 24-hour charts for each vital using Recharts
- Alert history table with acknowledge button

### 3. Alerts Center (/alerts)
- Filterable alerts: All, Critical, Warning, Unread
- Real-time toast notifications for new alerts
- Alert statistics
- Acknowledge action for each alert

### 4. Settings (/settings)
- Patient management: add, edit, delete patients
- Device assignment to patients
- Vital sign threshold reference
- Standard medical reference ranges

## 🎨 UI Components

### Core Components
- **Sidebar**: Navigation with alert badge
- **Header**: Current time, notification bell
- **BedTile**: Individual bed card with vitals summary
- **VitalCard**: Large vital sign display with trend
- **AlertRow**: Alert table row with actions
- **Toast**: Slide-in notifications for new alerts
- **ToastContainer**: Toast notification stack

## 🔧 Configuration

### Backend Environment (.env)
```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
LOG_LEVEL=info
```

### Frontend Environment (.env)
```
VITE_API_URL=http://localhost:3001
```

### Database
- **Type**: SQLite
- **Path**: `backend/hospital.db`
- **Auto-creation**: On first run
- **Tables**: devices, vitals, alerts, patients
- **Indexes**: For fast queries on device and alert lookups

## 📦 Dependencies

### Backend
- **express**: Web framework
- **socket.io**: Real-time communication
- **better-sqlite3**: SQLite database (no server needed)
- **cors**: Cross-origin support
- **dotenv**: Environment variables

### Frontend
- **react**: UI library
- **react-router-dom**: Client-side routing
- **socket.io-client**: WebSocket client
- **recharts**: Chart visualization
- **lucide-react**: Icon library
- **tailwindcss**: Utility-first CSS
- **vite**: Build tool

## 🧪 Testing

### Simulator Features
The `simulate_esp32.js` script:
- Creates 12 virtual devices spread across 3 buildings
- Generates realistic vital signs with natural variations
- Triggers random WARNING alerts (10% chance, 2-min cooldown)
- Triggers random CRITICAL alerts (5% chance, 5-min cooldown)
- Simulates battery levels (70-100%)
- Colored console output for easy monitoring
- Waits for backend to be ready before starting

### Test Scenarios
1. **Online Devices**: Check dashboard device count matches vitals frequency
2. **Real-time Updates**: Add patient → see in Settings → appear on Dashboard
3. **Alert Flow**: Trigger warning alert → see in toast → appears in Alerts Center
4. **Acknowledge**: Click acknowledge button → disappears from unread
5. **Charts**: View bed detail → 24h charts update with new vitals
6. **Offline Status**: Stop simulator → devices go gray after 5 minutes

## 🆘 Troubleshooting

### Backend won't start
- Check if port 3001 is in use: `netstat -an | grep 3001`
- Ensure Node.js 16+ installed: `node --version`
- Clear node_modules: `rm -rf node_modules && npm install`

### Frontend API calls failing
- Verify backend running on `http://localhost:3001`
- Check `frontend/.env` has correct API_URL
- Open DevTools → Network tab → check request URLs

### No data appearing
- Check simulator is running and connected
- Watch backend console for POST requests
- Check SQLite database exists: `ls backend/hospital.db`

### Alerts not showing
- Check backend console for alert creation logs
- Verify socket.io connection in frontend DevTools
- Check Alerts page filters aren't hiding them

## 📈 Production Deployment

### Backend
```bash
# Build
npm install --production

# Run
NODE_ENV=production PORT=3001 npm start
```

### Frontend
```bash
# Build
npm run build

# Deploy dist/ folder to static hosting
```

### Database
- Use SQLite for small hospitals (< 1000 beds)
- For larger deployments, migrate to PostgreSQL:
  - Update `db.js` to use `pg` library
  - Create equivalent schema in PostgreSQL
  - Update connection string

## 📝 File Structure

```
hospital-iot/
├── backend/
│   ├── index.js                (Express server + socket.io)
│   ├── db.js                   (SQLite setup + CRUD)
│   ├── package.json
│   ├── .env
│   └── simulate_esp32.js       (Virtual device simulator)
├── frontend/
│   ├── src/
│   │   ├── App.jsx             (Main router)
│   │   ├── main.jsx            (Entry point)
│   │   ├── index.css           (Global styles)
│   │   ├── App.css
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BedDetail.jsx
│   │   │   ├── Alerts.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Header.jsx
│   │   │   ├── BedTile.jsx
│   │   │   ├── VitalCard.jsx
│   │   │   ├── AlertRow.jsx
│   │   │   ├── Toast.jsx
│   │   └── hooks/
│   │       ├── useSocket.js
│   │       └── useAlerts.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .env
└── README.md
```

## 🎓 Learning Resources

### WebSocket Real-Time Features
- Socket.io server: `backend/index.js` (io.emit, io.on)
- Socket.io client: `frontend/src/hooks/useSocket.js`
- Real-time flows: new_vitals, new_alert, alert_acknowledged

### Database Patterns
- Connection: `backend/db.js` using better-sqlite3
- Prepared statements for security
- Foreign keys enabled for data integrity
- Indexes for query performance

### React Patterns
- Hooks: useState, useEffect, useContext
- Router: React Router v6 with nested routes
- Custom hooks: useSocket, useAlerts
- Component composition: reusable BedTile, VitalCard, etc.

## 📄 License

MIT

## 👥 Support

For issues or questions:
1. Check Troubleshooting section above
2. Review console logs (backend & browser)
3. Verify all services running on correct ports
4. Check environment variables (.env files)

---

**Status**: Production-Ready ✓
**Last Updated**: 2024
**Version**: 1.0.0
