import React, { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Box, Typography, Paper } from '@mui/material';
import {
  MapPinIcon,
  WindIcon,
  ClockIcon,
  CloudIcon,
  SunIcon,
  CloudRainIcon,
  SnowflakeIcon,
  CloudDrizzleIcon,
  ZapIcon,
} from 'lucide-react';

const getWeatherIcon = (code: number) => {
  if (code === 0) return <SunIcon size={20} />;
  if (code >= 1 && code <= 3) return <CloudIcon size={20} />;
  if (code >= 45 && code <= 48) return <CloudIcon size={20} />;
  if (code >= 51 && code <= 55) return <CloudDrizzleIcon size={20} />;
  if (code >= 61 && code <= 65) return <CloudRainIcon size={20} />;
  if (code >= 66 && code <= 67) return <CloudRainIcon size={20} />;
  if (code >= 71 && code <= 75) return <SnowflakeIcon size={20} />;
  if (code >= 80 && code <= 82) return <CloudRainIcon size={20} />;
  if (code === 95) return <ZapIcon size={20} />;
  if (code === 96 || code === 99) return <ZapIcon size={20} />;
  return <CloudIcon size={20} />;
};

const CityDataDisplay = () => {
  const { cityData } = useAppContext();
  const [timeState, setTimeState] = useState<{
    epochMs: number;
    receivedAt: number;
    tzOffsetSec: number;
    timeFormat: '12h' | '24h';
  } | null>(null);
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    if (!cityData) return;

    const getLocalTimeState = () => ({
      epochMs: Date.now(),
      receivedAt: Date.now(),
      tzOffsetSec: -new Date().getTimezoneOffset() * 60,
      timeFormat: timeState?.timeFormat || '24h',
    });

    const fetchTime = async () => {
      try {
        const response = await fetch(`${window.location.protocol}//${window.location.hostname}:5002/api/system/time`);
        if (response.ok) {
          const data = await response.json();
          setTimeState({
            epochMs: data.epoch_ms,
            receivedAt: Date.now(),
            tzOffsetSec: data.tz_offset_sec || 0,
            timeFormat: data.timeFormat === '24h' ? '24h' : '12h',
          });
        } else if (!timeState) {
          setTimeState(getLocalTimeState());
        }
      } catch (error) {
        console.error('Error fetching time:', error);
        if (!timeState) {
          setTimeState(getLocalTimeState());
        }
      }
    };

    fetchTime();
    const refresh = setInterval(fetchTime, 60000);
    return () => clearInterval(refresh);
  }, [cityData]);
  useEffect(() => {
    if (!timeState) return;

    const updateTime = () => {
      const elapsed = Date.now() - timeState.receivedAt;
      const baseMs = timeState.epochMs + elapsed;
      const displayMs = baseMs + timeState.tzOffsetSec * 1000;
      const date = new Date(displayMs);
      const formatter = new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: timeState.timeFormat !== '24h',
        timeZone: 'UTC',
      });
      setFormattedTime(formatter.format(date));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timeState]);

  if (!cityData) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2">No city selected. Please select a city first.</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1,
        bgcolor: 'background.paper',
        borderRadius: 1,
        borderWidth: 0.5,
        borderStyle: 'solid',
        borderColor: 'divider',
      }}
    >
      {/* Single line with all information */}
      <Box
        display="flex"
        flexDirection={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        gap={{ xs: 1, sm: 2 }}
      >
        {/* Location (Left) */}
        <Box
          display="flex"
          alignItems="center"
          gap={0.75}
          sx={{ flex: 1, minWidth: 0 }}
        >
          <MapPinIcon size={20} />
          <Typography variant="h6" fontWeight="600" fontSize="1.1rem" noWrap>
            {cityData.city} ({cityData.country})
          </Typography>
        </Box>

        {/* Time (Center) */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent={{ xs: 'flex-start', sm: 'center' }}
          gap={0.75}
          sx={{ flex: 1 }}
        >
          <ClockIcon size={20} />
          <Typography
            variant="h6"
            fontWeight="600"
            fontSize="1.1rem"
            sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 240, textAlign: 'center' }}
          >
            {formattedTime || '--'}
          </Typography>
        </Box>

        {/* Weather (Right) */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
          gap={1}
          sx={{ flex: 1 }}
        >
          <Box display="flex" alignItems="center" gap={0.4}>
            {getWeatherIcon(cityData.weathercode)}
            <Typography
              variant="h6"
              fontWeight="600"
              fontSize="1.1rem"
              sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 60, textAlign: 'right' }}
            >
              {cityData.temp}°C
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.4}>
            <WindIcon size={18} />
            <Typography
              variant="h6"
              fontWeight="600"
              fontSize="1.1rem"
              sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right' }}
            >
              {cityData.wind} km/h
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default CityDataDisplay;
