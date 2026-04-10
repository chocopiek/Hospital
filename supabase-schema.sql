-- Hospital IoT Monitoring - Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL,
  building VARCHAR(50) NOT NULL,
  floor INTEGER NOT NULL,
  room VARCHAR(50) NOT NULL,
  bed INTEGER NOT NULL,
  last_seen TIMESTAMPTZ,
  battery INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vitals table
CREATE TABLE IF NOT EXISTS vitals (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  heart_rate INTEGER,
  spo2 FLOAT,
  temperature FLOAT,
  bp_sys INTEGER,
  bp_dia INTEGER,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  device_id VARCHAR(255) UNIQUE NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  diagnosis TEXT,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vitals_device_recorded ON vitals(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_device_created ON alerts(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_devices_building_floor ON devices(building, floor);
CREATE INDEX IF NOT EXISTS idx_patients_device_id ON patients(device_id);

-- Enable Row Level Security (optional - disable for development)
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anonymous access (for development)
-- In production, replace with proper authentication policies
CREATE POLICY "Enable read access for all users" ON devices FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON devices FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON vitals FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON vitals FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON alerts FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON alerts FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON patients FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON patients FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON patients FOR UPDATE USING (true);

-- Enable Realtime for tables (required for Supabase Realtime subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE vitals;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE patients;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set default values for timestamps
ALTER TABLE devices ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE patients ALTER COLUMN updated_at SET DEFAULT NOW();
