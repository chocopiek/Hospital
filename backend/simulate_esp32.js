const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3001';

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Generate 12 virtual ESP32 devices
const devices = [];
const buildings = ['A', 'B', 'C'];
const floors = [1, 2];
const rooms = ['201', '202'];

let deviceId = 1;
for (const building of buildings) {
  for (const floor of floors) {
    for (const room of rooms) {
      devices.push({
        device_id: `ESP32_B${building}_F${floor}_R${room}_BED1`,
        building,
        floor,
        room,
        bed: 1,
        lastAlertTime: {},
      });
      deviceId++;
    }
  }
}

console.log(`
╔════════════════════════════════════════════════╗
║    Hospital IoT ESP32 Simulator                ║
║    Spawning ${devices.length} virtual devices                ║
║    API Endpoint: ${API_URL}              ║
╚════════════════════════════════════════════════╝
`);

/**
 * Generate realistic vital signs
 */
function generateVitals() {
  return {
    heart_rate: 60 + Math.floor(Math.random() * 40), // 60-100 bpm
    spo2: 94 + Math.random() * 6, // 94-100%
    temperature: 36.5 + Math.random() * 1.5, // 36.5-38°C
    blood_pressure_sys: 110 + Math.floor(Math.random() * 30), // 110-140 mmHg
    blood_pressure_dia: 70 + Math.floor(Math.random() * 20), // 70-90 mmHg
  };
}

/**
 * Simulate alerts based on probability
 */
function generateAlerts(vitals, device) {
  const alerts = [];
  const now = Date.now();

  // 5% chance of CRITICAL alert every 5 minutes
  if (Math.random() < 0.02) {
    if (!device.lastAlertTime.critical || now - device.lastAlertTime.critical > 300000) {
      const criticalMessages = [
        'Heart rate critically high',
        'SpO2 critically low',
        'Patient unresponsive',
        'Temperature critical',
      ];
      alerts.push({
        type: 'CRITICAL',
        message: criticalMessages[Math.floor(Math.random() * criticalMessages.length)],
      });
      device.lastAlertTime.critical = now;
    }
  }

  // 10% chance of WARNING alert every 2 minutes
  if (Math.random() < 0.05) {
    if (!device.lastAlertTime.warning || now - device.lastAlertTime.warning > 120000) {
      const warningMessages = [
        'Heart rate elevated',
        'SpO2 slightly low',
        'Temperature slightly high',
        'BP slightly elevated',
        'Irregular readings detected',
      ];
      alerts.push({
        type: 'WARNING',
        message: warningMessages[Math.floor(Math.random() * warningMessages.length)],
      });
      device.lastAlertTime.warning = now;
    }
  }

  return alerts;
}

/**
 * Post data to backend
 */
async function sendData(device) {
  try {
    const vitals = generateVitals();
    const alerts = generateAlerts(vitals, device);
    const battery = 70 + Math.floor(Math.random() * 30) ; // 70-100%

    const payload = {
      device_id: device.device_id,
      building: device.building,
      floor: device.floor,
      room: device.room,
      bed: device.bed,
      timestamp: new Date().toISOString(),
      vitals,
      alerts: alerts.length > 0 ? alerts : [],
      battery,
    };

    const response = await axios.post(`${API_URL}/api/data`, payload);

    // Log with colors
    const alertInfo = alerts.length > 0 
      ? ` | ${alerts.map(a => `${a.type}`).join(', ')}`
      : '';

    const statusColor = alerts.length > 0 
      ? (alerts.some(a => a.type === 'CRITICAL') ? colors.red : colors.yellow)
      : colors.green;

    console.log(
      `${statusColor}[${device.device_id}] HR:${vitals.heart_rate} SpO2:${vitals.spo2.toFixed(1)}% Temp:${vitals.temperature.toFixed(1)}°C Battery:${battery}%${alertInfo}${colors.reset}`
    );

  } catch (error) {
    console.error(
      `${colors.red}[ERROR] ${device.device_id}: ${error.message}${colors.reset}`
    );
  }
}

/**
 * Start simulator
 */
function startSimulator() {
  console.log(`${colors.cyan}Starting data transmission every 10 seconds...${colors.reset}\n`);

  // Send initial data
  devices.forEach((device) => sendData(device));

  // Continue sending every 10 seconds
  setInterval(() => {
    devices.forEach((device) => sendData(device));
  }, 10000);
}

// Wait for API to be ready
async function waitForAPI(maxAttempts = 30) {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_URL}/api/health`);
      console.log(`${colors.green}✓ Connected to backend API${colors.reset}\n`);
      return true;
    } catch (error) {
      attempts++;
      console.log(
        `${colors.yellow}Waiting for API... (attempt ${attempts}/${maxAttempts})${colors.reset}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.error(
    `${colors.red}✗ Could not connect to API after ${maxAttempts} attempts${colors.reset}`
  );
  process.exit(1);
}

// Initialize and start
(async () => {
  await waitForAPI();
  startSimulator();
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n${colors.cyan}Shutting down simulator...${colors.reset}`);
  process.exit(0);
});
