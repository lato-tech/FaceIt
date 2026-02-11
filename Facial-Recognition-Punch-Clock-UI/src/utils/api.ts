// API base URL - use proxy when on Vite dev/preview (port 5173) to avoid CORS
export const API_BASE =
  import.meta.env?.VITE_API_BASE ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? '/api'
    : `${window.location.protocol}//${window.location.hostname}:5002/api`);

// Health check for facial recognition API
export const checkRecognitionHealth = async () => {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return {
      connected: response.ok,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Start facial recognition
export const startRecognition = async () => {
  try {
    const response = await fetch(`${API_BASE}/recognition/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Stop facial recognition
export const stopRecognition = async () => {
  try {
    const response = await fetch(`${API_BASE}/recognition/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Get camera frame
export const getCameraFrame = async () => {
  try {
    const timestamp = new Date().getTime();
    const response = await fetch(`${API_BASE}/camera/frame?t=${timestamp}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.blob();
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to get camera frame');
  }
};

// Create EventSource for recognition stream
export const createRecognitionStream = () => {
  return new EventSource(`${API_BASE}/recognition/stream`);
};

// Simulated API functions for ERPNext integration
export const checkIn = async (employeeId: string, isCheckIn: boolean) => {
  // This would be a real API call to ERPNext in production
  console.log(`${isCheckIn ? 'Check-in' : 'Check-out'} request for employee ${employeeId}`);
  // Simulate network request
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        success: true,
        timestamp: new Date().toISOString(),
        message: `${isCheckIn ? 'Check-in' : 'Check-out'} recorded successfully`
      });
    }, 500);
  });
};

export const verifyConnection = async () => {
  // Simulate checking connection to ERPNext
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        connected: true
      });
    }, 300);
  });
};