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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from '@mui/material';
import { Edit, AlertCircle, Trash2 } from 'lucide-react';
import { AttendanceLog, EventLog } from '../../utils/types';
import EditAttendanceLogModal from './EditAttendanceLogModal';

import { API_BASE } from '../../utils/api';
const API_ROOT = API_BASE.replace(/\/api\/?$/, '') || window.location.origin;

type CombinedLog = {
  id: string;
  source: 'attendance' | 'event';
  timestamp: string;
  typeLabel: string;
  details: string;
  status: string;
  imageUrl?: string;
  attendanceLog?: AttendanceLog;
  confidence?: number | null;
  mode?: 'auto' | 'manual';
};

const AttendanceLogs: React.FC = () => {
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLog, setEditingLog] = useState<AttendanceLog | null>(null);
  const [deleteLog, setDeleteLog] = useState<AttendanceLog | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [attendanceResponse, eventsResponse] = await Promise.all([
        fetch(`${API_BASE}/attendance`),
        fetch(`${API_BASE}/event-logs?limit=500`),
      ]);
        const attendanceResult = await attendanceResponse.json();
        const eventsResult = await eventsResponse.json();

        if (attendanceResponse.ok && attendanceResult.attendance) {
          const logs: AttendanceLog[] = attendanceResult.attendance.map((item: any) => {
            const rawStatus = (item.status || 'Present').toString();
            const normalizedStatus = rawStatus.toLowerCase() === 'registered'
              ? 'registered'
              : rawStatus.toLowerCase() === 'modified'
                ? 'modified'
                : 'valid';
            const manual = item.manual === 1 || item.manual === true;
            return {
              id: String(item.id),
              employeeId: item.employee_id || item.employeeId || item.name,
              employeeName: item.employee_name || item.employeeName || item.name,
              type: item.event_type || 'check-in',
              timestamp: item.timestamp,
              status: normalizedStatus,
              confidence: item.confidence != null ? Number(item.confidence) : undefined,
              mode: manual ? 'manual' : 'auto',
              snapshotUrl: item.snapshot_url ? `${API_ROOT}${item.snapshot_url.startsWith('/') ? '' : '/'}${item.snapshot_url}` : undefined,
              modified: item.modified_reason ? {
                by: item.modified_by || 'Admin',
                reason: item.modified_reason,
                originalTimestamp: item.original_timestamp || item.timestamp,
              } : undefined,
            };
          });
          setAttendanceLogs(logs);
        }

        if (eventsResponse.ok && eventsResult.logs) {
          const logs: EventLog[] = eventsResult.logs.map((item: any) => ({
            id: String(item.id),
            eventType: item.event_type || 'event',
            message: item.message || '',
            timestamp: item.timestamp,
            imageUrl: item.image_url,
            metadata: item.metadata,
          }));
          setEventLogs(logs);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const combinedLogs = useMemo<CombinedLog[]>(() => {
    const attendanceCombined: CombinedLog[] = attendanceLogs.map((log) => ({
      id: `att-${log.id}`,
      source: 'attendance',
      timestamp: log.timestamp,
      typeLabel: log.type === 'check-in' ? 'Check In' : log.type === 'check-out' ? 'Check Out' : 'Register',
      details: `${log.employeeName} (${log.employeeId})`,
      status: log.status,
      attendanceLog: log,
      confidence: log.confidence,
      mode: log.mode,
      imageUrl: log.snapshotUrl,
    }));
    const eventCombined: CombinedLog[] = eventLogs.map((log) => ({
      id: `evt-${log.id}`,
      source: 'event',
      timestamp: log.timestamp,
      typeLabel: log.eventType.replace(/_/g, ' ').toUpperCase(),
      details: log.message || '-',
      status: log.eventType.replace(/_/g, ' '),
      imageUrl: log.imageUrl ? `${API_ROOT}${log.imageUrl.startsWith('/') ? '' : '/'}${log.imageUrl}` : undefined,
    }));
    return [...attendanceCombined, ...eventCombined].sort((a, b) => {
      return parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp);
    });
  }, [attendanceLogs, eventLogs]);

  const filteredLogs = useMemo(() => {
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).getTime() : null;
    return combinedLogs.filter((log) => {
      const ts = parseTimestamp(log.timestamp);
      if (start && ts < start) return false;
      if (end && ts > end) return false;
      return true;
    });
  }, [combinedLogs, startDate, endDate]);

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

  return (
    <Box padding={"24px"}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight="bold">
          Logs
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
              <TableCell>Source</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Details</TableCell>
              <TableCell>Confidence</TableCell>
              <TableCell>Mode</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Snapshot</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedLogs.map((log, idx) => (
              <TableRow key={log.id} hover>
                <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                <TableCell>
                  <Chip
                    label={log.source === 'attendance' ? 'Attendance' : 'Event'}
                    size="small"
                    color={log.source === 'attendance' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell>{log.typeLabel}</TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {log.details}
                  </Typography>
                </TableCell>
                <TableCell>
                  {log.confidence != null ? `${Math.min(100, (log.confidence * 100) / 0.6).toFixed(1)}%` : '-'}
                </TableCell>
                <TableCell>
                  {log.source === 'attendance' && log.mode != null ? (
                    <Chip label={log.mode} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={log.status} size="small" color={statusColor(log.status)} sx={{ textTransform: 'capitalize' }} />
                </TableCell>
                <TableCell>
                  {log.imageUrl ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box
                        component="img"
                        src={log.imageUrl}
                        alt="Snapshot"
                        sx={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}
                      />
                      <a href={log.imageUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem' }}>View</a>
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  {log.source === 'attendance' && log.attendanceLog && (
                    <>
                      <IconButton color="primary" onClick={() => setEditingLog(log.attendanceLog!)} size="small" title="Edit">
                        <Edit size={18} />
                      </IconButton>
                      <IconButton
                        color="error"
                        size="small"
                        title="Delete"
                        onClick={() => setDeleteLog(log.attendanceLog!)}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                      {log.attendanceLog.status === 'modified' && (
                        <IconButton color="warning" size="small">
                          <AlertCircle size={18} />
                        </IconButton>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {pagedLogs.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} align="center">
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

      {deleteLog && (
        <Dialog open={!!deleteLog} onClose={() => !deleting && setDeleteLog(null)}>
          <DialogTitle>Delete attendance log?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Delete the log for {deleteLog.employeeName} ({deleteLog.employeeId}) at {deleteLog.timestamp}?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteLog(null)} disabled={deleting}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  const res = await fetch(`${API_BASE}/attendance/${deleteLog.id}`, { method: 'DELETE' });
                  const data = res.ok ? null : await res.json().catch(() => ({}));
                  if (res.ok) {
                    setAttendanceLogs((prev) => prev.filter((l) => l.id !== deleteLog.id));
                    setDeleteLog(null);
                    fetchLogs(); // Refetch to ensure UI stays in sync
                  } else {
                    setDeleteError(data?.error || res.statusText || 'Delete failed');
                  }
                } catch (e) {
                  setDeleteError(e instanceof Error ? e.message : 'Delete failed');
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar open={!!deleteError} autoHideDuration={6000} onClose={() => setDeleteError(null)}>
        <Alert severity="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      </Snackbar>

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
                  modified: logData.modified
                })
              });
              if (!response.ok) {
                throw new Error('Failed to update attendance log');
              }
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

const parseTimestamp = (value?: string) => {
  if (!value) return 0;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? 0 : ts;
};

export default AttendanceLogs;
