import React, { useState } from 'react';
import {
  Box,
  Modal,
  Typography,
  IconButton,
  TextField,
  Select,
  MenuItem,
  Button,
  Stack,
  Tooltip,
} from '@mui/material';
import { XIcon } from 'lucide-react';
import { AttendanceLog } from '../../utils/types';

interface EditAttendanceLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (logData: AttendanceLog) => void;
  log: AttendanceLog;
}

const EditAttendanceLogModal = ({
  isOpen,
  onClose,
  onSubmit,
  log,
}: EditAttendanceLogModalProps) => {
  const [formData, setFormData] = useState({
    ...log,
    modified: {
      by: 'Admin',
      reason: '',
      originalTimestamp: log.timestamp,
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      status: 'modified',
    });
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 2,
          p: 4,
          maxWidth: 500,
          width: '90%',
          mx: 'auto',
          mt: '10%',
          boxShadow: 24,
          outline: 'none',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            Edit Attendance Log
          </Typography>
          <IconButton onClick={onClose}>
            <XIcon size={20} />
          </IconButton>
        </Box>

        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Tooltip title="Name of the employee for this attendance log." placement="top" arrow enterDelay={400}>
              <Box sx={{ cursor: 'help' }}>
                <TextField
                  label="Employee Name"
                  variant="outlined"
                  value={formData.employeeName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employeeName: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Box>
            </Tooltip>
            <Tooltip title="Employee ID or code." placement="top" arrow enterDelay={400}>
              <Box sx={{ cursor: 'help' }}>
                <TextField
                  label="Employee Code"
                  variant="outlined"
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      employeeId: e.target.value,
                    })
                  }
                  fullWidth
                />
              </Box>
            </Tooltip>
            <Tooltip title="Type of attendance event: Check In, Check Out, or Registration." placement="top" arrow enterDelay={400}>
              <Box sx={{ cursor: 'help' }}>
            <Select
              fullWidth
              variant="outlined"
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as 'check-in' | 'check-out' | 'register',
                })
              }
            >
              <MenuItem value="check-in">Check In</MenuItem>
              <MenuItem value="check-out">Check Out</MenuItem>
              <MenuItem value="register">Registration</MenuItem>
            </Select>
              </Box>
            </Tooltip>
            <Tooltip title="Date and time of the attendance event." placement="top" arrow enterDelay={400}>
              <Box sx={{ cursor: 'help' }}>
                <TextField
              label="Timestamp"
              variant="outlined"
              type="datetime-local"
              value={formData.timestamp.replace(' ', 'T').slice(0, 16)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  timestamp: e.target.value.replace('T', ' '),
                })
              }
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />
              </Box>
            </Tooltip>
            <Tooltip title="Reason for modifying this attendance log. Required when editing." placement="top" arrow enterDelay={400}>
              <Box sx={{ cursor: 'help' }}>
                <TextField
              label="Modification Reason"
              variant="outlined"
              multiline
              rows={3}
              value={formData.modified?.reason || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  modified: {
                    ...formData.modified!,
                    reason: e.target.value,
                  },
                })
              }
              required
              fullWidth
            />
              </Box>
            </Tooltip>

            <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
              <Button variant="outlined" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary">
                Save Changes
              </Button>
            </Box>
          </Stack>
        </form>
      </Box>
    </Modal>
  );
};

export default EditAttendanceLogModal;
