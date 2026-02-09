import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import { XIcon } from 'lucide-react';
import FaceRegistration from './FaceRegistration';
import { Employee } from '../../utils/types';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeData: Employee) => void;
}

const AddEmployeeModal = ({ isOpen, onClose, onSubmit }: AddEmployeeModalProps) => {
  const [step, setStep] = useState<'info' | 'face'>('info');
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    department: '',
    photo: '',
    joinDate: '',
    faceData: null as { registered: boolean; employeeId: string } | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name || !formData.department) {
      alert('Please fill in ID, Name, and Department');
      return;
    }
    onSubmit({
      id: formData.id,
      name: formData.name,
      department: formData.department,
      photo: formData.photo,
      joinDate: formData.joinDate,
      active: true,
      faceRegistered: !!formData.faceData,
    });
    setFormData({ id: '', name: '', department: '', photo: '', joinDate: '', faceData: null });
    setStep('info');
    onClose();
  };

  const handleCrossClick = () => {
    setStep('info');
    onClose();
  };

  const handleFaceCapture = (employeeId: string, profilePhotoUrl?: string) => {
    setFormData((prev) => ({
      ...prev,
      photo: profilePhotoUrl || prev.photo,
      faceData: { registered: true, employeeId },
    }));
    setStep('info');
    onClose();
    onSubmit({
      id: formData.id || employeeId,
      name: formData.name,
      department: formData.department,
      photo: profilePhotoUrl || formData.photo,
      joinDate: formData.joinDate,
      active: true,
      faceRegistered: true,
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            maxWidth: step !== 'info' ? '900px' : '800px',
            width: '100%',
          },
        },
      }}
      fullWidth
    >
      <DialogTitle>
        {step === 'info' ? 'Add employee' : 'Register face'}
        <IconButton
          aria-label="close"
          onClick={handleCrossClick}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
        >
          <XIcon size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ mb: 2 }}>
          <Stepper activeStep={step === 'info' ? 0 : 1} alternativeLabel>
            <Step>
              <StepLabel>Employee Info</StepLabel>
            </Step>
            <Step>
              <StepLabel>Face Registration</StepLabel>
            </Step>
          </Stepper>
        </Box>
        {step === 'info' ? (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Employee ID"
              required
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
              helperText="Required - This will be used for face registration"
            />
            <TextField
              label="Full Name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              label="Department"
              required
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <TextField
              label="Photo URL"
              value={formData.photo}
              onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
              helperText="You can use a full URL or /api/profiles/ID.jpg"
            />
            <TextField
              label="Join Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.joinDate}
              onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
            />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Tips for best results
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Keep your face centered, remove glare on glasses, and move slowly to capture all angles.
              </Typography>
            </Paper>
            <FaceRegistration
              employeeId={formData.id || undefined}
              onCapture={handleFaceCapture}
              onCancel={() => setStep('info')}
            />
          </Box>
        )}
      </DialogContent>

      {step === 'info' && (
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setStep('face')}
            disabled={!formData.id || !formData.name || !formData.department}
          >
            {formData.faceData ? 'Re-register Face' : 'Register Face'}
          </Button>
          {formData.faceData && (
            <Typography variant="caption" color="success.main" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              ✓ Face registered for {formData.id || 'this employee'}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            onClick={handleSubmit}
            disabled={!formData.id || !formData.name || !formData.department}
          >
            Add Employee {formData.faceData ? '(with face)' : '(without face)'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default AddEmployeeModal;
