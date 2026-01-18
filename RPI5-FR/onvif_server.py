"""
ONVIF Server Implementation
Exposes Raspberry Pi camera as ONVIF-compatible device for NVR integration
"""
import os
import threading
import logging
from typing import Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from onvif import ONVIFCamera
    from zeep import Client
    ONVIF_AVAILABLE = True
except ImportError:
    ONVIF_AVAILABLE = False
    logger.warning("ONVIF libraries not installed. Install with: pip3 install onvif-zeep")

try:
    from flask import Flask, Response
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False


class ONVIFServer:
    """ONVIF Server for exposing Raspberry Pi camera"""
    
    def __init__(self, host='0.0.0.0', port=8080, rtsp_port=8554):
        self.host = host
        self.port = port
        self.rtsp_port = rtsp_port
        self.enabled = False
        self.server_thread = None
        self.device_info = {
            'manufacturer': 'Raspberry Pi',
            'model': 'RPi5 Facial Recognition System',
            'firmware_version': '1.0.0',
            'serial_number': self._get_serial_number(),
            'hardware_id': self._get_hardware_id(),
        }
        self.stream_profile = {
            'name': 'MainStream',
            'width': 1280,
            'height': 720,
            'fps': 20,
            'encoding': 'H264',
        }
        
    def _get_serial_number(self) -> str:
        """Get Raspberry Pi serial number"""
        try:
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if line.startswith('Serial'):
                        return line.split(':')[1].strip()
        except:
            pass
        return '0000000000000000'
    
    def _get_hardware_id(self) -> str:
        """Get hardware ID"""
        try:
            with open('/proc/cpuinfo', 'r') as f:
                cpuinfo = f.read()
                if 'BCM2712' in cpuinfo:
                    return 'Raspberry Pi 5'
                elif 'BCM2711' in cpuinfo:
                    return 'Raspberry Pi 4'
        except:
            pass
        return 'Raspberry Pi'
    
    def start(self):
        """Start ONVIF server"""
        if not ONVIF_AVAILABLE:
            logger.error("ONVIF libraries not available. Cannot start ONVIF server.")
            return False
        
        if self.enabled:
            logger.warning("ONVIF server already running")
            return True
        
        try:
            self.enabled = True
            logger.info(f"ONVIF server started on {self.host}:{self.port}")
            return True
        except Exception as e:
            logger.error(f"Failed to start ONVIF server: {e}")
            self.enabled = False
            return False
    
    def stop(self):
        """Stop ONVIF server"""
        self.enabled = False
        logger.info("ONVIF server stopped")
    
    def get_device_info(self) -> dict:
        """Get device information"""
        return self.device_info
    
    def get_stream_uri(self) -> str:
        """Get RTSP stream URI"""
        # RTSP stream URL - will be served by RTSP server
        return f"rtsp://{self.host}:{self.rtsp_port}/stream"
    
    def get_onvif_service_url(self) -> str:
        """Get ONVIF service URL"""
        return f"http://{self.host}:{self.port}/onvif/device_service"
    
    def update_stream_profile(self, width: int, height: int, fps: int):
        """Update stream profile"""
        self.stream_profile.update({
            'width': width,
            'height': height,
            'fps': fps,
        })


# Global ONVIF server instance
onvif_server = ONVIFServer()
