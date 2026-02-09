import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import { Edit } from 'lucide-react';
import { AttendanceLog } from '../../utils/types';
import EditAttendanceLogModal from './EditAttendanceLogModal';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

const parseTimestamp = (value?: string) => {
  if (!value) return 0;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? 0 : ts;
};

const AttendanceLogsOnly: React.FC = () => {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE}/attendance`);
        const result = await response.json();
        if (response.ok && result.attendance) {
          const logs: AttendanceLog[] = result.attendance.map((item: Record<string, unknown>) => {
            const rawStatus = (item.status || 'Present').toString();
            const normalizedStatus =
              rawStatus.toLowerCase() === 'registered'
                ? 'registered'
                : rawStatus.toLowerCase() === 'modified'
                  ? 'modified'
                  : 'valid';
            return {
              id: String(item.id),
              employeeId: (item.employee_id || item.employeeId || item.name) as string,
              employeeName: (item.employee_name || item.employeeName || item.name) as string,
              type: (item.event_type || 'check-in') as 'check-in' | 'check-out' | 'register',
              timestamp: (item.timestamp as string) || '',
              status: normalizedStatus,
              modified: item.modified_reason
                ? {
                    by: (item.modified_by as string) || 'Admin',
                    reason: (item.modified_reason as string) || '',
                    originalTimestamp: (item.original_timestamp || item.timestamp) as string,
                  }
                : undefined,
            };
          });
          setAttendanceLogs(logs);
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = attendanceLogs.filter((log) => {
    const ts = parseTimestamp(log.timestamp);
    if (startDate && ts < new Date(startDate).getTime()) return false;
    if (endDate && ts > new Date(endDate).getTime()) return false;
    return true;
  });

  const pagedLogs = filteredLogs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const currentPage = Math.min(page + 1, totalPages);

  const formatTimestamp = (value: string) => {
    const ts = parseTimestamp(value);
    return ts ? new Date(ts).toLocaleString() : '-';
  };

  const statusColor = (status: string) => {
    if (status === 'valid') return 'success';
    if (status === 'registered') return 'info';
    if (status === 'modified') return 'warning';
    return 'default';
  };

  const typeLabel = (type: string) =>
    type === 'check-in' ? 'Check In' : type === 'check-out' ? 'Check Out' : 'Register';

  return (
    <Box padding="24px">
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
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ maxHeight: 520, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedLogs.map((log, idx) => (
              <TableRow key={log.id} hover>
                <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell>{typeLabel(log.type)}</TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {log.employeeName} ({log.employeeId})
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={log.status} size="small" color={statusColor(log.status)} sx={{ textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => setEditingLog(log)}>
                    <Edit size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {pagedLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {loading ? 'Loading...' : 'No attendance records found'}
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
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}
          >
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
                }),
              });
              if (!response.ok) throw new Error('Failed to update attendance log');
              setAttendanceLogs((prev) => prev.map((log) => (log.id === logData.id ? logData : log)));
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

export default AttendanceLogsOnly;
