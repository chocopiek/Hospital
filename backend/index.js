const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const {
  openDatabase,
  initializeDatabase,
  getOrCreateDevice,
  getAllDevices,
  getDeviceById,
  getBuildingHierarchy,
  insertVitals,
  getVitalsByDeviceId,
  getLatestVital,
  insertAlert,
  getAllAlerts,
  getAlertsByDeviceId,
  acknowledgeAlert,
  getUnreadAlertCount,
  createOrUpdatePatient,
  getAllPatients,
  getPatientByDeviceId,
  deletePatient,
} = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Store connected clients for broadcasting
const connectedClients = new Set();

io.on('connection', (socket) => {
  connectedClients.add(socket);
  console.log(`✓ Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    connectedClients.delete(socket);
    console.log(`✗ Client disconnected: ${socket.id}`);
  });
});

/**
 * Broadcast new vitals to all connected clients
 */
function broadcastNewVitals(device, vitals) {
  io.emit('new_vitals', {
    device_id: device.device_id,
    building: device.building,
    floor: device.floor,
    room: device.room,
    bed: device.bed,
    vitals,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast new alert to all connected clients
 */
function broadcastNewAlert(device, type, message) {
  io.emit('new_alert', {
    device_id: device.device_id,
    type,
    message,
    building: device.building,
    floor: device.floor,
    room: device.room,
    bed: device.bed,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// API ROUTES
// ============================================

/**
 * POST /api/data
 * Receive sensor data from ESP32
 */
app.post('/api/data', async (req, res) => {
  try {
    const {
      device_id,
      building,
      floor,
      room,
      bed,
      vitals,
      alerts,
      battery,
    } = req.body;

    // Validate required fields
    if (!device_id || !building || floor === undefined || !room || bed === undefined || !vitals) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create or update device
    const device = await getOrCreateDevice({
      device_id,
      building,
      floor,
      room,
      bed,
      battery: battery || 0,
    });

    // Insert vitals
    await insertVitals(device_id, vitals);

    // Broadcast new vitals
    broadcastNewVitals(device, vitals);

    // Process incoming alerts
    if (Array.isArray(alerts) && alerts.length > 0) {
      for (const alert of alerts) {
        await insertAlert(device_id, alert.type || 'INFO', alert.message);
        broadcastNewAlert(device, alert.type || 'INFO', alert.message);
      }
    }

    res.json({
      success: true,
      device_id,
      message: 'Data received and processed',
    });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/buildings
 * Return full hierarchy of buildings, floors, rooms, beds with latest vitals
 */
app.get('/api/buildings', async (req, res) => {
  try {
    const hierarchy = await getBuildingHierarchy();
    const result = {};

    // Enrich hierarchy with latest vitals and patient info
    for (const building in hierarchy) {
      result[building] = {};
      for (const floor in hierarchy[building]) {
        result[building][floor] = {};
        for (const room in hierarchy[building][floor]) {
          result[building][floor][room] = [];
          for (const device of hierarchy[building][floor][room]) {
            const latestVital = await getLatestVital(device.device_id);
            const patient = await getPatientByDeviceId(device.device_id);
            const unreadAlerts = await getAllAlerts({ unread: true });
            const deviceAlerts = unreadAlerts.filter((a) => a.device_id === device.device_id);

            result[building][floor][room].push({
              ...device,
              latestVital: latestVital || null,
              patient: patient || null,
              unreadAlerts: deviceAlerts,
              alertCount: deviceAlerts.length,
            });
          }
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devices
 * Get all devices with status
 */
app.get('/api/devices', async (req, res) => {
  try {
    const devices = await getAllDevices();
    const result = [];

    for (const device of devices) {
      const latestVital = await getLatestVital(device.device_id);
      const patient = await getPatientByDeviceId(device.device_id);
      const unreadAlerts = await getAllAlerts({ unread: true });
      const deviceAlerts = unreadAlerts.filter((a) => a.device_id === device.device_id);

      result.push({
        ...device,
        latestVital: latestVital || null,
        patient: patient || null,
        unreadAlerts: deviceAlerts,
        alertCount: deviceAlerts.length,
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bed/:device_id/vitals?limit=50
 * Get vital records for a specific bed
 */
app.get('/api/bed/:device_id/vitals', async (req, res) => {
  try {
    const { device_id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const device = await getDeviceById(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const vitals = await getVitalsByDeviceId(device_id, limit);

    res.json({
      device_id,
      device,
      vitals: vitals.reverse(), // Return in chronological order (oldest first)
    });
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alerts?unread=true&type=CRITICAL
 * Get alerts with optional filters
 */
app.get('/api/alerts', async (req, res) => {
  try {
    const { unread, type } = req.query;

    const filters = {
      type: type || 'ALL',
      unread: unread === 'true',
    };

    const alerts = await getAllAlerts(filters);

    // Enrich alerts with device info
    const enrichedAlerts = [];
    for (const alert of alerts) {
      const device = await getDeviceById(alert.device_id);
      enrichedAlerts.push({
        ...alert,
        device: device || null,
      });
    }

    res.json(enrichedAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
app.get('/api/alerts/stats', async (req, res) => {
  try {
    const allAlerts = await getAllAlerts({});
    const stats = {
      total: allAlerts.length,
      unread: allAlerts.filter((a) => !a.acknowledged).length,
      critical: allAlerts.filter((a) => a.type === 'CRITICAL').length,
      warning: allAlerts.filter((a) => a.type === 'WARNING').length,
      info: allAlerts.filter((a) => a.type === 'INFO').length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alerts/:id/acknowledge
 * Mark an alert as acknowledged
 */
app.post('/api/alerts/:id/acknowledge', async (req, res) => {
  try {
    const { id } = req.params;

    await acknowledgeAlert(parseInt(id));
    const unreadCount = await getUnreadAlertCount();

    // Broadcast updated unread count
    io.emit('alert_acknowledged', {
      alert_id: parseInt(id),
      unreadCount,
    });

    res.json({
      success: true,
      message: 'Alert acknowledged',
      unreadCount,
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/patients
 * Get all patients
 */
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await getAllPatients();
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/patients
 * Create or update patient
 */
app.post('/api/patients', async (req, res) => {
  try {
    const { device_id, name, age, diagnosis } = req.body;

    if (!device_id || !name) {
      return res.status(400).json({ error: 'Missing required fields: device_id, name' });
    }

    const device = await getDeviceById(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const patient = await createOrUpdatePatient(device_id, {
      name,
      age: age || null,
      diagnosis: diagnosis || null,
    });

    res.json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error('Error creating/updating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/patients/:device_id
 * Delete patient
 */
app.delete('/api/patients/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;

    await deletePatient(device_id);

    res.json({
      success: true,
      message: 'Patient deleted',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats
 * Get dashboard statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const devices = await getAllDevices();
    const alerts = await getAllAlerts({});

    const stats = {
      totalBeds: devices.length,
      onlineDevices: devices.filter((d) => {
        const lastSeen = new Date(d.last_seen || 0);
        const now = new Date();
        const diffMinutes = (now - lastSeen) / (1000 * 60);
        return diffMinutes < 5; // Online if seen in last 5 minutes
      }).length,
      criticalAlerts: alerts.filter((a) => a.type === 'CRITICAL' && !a.acknowledged).length,
      warningAlerts: alerts.filter((a) => a.type === 'WARNING' && !a.acknowledged).length,
      unreadAlerts: alerts.filter((a) => !a.acknowledged).length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize and start server
async function startServer() {
  try {
    // Open database connection
    await openDatabase();
    
    // Initialize schema
    await initializeDatabase();

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║   Hospital IoT Monitoring Backend Started    ║
║   Server: http://localhost:${PORT}           ║
║   Environment: ${process.env.NODE_ENV || 'development'}      ║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = { app, server, io };

// ============================================
// API ROUTES
// ============================================

/**
 * POST /api/data
 * Receive sensor data from ESP32
 */
app.post('/api/data', (req, res) => {
  try {
    const {
      device_id,
      building,
      floor,
      room,
      bed,
      vitals,
      alerts,
      battery,
    } = req.body;

    // Validate required fields
    if (!device_id || !building || floor === undefined || !room || bed === undefined || !vitals) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create or update device
    const device = getOrCreateDevice({
      device_id,
      building,
      floor,
      room,
      bed,
      battery: battery || 0,
    });

    // Insert vitals
    const vitalsData = insertVitals(device_id, vitals);

    // Broadcast new vitals
    broadcastNewVitals(device, vitals);

    // Process incoming alerts
    if (Array.isArray(alerts) && alerts.length > 0) {
      alerts.forEach((alert) => {
        insertAlert(device_id, alert.type || 'INFO', alert.message);

        // Broadcast alert to frontend
        io.emit('new_alert', {
          device_id,
          type: alert.type || 'INFO',
          message: alert.message,
          building,
          floor,
          room,
          bed,
          timestamp: new Date().toISOString(),
        });
      });
    }

    res.json({
      success: true,
      device_id,
      message: 'Data received and processed',
    });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/buildings
 * Return full hierarchy of buildings, floors, rooms, beds with latest vitals
 */
app.get('/api/buildings', (req, res) => {
  try {
    const hierarchy = getBuildingHierarchy();
    const result = {};

    // Enrich hierarchy with latest vitals and patient info
    for (const building in hierarchy) {
      result[building] = {};
      for (const floor in hierarchy[building]) {
        result[building][floor] = {};
        for (const room in hierarchy[building][floor]) {
          result[building][floor][room] = hierarchy[building][floor][room].map((device) => {
            const latestVital = getLatestVital(device.device_id);
            const patient = getPatientByDeviceId(device.device_id);
            const unreadAlerts = getAllAlerts({
              unread: true,
              limit: 5,
            }).filter((a) => a.device_id === device.device_id);

            return {
              ...device,
              latestVital: latestVital || null,
              patient: patient || null,
              unreadAlerts,
              alertCount: unreadAlerts.length,
            };
          });
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/devices
 * Get all devices with status
 */
app.get('/api/devices', (req, res) => {
  try {
    const devices = getAllDevices().map((device) => {
      const latestVital = getLatestVital(device.device_id);
      const patient = getPatientByDeviceId(device.device_id);
      const unreadAlerts = getAllAlerts({ unread: true }).filter(
        (a) => a.device_id === device.device_id
      );

      return {
        ...device,
        latestVital: latestVital || null,
        patient: patient || null,
        unreadAlerts,
        alertCount: unreadAlerts.length,
      };
    });

    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/bed/:device_id/vitals?limit=50
 * Get vital records for a specific bed
 */
app.get('/api/bed/:device_id/vitals', (req, res) => {
  try {
    const { device_id } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const device = getDeviceById(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const vitals = getVitalsByDeviceId(device_id, limit);

    res.json({
      device_id,
      device,
      vitals: vitals.reverse(), // Return in chronological order (oldest first)
    });
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alerts?unread=true&type=CRITICAL
 * Get alerts with optional filters
 */
app.get('/api/alerts', (req, res) => {
  try {
    const { unread, type } = req.query;

    const filters = {
      type: type || 'ALL',
      unread: unread === 'true',
    };

    const alerts = getAllAlerts(filters);

    // Enrich alerts with device info
    const enrichedAlerts = alerts.map((alert) => {
      const device = getDeviceById(alert.device_id);
      return {
        ...alert,
        device: device || null,
      };
    });

    res.json(enrichedAlerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alerts/stats
 * Get alert statistics
 */
app.get('/api/alerts/stats', (req, res) => {
  try {
    const allAlerts = getAllAlerts({});
    const stats = {
      total: allAlerts.length,
      unread: allAlerts.filter((a) => !a.acknowledged).length,
      critical: allAlerts.filter((a) => a.type === 'CRITICAL').length,
      warning: allAlerts.filter((a) => a.type === 'WARNING').length,
      info: allAlerts.filter((a) => a.type === 'INFO').length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching alert stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alerts/:id/acknowledge
 * Mark an alert as acknowledged
 */
app.post('/api/alerts/:id/acknowledge', (req, res) => {
  try {
    const { id } = req.params;

    acknowledgeAlert(parseInt(id));
    const unreadCount = getUnreadAlertCount();

    // Broadcast updated unread count
    io.emit('alert_acknowledged', {
      alert_id: parseInt(id),
      unreadCount,
    });

    res.json({
      success: true,
      message: 'Alert acknowledged',
      unreadCount,
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/patients
 * Get all patients
 */
app.get('/api/patients', (req, res) => {
  try {
    const patients = getAllPatients();
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/patients
 * Create or update patient
 */
app.post('/api/patients', (req, res) => {
  try {
    const { device_id, name, age, diagnosis } = req.body;

    if (!device_id || !name) {
      return res.status(400).json({ error: 'Missing required fields: device_id, name' });
    }

    const device = getDeviceById(device_id);
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    const patient = createOrUpdatePatient(device_id, {
      name,
      age: age || null,
      diagnosis: diagnosis || null,
    });

    res.json({
      success: true,
      patient,
    });
  } catch (error) {
    console.error('Error creating/updating patient:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/patients/:device_id
 * Delete patient
 */
app.delete('/api/patients/:device_id', (req, res) => {
  try {
    const { device_id } = req.params;

    deletePatient(device_id);

    res.json({
      success: true,
      message: 'Patient deleted',
    });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/stats
 * Get dashboard statistics
 */
app.get('/api/stats', (req, res) => {
  try {
    const devices = getAllDevices();
    const alerts = getAllAlerts({});

    const stats = {
      totalBeds: devices.length,
      onlineDevices: devices.filter((d) => {
        const lastSeen = new Date(d.last_seen || 0);
        const now = new Date();
        const diffMinutes = (now - lastSeen) / (1000 * 60);
        return diffMinutes < 5; // Online if seen in last 5 minutes
      }).length,
      criticalAlerts: alerts.filter((a) => a.type === 'CRITICAL' && !a.acknowledged).length,
      warningAlerts: alerts.filter((a) => a.type === 'WARNING' && !a.acknowledged).length,
      unreadAlerts: alerts.filter((a) => !a.acknowledged).length,
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║   Hospital IoT Monitoring Backend Started    ║
║   Server: http://localhost:${PORT}           ║
║   Environment: ${process.env.NODE_ENV || 'development'}      ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = { app, server, io };
