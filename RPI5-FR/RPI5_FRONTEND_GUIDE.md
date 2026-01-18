# Raspberry Pi 5 Facial Recognition Frontend Guide

## Overview
This guide explains how to use the facial recognition API endpoints on the frontend for Raspberry Pi 5.

## Quick Start

### 1. Start the API Server
```bash
# On Raspberry Pi 5
python3 api_server.py
```

The server will start on `http://localhost:5002`

### 2. Open the Frontend
Open `rpi5_frontend_example.html` in a web browser on your Raspberry Pi 5 or any device on the same network.

## API Endpoints Usage

### Connection & Health Check
```javascript
// Check if API server is running
const response = await fetch('http://localhost:5002/api/health');
const data = await response.json();
```

### Camera Management

#### Start Camera Stream
```javascript
// Get camera stream URL
const streamUrl = 'http://localhost:5002/api/camera/stream';

// Use in video element
const video = document.getElementById('cameraVideo');
video.src = streamUrl;
video.play();
```

#### Check Camera Status
```javascript
const response = await fetch('http://localhost:5002/api/camera/status');
const status = await response.json();
console.log('Camera status:', status);
```

### Face Recognition

#### Start Continuous Recognition
```javascript
const response = await fetch('http://localhost:5002/api/recognition/start', {
    method: 'POST'
});
const data = await response.json();
```

#### Stop Recognition
```javascript
const response = await fetch('http://localhost:5002/api/recognition/stop', {
    method: 'POST'
});
const data = await response.json();
```

#### Get Recognition Status
```javascript
const response = await fetch('http://localhost:5002/api/recognition/status');
const status = await response.json();
console.log('Recognition active:', status.active);
console.log('Loaded faces:', status.loaded_faces);
```

#### Get Latest Results
```javascript
const response = await fetch('http://localhost:5002/api/recognition/latest');
const results = await response.json();
console.log('Faces detected:', results.faces_detected);
console.log('Recognitions:', results.recognitions);
```

#### Real-time Recognition Stream
```javascript
// Using Server-Sent Events
const eventSource = new EventSource('http://localhost:5002/api/recognition/stream');

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Real-time recognition:', data);
};

eventSource.onerror = (error) => {
    console.error('Stream error:', error);
    eventSource.close();
};
```

### Face Registration

#### Register New Face
```javascript
const formData = new FormData();
formData.append('image', imageFile);  // File object
formData.append('name', 'John Doe');

const response = await fetch('http://localhost:5002/api/register-face', {
    method: 'POST',
    body: formData
});
const result = await response.json();
```

#### Get Registered Faces
```javascript
const response = await fetch('http://localhost:5002/api/faces');
const data = await response.json();
console.log('Registered faces:', data.faces);
```

#### Delete Registered Face
```javascript
const response = await fetch(`http://localhost:5002/api/faces/${encodeURIComponent(name)}`, {
    method: 'DELETE'
});
const result = await response.json();
```

### Attendance Management

#### Get Attendance Log
```javascript
const response = await fetch('http://localhost:5002/api/attendance');
const data = await response.json();
console.log('Attendance records:', data.attendance);
```

#### Get Employees (ERPNext Integration)
```javascript
const response = await fetch('http://localhost:5002/api/employees');
const data = await response.json();
console.log('Employees:', data.employees);
```

## Using the Continuous Recognition Client

The frontend includes a `ContinuousFaceRecognition` class for easier API usage:

```javascript
// Initialize client
const client = new ContinuousFaceRecognition('http://localhost:5002/api');

// Set up event handlers
client.onRecognition((data) => {
    console.log('Recognition result:', data);
});

client.onStatusChange((data) => {
    console.log('Status changed:', data);
});

client.onError((error) => {
    console.error('Error:', error);
});

// Start recognition
await client.startRecognition();

// Get latest results
const results = await client.getLatestResults();

// Stop recognition
await client.stopRecognition();
```

## Frontend Features

### 1. Connection Status
- Automatically checks API server connection
- Shows real-time connection status

### 2. Camera Stream
- Live camera feed display
- Start/stop camera controls
- Camera status monitoring

### 3. Face Recognition
- Start/stop continuous recognition
- Real-time face detection overlay
- Recognition statistics (faces detected, recognized)

### 4. Face Registration
- Upload face images
- Register new faces with names
- View registered faces list
- Delete registered faces

### 5. Recognition Results
- Real-time recognition results display
- Face bounding boxes on video
- Confidence scores
- Timestamps

### 6. Attendance Management
- View attendance logs
- Employee management (with ERPNext integration)

## Configuration

### API Server Configuration
Edit `config.py` to customize:
- Camera settings (resolution, FPS, port)
- Face recognition tolerance
- Attendance cooldown
- ERPNext integration

### Frontend Configuration
In the HTML file, change the API base URL:
```javascript
const API_BASE_URL = 'http://your-rpi5-ip:5002/api';
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if API server is running
   - Verify port 5002 is accessible
   - Check firewall settings

2. **Camera Not Working**
   - Ensure camera is connected
   - Check camera permissions
   - Verify camera port configuration

3. **Recognition Not Starting**
   - Check if faces are registered
   - Verify camera initialization
   - Check server logs for errors

4. **Segmentation Fault**
   - Restart the API server
   - Check camera hardware connections
   - Verify dlib installation

### Debug Mode
Enable debug mode in `config.py`:
```python
CAMERA_DEBUG = True
API_DEBUG = True
```

## Network Access

To access from other devices on the network:

1. Find your Raspberry Pi 5 IP address:
```bash
hostname -I
```

2. Update the frontend API URL:
```javascript
const API_BASE_URL = 'http://192.168.1.100:5002/api';  // Replace with your IP
```

3. Ensure port 5002 is accessible on your network

## Security Considerations

- Change default ERPNext credentials
- Use HTTPS in production
- Implement API key authentication
- Restrict network access as needed

## Performance Tips

- Lower camera resolution for better performance
- Reduce recognition frequency
- Use SSD storage for faster face loading
- Monitor system resources

## Integration Examples

### React/Vue.js Integration
```javascript
// React hook example
const useFaceRecognition = () => {
    const [results, setResults] = useState([]);
    const [isActive, setIsActive] = useState(false);
    
    const client = new ContinuousFaceRecognition(API_BASE_URL);
    
    useEffect(() => {
        client.onRecognition(setResults);
        client.onStatusChange((data) => setIsActive(data.active));
        
        return () => client.destroy();
    }, []);
    
    return { results, isActive, client };
};
```

### Node.js Backend Integration
```javascript
// Express.js middleware
app.use('/api/proxy', async (req, res) => {
    const response = await fetch(`http://localhost:5002/api${req.path}`, {
        method: req.method,
        headers: req.headers,
        body: req.body
    });
    
    const data = await response.json();
    res.json(data);
});
```

This guide covers all the essential API endpoints and frontend integration patterns for using the facial recognition system on Raspberry Pi 5. 