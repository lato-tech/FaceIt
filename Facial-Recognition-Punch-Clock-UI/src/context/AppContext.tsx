import React, { createContext, useState, useContext, useEffect } from 'react';
import { getWeatherDescription } from '../utils/weatherDescription';

export const AppContext = createContext<any>(null);
const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

const CPU_ALERT_THRESHOLD = 85;

// Default coordinates until user saves their own location.
const DEFAULT_CITY = {
  city: 'Pathankot',
  country: '',
  state: '',
  lat: 32.2669,
  lon: 75.6444,
  timezoneOffset: 330, // IST offset in minutes
};

const pickForecastAtHours = (hourly: any, targetHoursAhead: number) => {
  try {
    const times: string[] = Array.isArray(hourly?.time) ? hourly.time : [];
    const temps: any[] = Array.isArray(hourly?.temperature_2m) ? hourly.temperature_2m : [];
    const codes: any[] = Array.isArray(hourly?.weathercode) ? hourly.weathercode : [];
    if (!times.length || !temps.length) return null;

    const targetTs = Date.now() + targetHoursAhead * 60 * 60 * 1000;
    let bestIdx = -1;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let i = 0; i < times.length; i += 1) {
      const ts = new Date(times[i]).getTime();
      if (!Number.isFinite(ts)) continue;
      const delta = Math.abs(ts - targetTs);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) return null;
    const tempNum = Number(temps[bestIdx]);
    const codeNum = Number(codes[bestIdx]);
    return {
      hour: targetHoursAhead,
      temp: Number.isFinite(tempNum) ? `${Math.round(tempNum)}°C` : '-',
      weathercode: Number.isFinite(codeNum) ? codeNum : null,
      description: Number.isFinite(codeNum) ? getWeatherDescription(codeNum) : '-',
    };
  } catch (_error) {
    return null;
  }
};

// Fetch weather data from open-meteo API
const fetchWeatherData = async (lat: number, lon: number) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&forecast_days=3&timezone=Asia%2FKolkata`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data && data.current_weather) {
      const forecast24h = pickForecastAtHours(data.hourly, 24);
      const forecast48h = pickForecastAtHours(data.hourly, 48);
      return {
        temp: data.current_weather.temperature,
        wind: data.current_weather.windspeed,
        weathercode: data.current_weather.weathercode,
        description: getWeatherDescription(data.current_weather.weathercode),
        forecast24h,
        forecast48h,
      };
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
  }
  return null;
};


export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // Load from localStorage or use default
  const [cityData, setCityDataState] = useState<any>(() => {
    const saved = localStorage.getItem('cityData');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved city data:', e);
      }
    }
    return DEFAULT_CITY;
  });

  const [systemStats, setSystemStats] = useState<any>(null);
  const [cpuHigh, setCpuHigh] = useState(false);
  const [cpuAlertId, setCpuAlertId] = useState(0);
  const lastCpuHighRef = React.useRef(false);

  // Fetch weather data on mount and when city changes
  useEffect(() => {
    const loadWeatherData = async () => {
      // Always refresh if we have coordinates
      if (cityData.lat && cityData.lon) {
        const weather = await fetchWeatherData(cityData.lat, cityData.lon);
        if (weather) {
          const updated = { ...cityData, ...weather };
          setCityDataState(updated);
          localStorage.setItem('cityData', JSON.stringify(updated));
        }
      }
    };

    loadWeatherData();
    
    // Refresh weather every 5 minutes (lower API churn, still timely enough for dashboard use).
    const interval = setInterval(loadWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cityData.lat, cityData.lon]);

  useEffect(() => {
    let active = true;
    const fetchSystemStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/system/stats`);
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setSystemStats(data);
        const cpu = typeof data?.cpu_usage === 'number' ? data.cpu_usage : null;
        const isHigh = cpu !== null && cpu >= CPU_ALERT_THRESHOLD;
        setCpuHigh(isHigh);
        if (isHigh && !lastCpuHighRef.current) {
          setCpuAlertId((prev) => prev + 1);
        }
        lastCpuHighRef.current = isHigh;
      } catch (error) {
        console.error('Error fetching system stats:', error);
      }
    };

    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Save to localStorage whenever cityData changes
  const setCityData = (data: any) => {
    setCityDataState(data);
    localStorage.setItem('cityData', JSON.stringify(data));
  };

  return (
    <AppContext.Provider value={{ cityData, setCityData, systemStats, cpuHigh, cpuAlertId }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
