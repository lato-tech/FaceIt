import ErrorBoundary from "./components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FaceRecognitionSystem from './components/FaceRecognitionSystem';
import Settings from './pages/Settings';
import Sidebar from './components/layout/Sidebar';
import { ThemeProvider } from './utils/theme';
import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import { Alert, Grid, Snackbar } from '@mui/material';
import { AppProvider, useAppContext } from './context/AppContext';

const CpuWarningBanner = () => {
  const { cpuHigh, cpuAlertId, systemStats } = useAppContext();
  const cpuUsage = typeof systemStats?.cpu_usage === 'number' ? systemStats.cpu_usage : null;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (cpuHigh && cpuAlertId > 0) {
      setOpen(true);
    }
  }, [cpuHigh, cpuAlertId]);

  if (!cpuHigh && !open) return null;
  return (
    <Snackbar
      key={cpuAlertId}
      open={open}
      autoHideDuration={5000}
      onClose={() => setOpen(false)}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity="warning"
        variant="filled"
        onClose={() => setOpen(false)}
      >
        CPU above 85%{cpuUsage !== null ? ` (${cpuUsage}%)` : ''}
      </Alert>
    </Snackbar>
  );
};

export function App() {
  return (
    <ErrorBoundary><ThemeProvider>
      <BrowserRouter>
      <AppProvider>
        <Box sx={{ width: '100%', height: '100vh', bgcolor: 'background.default', overflow: 'hidden' }}>
          <CpuWarningBanner />
          <Grid container sx={{ height: '100vh', overflow: 'hidden', width: '100%' }}>
            <Grid

              component="aside"
              sx={{
                flexShrink: 0,
              }}
            >
              <Sidebar />
            </Grid>

            <Grid
             
              component="main"
              sx={{
                overflowY: 'auto',
                overflowX: 'hidden',
                width: '100%',
                flex: 1,
                height: '100vh',
              }}
            >
                <Routes>
                  <Route path="/" element={<FaceRecognitionSystem />} />
                  <Route path="/settings/*" element={<Settings />} />
                </Routes>

            </Grid>
          </Grid>
        </Box>
        </AppProvider>
      </BrowserRouter>
    </ThemeProvider></ErrorBoundary>
  );
  
}