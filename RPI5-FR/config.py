import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Configuration settings for the facial recognition system"""
    
    # ERPNext Configuration
    ERPNEXT_BASE_URL = os.getenv('ERPNEXT_BASE_URL', 'https://erp.namiex.com/api')
    ERPNEXT_USERNAME = os.getenv('ERPNEXT_USERNAME', '123456')
    ERPNEXT_PASSWORD = os.getenv('ERPNEXT_PASSWORD', '123456')
    
    # API Server Configuration
    API_HOST = os.getenv('API_HOST', '0.0.0.0')
    API_PORT = int(os.getenv('API_PORT', 5002))
    API_DEBUG = os.getenv('API_DEBUG', 'False').lower() == 'true'
    
    # Face Recognition Configuration
    FACES_DIRECTORY = os.getenv('FACES_DIRECTORY', 'faces')
    ATTENDANCE_COOLDOWN = int(os.getenv('ATTENDANCE_COOLDOWN', 30))  # seconds
    FACE_RECOGNITION_TOLERANCE = float(os.getenv('FACE_RECOGNITION_TOLERANCE', 0.7))  # Lower confidence accepted
    
    # Camera Configuration - 16:9 Aspect Ratio for Industrial RPi5 with Shield
    CAMERA_WIDTH = int(os.getenv('CAMERA_WIDTH', 960))  # 16:9 resolution
    CAMERA_HEIGHT = int(os.getenv('CAMERA_HEIGHT', 540))  # 16:9 resolution (960x540)
    CAMERA_FPS = int(os.getenv('CAMERA_FPS', 15))  # Slightly higher FPS for smoother stream
    
    # Camera Port Configuration
    CAMERA_PORT = os.getenv('CAMERA_PORT', 'CSI0')  # CSI0 for primary port
    CAMERA_SENSOR_ID = int(os.getenv('CAMERA_SENSOR_ID', 0))  # Sensor 0 for CSI0
    
    # Camera Transform Settings
    CAMERA_HORIZONTAL_FLIP = os.getenv('CAMERA_HORIZONTAL_FLIP', 'True').lower() == 'true'  # Enable horizontal flip
    CAMERA_VERTICAL_FLIP = os.getenv('CAMERA_VERTICAL_FLIP', 'False').lower() == 'true'  # Disable vertical flip
    
    # Recognition Auto-Start Settings
    AUTO_START_RECOGNITION = os.getenv('AUTO_START_RECOGNITION', 'True').lower() == 'true'  # Auto-start recognition when camera initializes
    
    # Debug Settings
    CAMERA_DEBUG = os.getenv('CAMERA_DEBUG', 'False').lower() == 'true'  # Enable camera debug output
    
    # Industrial Camera Settings (conservative for reliability)
    CAMERA_AUTOFOCUS = os.getenv('CAMERA_AUTOFOCUS', 'False').lower() == 'true'  # Disable for stability
    CAMERA_AWB_MODE = os.getenv('CAMERA_AWB_MODE', 'auto')  # auto, incandescent, tungsten, fluorescent, indoor, daylight, cloudy
    CAMERA_EXPOSURE_MODE = os.getenv('CAMERA_EXPOSURE_MODE', 'auto')  # auto, night, nightpreview, backlight, spotlight, sports, snow, beach, verylong, fixedfps, antishake, fireworks
    
    # Platform Configuration
    PLATFORM = os.getenv('PLATFORM', 'auto')  # auto, raspberry_pi, macos, windows, linux
    
    # Logging Configuration
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'facial_recognition.log')
    
    # Security Configuration
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')
    API_KEY = os.getenv('API_KEY', None)  # Optional API key for authentication
    
    @classmethod
    def get_platform(cls):
        """Auto-detect platform if not specified"""
        if cls.PLATFORM == 'auto':
            import platform
            system = platform.system().lower()
            if system == 'darwin':
                return 'macos'
            elif system == 'linux':
                # Check if running on Raspberry Pi
                try:
                    with open('/proc/cpuinfo', 'r') as f:
                        cpuinfo = f.read()
                        if 'Raspberry Pi' in cpuinfo and 'BCM2712' in cpuinfo:
                            return 'raspberry_pi_industrial'  # RPi5 with industrial shield
                        elif 'Raspberry Pi' in cpuinfo:
                            return 'raspberry_pi'
                except:
                    pass
                return 'linux'
            elif system == 'windows':
                return 'windows'
            else:
                return 'unknown'
        return cls.PLATFORM
