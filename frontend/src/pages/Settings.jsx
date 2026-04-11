import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react';

export function Settings() {
  const [patients, setPatients] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    device_id: '',
    name: '',
    age: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [patientsRes, devicesRes] = await Promise.all([
        fetch('/api/patients').then(r => r.json()),
        fetch('/api/devices').then(r => r.json()),
      ]);
      setPatients(patientsRes);
      setDevices(devicesRes);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsLoading(false);
    }
  };

  const handleAddPatient = async () => {
    if (!formData.device_id || !formData.name) {
      alert('Please select a bed and enter patient name');
      return;
    }

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: formData.device_id,
          name: formData.name,
          age: formData.age ? parseInt(formData.age) : null,
          notes: formData.notes || null,
        }),
      });

      // Handle error responses
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      // Parse success response
      let data;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server: ' + e.message);
      }

      // Add patient to list if we got valid data
      if (data.patient) {
        setPatients([...patients, data.patient]);
      }
      
      alert('Patient added successfully!');
      setFormData({
        device_id: '',
        name: '',
        age: '',
        notes: '',
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding patient:', error);
      alert('Error adding patient: ' + error.message);
    }
  };

  const handleUpdatePatient = async () => {
    if (!formData.device_id || !formData.name) {
      alert('Please fill in device and name');
      return;
    }

    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: formData.device_id,
          name: formData.name,
          age: formData.age ? parseInt(formData.age) : null,
          notes: formData.notes || null,
        }),
      });

      // Handle error responses
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}`);
        } catch (e) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      // Parse success response
      let data;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server: ' + e.message);
      }

      // Update patient in list if we got valid data
      if (data.patient) {
        setPatients(
          patients.map((p) =>
            p.device_id === formData.device_id ? data.patient : p
          )
        );
      }

      alert('Patient updated successfully!');
      setFormData({
        device_id: '',
        name: '',
        age: '',
        notes: '',
      });
      setEditingId(null);
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Error updating patient: ' + error.message);
    }
  };

  const handleDeletePatient = async (device_id) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;

    try {
      const response = await fetch(`/api/patients/${device_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error: ${response.status}`);
      }

      setPatients(patients.filter((p) => p.device_id !== device_id));
      alert('Patient deleted successfully!');
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Error deleting patient: ' + error.message);
    }
  };

  const handleEdit = (patient) => {
    setFormData({
      device_id: patient.device_id,
      name: patient.name,
      age: patient.age || '',
      notes: patient.notes || '',
    });
    setEditingId(patient.device_id);
  };

  const handleCancel = () => {
    setFormData({
      device_id: '',
      name: '',
      age: '',
      notes: '',
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Settings</h1>
        <p className="text-gray-600">Manage hospital patients and device configurations</p>
      </div>

      {/* Patient Management */}
      <div className="bg-white rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Patient Management</h2>
          {!showAddForm && !editingId && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Patient
            </button>
          )}
        </div>

        {/* Add/Edit Form */}
        {(showAddForm || editingId) && (
          <div className="bg-gray-50 p-6 rounded-lg mb-8 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Patient' : 'Add New Patient'}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Device Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Bed <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.device_id}
                  onChange={(e) =>
                    setFormData({ ...formData, device_id: e.target.value })
                  }
                  disabled={editingId}
                  placeholder="Enter bed ID (e.g., BED-A1-1)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>

              {/* Patient Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Patient Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter patient name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="Enter age"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notes
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Enter medical notes"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3">
              <button
                onClick={editingId ? handleUpdatePatient : handleAddPatient}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-5 h-5" />
                {editingId ? 'Update' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Patients Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading patients...</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-gray-500">No patients added yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Device
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Age
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Diagnosis
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Admitted
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.map((patient) => (
                  <tr
                    key={patient.device_id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-gray-600">
                        {patient.device_id}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-gray-900">
                        {patient.name}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{patient.age || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {patient.diagnosis || 'N/A'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {new Date(patient.admitted_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(patient)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePatient(patient.device_id)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vital Sign Thresholds */}
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Vital Sign Thresholds</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              vital: 'Heart Rate',
              unit: 'bpm',
              normal: '60 - 100',
              warning: '50 - 110',
              critical: '< 40 or > 120',
            },
            {
              vital: 'SpO2 Saturation',
              unit: '%',
              normal: '95 - 100',
              warning: '90 - 94',
              critical: '< 90',
            },
            {
              vital: 'Temperature',
              unit: '°C',
              normal: '36.5 - 37.5',
              warning: '36 - 38',
              critical: '< 35 or > 39',
            },
            {
              vital: 'Systolic BP',
              unit: 'mmHg',
              normal: '100 - 120',
              warning: '90 - 130',
              critical: '< 80 or > 140',
            },
            {
              vital: 'Diastolic BP',
              unit: 'mmHg',
              normal: '60 - 80',
              warning: '50 - 90',
              critical: '< 40 or > 100',
            },
            {
              vital: 'Respiratory Rate',
              unit: 'breaths/min',
              normal: '12 - 20',
              warning: '10 - 25',
              critical: '< 8 or > 30',
            },
          ].map((threshold, idx) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-3">{threshold.vital}</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-gray-600">Normal</p>
                  <p className="font-semibold text-green-700">
                    {threshold.normal} {threshold.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Warning</p>
                  <p className="font-semibold text-yellow-700">
                    {threshold.warning} {threshold.unit}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Critical</p>
                  <p className="font-semibold text-red-700">
                    {threshold.critical} {threshold.unit}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-gray-600 mt-6 p-4 bg-blue-50 rounded-lg">
          💡 <strong>Note:</strong> These are standard medical thresholds. Adjust based on individual patient conditions and physician recommendations. Custom thresholds per patient can be configured through the patient management interface.
        </p>
      </div>
    </div>
  );
}

export default Settings;
