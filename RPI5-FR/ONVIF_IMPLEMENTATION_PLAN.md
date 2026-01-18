# ONVIF Implementation Plan for UniFi UDM/UNVR Compatibility

## Current Status
- ❌ ONVIF server is NOT currently working
- ❌ ONVIF libraries not installed
- ❌ No RTSP server configured
- ✅ Basic skeleton code exists (`onvif_server.py`)

## UniFi UDM/UNVR Requirements

UniFi UDM and UNVR support:
- **ONVIF Profile S** (Streaming) - Required
- **ONVIF Profile T** (Advanced Streaming) - Optional but recommended
- **RTSP streaming** (H.264/H.265)
- **WS-Discovery** for device discovery
- **Digest authentication** (username/password)

## Implementation Options

### Option 1: Use rpos (Recommended - Easiest)
**rpos** is a mature Node.js ONVIF server specifically designed for Raspberry Pi:
- ✅ Supports ONVIF Profile S and T
- ✅ Works with UniFi systems
- ✅ Handles Pi Camera and USB cameras
- ✅ Includes RTSP server
- ✅ Active maintenance

**Installation:**
```bash
# Install Node.js if not present
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install rpos
cd /home/pi
git clone https://github.com/BreeeZe/rpos.git
cd rpos
npm install

# Configure rpos
# Edit config.json with your settings
```

**Pros:**
- Quick to set up
- Proven to work with UniFi
- Handles all ONVIF complexity

**Cons:**
- Requires Node.js
- Separate process from Python backend

### Option 2: Python ONVIF Server (More Integration)
Build a Python-based ONVIF server integrated with the Flask backend:
- ✅ Better integration with existing codebase
- ✅ Single process
- ❌ More complex to implement
- ❌ Need to handle RTSP separately

**Libraries needed:**
- `onvif-zeep` or `python-onvif-zeep` (ONVIF client/server)
- `mediamtx` or `rtsp-simple-server` (RTSP streaming)
- `spyne` or `soaplib` (SOAP server for ONVIF)

### Option 3: Hybrid Approach (Best of Both)
- Use **mediamtx** for RTSP streaming (lightweight, Go-based)
- Build minimal Python ONVIF server for device management
- Integrate with existing Flask backend

## Recommended Solution: rpos + Integration

**Why rpos:**
1. **Proven compatibility** with UniFi UDM/UNVR
2. **Active development** and maintenance
3. **Complete implementation** of ONVIF Profile S/T
4. **Easy configuration** via JSON
5. **Built-in RTSP server**

**Integration Strategy:**
1. Run rpos as a separate service
2. Integrate with Flask backend via API calls
3. Control rpos from Camera Settings UI
4. Share camera feed between systems

## Implementation Steps

### Phase 1: Install and Configure rpos
1. Install Node.js (if not present)
2. Clone and install rpos
3. Configure rpos for Pi Camera
4. Test ONVIF discovery with ONVIF Device Manager
5. Test with UniFi UDM/UNVR

### Phase 2: Integration
1. Add rpos control endpoints to Flask API
2. Update Camera Settings UI with ONVIF controls
3. Add ONVIF status monitoring
4. Add start/stop ONVIF server functionality

### Phase 3: Testing
1. Test ONVIF discovery from UniFi
2. Test RTSP stream playback
3. Test recording functionality
4. Verify all ONVIF operations work

## Configuration for UniFi

**rpos config.json example:**
```json
{
  "onvif": {
    "port": 8080,
    "profile": "S",
    "name": "Raspberry Pi Facial Recognition",
    "location": "Office",
    "manufacturer": "Raspberry Pi",
    "model": "RPi5 Facial Recognition System"
  },
  "rtsp": {
    "port": 8554,
    "path": "/stream"
  },
  "camera": {
    "source": "raspberry",
    "width": 1280,
    "height": 720,
    "fps": 20
  },
  "auth": {
    "username": "admin",
    "password": "changeme"
  }
}
```

## Verification Checklist

- [ ] rpos installed and running
- [ ] ONVIF Device Manager can discover device
- [ ] UniFi UDM/UNVR can discover device
- [ ] RTSP stream accessible
- [ ] Can add device to UniFi Protect
- [ ] Live view works in UniFi
- [ ] Recording works in UniFi

## Next Steps

1. **Test if rpos works** - Quick proof of concept
2. **If successful** - Integrate with existing system
3. **If issues** - Consider Python-based solution

## Can It Be Done?

**YES** - ONVIF support for UniFi UDM/UNVR is definitely achievable using rpos. It's a proven solution that many users have successfully deployed.

The main requirements are:
- ✅ ONVIF Profile S support (rpos has this)
- ✅ RTSP streaming (rpos includes this)
- ✅ Proper authentication (rpos supports this)
- ✅ Network accessibility (standard networking)

**Estimated Time:** 2-4 hours for full implementation and testing.
