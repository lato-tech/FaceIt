import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, IconButton, Box, Typography } from '@mui/material';
import { XIcon } from 'lucide-react';
import { useLanguage } from '../../utils/i18n';
import FaceRegistration from './FaceRegistration';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeData: any) => void;
}

const AddEmployeeModal = ({ isOpen, onClose, onSubmit }: AddEmployeeModalProps) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'info' | 'face'>('info');
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    department: '',
    photo: '',
    joinDate: '',
    faceData: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.id || !formData.name || !formData.department || !formData.joinDate) {
      alert('Please fill in all required fields (ID, Name, Department, Join Date)');
      return;
    }
    
    onSubmit({
      ...formData,
      active: true,
      faceRegistered: !!formData.faceData, // Mark if face was registered
    });
    
    // Reset form
    setFormData({ id: '', name: '', department: '', photo: '', joinDate: '', faceData: null });
    setStep('info');
    onClose();
  };

  const handleCrossClick = () => {
    setStep('info');
    onClose();
  
  }

  const handleFaceCapture = (employeeId: string, profilePhotoUrl?: string) => {
    // Face registration completed - mark as registered and sync profile photo
    setFormData((prev) => ({
      ...prev,
      photo: profilePhotoUrl || prev.photo,
      faceData: { registered: true, employeeId }
    }));
    setStep('info');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} slotProps={{
      paper: {
        sx: {
          maxWidth: step !== 'info' ? "900px" : '800px',
          width: '100%',
        }
      }
    }} fullWidth>
      <DialogTitle>
        {step === 'info' ? "Add employee" 
        :"Register face"}
        <IconButton
          aria-label="close"
          onClick={handleCrossClick}
          sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}
        >
          <XIcon size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent  dividers>
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
              required
              InputLabelProps={{ shrink: true }}
              value={formData.joinDate}
              onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
            />
          </Box>
        ) : (
          <FaceRegistration 
            employeeId={formData.id || undefined}
            onCapture={handleFaceCapture} 
            onCancel={() => setStep('info')} 
          />
        )}
      </DialogContent>

      {step === 'info' && (
        <DialogActions>
          <Button 
            variant="outlined" 
            onClick={() => {
              // Allow registering face even without employee ID (will use ID from form)
              // If no ID entered, we'll prompt in face registration
              setStep('face');
            }}
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
            disabled={!formData.id || !formData.name || !formData.department || !formData.joinDate}
          >
            Add Employee {formData.faceData ? '(with face)' : '(without face)'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default AddEmployeeModal;
