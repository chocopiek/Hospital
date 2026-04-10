const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'hospital.db');
let db = null;

/**
 * Initialize database schema
 */
function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      try {
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');

        // Create devices table
        db.run(`
          CREATE TABLE IF NOT EXISTS devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT UNIQUE NOT NULL,
            building TEXT NOT NULL,
            floor INTEGER NOT NULL,
            room TEXT NOT NULL,
            bed INTEGER NOT NULL,
            last_seen TEXT,
            battery INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        `);

        // Create vitals table
        db.run(`
          CREATE TABLE IF NOT EXISTS vitals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            heart_rate INTEGER,
            spo2 REAL,
            temperature REAL,
            bp_sys INTEGER,
            bp_dia INTEGER,
            recorded_at TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
          )
        `);

        // Create alerts table
        db.run(`
          CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            acknowledged INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
          )
        `);

        // Create patients table
        db.run(`
          CREATE TABLE IF NOT EXISTS patients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            age INTEGER,
            diagnosis TEXT,
            admitted_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else {
            // Create indexes
            db.serialize(() => {
              db.run(`CREATE INDEX IF NOT EXISTS idx_vitals_device_recorded ON vitals(device_id, recorded_at DESC)`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_device_created ON alerts(device_id, created_at DESC)`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged)`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_devices_building_floor ON devices(building, floor)`, (err) => {
                if (err) reject(err);
                else {
                  console.log('✓ Database schema initialized successfully');
                  resolve();
                }
              });
            });
          }
        });
      } catch (error) {
        console.error('✗ Error initializing database:', error.message);
        reject(error);
      }
    });
  });
}

/**
 * Open database connection
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) reject(err);
      else {
        console.log('✓ Database connection opened');
        resolve();
      }
    });
  });
}

/**
 * Device operations
 */
function getOrCreateDevice(deviceData) {
  return new Promise((resolve, reject) => {
    const {
      device_id,
      building,
      floor,
      room,
      bed,
      battery,
    } = deviceData;

    const now = new Date().toISOString();

    db.get('SELECT id FROM devices WHERE device_id = ?', [device_id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row) {
        db.run(
          `UPDATE devices SET last_seen = ?, battery = ?, updated_at = ? WHERE device_id = ?`,
          [now, battery, now, device_id],
          (err) => {
            if (err) reject(err);
            else {
              db.get('SELECT * FROM devices WHERE device_id = ?', [device_id], (err, device) => {
                if (err) reject(err);
                else resolve(device);
              });
            }
          }
        );
      } else {
        db.run(
          `INSERT INTO devices (device_id, building, floor, room, bed, last_seen, battery, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [device_id, building, floor, room, bed, now, battery, now, now],
          (err) => {
            if (err) reject(err);
            else {
              db.get('SELECT * FROM devices WHERE device_id = ?', [device_id], (err, device) => {
                if (err) reject(err);
                else resolve(device);
              });
            }
          }
        );
      }
    });
  });
}

function getAllDevices() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM devices ORDER BY building, floor, room, bed', (err, devices) => {
      if (err) reject(err);
      else resolve(devices || []);
    });
  });
}

function getDeviceById(device_id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM devices WHERE device_id = ?', [device_id], (err, device) => {
      if (err) reject(err);
      else resolve(device);
    });
  });
}

function getBuildingHierarchy() {
  return new Promise((resolve, reject) => {
    getAllDevices().then((devices) => {
      const hierarchy = {};

      devices.forEach((device) => {
        if (!hierarchy[device.building]) {
          hierarchy[device.building] = {};
        }
        if (!hierarchy[device.building][device.floor]) {
          hierarchy[device.building][device.floor] = {};
        }
        if (!hierarchy[device.building][device.floor][device.room]) {
          hierarchy[device.building][device.floor][device.room] = [];
        }

        hierarchy[device.building][device.floor][device.room].push(device);
      });

      resolve(hierarchy);
    }).catch(reject);
  });
}

/**
 * Vitals operations
 */
function insertVitals(device_id, vitals) {
  return new Promise((resolve, reject) => {
    const { heart_rate, spo2, temperature, blood_pressure_sys, blood_pressure_dia } = vitals;
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO vitals (device_id, heart_rate, spo2, temperature, bp_sys, bp_dia, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [device_id, heart_rate, spo2, temperature, blood_pressure_sys, blood_pressure_dia, now],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

function getVitalsByDeviceId(device_id, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM vitals WHERE device_id = ? ORDER BY recorded_at DESC LIMIT ?`,
      [device_id, limit],
      (err, vitals) => {
        if (err) reject(err);
        else resolve(vitals || []);
      }
    );
  });
}

function getLatestVital(device_id) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM vitals WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 1`,
      [device_id],
      (err, vital) => {
        if (err) reject(err);
        else resolve(vital);
      }
    );
  });
}

/**
 * Alerts operations
 */
function insertAlert(device_id, type, message) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO alerts (device_id, type, message, acknowledged, created_at)
       VALUES (?, ?, ?, 0, ?)`,
      [device_id, type, message, now],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

function getAllAlerts(filters = {}) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM alerts WHERE 1=1';
    const params = [];

    if (filters.type && filters.type !== 'ALL') {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters.unread) {
      query += ' AND acknowledged = 0';
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    db.all(query, params, (err, alerts) => {
      if (err) reject(err);
      else resolve(alerts || []);
    });
  });
}

function getAlertsByDeviceId(device_id) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM alerts WHERE device_id = ? ORDER BY created_at DESC`,
      [device_id],
      (err, alerts) => {
        if (err) reject(err);
        else resolve(alerts || []);
      }
    );
  });
}

function acknowledgeAlert(alert_id) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE alerts SET acknowledged = 1 WHERE id = ?`,
      [alert_id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

function getUnreadAlertCount() {
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0', (err, result) => {
      if (err) reject(err);
      else resolve(result.count || 0);
    });
  });
}

/**
 * Patients operations
 */
function createOrUpdatePatient(device_id, patientData) {
  return new Promise((resolve, reject) => {
    const { name, age, diagnosis } = patientData;
    const now = new Date().toISOString();

    db.get('SELECT id FROM patients WHERE device_id = ?', [device_id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      if (row) {
        db.run(
          `UPDATE patients SET name = ?, age = ?, diagnosis = ?, updated_at = ? WHERE device_id = ?`,
          [name, age, diagnosis, now, device_id],
          (err) => {
            if (err) reject(err);
            else {
              db.get('SELECT * FROM patients WHERE device_id = ?', [device_id], (err, patient) => {
                if (err) reject(err);
                else resolve(patient);
              });
            }
          }
        );
      } else {
        const admitted_at = now;
        db.run(
          `INSERT INTO patients (device_id, name, age, diagnosis, admitted_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [device_id, name, age, diagnosis, admitted_at, now, now],
          (err) => {
            if (err) reject(err);
            else {
              db.get('SELECT * FROM patients WHERE device_id = ?', [device_id], (err, patient) => {
                if (err) reject(err);
                else resolve(patient);
              });
            }
          }
        );
      }
    });
  });
}

function getAllPatients() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM patients ORDER BY name', (err, patients) => {
      if (err) reject(err);
      else resolve(patients || []);
    });
  });
}

function getPatientByDeviceId(device_id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM patients WHERE device_id = ?', [device_id], (err, patient) => {
      if (err) reject(err);
      else resolve(patient);
    });
  });
}

function deletePatient(device_id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM patients WHERE device_id = ?', [device_id], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

/**
 * Export all functions
 */
module.exports = {
  db,
  openDatabase,
  initializeDatabase,
  // Device operations
  getOrCreateDevice,
  getAllDevices,
  getDeviceById,
  getBuildingHierarchy,
  // Vitals operations
  insertVitals,
  getVitalsByDeviceId,
  getLatestVital,
  // Alerts operations
  insertAlert,
  getAllAlerts,
  getAlertsByDeviceId,
  acknowledgeAlert,
  getUnreadAlertCount,
  // Patients operations
  createOrUpdatePatient,
  getAllPatients,
  getPatientByDeviceId,
  deletePatient,
};

/**
 * Device operations
 */
function getOrCreateDevice(deviceData) {
  const {
    device_id,
    building,
    floor,
    room,
    bed,
    battery,
  } = deviceData;

  const now = new Date().toISOString();

  try {
    const existing = db
      .prepare('SELECT id FROM devices WHERE device_id = ?')
      .get(device_id);

    if (existing) {
      db.prepare(`
        UPDATE devices
        SET last_seen = ?, battery = ?, updated_at = ?
        WHERE device_id = ?
      `).run(now, battery, now, device_id);

      return db
        .prepare('SELECT * FROM devices WHERE device_id = ?')
        .get(device_id);
    } else {
      db.prepare(`
        INSERT INTO devices (device_id, building, floor, room, bed, last_seen, battery, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(device_id, building, floor, room, bed, now, battery, now, now);

      return db
        .prepare('SELECT * FROM devices WHERE device_id = ?')
        .get(device_id);
    }
  } catch (error) {
    console.error('Error in getOrCreateDevice:', error.message);
    throw error;
  }
}

function getAllDevices() {
  return db.prepare('SELECT * FROM devices ORDER BY building, floor, room, bed').all();
}

function getDeviceById(device_id) {
  return db.prepare('SELECT * FROM devices WHERE device_id = ?').get(device_id);
}

function getBuildingHierarchy() {
  const devices = getAllDevices();
  const hierarchy = {};

  devices.forEach((device) => {
    if (!hierarchy[device.building]) {
      hierarchy[device.building] = {};
    }
    if (!hierarchy[device.building][device.floor]) {
      hierarchy[device.building][device.floor] = {};
    }
    if (!hierarchy[device.building][device.floor][device.room]) {
      hierarchy[device.building][device.floor][device.room] = [];
    }

    hierarchy[device.building][device.floor][device.room].push(device);
  });

  return hierarchy;
}

/**
 * Vitals operations
 */
function insertVitals(device_id, vitals) {
  const { heart_rate, spo2, temperature, blood_pressure_sys, blood_pressure_dia } = vitals;
  const now = new Date().toISOString();

  return db.prepare(`
    INSERT INTO vitals (device_id, heart_rate, spo2, temperature, bp_sys, bp_dia, recorded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(device_id, heart_rate, spo2, temperature, blood_pressure_sys, blood_pressure_dia, now);
}

function getVitalsByDeviceId(device_id, limit = 50) {
  return db.prepare(`
    SELECT * FROM vitals
    WHERE device_id = ?
    ORDER BY recorded_at DESC
    LIMIT ?
  `).all(device_id, limit);
}

function getLatestVital(device_id) {
  return db.prepare(`
    SELECT * FROM vitals
    WHERE device_id = ?
    ORDER BY recorded_at DESC
    LIMIT 1
  `).get(device_id);
}

/**
 * Alerts operations
 */
function insertAlert(device_id, type, message) {
  const now = new Date().toISOString();

  return db.prepare(`
    INSERT INTO alerts (device_id, type, message, acknowledged, created_at)
    VALUES (?, ?, ?, 0, ?)
  `).run(device_id, type, message, now);
}

function getAllAlerts(filters = {}) {
  let query = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];

  if (filters.type && filters.type !== 'ALL') {
    query += ' AND type = ?';
    params.push(filters.type);
  }

  if (filters.unread) {
    query += ' AND acknowledged = 0';
  }

  query += ' ORDER BY created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  return db.prepare(query).all(...params);
}

function getAlertsByDeviceId(device_id) {
  return db.prepare(`
    SELECT * FROM alerts
    WHERE device_id = ?
    ORDER BY created_at DESC
  `).all(device_id);
}

function acknowledgeAlert(alert_id) {
  const now = new Date().toISOString();
  return db.prepare(`
    UPDATE alerts
    SET acknowledged = 1
    WHERE id = ?
  `).run(alert_id);
}

function getUnreadAlertCount() {
  const result = db.prepare('SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0').get();
  return result.count;
}

/**
 * Patients operations
 */
function createOrUpdatePatient(device_id, patientData) {
  const { name, age, diagnosis } = patientData;
  const now = new Date().toISOString();

  try {
    const existing = db
      .prepare('SELECT id FROM patients WHERE device_id = ?')
      .get(device_id);

    if (existing) {
      db.prepare(`
        UPDATE patients
        SET name = ?, age = ?, diagnosis = ?, updated_at = ?
        WHERE device_id = ?
      `).run(name, age, diagnosis, now, device_id);
    } else {
      const admitted_at = now;
      db.prepare(`
        INSERT INTO patients (device_id, name, age, diagnosis, admitted_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(device_id, name, age, diagnosis, admitted_at, now, now);
    }

    return db.prepare('SELECT * FROM patients WHERE device_id = ?').get(device_id);
  } catch (error) {
    console.error('Error in createOrUpdatePatient:', error.message);
    throw error;
  }
}

function getAllPatients() {
  return db.prepare('SELECT * FROM patients ORDER BY name').all();
}

function getPatientByDeviceId(device_id) {
  return db.prepare('SELECT * FROM patients WHERE device_id = ?').get(device_id);
}

function deletePatient(device_id) {
  return db.prepare('DELETE FROM patients WHERE device_id = ?').run(device_id);
}

/**
 * Export all functions
 */
module.exports = {
  db,
  initializeDatabase,
  // Device operations
  getOrCreateDevice,
  getAllDevices,
  getDeviceById,
  getBuildingHierarchy,
  // Vitals operations
  insertVitals,
  getVitalsByDeviceId,
  getLatestVital,
  // Alerts operations
  insertAlert,
  getAllAlerts,
  getAlertsByDeviceId,
  acknowledgeAlert,
  getUnreadAlertCount,
  // Patients operations
  createOrUpdatePatient,
  getAllPatients,
  getPatientByDeviceId,
  deletePatient,
};
