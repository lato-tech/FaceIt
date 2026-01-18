import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  IconButton,
  Chip,
  Button,
  TextField,
} from '@mui/material';
import { Edit, AlertCircle, Search } from 'lucide-react';
import { AttendanceLog } from '../../utils/types';
import EditAttendanceLogModal from './EditAttendanceLogModal';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

const AttendanceLogsOnly: React.FC = () => {
  const [data, setData] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/attendance`);
        const result = await response.json();

        if (response.ok && result.attendance) {
          const logs: AttendanceLog[] = result.attendance.map((item: any) => {
            const rawStatus = (item.status || 'Present').toString();
            const normalizedStatus = rawStatus.toLowerCase() === 'registered'
              ? 'registered'
              : rawStatus.toLowerCase() === 'modified'
                ? 'modified'
                : 'valid';
            return {
              id: String(item.id),
              employeeId: item.employee_id || item.employeeId || '',
              employeeName: item.employee_name || item.employeeName || '',
              type: item.event_type || 'check-in',
              timestamp: item.timestamp,
              status: normalizedStatus,
              synced: Boolean(item.synced),
              manual: Boolean(item.manual),
              modified: item.modified_reason ? {
                by: item.modified_by || 'Admin',
                reason: item.modified_reason,
                originalTimestamp: item.original_timestamp || item.timestamp,
              } : undefined,
            };
          });
          setData(logs);
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
    const interval = setInterval(fetchAttendance, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = useMemo(() => {
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).getTime() : null;
    const q = query.trim().toLowerCase();
    return data.filter((log) => {
      const ts = parseTimestamp(log.timestamp);
      if (start && ts < start) return false;
      if (end && ts > end) return false;
      if (!q) return true;
      return (
        log.employeeName.toLowerCase().includes(q) ||
        log.employeeId.toLowerCase().includes(q) ||
        log.type.toLowerCase().includes(q)
      );
    });
  }, [data, startDate, endDate, query]);

  const pagedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const currentPage = Math.min(page + 1, totalPages);

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const add = (p: number) => pages.push(p);
    add(1);
    if (currentPage > 3) pages.push('ellipsis');
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p += 1) {
      add(p);
    }
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    if (totalPages > 1) add(totalPages);
    return pages;
  };

  const statusColor = (status: string) => {
    if (status === 'valid') return 'success';
    if (status === 'registered') return 'info';
    if (status === 'modified') return 'warning';
    return 'default';
  };

  return (
    <Box padding={"24px"}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          Attendance Logs
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Box>
            <Typography variant="caption">From</Typography>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(0);
              }}
            />
          </Box>
          <Box>
            <Typography variant="caption">To</Typography>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(0);
              }}
            />
          </Box>
          <TextField
            placeholder="Search name, code, type"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            InputProps={{
              startAdornment: <Search size={18} style={{ marginRight: 8 }} />,
            }}
            size="small"
          />
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ maxHeight: 520, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Synced</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedLogs.map((log, idx) => (
              <TableRow key={log.id} hover>
                <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell>{log.employeeName}</TableCell>
                <TableCell>{log.employeeId}</TableCell>
                <TableCell>{log.type}</TableCell>
                <TableCell>
                  <Chip label={log.status} size="small" color={statusColor(log.status)} sx={{ textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell>
                  <Chip label={log.synced ? 'Yes' : 'No'} size="small" color={log.synced ? 'success' : 'default'} />
                </TableCell>
                <TableCell>
                  <Chip label={log.manual ? 'Manual' : 'Auto'} size="small" color={log.manual ? 'warning' : 'default'} />
                </TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => setEditingLog(log)}>
                    <Edit size={18} />
                  </IconButton>
                  {log.status === 'modified' && (
                    <IconButton color="warning">
                      <AlertCircle size={18} />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pagedLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  {loading ? 'Loading logs...' : 'No records found'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="caption">
          Page {currentPage} of {totalPages} • Total: {filteredLogs.length}
        </Typography>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <select value={rowsPerPage} onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(0);
          }}>
            {[10, 25, 50].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          <Button variant="outlined" size="small" onClick={() => setPage(0)} disabled={currentPage === 1}>
            First
          </Button>
          <Button variant="outlined" size="small" onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={currentPage === 1}>
            Prev
          </Button>
          {getPageNumbers().map((p, idx) => (
            <Button
              key={`${p}-${idx}`}
              variant={p === currentPage ? 'contained' : 'outlined'}
              size="small"
              disabled={p === 'ellipsis'}
              onClick={() => typeof p === 'number' && setPage(p - 1)}
            >
              {p === 'ellipsis' ? '…' : p}
            </Button>
          ))}
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPage((p) => (p + 1) * rowsPerPage < filteredLogs.length ? p + 1 : p)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          <Button variant="outlined" size="small" onClick={() => setPage(totalPages - 1)} disabled={currentPage === totalPages}>
            Last
          </Button>
        </Box>
      </Box>

      {editingLog && (
        <EditAttendanceLogModal
          isOpen={true}
          onClose={() => setEditingLog(null)}
          onSubmit={async (logData) => {
            try {
              const response = await fetch(`${API_BASE}/attendance/${logData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  timestamp: logData.timestamp,
                  event_type: logData.type,
                  status: logData.status === 'registered' ? 'Registered' : logData.status,
                  employee_id: logData.employeeId,
                  employee_name: logData.employeeName,
                  modified: logData.modified,
                })
              });
              if (!response.ok) {
                throw new Error('Failed to update attendance log');
              }
              setData((prev) => prev.map((log) => (log.id === logData.id ? logData : log)));
              setEditingLog(null);
            } catch (error) {
              console.error('Error updating attendance:', error);
            }
          }}
          log={editingLog}
        />
      )}
    </Box>
  );
};

const parseTimestamp = (value?: string) => {
  if (!value) return 0;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? 0 : ts;
};

const formatTimestamp = (value?: string) => {
  const ts = parseTimestamp(value);
  return ts ? new Date(ts).toLocaleString() : '-';
};

export default AttendanceLogsOnly;
