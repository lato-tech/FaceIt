import React, { useState } from 'react';
import { XIcon, CameraIcon } from 'lucide-react';
import {
  Box,
  Modal,
  Typography,
  IconButton,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  Tooltip,
} from '@mui/material';
import { Employee } from '../../utils/types';
import FaceRegistration from './FaceRegistration';

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeData: Employee) => void;
  employee: Employee;
  onFaceRegistered?: (employeeId: string) => void;
}

const EditEmployeeModal = ({
  isOpen,
  onClose,
  onSubmit,
  employee,
  onFaceRegistered,
}: EditEmployeeModalProps) => {
  const [formData, setFormData] = useState<Employee>(employee);
  const [step, setStep] = useState<'info' | 'face'>('info');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleFaceCapture = (employeeId: string, profilePhotoUrl?: string) => {
    // Face registration completed
    if (profilePhotoUrl) {
      setFormData((prev) => ({ ...prev, photo: profilePhotoUrl }));
    }
    if (onFaceRegistered) {
      onFaceRegistered(employeeId);
    }
    setStep('info');
  };

  const handleClose = () => {
    setStep('info');
    onClose();
  };

  return (
    <Modal 
      open={isOpen} 
      onClose={handleClose}
      sx={{
        '& .MuiBackdrop-root': {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
        },
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 1,
          p: step === 'face' ? 3 : 4,
          maxWidth: step === 'face' ? 1000 : 500,
          width: step === 'face' ? '95%' : '90%',
          mx: 'auto',
          mt: '3vh',
          mb: '3vh',
          boxShadow: 8,
          outline: 'none',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box 
          display="flex" 
          justifyContent="space-between" 
          alignItems="center" 
          mb={2}
          sx={{ 
            flexShrink: 0,
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            {step === 'info' ? 'Edit Employee' : 'Register Face'}
          </Typography>
          <IconButton onClick={handleClose} sx={{ zIndex: 11 }}>
            <XIcon size={20} />
          </IconButton>
        </Box>

        {step === 'info' ? (
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <Tooltip title="Employee ID. Cannot be changed." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
                  <TextField
                    label="Employee ID"
                    variant="outlined"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    fullWidth
                    disabled
                    helperText="Employee ID cannot be changed"
                  />
                </Box>
              </Tooltip>
              <Tooltip title="Full name of the employee." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
                  <TextField
                    label="Full Name"
                    variant="outlined"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    fullWidth
                  />
                </Box>
              </Tooltip>
              <Tooltip title="Department or team the employee belongs to." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
                  <TextField
                    label="Department"
                    variant="outlined"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    required
                    fullWidth
                  />
                </Box>
              </Tooltip>
              <Tooltip title="URL for profile photo. Use full URL or /api/profiles/ID.jpg" placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
                  <TextField
                    label="Photo URL"
                    variant="outlined"
                    value={formData.photo}
                    onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                    fullWidth
                    helperText="You can use a full URL or /api/profiles/ID.jpg"
                  />
                </Box>
              </Tooltip>
              <Tooltip title="Whether the employee is active. Inactive employees are excluded from recognition." placement="top" arrow enterDelay={400}>
                <Box sx={{ cursor: 'help' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                }
                label="Active"
              />
                </Box>
              </Tooltip>

              <Box display="flex" justifyContent="space-between" gap={2} mt={2}>
                <Button
                  variant="outlined"
                  startIcon={<CameraIcon size={16} />}
                  onClick={() => setStep('face')}
                  color="secondary"
                >
                  Register Face
                </Button>
                <Box display="flex" gap={2}>
                  <Button variant="outlined" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary">
                    Save Changes
                  </Button>
                </Box>
              </Box>
            </Stack>
          </form>
        ) : (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <FaceRegistration
              employeeId={formData.id}
              onCapture={handleFaceCapture}
              onCancel={() => setStep('info')}
            />
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default EditEmployeeModal;
