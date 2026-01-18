# ONVIF Server Quick Start Guide

## ✅ Status: ONVIF Server is Ready!

The ONVIF server has been successfully installed and configured. Your Raspberry Pi can now be added to UniFi UDM/UNVR and other NVR systems.

## 📋 What's Installed

- **rpos** - ONVIF server (Node.js based)
- **ONVIF Manager** - Python integration with Flask backend
- **Configuration** - Pre-configured for Raspberry Pi 5

## 🚀 How to Use

### Option 1: Via Web UI (Recommended)

1. Open the web interface
2. Navigate to **Settings → Camera Setup**
3. Scroll to **ONVIF Server** section
4. Toggle **Enable ONVIF Server** to ON
5. The server will start automatically

### Option 2: Via API

```bash
# Start ONVIF server
curl -X POST http://localhost:5002/api/onvif/start

# Check status
curl http://localhost:5002/api/onvif/status

# Stop ONVIF server
curl -X POST http://localhost:5002/api/onvif/stop
```

## 🔧 Configuration

**Current Settings:**
- **ONVIF Service Port:** 8081
- **RTSP Port:** 8554
- **IP Address:** 10.10.10.130
- **Username:** admin
- **Password:** admin

**ONVIF Service URL:**
```
http://10.10.10.130:8081/onvif/device_service
```

**RTSP Stream URL:**
```
rtsp://10.10.10.130:8554/h264
```

## 📺 Adding to UniFi UDM/UNVR

1. **Start ONVIF server** (via web UI or API)
2. **Open UniFi Protect** on your UDM/UNVR
3. **Go to Settings → Cameras**
4. **Click "Add Camera"**
5. **Select "ONVIF"**
6. **Enter the following:**
   - **IP Address:** 10.10.10.130
   - **Port:** 8081
   - **Username:** admin
   - **Password:** admin
7. **Click "Add"**
8. UniFi will discover the camera automatically

## ✅ Verification

### Test ONVIF Discovery
Use ONVIF Device Manager (Windows) or any ONVIF client:
- Device should appear in network scan
- Can retrieve device information
- Can get media profiles
- RTSP stream should be accessible

### Test RTSP Stream
```bash
# Using VLC
vlc rtsp://10.10.10.130:8554/h264

# Using ffplay
ffplay rtsp://10.10.10.130:8554/h264
```

## 🔍 Troubleshooting

### ONVIF Server Not Starting
1. Check if Node.js is installed: `node --version`
2. Check if rpos.js exists: `ls /home/pi/rpos/rpos.js`
3. Check logs: Look for errors in backend logs
4. Check port availability: `sudo netstat -tulnp | grep 8081`

### UniFi Can't Discover Camera
1. Ensure ONVIF server is running
2. Check firewall: Port 8081 must be open
3. Verify IP address is correct
4. Try manual IP entry instead of discovery

### RTSP Stream Not Working
1. Check RTSP port: `sudo netstat -tulnp | grep 8554`
2. Verify camera is active in main application
3. Test RTSP URL with VLC or ffplay

## 📝 Configuration Files

- **rpos Config:** `/home/pi/rpos/rposConfig.json`
- **ONVIF Manager:** `/home/pi/FaceRecognization-120725/RPI5-FR/onvif_manager.py`
- **PID File:** `/tmp/rpos.pid`

## 🎯 Next Steps

1. Start ONVIF server via web UI
2. Add to UniFi UDM/UNVR
3. Configure recording settings in UniFi
4. Test live view and recording

## 📞 Support

If you encounter issues:
1. Check backend logs: `/home/pi/FaceRecognization-120725/RPI5-FR/server.log`
2. Check rpos output: Look for errors when starting
3. Verify network connectivity
4. Test with ONVIF Device Manager first

---

**Status:** ✅ Ready for Production Use
