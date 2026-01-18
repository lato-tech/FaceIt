#!/bin/bash

echo "🔧 Fixing Camera Conflicts on Raspberry Pi 5"
echo "============================================="

# Kill any existing camera processes
echo "Killing camera processes..."
pkill -f "python.*camera" || true
pkill -f "python.*picamera" || true
pkill -f "libcamera" || true
pkill -f "api_server" || true

# Wait for processes to clean up
sleep 3

# Reset camera modules
echo "Resetting camera modules..."
sudo modprobe -r bcm2835-v4l2 || true
sleep 2
sudo modprobe bcm2835-v4l2 || true

# Wait for camera to be ready
sleep 3

# Test camera availability
echo "Testing camera..."
if libcamera-hello --timeout 1000 > /dev/null 2>&1; then
    echo "✅ Camera is working!"
    echo "You can now run: python3 api_server.py"
else
    echo "❌ Camera test failed"
    echo "Try rebooting: sudo reboot"
fi 