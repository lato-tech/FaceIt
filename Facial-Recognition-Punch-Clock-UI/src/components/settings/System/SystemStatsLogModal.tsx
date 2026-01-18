import React, { useEffect, useState } from 'react';
import {
  Box,
  Modal,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
} from '@mui/material';
import { XIcon } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

type Props = {
  isOpen: boolean;
  onClose: () => void;
  intervalSec: number;
};

const SystemStatsLogModal: React.FC<Props> = ({ isOpen, onClose, intervalSec }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLogs = async () => {
      try {
        const response = await fetch(`${API_BASE}/system/stats/logs?limit=500`);
        const data = await response.json();
        if (response.ok && data.logs) {
          setLogs(data.logs.slice().reverse().slice(0, 500));
        }
      } catch (error) {
        console.error('Error fetching system logs:', error);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, intervalSec * 1000);
    return () => clearInterval(interval);
  }, [isOpen, intervalSec]);

  const filteredLogs = logs.filter((log) => {
    const ts = log.ts ? new Date(log.ts).getTime() : 0;
    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).getTime() : null;
    if (start && ts < start) return false;
    if (end && ts > end) return false;
    return true;
  });
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

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 3,
          maxWidth: 900,
          width: '95%',
          mx: 'auto',
          mt: '5%',
          boxShadow: 24,
          outline: 'none',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            System Stats Logs
          </Typography>
          <IconButton onClick={onClose}>
            <XIcon size={20} />
          </IconButton>
        </Box>
        <Box display="flex" gap={2} mb={2}>
          <Box>
            <Typography variant="caption">From</Typography>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Box>
          <Box>
            <Typography variant="caption">To</Typography>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Box>
        </Box>
        <TableContainer component={Paper} sx={{ maxHeight: 460, overflow: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>CPU %</TableCell>
                <TableCell>Temp °C</TableCell>
                <TableCell>RAM %</TableCell>
                <TableCell>RAM GB</TableCell>
                <TableCell>Storage Free GB</TableCell>
                <TableCell>Cores/Threads</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedLogs.map((log, idx) => (
                <TableRow key={idx}>
                  <TableCell>{page * rowsPerPage + idx + 1}</TableCell>
                  <TableCell>{log.ts ? new Date(log.ts).toLocaleString() : '-'}</TableCell>
                  <TableCell>{log.cpu_usage !== undefined ? `${log.cpu_usage}%` : '-'}</TableCell>
                  <TableCell>{log.temperature !== undefined ? `${log.temperature}°C` : '-'}</TableCell>
                  <TableCell>{log.ram_usage_percent !== undefined ? `${log.ram_usage_percent}%` : '-'}</TableCell>
                  <TableCell>{log.ram_used_gb !== undefined ? `${log.ram_used_gb} GB` : '-'}</TableCell>
                  <TableCell>{log.storage_free_gb !== undefined ? `${log.storage_free_gb} GB` : '-'}</TableCell>
                  <TableCell>{log.cpu_cores ?? '-'}/{log.cpu_threads ?? '-'}</TableCell>
                </TableRow>
              ))}
              {pagedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No logs yet
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
          <Box display="flex" alignItems="center" gap={1}>
            <select value={rowsPerPage} onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setPage(0);
            }}>
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPage(0)}
              disabled={currentPage === 1}
            >
              First
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={currentPage === 1}
            >
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
            <Button
              variant="outlined"
              size="small"
              onClick={() => setPage(totalPages - 1)}
              disabled={currentPage === totalPages}
            >
              Last
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default SystemStatsLogModal;
