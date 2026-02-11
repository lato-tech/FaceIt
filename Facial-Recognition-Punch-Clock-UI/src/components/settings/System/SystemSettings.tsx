import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography, Button, Alert
} from '@mui/material';
import {
  Save as SaveIcon, GraduationCap as GraduationCapIcon,
  Stethoscope as StethoscopeIcon,
  HardHat as HardHatIcon,
  Landmark as LandmarkIcon
} from 'lucide-react';
import { useLanguage } from '../../../utils/i18n';
import { useAppContext } from '../../../context/AppContext';
import { getWeatherDescription } from '../../../utils/weatherDescription';
import LanguageSettingsPanel from './LanguageSetting';
import AIFeaturesPanel from './AIFeature';
import AIPerformancePanel from './AIPerformance';
import SpecialFeaturesPanel from './SpecialFeature';
import WeatherPanel from './WeatherSettings';
import SystemStatusPanel from './SystemStatusPanel';
import CameraSettingsPanel from './CameraSettingsPanel';
import ERPNextSettingsPanel from './ERPNextSettingsPanel';
import DeviceSettingsPanel from './DeviceSettingsPanel';
import TimeSettingsPanel from './TimeSettingsPanel';
import AttendanceSettingsPanel from './AttendanceSettingsPanel';

const API_BASE = (import.meta as any).env?.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

const industries = [
  { id: 'school', name: 'School & College', icon: GraduationCapIcon, path: '/settings/industry/school' },
  { id: 'hospital', name: 'Hospital & Clinic', icon: StethoscopeIcon, path: '/settings/industry/hospital' },
  { id: 'government', name: 'Government', icon: LandmarkIcon, path: '/settings/industry/government' },
  { id: 'construction', name: 'Construction', icon: HardHatIcon, path: '/settings/industry/construction' },
];

const SystemSettings = () => {
  const { setLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    faceDetectionThreshold: 0.85,
    recognitionDistance: 0.5,
    cameraResolution: '1080p',
    streamResolution: '720p',
    streamQuality: 90,
    streamFps: 30,
    colorTone: 'natural',
    enhancedLighting: true,
    aiFeatures: {
      enhancedRecognition: true,
      multiPersonDetection: true,
      emotionDetection: false,
      ageEstimation: false,
      maskDetection: true,
      antispoofing: true,
      behaviorAnalysis: false,
      glassesDetection: true,
    },
    aiPerformance: {
      modelOptimization: 'balanced',
      processingUnit: 'auto',
      confidenceThreshold: 0.85,
    },
    language: 'en',
    autoTranslate: false,
  });
  const { cityData, setCityData } = useAppContext();
  const [deviceSettings, setDeviceSettings] = useState({
    organization: '',
    location: '',
  });
  const [deviceInfo, setDeviceInfo] = useState<{ internalIp?: string | null; externalIp?: string | null; tailscaleIp?: string | null }>({});
  const [timeSettings, setTimeSettings] = useState({
    timeSource: 'auto',
    ntpServers: ['time.google.com', 'pool.ntp.org', 'time.cloudflare.com', 'time.windows.com'],
    timeFormat: '24h',
  });
  const [attendanceSettings, setAttendanceSettings] = useState({
    duplicatePunchIntervalSec: 30,
  });
  const [savedSnapshots, setSavedSnapshots] = useState<any>(null);
  const [baselineSnapshots, setBaselineSnapshots] = useState<any>(null);
  const [erpnextSettings, setErpnextSettings] = useState({
    serverUrl: '',
    username: '',
    password: '',
    apiKey: '',
    apiSecret: '',
    company: '',
    syncInterval: 5,
    sendLogs: {
      recognition: true,
      registration: true,
      unknown: false,
    },
  });

  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [logIntervalSec, setLogIntervalSec] = useState(() => {
    const saved = localStorage.getItem('systemLogIntervalSec');
    return saved ? Number(saved) : 30;
  });

  // Load camera settings on mount
  useEffect(() => {
    const init = async () => {
      const [camera, ai, erp, device, time, attendance] = await Promise.all([
        fetchCameraSettings(),
        fetchAISettings(),
        fetchERPNextSettings(),
        fetchDeviceSettings(),
        fetchDeviceInfo(),
        fetchTimeSettings(),
        fetchAttendanceSettings(),
      ]);
      const nextSettings = {
        ...settings,
        ...(camera || {}),
        aiFeatures: { ...settings.aiFeatures, ...(ai?.aiFeatures || {}) },
        aiPerformance: { ...settings.aiPerformance, ...(ai?.aiPerformance || {}) },
      };
      const nextErp = { ...erpnextSettings, ...(erp || {}) };
      const nextDevice = { ...deviceSettings, ...(device || {}) };
      const nextTime = { ...timeSettings, ...(time || {}) };
      const nextAttendance = { ...attendanceSettings, ...(attendance || {}) };
      setSettings(nextSettings);
      setErpnextSettings(nextErp);
      setDeviceSettings(nextDevice);
      setTimeSettings(nextTime);
      setAttendanceSettings(nextAttendance);
      if (cityData?.city) {
        setInputValue(`${cityData.city}`);
        setSelectedCity({
          name: cityData.city,
          country: cityData.country,
          latitude: cityData.lat,
          longitude: cityData.lon,
        });
        if (cityData.temp && cityData.wind && cityData.weathercode) {
          setWeather({
            temperature: Number(String(cityData.temp).replace('°C', '')),
            windspeed: Number(String(cityData.wind).replace('km/h', '')),
            weathercode: cityData.weathercode,
          });
        }
      }
      setBaselineSnapshots({
        settings: JSON.parse(JSON.stringify(nextSettings)),
        erpnextSettings: JSON.parse(JSON.stringify(nextErp)),
        deviceSettings: JSON.parse(JSON.stringify(nextDevice)),
        timeSettings: JSON.parse(JSON.stringify(nextTime)),
        attendanceSettings: JSON.parse(JSON.stringify(nextAttendance)),
        cityData: JSON.parse(JSON.stringify(cityData)),
        logIntervalSec,
      });
    };
    init();
  }, []);

  const fetchCameraSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/camera-settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          faceDetectionThreshold: data.faceDetectionThreshold ?? prev.faceDetectionThreshold,
          recognitionDistance: data.recognitionDistance ?? prev.recognitionDistance,
          cameraResolution: data.cameraResolution ?? prev.cameraResolution,
          streamResolution: data.streamResolution ?? prev.streamResolution,
          streamQuality: data.streamQuality ?? prev.streamQuality,
          streamFps: data.streamFps ?? prev.streamFps,
          colorTone: data.colorTone ?? prev.colorTone,
          enhancedLighting: data.enhancedLighting ?? prev.enhancedLighting,
        }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching camera settings:', error);
    }
    return null;
  };

  const fetchAISettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/ai-settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings((prev) => ({
          ...prev,
          aiFeatures: { ...prev.aiFeatures, ...(data.aiFeatures || {}) },
          aiPerformance: { ...prev.aiPerformance, ...(data.aiPerformance || {}) },
        }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching AI settings:', error);
    }
    return null;
  };

  const fetchERPNextSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/erpnext-settings`);
      if (response.ok) {
        const data = await response.json();
        setErpnextSettings((prev) => ({ ...prev, ...data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching ERPNext settings:', error);
    }
    return null;
  };

  const fetchDeviceSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/device-settings`);
      if (response.ok) {
        const data = await response.json();
        setDeviceSettings((prev) => ({ ...prev, ...data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching device settings:', error);
    }
    return null;
  };

  const fetchDeviceInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/device-info`);
      if (response.ok) {
        const data = await response.json();
        setDeviceInfo(data);
        return data;
      }
    } catch (error) {
      console.error('Error fetching device info:', error);
    }
    return null;
  };

  const fetchTimeSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/time-settings`);
      if (response.ok) {
        const data = await response.json();
        setTimeSettings((prev) => ({ ...prev, ...data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching time settings:', error);
    }
    return null;
  };

  const fetchAttendanceSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/attendance-settings`);
      if (response.ok) {
        const data = await response.json();
        setAttendanceSettings((prev) => ({ ...prev, ...data }));
        return data;
      }
    } catch (error) {
      console.error('Error fetching attendance settings:', error);
    }
    return null;
  };

  const handleERPNextSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_BASE}/system/erpnext-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(erpnextSettings),
      });
      if (response.ok) {
        setMessage({ type: 'success', text: 'ERPNext settings saved' });
        setTimeout(() => setMessage(null), 3000);
        setSavedSnapshots((prev: any) => ({
          ...(prev || {}),
          erpnextSettings: JSON.parse(JSON.stringify(erpnextSettings)),
        }));
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to save ERPNext settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save ERPNext settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleERPNextTest = async () => {
    try {
      const response = await fetch(`${API_BASE}/erpnext/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(erpnextSettings),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'ERPNext connection OK' });
      } else {
        setMessage({ type: 'error', text: data.error || 'ERPNext connection failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'ERPNext connection failed' });
    }
  };

  const handleERPNextSync = async () => {
    try {
      const response = await fetch(`${API_BASE}/erpnext/sync`, { method: 'POST' });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: `Sync complete: ${data.sent} logs` });
      } else {
        setMessage({ type: 'error', text: data.error || 'Sync failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sync failed' });
    }
  };



  const handleInputChange = async (_event: any, value: string) => {
    setInputValue(value);
    if (value.length < 3) return; // wait until 3 chars to search

    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(value)}&count=5&language=en&format=json`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.results) {
        setOptions(data.results);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const handleCitySelect = async (_event: any, newValue: any) => {
    setSelectedCity(newValue);
    setWeather(null);
    if (!newValue) return;

    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${newValue.latitude}&longitude=${newValue.longitude}&current_weather=true`;
      const res = await fetch(url);
      const data = await res.json();
      setWeather(data.current_weather);

      setCityData({
        city: newValue.name,
        country: newValue.country,
        lat: newValue.latitude,
        lon: newValue.longitude,
        timezoneOffset: data.utc_offset_seconds || 5.5 * 3600,
        temp: `${data.current_weather.temperature}°C`,
        wind: `${data.current_weather.windspeed}km/h`,
        discription: getWeatherDescription(data.current_weather.weathercode)
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      // Save camera settings
      const cameraSettings = {
        faceDetectionThreshold: settings.faceDetectionThreshold,
        recognitionDistance: settings.recognitionDistance,
        cameraResolution: settings.cameraResolution,
        streamResolution: settings.streamResolution ?? '720p',
        streamQuality: settings.streamQuality ?? 90,
        streamFps: settings.streamFps ?? 30,
        colorTone: settings.colorTone,
        enhancedLighting: settings.enhancedLighting,
      };

      const response = await fetch(`${API_BASE}/system/camera-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cameraSettings),
      });

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('cameraSettingsSaved'));
      }

      const aiSettings = {
        aiFeatures: settings.aiFeatures,
        aiPerformance: settings.aiPerformance,
      };

      const aiResponse = await fetch(`${API_BASE}/system/ai-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiSettings),
      });

      const deviceResponse = await fetch(`${API_BASE}/system/device-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deviceSettings),
      });

      const timeResponse = await fetch(`${API_BASE}/system/time-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(timeSettings),
      });
      const attendanceResponse = await fetch(`${API_BASE}/system/attendance-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attendanceSettings),
      });

      if (response.ok && aiResponse.ok && deviceResponse.ok && timeResponse.ok && attendanceResponse.ok) {
        setMessage({ type: 'success', text: 'Settings saved successfully' });
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
        localStorage.setItem('systemLogIntervalSec', String(logIntervalSec));
        setSavedSnapshots({
          settings: JSON.parse(JSON.stringify(settings)),
          aiSettings: JSON.parse(JSON.stringify(aiSettings)),
          erpnextSettings: JSON.parse(JSON.stringify(erpnextSettings)),
          deviceSettings: JSON.parse(JSON.stringify(deviceSettings)),
          timeSettings: JSON.parse(JSON.stringify(timeSettings)),
          attendanceSettings: JSON.parse(JSON.stringify(attendanceSettings)),
          cityData: JSON.parse(JSON.stringify(cityData)),
          logIntervalSec,
        });
        setBaselineSnapshots({
          settings: JSON.parse(JSON.stringify(settings)),
          erpnextSettings: JSON.parse(JSON.stringify(erpnextSettings)),
          deviceSettings: JSON.parse(JSON.stringify(deviceSettings)),
          timeSettings: JSON.parse(JSON.stringify(timeSettings)),
          attendanceSettings: JSON.parse(JSON.stringify(attendanceSettings)),
          cityData: JSON.parse(JSON.stringify(cityData)),
          logIntervalSec,
        });
      } else {
        const data = await response.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error || 'Failed to save settings' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage({ type: 'error', text: 'Error saving settings' });
    } finally {
      setSaving(false);
    }
  };

  const compareSnapshots = savedSnapshots || baselineSnapshots;
  const hasUnsavedChanges = Boolean(compareSnapshots) && (
    JSON.stringify(settings) !== JSON.stringify(compareSnapshots.settings) ||
    JSON.stringify(erpnextSettings) !== JSON.stringify(compareSnapshots.erpnextSettings) ||
    JSON.stringify(deviceSettings) !== JSON.stringify(compareSnapshots.deviceSettings) ||
    JSON.stringify(timeSettings) !== JSON.stringify(compareSnapshots.timeSettings) ||
    JSON.stringify(attendanceSettings) !== JSON.stringify(compareSnapshots.attendanceSettings) ||
    JSON.stringify(cityData) !== JSON.stringify(compareSnapshots.cityData) ||
    logIntervalSec !== compareSnapshots.logIntervalSec
  );

  return (
    <Box component="form" sx={{
      padding: "24px",
      width: '100%',
      boxSizing: 'border-box',
    }} onSubmit={handleSubmit}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          System Settings
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          {hasUnsavedChanges && (
            <Typography variant="body2" color="warning.main">
              Unsaved changes
            </Typography>
          )}
          <Button
            variant="outlined"
            size="large"
            disabled={!savedSnapshots || !hasUnsavedChanges}
            onClick={() => {
              if (!savedSnapshots) return;
              setSettings(savedSnapshots.settings);
              setErpnextSettings(savedSnapshots.erpnextSettings);
              setDeviceSettings(savedSnapshots.deviceSettings);
              if (savedSnapshots.timeSettings) {
                setTimeSettings(savedSnapshots.timeSettings);
              }
              if (savedSnapshots.attendanceSettings) {
                setAttendanceSettings(savedSnapshots.attendanceSettings);
              }
              if (savedSnapshots.cityData) {
                setCityData(savedSnapshots.cityData);
              }
              if (typeof savedSnapshots.logIntervalSec === 'number') {
                setLogIntervalSec(savedSnapshots.logIntervalSec);
                localStorage.setItem('systemLogIntervalSec', String(savedSnapshots.logIntervalSec));
              }
            }}
          >
            Restore
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            size="large"
            sx={{ 
              px: 3, 
              py: 1.5,
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'none',
              bgcolor: hasUnsavedChanges ? 'warning.main' : 'grey.700',
              color: hasUnsavedChanges ? 'black' : 'white',
            }}
            startIcon={<SaveIcon size={20} />}
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </Box>
      </Box>
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mt: 2, mb: 2 }} 
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
      <Box
        sx={{
          mt: 2,
          width: '100%',
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'repeat(12, 1fr)' },
        }}
      >
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' }, display: 'flex' }}>
          <SystemStatusPanel
            logIntervalSec={logIntervalSec}
            onLogIntervalChange={(next) => {
              setLogIntervalSec(next);
              localStorage.setItem('systemLogIntervalSec', String(next));
            }}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 3' }, display: 'flex' }}>
          <CameraSettingsPanel settings={settings} setSettings={setSettings} />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, display: 'flex' }}>
          <WeatherPanel
            inputValue={inputValue}
            setInputValue={setInputValue}
            options={options}
            handleInputChange={handleInputChange}
            handleCitySelect={handleCitySelect}
            weather={weather}
            selectedCity={selectedCity}
            loading={loading}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, display: 'flex' }}>
          <TimeSettingsPanel settings={timeSettings} setSettings={setTimeSettings} />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, display: 'flex' }}>
          <AttendanceSettingsPanel settings={attendanceSettings} setSettings={setAttendanceSettings} />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, display: 'flex' }}>
          <SpecialFeaturesPanel industries={industries} />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, display: 'flex' }}>
          <AIFeaturesPanel aiFeatures={settings.aiFeatures} setSettings={setSettings} />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, display: 'flex' }}>
          <AIPerformancePanel aiPerformance={settings.aiPerformance} setSettings={setSettings} />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 4' }, display: 'flex' }}>
          <LanguageSettingsPanel
            language={settings.language}
            autoTranslate={settings.autoTranslate}
            setSettings={setSettings}
            setLanguage={setLanguage}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 8' }, display: 'flex' }}>
          <DeviceSettingsPanel
            deviceSettings={deviceSettings}
            setDeviceSettings={setDeviceSettings}
            deviceInfo={deviceInfo}
          />
        </Box>
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 8' }, display: 'flex' }}>
          <ERPNextSettingsPanel
            settings={erpnextSettings}
            setSettings={setErpnextSettings}
            onSave={handleERPNextSave}
            onTest={handleERPNextTest}
            onSync={handleERPNextSync}
            saving={saving}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default SystemSettings;
