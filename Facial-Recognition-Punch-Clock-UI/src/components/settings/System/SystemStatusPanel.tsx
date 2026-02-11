import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, CircularProgress, Button, FormControl, Select, MenuItem, Tooltip } from '@mui/material';
import { Cpu as CpuIcon, FileText as FileTextIcon } from 'lucide-react';
import SystemStatsLogModal from './SystemStatsLogModal';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

type Props = {
  logIntervalSec: number;
  onLogIntervalChange: (next: number) => void;
};

const SystemStatusPanel: React.FC<Props> = ({ logIntervalSec, onLogIntervalChange }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [logsOpen, setLogsOpen] = useState(false);

  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/system/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) {
    return (
      <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
          <CpuIcon size={20} style={{ marginRight: 6 }} />
          System Status
        </Typography>
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  const statsData = [
    { label: 'CPU Usage', value: stats?.cpu_usage ? `${stats.cpu_usage}%` : 'N/A', tooltip: 'Current CPU utilization' },
    { label: 'Temperature', value: stats?.temperature ? `${stats.temperature}°C` : 'N/A', tooltip: 'Device temperature (RPi shows SoC temp)' },
    { label: 'GPU', value: typeof stats?.gpu_clock_mhz === 'number' ? `${stats.gpu_clock_mhz} MHz${typeof stats?.gpu_mem_mb === 'number' ? ` (${stats.gpu_mem_mb} MB)` : ''}${typeof stats?.gpu_busy_percent === 'number' ? ` • ${stats.gpu_busy_percent}%` : ''}` : 'N/A', tooltip: 'GPU clock, memory, and utilization' },
    { label: 'RAM Usage', value: (typeof stats?.ram_usage_percent === 'number' && typeof stats?.ram_used_gb === 'number') ? `${stats.ram_usage_percent}% (${stats.ram_used_gb} GB)` : 'N/A', tooltip: 'RAM used vs total' },
    { label: 'Storage', value: stats?.storage_free_gb ? `${stats.storage_free_gb} GB free` : 'N/A', tooltip: 'Free disk space' },
    { label: 'Cores / Threads', value: (typeof stats?.cpu_cores === 'number' && typeof stats?.cpu_threads === 'number') ? `${stats.cpu_cores}/${stats.cpu_threads}` : 'N/A', tooltip: 'CPU physical cores / logical threads' },
    { label: 'Employees', value: typeof stats?.employees_count === 'number' ? `${stats.employees_count}/100000` : 'N/A', tooltip: 'Registered employees / max capacity' },
    { label: 'Logs', value: typeof stats?.logs_count === 'number' ? `${stats.logs_count}/1000000` : 'N/A', tooltip: 'Attendance logs stored / max' },
  ];

  return (
    <Paper sx={{ p: 3, width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" fontWeight="bold">
          <CpuIcon size={20} style={{ marginRight: 6 }} />
          System Status
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Tooltip title="How often system stats (CPU, RAM, etc.) are logged to the stats file." placement="top" arrow enterDelay={400}>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select
                value={logIntervalSec}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  onLogIntervalChange(next);
                }}
              >
                {[1, 5, 10, 30, 60, 90, 120, 600].map((sec) => (
                  <MenuItem key={sec} value={sec}>{sec}s</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Tooltip>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileTextIcon size={16} />}
            onClick={() => setLogsOpen(true)}
          >
            View Log
          </Button>
        </Box>
      </Box>
      {statsData.map((item, i) => (
        <Tooltip key={i} title={item.tooltip} placement="top" arrow enterDelay={400}>
          <Box display="flex" justifyContent="space-between" py={1.5} px={1} sx={{ cursor: 'help' }}>
            <Typography variant="body1" fontWeight="bold">{item.label}</Typography>
            <Typography variant="body1">{item.value}</Typography>
          </Box>
        </Tooltip>
      ))}
      <SystemStatsLogModal
        isOpen={logsOpen}
        onClose={() => setLogsOpen(false)}
        intervalSec={logIntervalSec}
      />
    </Paper>
  );
};

export default SystemStatusPanel;
