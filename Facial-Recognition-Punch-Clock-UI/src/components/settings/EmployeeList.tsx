import React, { useState, useEffect } from 'react';
import { Employee } from '../../utils/types';
import { PlusIcon, SearchIcon, EditIcon, TrashIcon, CheckCircleIcon } from 'lucide-react';
import AddEmployeeModal from './AddEmployeeModal';
import EditEmployeeModal from './EditEmployeeModal';
import {
  Box,
  Button,
  Typography,
  InputBase,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox,
  FormControlLabel,
} from '@mui/material';

const API_BASE = import.meta.env.VITE_API_BASE || (window.location.protocol + '//' + window.location.hostname + ':5002/api');

interface EmployeeWithFace extends Employee {
  faceRegistered?: boolean;
}

const EmployeeList = () => {
  const [employees, setEmployees] = useState<EmployeeWithFace[]>([]);
  const [registeredFaces, setRegisteredFaces] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    employeeId: string | null;
    employeeName: string;
    hasFaceData: boolean;
    deleteFaceData: boolean;
  }>({
    open: false,
    employeeId: null,
    employeeName: '',
    hasFaceData: false,
    deleteFaceData: false,
  });

  // Fetch registered faces from backend
  const fetchRegisteredFaces = async () => {
    try {
      const response = await fetch(`${API_BASE}/faces`);
      const data = await response.json();
      
      if (response.ok && data.faces) {
        const faceSet = new Set(data.faces.map((face: any) => face.name));
        setRegisteredFaces(faceSet);
      }
    } catch (err) {
      console.error('Error fetching registered faces:', err);
    }
  };

  // Fetch employees from backend database
  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch employees from backend API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${API_BASE}/employees`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data.employees) {
          setEmployees(data.employees);
          // Also sync to localStorage as backup
          localStorage.setItem('employees', JSON.stringify(data.employees));
        }
      } else {
        // Fallback to localStorage if backend fails
        const savedEmployees = localStorage.getItem('employees');
        if (savedEmployees) {
          try {
            const parsed = JSON.parse(savedEmployees);
            setEmployees(parsed);
          } catch (e) {
            console.error('Error parsing saved employees:', e);
          }
        }
      }
      
      // Also fetch registered faces from backend
      await fetchRegisteredFaces();
    } catch (err: any) {
      // Fallback to localStorage on error
      const savedEmployees = localStorage.getItem('employees');
      if (savedEmployees) {
        try {
          const parsed = JSON.parse(savedEmployees);
          setEmployees(parsed);
        } catch (e) {
          console.error('Error parsing saved employees:', e);
        }
      }
      if (err.name !== 'AbortError') {
        setError('Failed to load employees from server. Using cached data.');
        console.error('Error fetching employees:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // Refresh face registration status every 10 seconds
    const interval = setInterval(fetchRegisteredFaces, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAddEmployee = async (employeeData: Employee) => {
    try {
      // Send to backend API
      const response = await fetch(`${API_BASE}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: employeeData.id,
          name: employeeData.name,
          department: employeeData.department,
          photo: employeeData.photo || '',
          joinDate: employeeData.joinDate || '',
          active: employeeData.active !== undefined ? employeeData.active : true,
          faceRegistered: employeeData.faceRegistered || false,
        }),
      });

      if (response.ok) {
        // Refresh employees list
        await fetchEmployees();
        // Refresh face status
        await fetchRegisteredFaces();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add employee');
      }
    } catch (err) {
      console.error('Error adding employee:', err);
      setError('Failed to add employee. Please try again.');
    }
  };

  const handleDeleteClick = (employee: EmployeeWithFace) => {
    setDeleteDialog({
      open: true,
      employeeId: employee.id,
      employeeName: employee.name,
      hasFaceData: employee.faceRegistered || false,
      deleteFaceData: false, // Default to keeping face data
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.employeeId) return;

    try {
      // Call backend API to delete employee
      const deleteUrl = `${API_BASE}/employees/${deleteDialog.employeeId}?delete_face_data=${deleteDialog.deleteFaceData}`;
      const response = await fetch(deleteUrl, { method: 'DELETE' });

      if (response.ok) {
        // Remove from local state
        const updatedEmployees = employees.filter(emp => emp.id !== deleteDialog.employeeId);
        setEmployees(updatedEmployees);
        // Save to localStorage
        localStorage.setItem('employees', JSON.stringify(updatedEmployees));
        
        // Refresh face status
        await fetchRegisteredFaces();
        
        setDeleteDialog({ ...deleteDialog, open: false });
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete employee');
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Failed to delete employee. Please try again.');
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog({ ...deleteDialog, open: false });
  };

  const handleEditEmployee = async (employeeData: Employee) => {
    try {
      // Send to backend API
      const response = await fetch(`${API_BASE}/employees/${employeeData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: employeeData.name,
          department: employeeData.department,
          photo: employeeData.photo || '',
          active: employeeData.active !== undefined ? employeeData.active : true,
        }),
      });

      if (response.ok) {
        // Refresh employees list
        await fetchEmployees();
        setEditingEmployee(null);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update employee');
      }
    } catch (err) {
      console.error('Error updating employee:', err);
      setError('Failed to update employee. Please try again.');
    }
  };

  // Refresh face status when modal closes (in case face was registered)
  const handleModalClose = () => {
    setIsModalOpen(false);
    fetchRegisteredFaces();
  };

  // Handle face registration completion for existing employee
  const handleFaceRegistered = (employeeId: string) => {
    fetchRegisteredFaces();
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.id.toLowerCase().includes(search.toLowerCase()) ||
    emp.department.toLowerCase().includes(search.toLowerCase())
  );

  // Mark employees with registered faces
  const employeesWithFaceStatus = filteredEmployees.map(emp => ({
    ...emp,
    faceRegistered: registeredFaces.has(emp.id),
  }));

  const getProfilePhoto = (employee: EmployeeWithFace) => {
    if (employee.photo) {
      return employee.photo;
    }
    if (employee.faceRegistered) {
      return API_BASE + '/profiles/' + employee.id + '.jpg';
    }
    return '';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box padding="24px" position={"relative"}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Employees
        </Typography>
        <Button
          variant="contained"
          startIcon={<PlusIcon size={16} />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Employee
        </Button>
      </Box>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSubmit={handleAddEmployee}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Paper
        sx={{
          p: '2px 8px',
          display: 'flex',
          alignItems: 'center',
          mb: 3,
        }}
        variant="outlined"
      >
        <SearchIcon size={18} style={{ marginRight: 8, color: 'gray' }} />
        <InputBase
          sx={{ flex: 1 }}
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Paper>

      {/* Table */}
      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Face Registered</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {employeesWithFaceStatus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No employees found. Click "Add Employee" to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              employeesWithFaceStatus.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Avatar src={getProfilePhoto(employee)} alt={employee.name} sx={{ mr: 2 }} />
                      <Box>
                        <Typography variant="subtitle2">{employee.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{employee.id}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{employee.department}</Typography>
                  </TableCell>
                  <TableCell>
                    {employee.faceRegistered ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <CheckCircleIcon size={20} style={{ color: '#4caf50' }} />
                        <Typography variant="body2" color="success.main">
                          Registered
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not Registered
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={employee.active ? 'Active' : 'Inactive'}
                      color={employee.active ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => setEditingEmployee(employee)}
                    >
                      <EditIcon size={16} />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteClick(employee)}
                    >
                      <TrashIcon size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      {editingEmployee && (
        <EditEmployeeModal
          isOpen={true}
          onClose={() => setEditingEmployee(null)}
          onSubmit={handleEditEmployee}
          employee={editingEmployee}
          onFaceRegistered={handleFaceRegistered}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Employee?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete <strong>{deleteDialog.employeeName}</strong> (ID: {deleteDialog.employeeId})?
            {deleteDialog.hasFaceData && (
              <>
                <br /><br />
                This employee has registered face data. You can choose to keep or delete it.
              </>
            )}
          </DialogContentText>
          {deleteDialog.hasFaceData && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteDialog.deleteFaceData}
                  onChange={(e) =>
                    setDeleteDialog({ ...deleteDialog, deleteFaceData: e.target.checked })
                  }
                  color="error"
                />
              }
              label={
                <Typography variant="body2" color="error">
                  Also delete face registration data
                </Typography>
              }
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeList;
