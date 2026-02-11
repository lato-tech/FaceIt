import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  CircularProgress,
  Tooltip,
} from '@mui/material';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

type EventLog = {
  id: number;
  event_type: string;
  message?: string;
  timestamp?: string;
  created_at?: string;
  metadata?: string;
};

type SystemStatLog = {
  ts?: string;
  cpu_usage?: number;
  ram_usage_percent?: number;
  temperature?: number | null;
  storage_used_gb?: number;
  storage_total_gb?: number;
};

const CATEGORY_MAP: Record<string, string> = {
  camera_start: 'Camera',
  camera_stop: 'Camera',
  camera_restart: 'Camera',
  camera_start_failed: 'Camera',
  camera_start_error: 'Camera',
  camera_stop_error: 'Camera',
  camera_restart_failed: 'Camera',
  camera_restart_error: 'Camera',
  camera_start_skipped: 'Camera',
  camera_stop_skipped: 'Camera',
  glasses_detected: 'Registration',
};

const categorizeEvent = (eventType: string) => CATEGORY_MAP[eventType] || 'General';

const SystemLogs: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemStatLog[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  useEffect(() => {
    const loadEvents = async () => {
      setLoadingEvents(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', '500');
        if (dateStart) params.set('start_date', dateStart);
        if (dateEnd) params.set('end_date', dateEnd);
        const response = await fetch(`${API_BASE}/event-logs?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setEventLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Failed to load event logs:', error);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, [dateStart, dateEnd]);

  useEffect(() => {
    const loadStats = async () => {
      setLoadingStats(true);
      try {
        const response = await fetch(`${API_BASE}/system/stats/logs?limit=500`);
        if (response.ok) {
          const data = await response.json();
          setSystemLogs((data.logs || []).slice().reverse());
        }
      } catch (error) {
        console.error('Failed to load system stats logs:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    loadStats();
  }, []);

  const filteredEvents = useMemo(() => {
    return eventLogs.filter((log) => {
      const matchesCategory = category === 'All' || categorizeEvent(log.event_type) === category;
      const haystack = `${log.event_type} ${log.message || ''} ${log.metadata || ''}`.toLowerCase();
      const matchesSearch = !search || haystack.includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [eventLogs, category, search]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    eventLogs.forEach((log) => set.add(categorizeEvent(log.event_type)));
    return Array.from(set);
  }, [eventLogs]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>
        System Logs
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Tabs value={tab} onChange={(_, next) => setTab(next)} sx={{ mb: 2 }}>
          <Tab label="Events" />
          <Tab label="System Stats" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Tooltip title="Search events by text." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
              <TextField
                label="Search"
                variant="outlined"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
              />
                </Box>
              </Tooltip>
              <Tooltip title="Filter events by category." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
              <TextField
                label="Category"
                variant="outlined"
                select
                size="small"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                sx={{ minWidth: 160 }}
              >
                {categories.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </TextField>
                </Box>
              </Tooltip>
              <Tooltip title="Start date/time for event filter." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
              <TextField
                label="From"
                variant="outlined"
                type="datetime-local"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
                </Box>
              </Tooltip>
              <Tooltip title="End date/time for event filter." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
              <TextField
                label="To"
                variant="outlined"
                type="datetime-local"
                size="small"
                InputLabelProps={{ shrink: true }}
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
                </Box>
              </Tooltip>
            </Box>
            {loadingEvents ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Event</TableCell>
                      <TableCell>Message</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredEvents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>No logs found</TableCell>
                      </TableRow>
                    ) : (
                      filteredEvents.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{log.timestamp || log.created_at || '-'}</TableCell>
                          <TableCell>{categorizeEvent(log.event_type)}</TableCell>
                          <TableCell>{log.event_type}</TableCell>
                          <TableCell>{log.message || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            {loadingStats ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>CPU %</TableCell>
                      <TableCell>RAM %</TableCell>
                      <TableCell>Temp °C</TableCell>
                      <TableCell>Storage Used</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {systemLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>No logs found</TableCell>
                      </TableRow>
                    ) : (
                      systemLogs.map((log, idx) => (
                        <TableRow key={`${log.ts || 'log'}-${idx}`}>
                          <TableCell>{log.ts || '-'}</TableCell>
                          <TableCell>{typeof log.cpu_usage === 'number' ? log.cpu_usage.toFixed(1) : '-'}</TableCell>
                          <TableCell>{typeof log.ram_usage_percent === 'number' ? log.ram_usage_percent.toFixed(1) : '-'}</TableCell>
                          <TableCell>{log.temperature ?? '-'}</TableCell>
                          <TableCell>
                            {typeof log.storage_used_gb === 'number' && typeof log.storage_total_gb === 'number'
                              ? `${log.storage_used_gb.toFixed(1)} / ${log.storage_total_gb.toFixed(1)} GB`
                              : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default SystemLogs;
