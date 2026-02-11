from flask import Flask, request, jsonify, send_file, Response, send_from_directory
from flask_cors import CORS
import cv2
import numpy as np
import face_recognition
import os
import base64
from datetime import datetime
import json
import threading
from collections import deque
import tempfile
import subprocess
import socket
import struct
import time
from auth import AuthManager
from config import Config
# Import face detector for enhanced face detection
from face_detection.face_detector import FaceDetector
# Import enhanced camera manager
from face_detection.camera_manager import CameraManager
import logging
import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.FileHandler("server.log"),
        logging.StreamHandler()
    ]
)

def log_face_registration(message):
    try:
        faces_dir = Config.FACES_DIRECTORY
        abs_faces_dir = os.path.abspath(faces_dir)
        base_dir = os.path.dirname(abs_faces_dir) or os.getcwd()
        log_dir = os.path.join(base_dir, 'logs')
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        log_path = os.path.join(log_dir, 'face_registration.log')
        timestamp = datetime.now().isoformat()
        with open(log_path, 'a') as log_file:
            log_file.write("%s %s\n" % (timestamp, message))
    except Exception as e:
        print("⚠️  Face registration log error: %s" % e)

def _normalize_confidence(raw_confidence):
    """Map raw model confidence (0–1, typically max ~0.6) to 0–1 scale so display is 0–100%."""
    if raw_confidence is None:
        return 0.0
    scale = getattr(Config, 'CONFIDENCE_100_PCT_RAW', 0.6)
    return min(1.0, float(raw_confidence) / scale) if scale > 0 else 0.0

# Stream tuning (lower size/quality for snappier MJPEG)
STREAM_WIDTH = 640
STREAM_HEIGHT = 360
STREAM_JPEG_QUALITY = 70
STREAM_MIN_WIDTH = 320
STREAM_MAX_WIDTH = 1920
STREAM_MIN_HEIGHT = 240
STREAM_MAX_HEIGHT = 1080
STREAM_MIN_QUALITY = 50
STREAM_MAX_QUALITY = 100

# Event logs (anti-spoofing, multi-face, detection stats)
event_log_lock = threading.Lock()
event_log_last = {}

def _should_log_event(event_type: str, cooldown_seconds: int = 10) -> bool:
    now = time.time()
    with event_log_lock:
        last_time = event_log_last.get(event_type, 0)
        if now - last_time < cooldown_seconds:
            return False
        event_log_last[event_type] = now
        return True

def _save_event_image(frame, prefix: str) -> str:
    try:
        faces_dir = Config.FACES_DIRECTORY
        abs_faces_dir = os.path.abspath(faces_dir)
        base_dir = os.path.dirname(abs_faces_dir) or os.getcwd()
        log_dir = os.path.join(base_dir, 'logs', 'event_images')
        os.makedirs(log_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{prefix}_{timestamp}.jpg"
        filepath = os.path.join(log_dir, filename)
        cv2.imwrite(filepath, frame)
        return filename
    except Exception as e:
        print(f"⚠️  Event image save error: {e}")
        return ''

def log_event_entry(event_type: str, message: str = '', image_filename: str = '', metadata: dict = None):
    try:
        from db import db
        metadata_json = json.dumps(metadata) if metadata else None
        db.log_event(event_type=event_type, message=message, image_path=image_filename, metadata=metadata_json)
    except Exception as e:
        print(f"⚠️  Event log error: {e}")

app = Flask(__name__)
CORS(app)  # Enable CORS for webapp integration

# Initialize components
auth_manager = AuthManager()
face_detector = None  # Will be initialized after loading faces

# Global variables for face recognition
known_face_encodings = []
known_face_names = []
last_attendance_time = {}
attendance_cooldown = Config.ATTENDANCE_COOLDOWN  # seconds

# Haar cascades (initialized once to avoid repeated allocations)
try:
    FACE_CASCADE = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
except Exception as cascade_error:
    logging.warning(f"Failed to initialize face cascade: {cascade_error}")
    FACE_CASCADE = None

try:
    EYEGLASS_CASCADE = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml'
    )
except Exception as cascade_error:
    logging.warning(f"Failed to initialize eyeglass cascade: {cascade_error}")
    EYEGLASS_CASCADE = None

# Camera setup - using enhanced CameraManager
camera_manager = None
camera_active = False
last_camera_init_attempt = 0.0
last_camera_init_error = ''

# Camera settings (runtime)
camera_settings = {
    'faceDetectionThreshold': 0.6,
    'recognitionDistance': 0.5,
    'cameraResolution': '1080p',
    'streamResolution': '720p',
    'streamQuality': 90,
    'streamFps': 30,
    'colorTone': 'natural',
    'enhancedLighting': True
}

# AI settings (runtime)
ai_settings = {
    'aiFeatures': {
        'enhancedRecognition': True,
        'multiPersonDetection': True,
        'emotionDetection': False,
        'ageEstimation': False,
        'maskDetection': True,
        'antispoofing': True,
        'behaviorAnalysis': False,
        'glassesDetection': False
    },
    'aiPerformance': {
        'modelOptimization': 'balanced',
        'processingUnit': 'auto',
        'confidenceThreshold': 0.6
    }
}

# Recognition results for streaming
recognition_results = []
recognition_lock = threading.Lock()

# Enhanced EventSource variables
event_source_clients = set()
event_source_lock = threading.Lock()

#   Optimized Pipeline Variables
frame_buffer = []
frame_buffer_lock = threading.Lock()
# RAM tuning: keep more frames in memory to smooth stream + recognition handoff.
# 24 frames at 1280x720 BGR ~66MB; use free RAM for smoother handoff and less frame drops.
frame_buffer_max_size = 24
recognition_thread = None
recognition_active = False
last_recognition_time = 0
recognition_interval = 0.45  # Process recognition more often for smoother detection (~2.2 Hz)
last_face_detection_time = 0
face_detection_cooldown = 2.0  # Retry recognition sooner when faces appear
last_empty_broadcast_time = 0.0
empty_broadcast_interval = 0.5
last_attribute_time = 0
system_stats_thread = None
last_recognition_heartbeat = 0.0
recognition_watchdog_thread = None
recognition_watchdog_active = False
last_recognition_debug_log = 0.0
last_frame_none_count = 0
last_detection_count = 0
last_frame_source = None

# System stats logging
SYSTEM_STATS_LOG = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs', 'system_stats.log')
DEEPFACE_PY = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.venv-deepface', 'bin', 'python')

# ERPNext settings (runtime)
erpnext_settings = {
    'serverUrl': '',
    'username': '',
    'password': '',
    'apiKey': '',
    'apiSecret': '',
    'company': '',
    'syncInterval': 5,
    'sendLogs': {
        'recognition': True,
        'registration': True,
        'unknown': False
    }
}

# Device settings (runtime)
device_settings = {
    'organization': '',
    'location': ''
}

# Time settings (runtime)
time_settings = {
    'timeSource': 'auto',  # 'auto' | 'time.is' | 'ntp' | 'system'
    'ntpServers': [
        'time.google.com',
        'pool.ntp.org',
        'time.cloudflare.com',
        'time.windows.com',
    ],
    'timeFormat': '24h',  # '12h' | '24h'
}

# Attendance settings (runtime)
attendance_settings = {
    'duplicatePunchIntervalSec': Config.ATTENDANCE_COOLDOWN,
}
duplicate_broadcast_last = {}

# RAM tuning: cache profile photos in memory to reduce disk I/O and UI stutter.
PROFILE_PHOTO_CACHE_MAX = 200
PROFILE_PHOTO_CACHE_TTL_SEC = 600
profile_photo_cache = {}

def _get_profile_photo_cache(cache_key: str):
    entry = profile_photo_cache.get(cache_key)
    if not entry:
        return None
    if time.time() - entry.get('ts', 0) > PROFILE_PHOTO_CACHE_TTL_SEC:
        profile_photo_cache.pop(cache_key, None)
        return None
    return entry

def _set_profile_photo_cache(cache_key: str, data: bytes, mime: str):
    profile_photo_cache[cache_key] = {'data': data, 'mime': mime, 'ts': time.time()}
    if len(profile_photo_cache) > PROFILE_PHOTO_CACHE_MAX:
        # Evict oldest entry to cap RAM usage.
        oldest_key = min(profile_photo_cache.items(), key=lambda item: item[1].get('ts', 0))[0]
        profile_photo_cache.pop(oldest_key, None)
 
def _get_resolution_dims(resolution: str):
    mapping = {
        '480p': (854, 480),
        '720p': (1280, 720),
        '1080p': (1920, 1080),
        '1440p': (2560, 1440),
        '2160p': (3840, 2160),
    }
    return mapping.get(resolution, (Config.CAMERA_WIDTH, Config.CAMERA_HEIGHT))

def _load_camera_settings():
    """Load camera settings from disk (if present)."""
    global camera_settings
    try:
        settings_file = 'camera_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                camera_settings.update(data)
    except Exception as e:
        print(f"⚠️  Could not load camera settings: {e}")

def _load_ai_settings():
    """Load AI settings from disk (if present)."""
    global ai_settings
    try:
        settings_file = 'ai_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                ai_settings.update(data)
    except Exception as e:
        print(f"⚠️  Could not load AI settings: {e}")

def _load_erpnext_settings():
    """Load ERPNext settings from disk (if present)."""
    global erpnext_settings
    try:
        settings_file = 'erpnext_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                erpnext_settings.update(data)
    except Exception as e:
        print(f"⚠️  Could not load ERPNext settings: {e}")

def _load_device_settings():
    """Load device settings from disk (if present)."""
    global device_settings
    try:
        settings_file = 'device_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                device_settings.update(data)
    except Exception as e:
        print(f"⚠️  Could not load device settings: {e}")

def _load_time_settings():
    """Load time settings from disk (if present)."""
    global time_settings
    try:
        settings_file = 'time_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                time_settings.update(data)
    except Exception as e:
        print(f"⚠️  Could not load time settings: {e}")

def _load_attendance_settings():
    """Load attendance settings from disk (if present)."""
    global attendance_settings, attendance_cooldown
    try:
        settings_file = 'attendance_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                attendance_settings.update(data)
        attendance_cooldown = int(attendance_settings.get('duplicatePunchIntervalSec', attendance_cooldown))
    except Exception as e:
        print(f"⚠️  Could not load attendance settings: {e}")

def _get_system_time_ms():
    return int(time.time() * 1000)

def _get_time_is_ms():
    try:
        import urllib.request
        with urllib.request.urlopen("https://time.is/Unix_time", timeout=3) as response:
            payload = response.read().decode('utf-8').strip()
            if payload.isdigit():
                return int(payload) * 1000
    except Exception as e:
        print(f"⚠️  time.is fetch error: {e}")
    return None

def _query_ntp_time(server: str, timeout: float = 2.0):
    try:
        client = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        client.settimeout(timeout)
        msg = b'\x1b' + 47 * b'\0'
        client.sendto(msg, (server, 123))
        data, _ = client.recvfrom(1024)
        if len(data) < 48:
            return None
        unpacked = struct.unpack('!12I', data[:48])
        transmit_seconds = unpacked[10]
        transmit_fraction = unpacked[11]
        ntp_time = transmit_seconds + float(transmit_fraction) / 2**32
        unix_time = ntp_time - 2208988800
        return int(unix_time * 1000)
    except Exception:
        return None
    finally:
        try:
            client.close()
        except Exception:
            pass

def _get_ntp_time_ms(servers):
    for server in servers:
        ts = _query_ntp_time(server.strip())
        if ts:
            return ts, server
    return None, None

def _apply_camera_effects(frame):
    """Apply runtime color tone and lighting effects."""
    if frame is None:
        return frame
    try:
        tone = camera_settings.get('colorTone', 'natural')
        enhanced = bool(camera_settings.get('enhancedLighting', True))

        out = frame
        if tone == 'grayscale':
            gray = cv2.cvtColor(out, cv2.COLOR_BGR2GRAY)
            out = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
        elif tone == 'vivid':
            hsv = cv2.cvtColor(out, cv2.COLOR_BGR2HSV)
            h, s, v = cv2.split(hsv)
            s = cv2.add(s, 30)
            hsv = cv2.merge([h, s, v])
            out = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
        elif tone == 'low-light':
            out = cv2.convertScaleAbs(out, alpha=1.2, beta=20)
        elif tone == 'bright':
            out = cv2.convertScaleAbs(out, alpha=1.1, beta=35)
        elif tone == 'high-contrast':
            out = cv2.convertScaleAbs(out, alpha=1.3, beta=0)

        if enhanced:
            # Mild CLAHE on luminance to improve lighting
            lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l2 = clahe.apply(l)
            lab = cv2.merge((l2, a, b))
            out = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        return out
    except Exception as e:
        print(f"⚠️  Camera effects error: {e}")
        return frame

def _detect_spoof(frame, face_location):
    """Basic anti-spoofing check using sharpness/texture."""
    try:
        features = ai_settings.get('aiFeatures', {})
        if not features.get('antispoofing'):
            return None
        top, right, bottom, left = face_location
        h, w = frame.shape[:2]
        top = max(0, top)
        left = max(0, left)
        bottom = min(h, bottom)
        right = min(w, right)
        if bottom <= top or right <= left:
            return None
        face_img = frame[top:bottom, left:right]
        if face_img.size == 0:
            return None
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        # Low texture/blur often indicates a spoofed photo
        is_spoof = bool(sharpness < 18.0)
        return {'spoof': is_spoof, 'spoof_score': round(float(sharpness), 2)}
    except Exception as e:
        print(f"⚠️  Anti-spoofing error: {e}")
        return None

def _apply_detection_threshold():
    """Apply detection threshold and recognition distance to face detector."""
    global face_detector
    try:
        if face_detector is not None:
            face_detector.min_confidence_threshold = float(camera_settings.get('faceDetectionThreshold', 0.85))
            face_detector.recognition_tolerance = float(camera_settings.get('recognitionDistance', 0.5))
    except Exception as e:
        print(f"⚠️  Could not apply detection threshold: {e}")

def _apply_ai_settings():
    """Apply AI settings to runtime components."""
    global face_detector
    try:
        confidence = ai_settings.get('aiPerformance', {}).get('confidenceThreshold', 0.85)
        if face_detector is not None:
            face_detector.min_confidence_threshold = float(confidence)
    except Exception as e:
        print(f"⚠️  Could not apply AI settings: {e}")

def _analyze_face_attributes(frame, face_location):
    """Optional age/emotion analysis using DeepFace if available."""
    try:
        features = ai_settings.get('aiFeatures', {})
        want_age = bool(features.get('ageEstimation'))
        want_emotion = bool(features.get('emotionDetection'))
        if not want_age and not want_emotion:
            return {}

        global last_attribute_time
        now = time.time()
        if now - last_attribute_time < 1.5:
            return {}

        top, right, bottom, left = face_location
        h, w = frame.shape[:2]
        top = max(0, top)
        left = max(0, left)
        bottom = min(h, bottom)
        right = min(w, right)
        if bottom <= top or right <= left:
            return {}

        face_img = frame[top:bottom, left:right]
        if face_img.size == 0:
            return {}

        # Try in-process DeepFace first, else fallback to external worker
        analysis = None
        try:
            from deepface import DeepFace  # type: ignore
            actions = []
            if want_age:
                actions.append('age')
            if want_emotion:
                actions.append('emotion')

            analysis = DeepFace.analyze(
                img_path=face_img,
                actions=actions,
                enforce_detection=False
            )
            if isinstance(analysis, list):
                analysis = analysis[0]
        except Exception:
            if os.path.exists(DEEPFACE_PY):
                try:
                    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=True) as tmp:
                        ok, buf = cv2.imencode('.jpg', face_img, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                        if not ok:
                            return {}
                        tmp.write(buf.tobytes())
                        tmp.flush()
                        cmd = [
                            DEEPFACE_PY,
                            os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deepface_worker.py'),
                            '--image', tmp.name,
                        ]
                        if want_age:
                            cmd.append('--age')
                        if want_emotion:
                            cmd.append('--emotion')
                        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=4)
                        if proc.returncode == 0 and proc.stdout:
                            analysis = json.loads(proc.stdout.strip())
                except Exception as e:
                    print(f"⚠️  DeepFace worker error: {e}")

        if not analysis:
            return {}

        last_attribute_time = now
        result = {}
        if want_age and 'age' in analysis:
            result['age'] = int(analysis['age'])
        if want_emotion and 'emotion' in analysis:
            result['emotion'] = analysis.get('emotion')
        return result
    except Exception as e:
        print(f"⚠️  Age/Emotion analysis error: {e}")
        return {}

def initialize_camera():
    """Initialize camera using enhanced CameraManager"""
    global camera_manager, camera_active, last_camera_init_error
    
    if camera_manager and camera_manager.is_initialized:
        return True
        
    try:
        # Load persisted settings before initializing
        _load_camera_settings()
        _load_ai_settings()
        _load_erpnext_settings()
        _load_device_settings()
        _load_time_settings()
        _load_attendance_settings()
        _apply_detection_threshold()
        _apply_ai_settings()

        width, height = _get_resolution_dims(camera_settings.get('cameraResolution', '1080p'))

        # Create camera manager with configuration from Config/settings
        camera_manager = CameraManager(
            width=width,
            height=height,
            framerate=Config.CAMERA_FPS,
            camera_port=Config.CAMERA_PORT,
            autofocus=Config.CAMERA_AUTOFOCUS,
            awb_mode=Config.CAMERA_AWB_MODE,
            exposure_mode=Config.CAMERA_EXPOSURE_MODE,
            horizontal_flip=Config.CAMERA_HORIZONTAL_FLIP,
            vertical_flip=Config.CAMERA_VERTICAL_FLIP,
            debug=Config.CAMERA_DEBUG  # Use camera debug setting
        )
        
        # Initialize camera
        if camera_manager.initialize():
            # Verify camera can deliver a frame
            frame = None
            for _ in range(3):
                frame = camera_manager.read_frame()
                if frame is not None:
                    break
                time.sleep(0.2)
            if frame is None:
                print("❌ Camera initialized but no frames received")
                camera_manager.close()
                camera_active = False
                return False

            print(f"✅ Camera initialized successfully using CameraManager")
            camera_active = True
            return True
        else:
            last_camera_init_error = 'Camera failed to open (Picamera2 and OpenCV fallback failed). Check camera connection and permissions.'
            print("❌ Failed to initialize camera using CameraManager")
            return False
            
    except Exception as e:
        last_camera_init_error = str(e)
        print(f"❌ Camera initialization error: {e}")
        import traceback
        traceback.print_exc()
        return False


def ensure_camera_ready(force: bool = False) -> bool:
    """Ensure camera is initialized and usable, optionally force reinit."""
    global camera_manager, camera_active, last_camera_init_attempt
    now = time.time()
    if not force and (now - last_camera_init_attempt) < 3:
        return bool(camera_manager and camera_manager.is_initialized)
    last_camera_init_attempt = now

    if camera_manager and camera_manager.is_initialized and not force:
        return True

    if camera_manager:
        try:
            camera_manager.close()
        except Exception as e:
            logging.warning(f"Camera close failed: {e}")
        camera_manager = None
    camera_active = False

    return initialize_camera()

def get_camera_frame():
    """Get a single frame from the camera using CameraManager"""
    global camera_manager, camera_active
    
    if not camera_active or not camera_manager:
        return None
    
    frame = camera_manager.read_frame()
    if frame is None:
        if ensure_camera_ready(force=True):
            frame = camera_manager.read_frame()
    if frame is None:
        return None
    return _apply_camera_effects(frame)

def process_frame_for_recognition(frame):
    """Process a frame for face recognition"""
    if frame is None:
        return []
    
    try:
        # Validate frame format
        if len(frame.shape) != 3 or frame.shape[2] != 3:
            print(f"⚠️  Invalid frame format: shape={frame.shape}")
            return []
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    except Exception as e:
        print(f"❌ Error processing frame: {e}")
        return []
    
    # Find faces in the image
    face_locations = face_recognition.face_locations(rgb_image)
    face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
    
    results = []
    for i, face_encoding in enumerate(face_encodings):
        matches = face_recognition.compare_faces(known_face_encodings, face_encoding, tolerance=Config.FACE_RECOGNITION_TOLERANCE)
        name = "Unknown"
        confidence = 0.0
        
        if True in matches:
            first_match_index = matches.index(True)
            name = known_face_names[first_match_index]
            
            # Calculate confidence (distance-based)
            face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
            confidence = 1.0 - face_distances[first_match_index]
            
            # Check attendance cooldown
            current_time = datetime.now()
            if name not in last_attendance_time or \
               (current_time - last_attendance_time[name]).seconds > attendance_cooldown:
                record_attendance(name)
                last_attendance_time[name] = current_time
        
        # Get face location for bounding box
        top, right, bottom, left = face_locations[i]
        
        results.append({
            'name': name,
            'confidence': round(confidence, 3),
            'timestamp': datetime.now().isoformat(),
            'location': {
                'top': top,
                'right': right,
                'bottom': bottom,
                'left': left
            }
        })
    
    return results



def _parse_stream_arg(value, default, min_value, max_value):
    try:
        if value is None:
            return default
        parsed = int(value)
        if parsed < min_value:
            return min_value
        if parsed > max_value:
            return max_value
        return parsed
    except Exception:
        return default


def generate_optimized_video_stream(width=STREAM_WIDTH, height=STREAM_HEIGHT, quality=STREAM_JPEG_QUALITY, fps=30):
    """  optimized video stream - smooth, non-blocking. fps controls stream frame rate."""
    global camera_active, frame_buffer
    frame_interval = 1.0 / max(1, min(60, fps)) if fps else 0.02
    try:
        while True:
            if not camera_active:
                blank_frame = np.zeros((height, width, 3), dtype=np.uint8)
                ret, buffer = cv2.imencode('.jpg', blank_frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(0.5)
                continue

            frame = get_camera_frame()
            if frame is not None:
                # Add frame to buffer for recognition thread
                with frame_buffer_lock:
                    frame_buffer.append(frame.copy())
                    if len(frame_buffer) > frame_buffer_max_size:
                        frame_buffer.pop(0)  # Remove oldest frame
                # Resize for faster, smoother streaming
                stream_frame = frame
                if frame.shape[1] != width or frame.shape[0] != height:
                    stream_frame = cv2.resize(frame, (width, height))
                # Encode frame to JPEG for streaming (non-blocking)
                ret, buffer = cv2.imencode(
                    '.jpg',
                    stream_frame,
                    [cv2.IMWRITE_JPEG_QUALITY, quality]
                )
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                    time.sleep(frame_interval)
            else:
                # Send a blank frame if camera is not available
                blank_frame = np.zeros((height, width, 3), dtype=np.uint8)
                ret, buffer = cv2.imencode('.jpg', blank_frame, [cv2.IMWRITE_JPEG_QUALITY, quality])
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
                time.sleep(0.5)  # Delay if camera not available
    except GeneratorExit:
        logging.info("Client disconnected from MJPEG stream.")
    except Exception as e:
        logging.error(f"Error in MJPEG stream: {e}")
    finally:
        pass

def recognition_worker():
    """  optimized recognition worker - async, smart, efficient"""
    global recognition_active, recognition_results, last_recognition_time, last_face_detection_time, last_empty_broadcast_time, last_recognition_heartbeat
    global last_recognition_debug_log, last_frame_none_count, last_detection_count, last_frame_source
    cpu_high = False
    last_cpu_check = 0.0
    frame_none_count = 0
    logging.info("Recognition worker started")

    while recognition_active:
        try:
            now_ts = time.time()
            last_recognition_heartbeat = now_ts
            if now_ts - last_cpu_check >= 2.0:
                try:
                    import psutil
                    cpu_high = psutil.cpu_percent(interval=0.0) >= 85.0
                except Exception:
                    cpu_high = False
                last_cpu_check = now_ts

            if cpu_high and (now_ts - last_recognition_time) < max(recognition_interval, 1.0):
                time.sleep(0.2)
                continue
            
            # Smart frame skipping: only process if enough time has passed
            if now_ts - last_recognition_time < recognition_interval:
                time.sleep(0.06)  # Short sleep to prevent CPU spinning
                continue
            
            # Get latest frame from buffer (fallback to camera if buffer is empty)
            frame = None
            with frame_buffer_lock:
                if frame_buffer:
                    frame = frame_buffer[-1].copy()  # Use latest frame
                    last_frame_source = 'buffer'
            if frame is None:
                frame = get_camera_frame()
                if frame is None:
                    frame_none_count += 1
                    last_frame_none_count = frame_none_count
                    last_frame_source = 'none'
                    if frame_none_count >= 5:
                        ensure_camera_ready(force=True)
                        frame_none_count = 0
                    time.sleep(0.1)
                    continue
                last_frame_source = 'camera'
            frame_none_count = 0
            last_frame_none_count = 0
            
            # Perform face detection and recognition in one step
            try:
                results = face_detector.detect_and_recognize_faces(frame)
            except Exception as e:
                print(f"❌ Face detection and recognition error: {e}")
                time.sleep(0.12)
                continue

            last_detection_count = len(results) if results is not None else 0
            if now_ts - last_recognition_debug_log >= 5.0:
                logging.info(
                    "Recognition debug: frame_source=%s frame_none_count=%s results=%s cpu_high=%s",
                    last_frame_source,
                    last_frame_none_count,
                    last_detection_count,
                    cpu_high
                )
                last_recognition_debug_log = now_ts
            
            if not results:
                # No faces detected - skip and extend cooldown
                last_face_detection_time = now_ts
                with recognition_lock:
                    recognition_results = []
                if now_ts - last_empty_broadcast_time >= empty_broadcast_interval:
                    broadcast_recognition_results([])
                    last_empty_broadcast_time = now_ts
                time.sleep(0.12)  # Shorter sleep when no faces for snappier retry
                continue
            
            # Update recognition results
            with recognition_lock:
                recognition_results = results
            
            # Multi-person toggle: limit to first face if disabled
            if not ai_settings.get('aiFeatures', {}).get('multiPersonDetection', True):
                results = results[:1]

            # Build UI-friendly faces payload in stream coordinates so overlay matches video
            frame_h, frame_w = frame.shape[:2]
            scale_x = float(STREAM_WIDTH) / float(frame_w) if frame_w else 1.0
            scale_y = float(STREAM_HEIGHT) / float(frame_h) if frame_h else 1.0
            faces_payload = []
            for r in results:
                loc = r.get('location', {})
                top = loc.get('top', 0)
                right = loc.get('right', 0)
                bottom = loc.get('bottom', 0)
                left = loc.get('left', 0)
                # Optional age/emotion analysis
                attrs = _analyze_face_attributes(frame, (top, right, bottom, left))
                if attrs:
                    r.update(attrs)
                spoof_attrs = _detect_spoof(frame, (top, right, bottom, left))
                if spoof_attrs:
                    r.update(spoof_attrs)
                age = r.get('age')
                emotion = r.get('emotion')
                spoof = r.get('spoof')
                raw_conf = r.get('confidence', 0.0)
                faces_payload.append({
                    'x': int(left * scale_x),
                    'y': int(top * scale_y),
                    'width': int((right - left) * scale_x),
                    'height': int((bottom - top) * scale_y),
                    'confidence': _normalize_confidence(raw_conf),
                    'recognized': r.get('name') != 'Unknown',
                    'name': r.get('name'),
                    'age': age,
                    'emotion': emotion,
                    'spoof': spoof,
                })

            # Prepare recognized payload (first recognized face)
            recognized_payload = None
            for r in results:
                if r.get('name') and r.get('name') != 'Unknown':
                    raw_conf = r.get('confidence')
                    recognized_payload = {
                        'type': 'person_recognized',
                        'timestamp': r.get('timestamp'),
                        'data': {
                            'name': r.get('name'),
                            'confidence': _normalize_confidence(raw_conf)
                        }
                    }
                    break

            recognized_names = [r.get('name') for r in results if r.get('name') and r.get('name') != 'Unknown']
            recognized_count = len(recognized_names)
            detected_count = len(results)

            if _should_log_event('event', cooldown_seconds=5):
                log_event_entry(
                    event_type='event',
                    message=f"Recognition event processed ({detected_count} face(s))",
                    metadata={'detected': detected_count, 'recognized': recognized_count}
                )

            if _should_log_event('detected', cooldown_seconds=5):
                log_event_entry(
                    event_type='detected',
                    message=f"Detected {detected_count} face(s)",
                    metadata={'detected': detected_count}
                )

            if recognized_names and _should_log_event('recognized', cooldown_seconds=5):
                log_event_entry(
                    event_type='recognized',
                    message=f"Recognized: {', '.join(recognized_names)}",
                    metadata={'recognized': recognized_count, 'names': recognized_names}
                )

            if detected_count > 1 and _should_log_event('multi_face', cooldown_seconds=10):
                log_event_entry(
                    event_type='multi_face',
                    message=f"Multiple faces detected ({detected_count})",
                    metadata={'detected': detected_count}
                )

            if any(r.get('spoof') for r in results) and _should_log_event('anti_spoof', cooldown_seconds=30):
                image_filename = _save_event_image(frame, 'anti_spoof')
                log_event_entry(
                    event_type='anti_spoof',
                    message="Spoof suspected",
                    image_filename=image_filename,
                    metadata={'detected': detected_count, 'recognized': recognized_count}
                )

            # Broadcast results to EventSource clients
            broadcast_recognition_results(faces_payload, recognized_payload)

            # Record attendance only when confidence is high enough (0–100% scale)
            from config import Config as Cfg
            attendance_min_conf = getattr(Cfg, 'ATTENDANCE_MIN_CONFIDENCE', 0.75)
            for r in results:
                name = r.get('name')
                if not name or name == 'Unknown':
                    continue
                raw_conf = r.get('confidence') or 0.0
                norm_conf = _normalize_confidence(raw_conf)
                if norm_conf < attendance_min_conf:
                    continue  # skip low-confidence matches (threshold on 0–100% scale)
                now_dt = datetime.now()
                if name not in last_attendance_time or \
                   (now_dt - last_attendance_time[name]).seconds > attendance_cooldown:
                    attendance_info = record_attendance(name, confidence=raw_conf)
                    last_attendance_time[name] = now_dt
                    if recognized_payload and recognized_payload.get('data', {}).get('name') == name:
                        recognized_payload['data'].update({
                            'log_id': attendance_info.get('id'),
                            'employee_id': attendance_info.get('employee_id'),
                            'employee_name': attendance_info.get('employee_name'),
                            'timestamp': attendance_info.get('timestamp'),
                            'event_type': attendance_info.get('event_type'),
                        })
                else:
                    # Within duplicate punch window: do not log attendance, but notify UI
                    last_time = last_attendance_time.get(name)
                    elapsed_sec = int((now_dt - last_time).total_seconds()) if last_time else 0
                    try:
                        now_ts = time.time()
                        last_sent = duplicate_broadcast_last.get(name, 0)
                        if now_ts - last_sent >= 1.0:
                            duplicate_payload = {
                                'type': 'duplicate_punch',
                                'timestamp': now_dt.isoformat(),
                                'data': {
                                    'employee_id': name,
                                    'employee_name': name,
                                    'last_punch_time': last_time.isoformat() if last_time else None,
                                    'elapsed_seconds': elapsed_sec,
                                    'event_type': 'check-in',
                                }
                            }
                            broadcast_recognition_results(None, duplicate_payload)
                            duplicate_broadcast_last[name] = now_ts
                    except Exception as e:
                        logging.warning(f"Duplicate punch broadcast error: {e}")
            
            # Update timestamps
            last_recognition_time = now_ts
            last_face_detection_time = now_ts
            
            # Show recognition results
            if results:
                faces_detected = len(results)
                recognized_names = [r['name'] for r in results if r['name'] != 'Unknown']
                if recognized_names:
                    print(f"👥 Detected {faces_detected} face(s): {', '.join(recognized_names)}")
                else:
                    print(f"👤 Detected {faces_detected} unknown face(s)")
            
            # Adaptive sleep based on results (tighter for smoother detection)
            if results:
                time.sleep(0.06)  # Shorter sleep when faces detected
            else:
                time.sleep(0.15)  # Shorter sleep when no recognition for quicker retry
                
        except Exception as e:
            logging.exception("Error in recognition worker")
            time.sleep(1)
    logging.warning("Recognition worker exited")

def start_recognition_pipeline():
    """Start the optimized recognition pipeline"""
    global recognition_active, recognition_thread
    
    if recognition_thread is not None and not recognition_thread.is_alive():
        recognition_active = False
        recognition_thread = None

    if not recognition_active:
        recognition_active = True
        recognition_thread = threading.Thread(target=recognition_worker, daemon=True)
        recognition_thread.start()
        start_recognition_watchdog()
        print("🔍 Optimized recognition pipeline started")
        return True
    return False


def start_recognition_watchdog():
    """Restart recognition loop if it stalls"""
    global recognition_watchdog_thread, recognition_watchdog_active
    if recognition_watchdog_thread is not None and recognition_watchdog_thread.is_alive():
        return
    recognition_watchdog_active = True

    def _watchdog():
        global recognition_active, recognition_thread, last_recognition_heartbeat
        while recognition_watchdog_active:
            time.sleep(2.0)
            if not camera_active or not recognition_active:
                continue
            now = time.time()
            if last_recognition_heartbeat and (now - last_recognition_heartbeat) > 4.0:
                logging.warning("Recognition loop stalled; restarting pipeline.")
                recognition_active = False
                recognition_thread = None
                start_recognition_pipeline()

    recognition_watchdog_thread = threading.Thread(target=_watchdog, daemon=True)
    recognition_watchdog_thread.start()

def stop_recognition_pipeline():
    """Stop the optimized recognition pipeline"""
    global recognition_active
    
    if recognition_active:
        recognition_active = False
        if recognition_thread:
            recognition_thread.join(timeout=2)
        print("🔍 Recognition pipeline stopped")
        return True
    return False

def broadcast_recognition_results(faces_payload, recognized_payload=None):
    """Broadcast recognition results to all connected EventSource clients"""
    with event_source_lock:
        if event_source_clients:
            now_ts = datetime.now().isoformat()
            # Send to all connected clients
            for client in event_source_clients.copy():
                try:
                    if faces_payload is not None:
                        face_event = {
                            'type': 'face_detected',
                            'timestamp': now_ts,
                            'faces': faces_payload,
                            'streamWidth': STREAM_WIDTH,
                            'streamHeight': STREAM_HEIGHT,
                            'data': {'faces_detected': len(faces_payload)}
                        }
                        client.put(f"data: {json.dumps(_json_safe(face_event))}\n\n")
                    if recognized_payload:
                        client.put(f"data: {json.dumps(_json_safe(recognized_payload))}\n\n")
                except:
                    # Remove disconnected clients
                    event_source_clients.discard(client)

def generate_recognition_stream():
    """Enhanced EventSource stream with client management"""
    from queue import Queue
    
    # Create a queue for this client
    client_queue = Queue()
    
    # Add client to the set
    with event_source_lock:
        event_source_clients.add(client_queue)
    
    try:
        # Send initial connection message
        yield f"data: {json.dumps({'type': 'connection', 'message': 'Connected to recognition stream'})}\n\n"
        
        # Send current recognition status
        with recognition_lock:
            current_results = recognition_results.copy()
        recognized_count = len([r for r in current_results if r.get('name') and r.get('name') != 'Unknown'])

        initial_data = {
            'type': 'status',
            'timestamp': datetime.now().isoformat(),
            'faces_detected': len(current_results),
            'recognitions': current_results,
            'camera_active': camera_active,
            'statistics': {
                'totalFaces': len(current_results),
                'recognizedFaces': recognized_count,
                'eventsReceived': 0,
                'uptime': 0
            }
        }
        yield f"data: {json.dumps(_json_safe(initial_data))}\n\n"
        
        # Keep connection alive and send updates
        while camera_active:
            try:
                # Wait for new data or timeout
                data = client_queue.get(timeout=30)  # 30 second timeout
                yield data
            except Exception:
                # Send heartbeat to keep connection alive
                heartbeat = {
                    'type': 'heartbeat',
                    'timestamp': datetime.now().isoformat()
                }
                yield f"data: {json.dumps(heartbeat)}\n\n"
                
    except GeneratorExit:
        logging.info("Client disconnected from recognition SSE stream.")
    except Exception as e:
        logging.error(f"Error in recognition SSE stream: {e}")
    finally:
        # Remove client from the set
        with event_source_lock:
            event_source_clients.discard(client_queue)

def load_known_faces():
    """Load known faces from the faces directory (supports multi-angle registration)"""
    global known_face_encodings, known_face_names
    
    known_face_encodings = []
    known_face_names = []
    
    faces_dir = Config.FACES_DIRECTORY
    if not os.path.exists(faces_dir):
        os.makedirs(faces_dir)
        return
    
    # Track loaded employees to avoid duplicates
    loaded_employees = set()
    
    # First, load faces from employee subdirectories (multi-angle format)
    for item in os.listdir(faces_dir):
        item_path = os.path.join(faces_dir, item)
        
        # Check if it's a directory (employee folder with multiple angles)
        if os.path.isdir(item_path):
            employee_name = item
            angle_count = 0
            
            # Load all angles for this employee
            for angle_file in os.listdir(item_path):
                if angle_file.endswith((".jpg", ".jpeg", ".png")):
                    image_path = os.path.join(item_path, angle_file)
                    
                    try:
                        image = face_recognition.load_image_file(image_path)
                        face_locations = face_recognition.face_locations(image)
                        
                        if not face_locations:
                            continue
                        
                        encoding = face_recognition.face_encodings(image, face_locations)
                        if encoding:
                            # Add encoding for each angle to improve recognition
                            known_face_encodings.append(encoding[0])
                            known_face_names.append(employee_name)
                            angle_count += 1
                    except Exception as e:
                        print(f"❌ Error loading angle {angle_file} for {employee_name}: {e}")
            
            if angle_count > 0:
                loaded_employees.add(employee_name)
                print(f"✅ Loaded {angle_count} angles for {employee_name}")
    
    # Then, load standalone face files (legacy format or main face files)
    for filename in os.listdir(faces_dir):
        file_path = os.path.join(faces_dir, filename)
        
        # Skip if it's a directory (already processed)
        if os.path.isdir(file_path):
            continue
            
        if filename.endswith((".jpg", ".jpeg", ".png")):
            name = os.path.splitext(filename)[0]
            
            # Skip if already loaded from subdirectory
            if name in loaded_employees:
                continue
            
            try:
                image = face_recognition.load_image_file(file_path)
                face_locations = face_recognition.face_locations(image)
                
                if not face_locations:
                    print(f"⚠️  No face detected in {filename} - skipping")
                    continue
                
                if len(face_locations) > 1:
                    print(f"⚠️  Multiple faces detected in {filename} - using first face")
                
                encoding = face_recognition.face_encodings(image, face_locations)
                if encoding:
                    known_face_encodings.append(encoding[0])
                    known_face_names.append(name)
                    print(f"✅ Loaded face: {name}")
                else:
                    print(f"❌ Failed to encode face in {filename}")
            except Exception as e:
                print(f"❌ Error loading face {name}: {e}")
    
    print(f"📊 Loaded {len(known_face_names)} face encodings from {len(set(known_face_names))} employees")
    # Initialize or update face detector with known faces
    global face_detector
    if face_detector is None:
        face_detector = FaceDetector(
            known_face_encodings=known_face_encodings,
            known_face_names=known_face_names,
            recognition_tolerance=float(camera_settings.get('recognitionDistance', Config.FACE_RECOGNITION_TOLERANCE))
        )
        print("🔍 Face detector initialized with recognition capabilities")
    else:
        face_detector.update_known_faces(known_face_encodings, known_face_names)


def _score_profile_candidate(image_path: str, angle_hint: str = '') -> float:
    """Score a candidate profile image based on face size + sharpness."""
    try:
        image = face_recognition.load_image_file(image_path)
        face_locations = face_recognition.face_locations(image)
        if not face_locations:
            return -1.0

        # Pick the largest face in the image
        def area(loc):
            top, right, bottom, left = loc
            return max(0, right - left) * max(0, bottom - top)

        best_loc = max(face_locations, key=area)
        top, right, bottom, left = best_loc
        face_area = area(best_loc)
        image_area = max(1, image.shape[0] * image.shape[1])
        area_ratio = face_area / float(image_area)

        # Sharpness score (Laplacian variance on face crop)
        try:
            face_crop = image[top:bottom, left:right]
            if face_crop.size == 0:
                sharpness = 0.0
            else:
                gray = cv2.cvtColor(face_crop, cv2.COLOR_RGB2GRAY)
                sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        except Exception:
            sharpness = 0.0

        sharpness_norm = min(1.0, sharpness / 1000.0)
        score = (area_ratio * 0.7) + (sharpness_norm * 0.3)

        hint = (angle_hint or '').lower()
        if 'front' in hint or 'center' in hint:
            score += 0.05

        return score
    except Exception as e:
        print(f"⚠️  Profile scoring error for {image_path}: {e}")
        return -1.0

# Load faces on startup
load_known_faces()

@app.route('/api/health', methods=['GET'])
def health_check():
    """Enhanced health check with EventSource client count"""
    with event_source_lock:
        client_count = len(event_source_clients)
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'loaded_faces': len(known_face_names),
        'platform': Config.get_platform(),
        'event_source_clients': client_count,
        'camera_active': camera_active
    })

@app.route('/api/detect-face-quality', methods=['POST'])
def detect_face_quality():
    """Detect face quality for registration (real-time validation)"""
    try:
        if 'image' not in request.files:
            logging.warning("detect-face-quality: No image in request files")
            return jsonify({
                'detected': False,
                'quality': 'poor',
                'message': 'No image provided'
            }), 400
        
        file = request.files['image']
        angle = request.form.get('angle', 'front')
        
        if file.filename == '':
            logging.warning("detect-face-quality: Empty filename")
            return jsonify({
                'detected': False,
                'quality': 'poor',
                'message': 'No file selected'
            }), 400
        
        # Read image
        try:
            image_bytes = file.read()
            if not image_bytes or len(image_bytes) == 0:
                return jsonify({
                    'detected': False,
                    'quality': 'poor',
                    'message': 'Empty image file'
                }), 400
            
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return jsonify({
                    'detected': False,
                    'quality': 'poor',
                    'message': 'Invalid image format. Could not decode image.'
                }), 400
            
            if image.size == 0:
                return jsonify({
                    'detected': False,
                    'quality': 'poor',
                    'message': 'Empty image after decoding'
                }), 400
        except Exception as e:
            return jsonify({
                'detected': False,
                'quality': 'poor',
                'message': f'Error reading image: {str(e)}'
            }), 400
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Detect faces (HOG first, then Haar cascade fallback)
        face_locations = face_recognition.face_locations(rgb_image, number_of_times_to_upsample=1, model='hog')
        if not face_locations:
            try:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                if FACE_CASCADE is not None and not FACE_CASCADE.empty():
                    detected_faces = FACE_CASCADE.detectMultiScale(
                        gray,
                        scaleFactor=1.1,
                        minNeighbors=5,
                        minSize=(60, 60)
                    )
                    if len(detected_faces) > 0:
                        x, y, w, h = detected_faces[0]
                        top, right, bottom, left = y, x + w, y + h, x
                        face_locations = [(top, right, bottom, left)]
            except Exception as cascade_error:
                logging.warning(f"detect-face-quality: Haar fallback failed: {cascade_error}")
        
        if not face_locations:
            return jsonify({
                'detected': False,
                'quality': 'poor',
                'message': 'No face detected. Please position your face in the frame.'
            })
        
        if len(face_locations) > 1:
            return jsonify({
                'detected': True,
                'quality': 'poor',
                'message': 'Multiple faces detected. Please ensure only one person is in frame.'
            })
        
        # Get face location
        top, right, bottom, left = face_locations[0]
        
        # Check for eyeglasses (ask user to remove)
        try:
            glasses_enabled = ai_settings.get('aiFeatures', {}).get('glassesDetection', True)
            if glasses_enabled and EYEGLASS_CASCADE is not None and not EYEGLASS_CASCADE.empty():
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                face_roi = gray[max(top, 0):max(bottom, 0), max(left, 0):max(right, 0)].copy()
                if face_roi.size > 0:
                    glasses = EYEGLASS_CASCADE.detectMultiScale(
                        face_roi,
                        scaleFactor=1.1,
                        minNeighbors=5,
                        minSize=(20, 20)
                    )
                    if len(glasses) > 0:
                        if _should_log_event('glasses_detected', 10):
                            log_event_entry(
                                event_type='glasses_detected',
                                message='Glasses detected during registration',
                                metadata={'angle': angle}
                            )
                        return jsonify({
                            'detected': True,
                            'quality': 'poor',
                            'message': 'Please remove glasses for registration.'
                        })
        except Exception as glasses_error:
            logging.warning(f"detect-face-quality: glasses check failed: {glasses_error}")
        face_width = right - left
        face_height = bottom - top
        face_size = (face_width + face_height) / 2
        
        # Calculate face area percentage
        image_area = image.shape[0] * image.shape[1]
        face_area = face_width * face_height
        face_percentage = (face_area / image_area) * 100
        
        # Check face size (should be between 10% and 40% of image)
        if face_percentage < 8:
            return jsonify({
                'detected': True,
                'quality': 'too_far',
                'message': 'Face too far. Please move closer.',
                'faceSize': face_size
            })
        
        if face_percentage > 50:
            return jsonify({
                'detected': True,
                'quality': 'too_close',
                'message': 'Face too close. Please move back.',
                'faceSize': face_size
            })
        
        # Try to encode face (validates quality)
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        if not face_encodings:
            return jsonify({
                'detected': True,
                'quality': 'poor',
                'message': 'Face quality too low. Please ensure good lighting and clear view.'
            })

        # Validate expected angle using landmarks (basic yaw/pitch checks)
        try:
            landmarks_list = face_recognition.face_landmarks(rgb_image, face_locations)
            if landmarks_list:
                landmarks = landmarks_list[0]
                left_eye = landmarks.get('left_eye', [])
                right_eye = landmarks.get('right_eye', [])
                nose_tip = landmarks.get('nose_tip', [])

                if left_eye and right_eye and nose_tip:
                    left_eye_center = np.mean(np.array(left_eye), axis=0)
                    right_eye_center = np.mean(np.array(right_eye), axis=0)
                    eye_mid = (left_eye_center + right_eye_center) / 2.0
                    nose_center = np.mean(np.array(nose_tip), axis=0)

                    # Normalize offsets by face box size
                    face_center_x = (left + right) / 2.0
                    face_center_y = (top + bottom) / 2.0
                    face_w = max(1.0, right - left)
                    face_h = max(1.0, bottom - top)

                    nose_offset_x = (nose_center[0] - face_center_x) / face_w
                    nose_eye_delta_y = (nose_center[1] - eye_mid[1]) / face_h

                    # Angle thresholds (tuned for coarse validation)
                    yaw_th = 0.08
                    pitch_up_th = 0.20
                    pitch_down_th = 0.28

                    if angle == 'left' and not (nose_offset_x < -yaw_th):
                        return jsonify({
                            'detected': True,
                            'quality': 'wrong_angle',
                            'message': 'Please turn your face to the left.',
                            'faceSize': face_size
                        })
                    if angle == 'right' and not (nose_offset_x > yaw_th):
                        return jsonify({
                            'detected': True,
                            'quality': 'wrong_angle',
                            'message': 'Please turn your face to the right.',
                            'faceSize': face_size
                        })
                    if angle == 'front' and not (abs(nose_offset_x) <= yaw_th):
                        return jsonify({
                            'detected': True,
                            'quality': 'wrong_angle',
                            'message': 'Please look straight at the camera.',
                            'faceSize': face_size
                        })
                    if angle == 'up' and not (nose_eye_delta_y < pitch_up_th):
                        return jsonify({
                            'detected': True,
                            'quality': 'wrong_angle',
                            'message': 'Please tilt your face up slightly.',
                            'faceSize': face_size
                        })
                    if angle == 'down' and not (nose_eye_delta_y > pitch_down_th):
                        return jsonify({
                            'detected': True,
                            'quality': 'wrong_angle',
                            'message': 'Please tilt your face down slightly.',
                            'faceSize': face_size
                        })
        except Exception as e:
            logging.warning(f"detect-face-quality angle validation skipped: {e}")
        
        # Check face position (basic check - face should be roughly centered)
        image_center_x = image.shape[1] / 2
        image_center_y = image.shape[0] / 2
        face_center_x = (left + right) / 2
        face_center_y = (top + bottom) / 2
        
        offset_x = abs(face_center_x - image_center_x) / image.shape[1]
        offset_y = abs(face_center_y - image_center_y) / image.shape[0]
        
        # For non-front angles, allow more offset
        max_offset = 0.4 if angle == 'front' else 0.5
        
        if offset_x > max_offset or offset_y > max_offset:
            return jsonify({
                'detected': True,
                'quality': 'wrong_angle',
                'message': f'Please center your face better for {angle} angle.',
                'faceSize': face_size
            })
        
        # All checks passed
        logging.info(f"detect-face-quality: Face quality good for angle {angle}")
        return jsonify({
            'detected': True,
            'quality': 'good',
            'message': 'Face position is good!',
            'faceSize': face_size,
            'facePercentage': round(face_percentage, 2)
        })
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        logging.error(f"detect-face-quality error: {error_msg}")
        traceback.print_exc()
        return jsonify({
            'detected': False,
            'quality': 'poor',
            'message': f'Detection error: {error_msg}'
        }), 500

@app.route('/api/recognize', methods=['POST'])
def recognize_face():
    """Recognize faces from uploaded image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read and process image
        image_bytes = file.read()
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Find faces in the image
        face_locations = face_recognition.face_locations(rgb_image)
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        results = []
        for face_encoding in face_encodings:
            matches = face_recognition.compare_faces(known_face_encodings, face_encoding)
            name = "Unknown"
            confidence = 0.0
            
            if True in matches:
                first_match_index = matches.index(True)
                name = known_face_names[first_match_index]
                
                # Calculate confidence (distance-based)
                face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                confidence = 1.0 - face_distances[first_match_index]
                
                # Check attendance cooldown
                current_time = datetime.now()
                if name not in last_attendance_time or \
                   (current_time - last_attendance_time[name]).seconds > attendance_cooldown:
                    record_attendance(name)
                    last_attendance_time[name] = current_time
            
            results.append({
                'name': name,
                'confidence': round(confidence, 3),
                'timestamp': datetime.now().isoformat()
            })
        
        return jsonify({
            'faces_detected': len(face_locations),
            'recognitions': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/register-face', methods=['POST'])
def register_face():
    """Register a new face with multiple angles (iPhone-style)"""
    try:
        # Check if multiple images are provided (new multi-angle format)
        if 'images' in request.files:
            files = request.files.getlist('images')
            if not files or len(files) == 0:
                return jsonify({'error': 'No images provided'}), 400
            
            if 'name' not in request.form:
                return jsonify({'error': 'No name provided'}), 400
            
            name = request.form['name']
            angles_json = request.form.get('angles', '[]')
            
            try:
                angles = json.loads(angles_json)
            except:
                angles = []
            
            log_face_registration(f"register_start name={name} total_files={len(files)}")

            # Create faces directory if it doesn't exist
            faces_dir = Config.FACES_DIRECTORY
            if not os.path.exists(faces_dir):
                os.makedirs(faces_dir)
            
            # Create subdirectory for this employee's multiple angles
            employee_faces_dir = os.path.join(faces_dir, name)
            if not os.path.exists(employee_faces_dir):
                os.makedirs(employee_faces_dir)

            # Create a dated subfolder to preserve prior registrations
            registration_stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            registration_dir = os.path.join(employee_faces_dir, registration_stamp)
            os.makedirs(registration_dir, exist_ok=True)
            
            saved_files = []
            validated_count = 0
            
            # Process each angle image
            for i, file in enumerate(files):
                if file.filename == '':
                    continue
                
                # Determine angle from filename or index
                angle = angles[i] if i < len(angles) else f'angle_{i}'
                filename = f"{name}_{angle}.jpg"
                filepath = os.path.join(registration_dir, filename)
                
                try:
                    log_face_registration(f"register_save_attempt name={name} angle={angle} filename={file.filename}")
                    file.save(filepath)
                    
                    # Validate the saved image has a face
                    image = face_recognition.load_image_file(filepath)
                    face_locations = face_recognition.face_locations(image)
                    
                    if not face_locations:
                        # Remove the file if no face detected
                        os.remove(filepath)
                        log_face_registration(f"register_no_face name={name} angle={angle}")
                        continue
                    
                    if len(face_locations) > 1:
                        print(f'⚠️  Multiple faces detected in {filename}. Using the first face.')
                    
                    # Test encoding quality
                    encoding = face_recognition.face_encodings(image, face_locations)
                    if not encoding:
                        os.remove(filepath)
                        log_face_registration(f"register_encoding_failed name={name} angle={angle}")
                        continue
                    
                    saved_files.append(filename)
                    validated_count += 1
                    log_face_registration(f"register_saved name={name} angle={angle} file={filename}")
                    
                except Exception as e:
                    print(f'❌ Error processing {filename}: {e}')
                    log_face_registration(f"register_error name={name} angle={angle} error={e}")
                    if os.path.exists(filepath):
                        os.remove(filepath)
                    continue
            
            if validated_count == 0:
                log_face_registration(f"register_failed name={name} reason=no_valid_faces")
                return jsonify({'error': 'No valid faces detected in any of the uploaded images'}), 400
            
            # Pick the best front-facing profile photo
            front_filepath = None
            if saved_files:
                best_score = -1.0
                best_filename = None
                for idx, filename in enumerate(saved_files):
                    angle_hint = ''
                    if idx < len(angles):
                        angle_hint = angles[idx]
                    candidate_path = os.path.join(registration_dir, filename)
                    score = _score_profile_candidate(candidate_path, angle_hint=angle_hint)
                    if score > best_score:
                        best_score = score
                        best_filename = filename
                if best_filename:
                    front_filepath = os.path.join(registration_dir, best_filename)
            
            # Also save the front/best photo as the main face file for backward compatibility
            if front_filepath and os.path.exists(front_filepath):
                main_filename = f"{name}.jpg"
                main_filepath = os.path.join(faces_dir, main_filename)
                import shutil
                shutil.copy2(front_filepath, main_filepath)
            
            # Create profile photo for UI (even if DB update fails)
            profile_filename = None
            profile_photo_url = None
            if front_filepath and os.path.exists(front_filepath):
                try:
                    abs_faces_dir = os.path.abspath(faces_dir)
                    profile_base_dir = os.path.dirname(abs_faces_dir) or os.getcwd()
                    profile_dir = os.path.join(profile_base_dir, 'profiles')

                    if not os.path.exists(profile_dir):
                        os.makedirs(profile_dir)

                    profile_filename = f"{name}.jpg"
                    profile_filepath = os.path.join(profile_dir, profile_filename)
                    import shutil
                    shutil.copy2(front_filepath, profile_filepath)
                    profile_photo_url = f"/api/profiles/{profile_filename}"
                    log_face_registration(f"register_profile_saved name={name} file={profile_filename}")
                except Exception as e:
                    print(f"⚠️  Could not create profile photo: {e}")
                    log_face_registration(f"register_profile_error name={name} error={e}")

            # Update database - set face registered and update photo
            try:
                from db import db
                db.set_face_registered(name, True)

                if profile_photo_url:
                    db.update_employee(name, {'photo': profile_photo_url})
                    print(f"✅ Updated profile photo for {name}: {profile_photo_url}")

            except Exception as e:
                print(f'⚠️  Could not update database: {e}')
                import traceback
                traceback.print_exc()
                log_face_registration(f"register_db_error name={name} error={e}")

            # Log registration event
            try:
                from db import db
                db.log_attendance(
                    employee_id=name,
                    employee_name=name,
                    confidence=None,
                    status='Registered',
                    event_type='register'
                )
            except Exception as e:
                log_face_registration(f"register_log_error name={name} error={e}")
            
            # Reload known faces
            log_face_registration(f"training_start name={name}")
            load_known_faces()
            log_face_registration(f"training_done name={name} samples={validated_count}")
            
            return jsonify({
                'success': True,
                'message': f'Face registered for {name} with {validated_count} angles',
                'filename': f"{name}.jpg",
                'angles_saved': validated_count,
                'files': saved_files,
                'profile_photo': profile_photo_url
            })
        
        # Legacy single image support
        elif 'image' in request.files:
            if 'name' not in request.form:
                return jsonify({'error': 'No name provided'}), 400
            
            file = request.files['image']
            name = request.form['name']
            
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # Create faces directory if it doesn't exist
            faces_dir = Config.FACES_DIRECTORY
            if not os.path.exists(faces_dir):
                os.makedirs(faces_dir)
            
            # Save the image
            filename = f"{name}.jpg"
            filepath = os.path.join(faces_dir, filename)
            file.save(filepath)
            
            # Validate the saved image has a face
            try:
                image = face_recognition.load_image_file(filepath)
                face_locations = face_recognition.face_locations(image)
                
                if not face_locations:
                    # Remove the file if no face detected
                    os.remove(filepath)
                    return jsonify({'error': 'No face detected in the uploaded image'}), 400
                
                if len(face_locations) > 1:
                    return jsonify({'warning': f'Multiple faces detected in image. Using the first face for {name}'}), 200
                
                # Test encoding quality
                encoding = face_recognition.face_encodings(image, face_locations)
                if not encoding:
                    os.remove(filepath)
                    return jsonify({'error': 'Failed to encode face from uploaded image'}), 400
                    
            except Exception as e:
                os.remove(filepath)
                return jsonify({'error': f'Error validating face: {str(e)}'}), 500
            
            # Update database if employee exists
            try:
                from db import db
                db.set_face_registered(name, True)
            except Exception as e:
                print(f'⚠️  Could not update database: {e}')

            # Log registration event
            try:
                from db import db
                db.log_attendance(
                    employee_id=name,
                    employee_name=name,
                    confidence=None,
                    status='Registered',
                    event_type='register'
                )
            except Exception as e:
                print(f"⚠️  Could not log registration: {e}")
            
            # Reload known faces
            load_known_faces()
            
            return jsonify({
                'success': True,
                'message': f'Face registered for {name}',
                'filename': filename
            })
        else:
            return jsonify({'error': 'No image(s) provided'}), 400
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        log_face_registration(f"register_exception error={e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees', methods=['GET'])
def get_employees():
    """Get employee list from local database"""
    try:
        from db import db
        employees = db.get_all_employees()
        
        # Convert to frontend format
        formatted_employees = []
        for emp in employees:
            formatted_employees.append({
                'id': emp['id'],
                'name': emp['name'],
                'department': emp['department'],
                'photo': emp.get('photo', ''),
                'active': bool(emp.get('active', True)),
                'joinDate': emp.get('join_date', ''),
                'faceRegistered': bool(emp.get('face_registered', False)),
            })
        
        return jsonify({
            'employees': formatted_employees,
            'count': len(formatted_employees)
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees', methods=['POST'])
def create_employee():
    """Create a new employee"""
    try:
        from db import db
        data = request.json
        
        if not data or not data.get('id') or not data.get('name') or not data.get('department'):
            return jsonify({'error': 'Missing required fields: id, name, department'}), 400
        
        employee_data = {
            'id': data['id'],
            'name': data['name'],
            'department': data['department'],
            'photo': data.get('photo', ''),
            'join_date': data.get('joinDate', ''),
            'active': data.get('active', True),
            'face_registered': data.get('faceRegistered', False),
        }
        
        success = db.create_employee(employee_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Employee {data["id"]} created successfully',
                'employee': employee_data
            }), 201
        else:
            return jsonify({'error': 'Employee already exists'}), 409
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<employee_id>', methods=['PUT'])
def update_employee(employee_id):
    """Update an employee"""
    try:
        from db import db
        data = request.json
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        employee_data = {
            'name': data.get('name', ''),
            'department': data.get('department', ''),
            'photo': data.get('photo', ''),
            'active': data.get('active', True),
        }
        
        success = db.update_employee(employee_id, employee_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Employee {employee_id} updated successfully'
            })
        else:
            return jsonify({'error': 'Employee not found'}), 404
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/employees/<employee_id>', methods=['DELETE'])
def delete_employee(employee_id):
    """Delete an employee with option to keep face data"""
    try:
        from db import db
        import shutil
        
        # Get query parameter for face data deletion
        delete_face_data = request.args.get('delete_face_data', 'false').lower() == 'true'
        
        # Check if employee exists
        employee = db.get_employee(employee_id)
        if not employee:
            # Idempotent delete: return success if already removed
            return jsonify({
                'success': True,
                'message': f'Employee {employee_id} already deleted',
                'face_data_deleted': delete_face_data
            })
        
        # Delete face data if requested
        if delete_face_data:
            faces_dir = Config.FACES_DIRECTORY
            
            # Delete employee-specific folder
            employee_faces_dir = os.path.join(faces_dir, employee_id)
            if os.path.exists(employee_faces_dir):
                try:
                    shutil.rmtree(employee_faces_dir)
                    print(f"✅ Deleted face data folder for {employee_id}")
                except Exception as e:
                    print(f"⚠️  Error deleting face folder: {e}")
            
            # Delete main face file (legacy format)
            main_face_file = os.path.join(faces_dir, f"{employee_id}.jpg")
            if os.path.exists(main_face_file):
                try:
                    os.remove(main_face_file)
                    print(f"✅ Deleted main face file for {employee_id}")
                except Exception as e:
                    print(f"⚠️  Error deleting face file: {e}")
            
            # Reload known faces
            load_known_faces()
        
        # Delete employee from database
        success = db.delete_employee(employee_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': f'Employee {employee_id} deleted successfully',
                'face_data_deleted': delete_face_data
            })
        else:
            return jsonify({'error': 'Failed to delete employee'}), 500
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/attendance', methods=['GET'])
def get_attendance_log():
    """Get recent attendance log"""
    try:
        from db import db
        limit = min(int(request.args.get('limit', 200)), 1000)
        logs = db.get_attendance_logs(limit=limit)
        return jsonify({
            'attendance': logs,
            'count': len(logs)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/event-logs', methods=['GET'])
def get_event_logs():
    """Get recent event logs (anti-spoofing, multi-face, detection stats)"""
    try:
        from db import db
        limit = min(int(request.args.get('limit', 200)), 1000)
        event_type = request.args.get('event_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        logs = db.get_event_logs(limit=limit, event_type=event_type, start_date=start_date, end_date=end_date)
        for log in logs:
            image_path = log.get('image_path')
            if image_path:
                log['image_url'] = f"/api/event-logs/images/{image_path}"
        return jsonify({'logs': logs, 'count': len(logs)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/event-logs/images/<path:filename>', methods=['GET'])
def get_event_log_image(filename):
    """Serve stored event log images."""
    try:
        faces_dir = Config.FACES_DIRECTORY
        abs_faces_dir = os.path.abspath(faces_dir)
        base_dir = os.path.dirname(abs_faces_dir) or os.getcwd()
        log_dir = os.path.join(base_dir, 'logs', 'event_images')
        return send_from_directory(log_dir, filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 404

@app.route('/api/attendance/<int:log_id>', methods=['PUT'])
def update_attendance_log(log_id):
    """Update an attendance log entry"""
    try:
        data = request.get_json() or {}
        timestamp = data.get('timestamp')
        event_type = data.get('event_type', 'check-in')
        status = data.get('status', 'Present')
        employee_id = data.get('employee_id')
        employee_name = data.get('employee_name')
        modified = data.get('modified', {}) or {}
        modified_by = modified.get('by', 'Admin')
        modified_reason = modified.get('reason', '')
        original_timestamp = modified.get('originalTimestamp', timestamp)

        if not timestamp or not modified_reason or not employee_id or not employee_name:
            return jsonify({'error': 'timestamp, employee_id, employee_name, and modified.reason are required'}), 400

        from db import db
        ok = db.update_attendance_log(
            log_id=log_id,
            timestamp=timestamp,
            event_type=event_type,
            status=status,
            employee_id=employee_id,
            employee_name=employee_name,
            modified_by=modified_by,
            modified_reason=modified_reason,
            original_timestamp=original_timestamp
        )
        if not ok:
            return jsonify({'error': 'Log not found'}), 404

        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/faces', methods=['GET'])
def get_registered_faces():
    """Get list of registered faces"""
    try:
        faces_dir = Config.FACES_DIRECTORY
        if not os.path.exists(faces_dir):
            return jsonify({'faces': [], 'count': 0})
        
        faces = []
        for filename in os.listdir(faces_dir):
            if filename.endswith((".jpg", ".jpeg", ".png")):
                name = os.path.splitext(filename)[0]
                faces.append({
                    'name': name,
                    'filename': filename
                })
        
        return jsonify({
            'faces': faces,
            'count': len(faces)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/faces/<name>', methods=['DELETE'])
def delete_face(name):
    """Delete a registered face"""
    try:
        faces_dir = Config.FACES_DIRECTORY
        filepath = os.path.join(faces_dir, f"{name}.jpg")
        
        if os.path.exists(filepath):
            os.remove(filepath)
            load_known_faces()  # Reload faces
            return jsonify({
                'success': True,
                'message': f'Face {name} deleted successfully'
            })
        else:
            return jsonify({'error': 'Face not found'}), 404
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/faces/reload', methods=['POST'])
def reload_faces():
    """Reload face encodings (training)"""
    try:
        load_known_faces()
        return jsonify({
            'success': True,
            'message': 'Face training completed'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def record_attendance(name, confidence=None, status='Present', event_type='check-in'):
    """Record attendance for the recognized person"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"✅ Attendance recorded for {name} at {timestamp}")

    try:
        from db import db
        employee = db.get_employee(name)
        employee_id = employee.get('id') if employee else name
        employee_name = employee.get('name') if employee else name
        log_id = db.log_attendance(
            employee_id=employee_id,
            employee_name=employee_name,
            confidence=confidence,
            status=status,
            event_type=event_type
        )
    except Exception as e:
        print(f"⚠️  Could not write attendance to DB: {e}")
        log_id = None

    return {
        'id': log_id,
        'employee_id': employee_id if 'employee_id' in locals() else name,
        'employee_name': employee_name if 'employee_name' in locals() else name,
        'name': name,
        'timestamp': timestamp,
        'status': status,
        'event_type': event_type
    }

@app.route('/api/erpnext/authenticate', methods=['POST'])
def authenticate_erpnext():
    """Authenticate with ERPNext"""
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        success = auth_manager.authenticate(username, password)
        
        return jsonify({
            'success': success,
            'message': 'Authentication successful' if success else 'Authentication failed'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/erpnext/employees', methods=['GET'])
def get_erpnext_employees():
    """Get employees from ERPNext with authentication"""
    try:
        # Get credentials from query parameters or headers
        username = request.args.get('username') or request.headers.get('X-Username')
        password = request.args.get('password') or request.headers.get('X-Password')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Authenticate
        if not auth_manager.authenticate(username, password):
            return jsonify({'error': 'ERPNext authentication failed'}), 401
        
        # Fetch employee data
        employee_data = auth_manager.fetch_employee_data()
        
        return jsonify({
            'employees': employee_data,
            'count': len(employee_data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/camera/stream', methods=['GET'])
def camera_stream():
    """Stream camera feed with integrated face recognition as MJPEG"""
    # Use query params if provided, else camera_settings (Stream Resolution, Quality, FPS)
    w_arg = request.args.get('w')
    h_arg = request.args.get('h')
    if w_arg and h_arg:
        stream_width = _parse_stream_arg(w_arg, STREAM_WIDTH, STREAM_MIN_WIDTH, STREAM_MAX_WIDTH)
        stream_height = _parse_stream_arg(h_arg, STREAM_HEIGHT, STREAM_MIN_HEIGHT, STREAM_MAX_HEIGHT)
    else:
        sw, sh = _get_resolution_dims(camera_settings.get('streamResolution', '720p'))
        stream_width = min(max(sw, STREAM_MIN_WIDTH), STREAM_MAX_WIDTH)
        stream_height = min(max(sh, STREAM_MIN_HEIGHT), STREAM_MAX_HEIGHT)
    stream_quality = _parse_stream_arg(
        request.args.get('q'),
        int(camera_settings.get('streamQuality', STREAM_JPEG_QUALITY)),
        STREAM_MIN_QUALITY,
        STREAM_MAX_QUALITY
    )
    stream_fps = max(1, min(60, int(camera_settings.get('streamFps', 30))))
    try:
        if not camera_active:
            if ensure_camera_ready(force=True):
                start_recognition_pipeline()
                if _should_log_event('camera_start', 5):
                    log_event_entry(event_type='camera_start', message='Camera started by stream request')
    except Exception as e:
        logging.warning(f"Camera auto-start on stream failed: {e}")
    return Response(
        generate_optimized_video_stream(
            width=stream_width,
            height=stream_height,
            quality=stream_quality,
            fps=stream_fps
        ),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )


@app.route('/api/camera/snapshot', methods=['GET'])
def camera_snapshot():
    """Return a single JPEG frame from the camera."""
    try:
        if not camera_active:
            if ensure_camera_ready(force=True):
                start_recognition_pipeline()
                if _should_log_event('camera_start', 5):
                    log_event_entry(event_type='camera_start', message='Camera started by snapshot request')
        frame = get_camera_frame()
        if frame is None:
            if ensure_camera_ready(force=True):
                frame = get_camera_frame()
        if frame is None:
            return jsonify({'error': 'Camera frame not available'}), 503
        snap_width = _parse_stream_arg(
            request.args.get('w'),
            Config.CAMERA_WIDTH,
            STREAM_MIN_WIDTH,
            STREAM_MAX_WIDTH
        )
        snap_height = _parse_stream_arg(
            request.args.get('h'),
            Config.CAMERA_HEIGHT,
            STREAM_MIN_HEIGHT,
            STREAM_MAX_HEIGHT
        )
        snap_quality = _parse_stream_arg(
            request.args.get('q'),
            85,
            STREAM_MIN_QUALITY,
            STREAM_MAX_QUALITY
        )
        if frame.shape[1] != snap_width or frame.shape[0] != snap_height:
            frame = cv2.resize(frame, (snap_width, snap_height))
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, snap_quality])
        if not ret:
            return jsonify({'error': 'Failed to encode frame'}), 500
        return Response(
            buffer.tobytes(),
            mimetype='image/jpeg',
            headers={'Cache-Control': 'no-store'}
        )
    except Exception as e:
        logging.error(f"Snapshot error: {e}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/camera/status', methods=['GET'])
def camera_status():
    """Get camera status using CameraManager"""
    global camera_manager
    
    if not camera_manager:
        # Try to initialize if not already done
        initialize_camera()
    
    if camera_manager:
        status = camera_manager.get_status()
        return jsonify(status)
    else:
        return jsonify({
            'platform': Config.get_platform(),
            'initialized': False,
            'working': False,
            'camera_type': 'None',
            'resolution': f"{Config.CAMERA_WIDTH}x{Config.CAMERA_HEIGHT}",
            'framerate': Config.CAMERA_FPS,
            'camera_port': Config.CAMERA_PORT,
            'error': 'Camera manager not available'
        })

@app.route('/api/camera/start', methods=['POST'])
def start_camera():
    """Start camera and begin optimized face recognition"""
    global camera_active
    
    try:
        needs_reinit = False
        if camera_manager and camera_manager.is_initialized:
            try:
                status = camera_manager.get_status()
                needs_reinit = not status.get('working', False)
            except Exception:
                needs_reinit = True

        if not camera_active or needs_reinit:
            if ensure_camera_ready(force=needs_reinit):
                camera_active = True
                # Start the optimized recognition pipeline
                start_recognition_pipeline()
                if _should_log_event('camera_start', 5):
                    log_event_entry(event_type='camera_start', message='Camera started')
                print("📹 Camera started with optimized face recognition pipeline")
                return jsonify({
                    'success': True,
                    'message': 'Camera started with optimized face recognition pipeline'
                })
            else:
                err_msg = last_camera_init_error or 'Failed to initialize camera'
                if 'Pipeline handler in use' in err_msg or 'resource busy' in err_msg.lower():
                    err_msg = 'Camera in use by another process. Stop other apps or restart the backend (FR-start.sh).'
                log_event_entry(event_type='camera_start_failed', message=err_msg)
                return jsonify({'error': err_msg}), 500

        if _should_log_event('camera_start_skipped', 10):
            log_event_entry(event_type='camera_start_skipped', message='Camera already active')
        return jsonify({
            'success': False,
            'message': 'Camera is already active'
        })
    except Exception as e:
        log_event_entry(event_type='camera_start_error', message=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/camera/stop', methods=['POST'])
def stop_camera():
    """Stop camera and face recognition"""
    global camera_active, camera_manager
    
    try:
        if camera_active:
            camera_active = False
            # Stop the recognition pipeline
            stop_recognition_pipeline()
            if camera_manager:
                camera_manager.close()
                camera_manager = None
            if _should_log_event('camera_stop', 5):
                log_event_entry(event_type='camera_stop', message='Camera stopped')
            print("📹 Camera stopped")
            return jsonify({
                'success': True,
                'message': 'Camera stopped'
            })
        else:
            if _should_log_event('camera_stop_skipped', 10):
                log_event_entry(event_type='camera_stop_skipped', message='Camera not active')
            return jsonify({
                'success': False,
                'message': 'Camera is not active'
            })
    except Exception as e:
        log_event_entry(event_type='camera_stop_error', message=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/camera/restart', methods=['POST'])
def restart_camera():
    """Restart camera and face recognition"""
    try:
        # Stop first
        stop_result = stop_camera()
        if stop_result.json.get('success'):
            time.sleep(1)  # Brief delay
            # Start again
            start_result = start_camera()
            if start_result.json and start_result.json.get('success'):
                if _should_log_event('camera_restart', 5):
                    log_event_entry(event_type='camera_restart', message='Camera restarted')
            return start_result
        else:
            log_event_entry(event_type='camera_restart_failed', message='Failed to stop camera')
            return jsonify({'error': 'Failed to stop camera'}), 500
    except Exception as e:
        log_event_entry(event_type='camera_restart_error', message=str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/recognition/status', methods=['GET'])
def recognition_status():
    """Get recognition status"""
    with event_source_lock:
        client_count = len(event_source_clients)
    if camera_active:
        start_recognition_pipeline()
    
    return jsonify({
        'camera_active': camera_active,
        'loaded_faces': len(known_face_names),
        'last_results': recognition_results,
        'event_source_clients': client_count,
        'recognition_active': recognition_active,
        'last_heartbeat_age_sec': round(time.time() - last_recognition_heartbeat, 2) if last_recognition_heartbeat else None,
        'last_recognition_time_sec': round(time.time() - last_recognition_time, 2) if last_recognition_time else None,
        'last_detection_count': last_detection_count,
        'last_frame_none_count': last_frame_none_count,
        'last_frame_source': last_frame_source
    })

@app.route('/api/recognition/stream', methods=['GET'])
def recognition_stream():
    """Enhanced EventSource stream with better error handling"""
    if camera_active:
        start_recognition_pipeline()
    return Response(
        generate_recognition_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
            'X-Accel-Buffering': 'no'  # Disable nginx buffering
        }
    )

@app.route('/api/onvif/status', methods=['GET'])
def get_onvif_status():
    """Get ONVIF server status"""
    try:
        from onvif_manager import onvif_manager
        status = onvif_manager.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({
            'running': False,
            'error': str(e)
        }), 500

@app.route('/api/onvif/start', methods=['POST'])
def start_onvif():
    """Start ONVIF server"""
    try:
        from onvif_manager import onvif_manager
        success = onvif_manager.start()
        if success:
            return jsonify({
                'success': True,
                'message': 'ONVIF server started',
                'status': onvif_manager.get_status()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to start ONVIF server'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/onvif/stop', methods=['POST'])
def stop_onvif():
    """Stop ONVIF server"""
    try:
        from onvif_manager import onvif_manager
        success = onvif_manager.stop()
        if success:
            return jsonify({
                'success': True,
                'message': 'ONVIF server stopped'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to stop ONVIF server'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/onvif/restart', methods=['POST'])
def restart_onvif():
    """Restart ONVIF server"""
    try:
        from onvif_manager import onvif_manager
        success = onvif_manager.restart()
        if success:
            return jsonify({
                'success': True,
                'message': 'ONVIF server restarted',
                'status': onvif_manager.get_status()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to restart ONVIF server'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/onvif/config', methods=['GET'])
def get_onvif_config():
    """Get ONVIF configuration"""
    try:
        from onvif_manager import onvif_manager
        config = onvif_manager.get_config()
        return jsonify(config)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/onvif/config', methods=['POST'])
def update_onvif_config():
    """Update ONVIF configuration"""
    try:
        from onvif_manager import onvif_manager
        data = request.json
        
        # Filter allowed config keys
        allowed_keys = [
            'ServicePort', 'RTSPPort', 'Username', 'Password',
            'IpAddress', 'DeviceInformation', 'logLevel'
        ]
        
        config_updates = {k: v for k, v in data.items() if k in allowed_keys}
        
        success = onvif_manager.update_config(**config_updates)
        if success:
            return jsonify({
                'success': True,
                'message': 'Configuration updated',
                'config': onvif_manager.get_config()
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to update configuration'
            }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/recognition/latest', methods=['GET'])
def get_latest_recognition():
    """Get the latest recognition results"""
    with recognition_lock:
        current_results = recognition_results.copy()
    
    return jsonify({
        'timestamp': datetime.now().isoformat(),
        'faces_detected': len(current_results),
        'recognitions': _json_safe(current_results)
    })

def _json_safe(obj):
    """Convert numpy/scalar types into JSON-serializable primitives."""
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, tuple):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, np.generic):
        return obj.item()
    return obj

@app.route('/api/profiles/<filename>', methods=['GET'])
def get_profile_photo(filename):
    """Serve employee profile photos"""
    try:
        # Get profiles directory (in same parent directory as faces)
        faces_dir = Config.FACES_DIRECTORY
        abs_faces_dir = os.path.abspath(faces_dir)
        profile_base_dir = os.path.dirname(abs_faces_dir) or os.getcwd()
        profile_dir = os.path.join(profile_base_dir, 'profiles')
        
        # Ensure directory exists
        if not os.path.exists(profile_dir):
            os.makedirs(profile_dir)
        
        # Security: only allow jpg/jpeg files
        if not filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            return jsonify({'error': 'Invalid file type'}), 400
        
        profile_path = os.path.join(profile_dir, filename)
        cache_key = profile_path
        cached = _get_profile_photo_cache(cache_key)
        if cached:
            return Response(cached['data'], mimetype=cached['mime'])
        if os.path.exists(profile_path):
            with open(profile_path, 'rb') as f:
                data = f.read()
            mime = 'image/png' if filename.lower().endswith('.png') else 'image/jpeg'
            _set_profile_photo_cache(cache_key, data, mime)
            return Response(data, mimetype=mime)

        # Fallback to faces directory if profiles are missing
        faces_dir = Config.FACES_DIRECTORY
        abs_faces_dir = os.path.abspath(faces_dir)
        name, _ = os.path.splitext(filename)
        candidates = (
            os.path.join(abs_faces_dir, filename),
            os.path.join(abs_faces_dir, name, f"{name}_front.jpg"),
            os.path.join(abs_faces_dir, name, f"{name}_front.jpeg"),
            os.path.join(abs_faces_dir, name, f"{name}_front.png"),
        )

        for candidate in candidates:
            if os.path.exists(candidate):
                cache_key = candidate
                cached = _get_profile_photo_cache(cache_key)
                if cached:
                    return Response(cached['data'], mimetype=cached['mime'])
                with open(candidate, 'rb') as f:
                    data = f.read()
                mime = 'image/png' if candidate.lower().endswith('.png') else 'image/jpeg'
                _set_profile_photo_cache(cache_key, data, mime)
                return Response(data, mimetype=mime)

        return jsonify({'error': 'Profile photo not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/stats', methods=['GET'])
def get_system_stats():
    """Get system statistics (CPU, temperature, storage, database)"""
    try:
        return jsonify(_collect_system_stats())
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

def _collect_system_stats():
    import psutil
    import subprocess
    import shutil
    import glob

    # CPU Usage
    cpu_percent = psutil.cpu_percent(interval=0.0)
    cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
    cpu_threads = psutil.cpu_count(logical=True) or 0
    cpu_cores = psutil.cpu_count(logical=False) or cpu_threads

    # Temperature (Raspberry Pi specific)
    temperature = None
    try:
        with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
            temp_raw = int(f.read().strip())
            temperature = temp_raw / 1000.0  # Convert from millidegrees
    except:
        # Fallback: try vcgencmd if available
        try:
            result = subprocess.run(['vcgencmd', 'measure_temp'], capture_output=True, text=True)
            if result.returncode == 0:
                temp_str = result.stdout.strip().split('=')[1].replace("'C", "")
                temperature = float(temp_str)
        except:
            temperature = None

    # GPU stats (Raspberry Pi)
    gpu_clock_mhz = None
    gpu_mem_mb = None
    gpu_temp = None
    gpu_busy_percent = None
    try:
        clock_result = subprocess.run(['vcgencmd', 'measure_clock', 'v3d'], capture_output=True, text=True)
        if clock_result.returncode == 0 and '=' in clock_result.stdout:
            clock_hz = int(clock_result.stdout.strip().split('=')[1])
            gpu_clock_mhz = round(clock_hz / 1_000_000, 1)
    except:
        gpu_clock_mhz = None

    try:
        mem_result = subprocess.run(['vcgencmd', 'get_mem', 'gpu'], capture_output=True, text=True)
        if mem_result.returncode == 0 and '=' in mem_result.stdout:
            mem_str = mem_result.stdout.strip().split('=')[1].replace('M', '')
            gpu_mem_mb = int(mem_str)
    except:
        gpu_mem_mb = None

    try:
        result = subprocess.run(['vcgencmd', 'measure_temp'], capture_output=True, text=True)
        if result.returncode == 0 and '=' in result.stdout:
            temp_str = result.stdout.strip().split('=')[1].replace("'C", "")
            gpu_temp = float(temp_str)
    except:
        gpu_temp = None

    # Try GPU busy percent from DRM/debugfs if available
    try:
        candidate_paths = []
        candidate_paths.extend(glob.glob('/sys/class/drm/card*/device/gpu_busy_percent'))
        candidate_paths.extend(glob.glob('/sys/kernel/debug/dri/*/gpu_busy_percent'))
        for path in candidate_paths:
            if os.path.exists(path):
                with open(path, 'r') as f:
                    gpu_busy_percent = float(f.read().strip())
                break
    except:
        gpu_busy_percent = None

    # Storage
    disk = shutil.disk_usage('/')
    storage_free_gb = disk.free / (1024**3)
    storage_total_gb = disk.total / (1024**3)
    storage_used_gb = storage_total_gb - storage_free_gb

    # RAM
    mem = psutil.virtual_memory()
    ram_total_gb = mem.total / (1024**3)
    ram_used_gb = (mem.total - mem.available) / (1024**3)
    ram_usage_percent = mem.percent

    # Database size
    db_size = 0
    employees_count = 0
    logs_count = 0
    try:
        from db.database import DB_FILE
        db_path = DB_FILE
        if os.path.exists(db_path):
            db_size = os.path.getsize(db_path) / (1024**2)  # MB
        from db import db
        employees_count = len(db.get_all_employees())
        logs_count = db.get_attendance_stats().get('total_records', 0)
    except:
        pass

    return {
        'cpu_usage': round(cpu_percent, 1),
        'cpu_per_core': [round(v, 1) for v in cpu_per_core],
        'cpu_cores': cpu_cores,
        'cpu_threads': cpu_threads,
        'temperature': round(temperature, 1) if temperature else None,
        'ram_total_gb': round(ram_total_gb, 1),
        'ram_used_gb': round(ram_used_gb, 1),
        'ram_usage_percent': round(ram_usage_percent, 1),
        'gpu_clock_mhz': gpu_clock_mhz,
        'gpu_mem_mb': gpu_mem_mb,
        'gpu_temp': round(gpu_temp, 1) if gpu_temp else None,
        'gpu_busy_percent': round(gpu_busy_percent, 1) if gpu_busy_percent is not None else None,
        'storage_free_gb': round(storage_free_gb, 1),
        'storage_total_gb': round(storage_total_gb, 1),
        'storage_used_gb': round(storage_used_gb, 1),
        'database_size_mb': round(db_size, 1),
        'employees_count': employees_count,
        'logs_count': logs_count,
        'ts': datetime.now().isoformat()
    }

def _log_system_stats():
    os.makedirs(os.path.dirname(SYSTEM_STATS_LOG), exist_ok=True)
    while True:
        try:
            data = _collect_system_stats()
            with open(SYSTEM_STATS_LOG, 'a') as f:
                f.write(json.dumps(data) + "\n")
        except Exception as e:
            print(f"⚠️  System stats log error: {e}")
        time.sleep(30)

def start_system_stats_logger():
    global system_stats_thread
    if system_stats_thread and system_stats_thread.is_alive():
        return
    system_stats_thread = threading.Thread(target=_log_system_stats, daemon=True)
    system_stats_thread.start()

@app.route('/api/system/stats/logs', methods=['GET'])
def get_system_stats_logs():
    """Get recent system stats logs"""
    try:
        limit = int(request.args.get('limit', 200))
        if not os.path.exists(SYSTEM_STATS_LOG):
            return jsonify({'logs': []})
        with open(SYSTEM_STATS_LOG, 'r') as f:
            dq = deque(f, maxlen=limit)
        logs = [json.loads(line.strip()) for line in dq if line.strip()]
        return jsonify({'logs': logs})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/camera-settings', methods=['GET'])
def get_camera_settings():
    """Get camera settings (detection threshold, resolution, color tone, enhanced lighting)"""
    try:
        settings_file = 'camera_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                camera_settings.update(data)
                _apply_detection_threshold()
                return jsonify(camera_settings)
        else:
            # Return defaults
            return jsonify(camera_settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/camera-settings', methods=['POST'])
def update_camera_settings():
    """Update camera settings"""
    try:
        data = request.json
        settings_file = 'camera_settings.json'
        
        # Validate data
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Save settings to file
        with open(settings_file, 'w') as f:
            json.dump(data, f, indent=2)

        # Apply settings to runtime
        camera_settings.update(data)
        _apply_detection_threshold()

        # Restart camera if capture resolution changed (Stream Resolution applies on next stream connection)
        if camera_active and 'cameraResolution' in data:
            try:
                stop_camera()
                time.sleep(0.5)
                start_camera()
            except Exception as e:
                print(f"⚠️  Camera restart failed after settings update: {e}")

        return jsonify({
            'success': True,
            'message': 'Camera settings updated successfully',
            'settings': camera_settings
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/ai-settings', methods=['GET'])
def get_ai_settings():
    """Get AI settings"""
    try:
        settings_file = 'ai_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                ai_settings.update(data)
                _apply_ai_settings()
        return jsonify(ai_settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/ai-settings', methods=['POST'])
def update_ai_settings():
    """Update AI settings"""
    try:
        data = request.json
        settings_file = 'ai_settings.json'

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        with open(settings_file, 'w') as f:
            json.dump(data, f, indent=2)

        ai_settings.update(data)
        _apply_ai_settings()

        return jsonify({
            'success': True,
            'message': 'AI settings updated successfully',
            'settings': ai_settings
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/erpnext-settings', methods=['GET'])
def get_erpnext_settings():
    """Get ERPNext settings"""
    try:
        settings_file = 'erpnext_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                erpnext_settings.update(data)
        return jsonify(erpnext_settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/erpnext-settings', methods=['POST'])
def update_erpnext_settings():
    """Update ERPNext settings"""
    try:
        data = request.json
        settings_file = 'erpnext_settings.json'

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        with open(settings_file, 'w') as f:
            json.dump(data, f, indent=2)

        erpnext_settings.update(data)

        return jsonify({
            'success': True,
            'message': 'ERPNext settings updated successfully',
            'settings': erpnext_settings
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/erpnext/test', methods=['POST'])
def test_erpnext_connection():
    """Test ERPNext connectivity"""
    try:
        data = request.json or {}
        server_url = data.get('serverUrl') or erpnext_settings.get('serverUrl')
        api_key = data.get('apiKey') or erpnext_settings.get('apiKey')
        api_secret = data.get('apiSecret') or erpnext_settings.get('apiSecret')

        if not server_url:
            return jsonify({'success': False, 'error': 'Server URL is required'}), 400

        import urllib.request
        req = urllib.request.Request(server_url)
        if api_key and api_secret:
            req.add_header('Authorization', f"token {api_key}:{api_secret}")
        try:
            with urllib.request.urlopen(req, timeout=5) as resp:
                return jsonify({'success': True, 'status': resp.status})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/erpnext/sync', methods=['POST'])
def sync_erpnext_logs():
    """Sync attendance logs to ERPNext (placeholder)"""
    try:
        from db import db
        settings = erpnext_settings.copy()
        send_logs = settings.get('sendLogs', {})
        logs = db.get_attendance_logs(limit=1000)
        filtered = []
        for log in logs:
            event_type = log.get('event_type', 'check-in')
            if event_type == 'register' and not send_logs.get('registration', True):
                continue
            if event_type != 'register' and not send_logs.get('recognition', True):
                continue
            filtered.append(log)

        # Write payload to a local log for visibility
        try:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            log_dir = os.path.join(base_dir, 'logs')
            os.makedirs(log_dir, exist_ok=True)
            sync_path = os.path.join(log_dir, 'erpnext_sync.log')
            with open(sync_path, 'a') as f:
                f.write(json.dumps({'ts': datetime.now().isoformat(), 'count': len(filtered)}) + "\n")
        except Exception:
            pass

        try:
            synced_ids = [int(log['id']) for log in filtered if log.get('id') is not None]
            db.mark_attendance_synced(synced_ids)
        except Exception:
            pass

        return jsonify({
            'success': True,
            'sent': len(filtered),
            'message': 'Logs prepared for ERPNext sync'
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/system/device-settings', methods=['GET'])
def get_device_settings():
    """Get device settings"""
    try:
        settings_file = 'device_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                device_settings.update(data)
        return jsonify(device_settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/device-settings', methods=['POST'])
def update_device_settings():
    """Update device settings"""
    try:
        data = request.json
        settings_file = 'device_settings.json'

        if not data:
            return jsonify({'error': 'No data provided'}), 400

        with open(settings_file, 'w') as f:
            json.dump(data, f, indent=2)

        device_settings.update(data)

        return jsonify({
            'success': True,
            'message': 'Device settings updated successfully',
            'settings': device_settings
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/device-info', methods=['GET'])
def get_device_info():
    """Get device IP information"""
    try:
        import socket
        internal_ip = None
        external_ip = None
        tailscale_ip = None
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            internal_ip = s.getsockname()[0]
            s.close()
        except Exception:
            internal_ip = None

        try:
            import urllib.request
            with urllib.request.urlopen('https://api.ipify.org', timeout=3) as resp:
                external_ip = resp.read().decode().strip()
        except Exception:
            external_ip = None

        try:
            result = subprocess.run(['tailscale', 'ip', '-4'], capture_output=True, text=True, timeout=2)
            if result.returncode == 0:
                tailscale_ip = result.stdout.strip().splitlines()[0] if result.stdout.strip() else None
        except Exception:
            tailscale_ip = None

        return jsonify({
            'internalIp': internal_ip,
            'externalIp': external_ip,
            'tailscaleIp': tailscale_ip
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/time-settings', methods=['GET'])
def get_time_settings():
    """Get time settings"""
    try:
        settings_file = 'time_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                time_settings.update(data)
        return jsonify(time_settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/time-settings', methods=['POST'])
def update_time_settings():
    """Update time settings"""
    try:
        data = request.json or {}
        settings_file = 'time_settings.json'
        with open(settings_file, 'w') as f:
            json.dump(data, f, indent=2)
        time_settings.update(data)
        return jsonify({
            'success': True,
            'message': 'Time settings updated successfully',
            'settings': time_settings
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/attendance-settings', methods=['GET'])
def get_attendance_settings():
    """Get attendance settings"""
    try:
        settings_file = 'attendance_settings.json'
        if os.path.exists(settings_file):
            with open(settings_file, 'r') as f:
                data = json.load(f)
                attendance_settings.update(data)
        return jsonify(attendance_settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/attendance-settings', methods=['POST'])
def update_attendance_settings():
    """Update attendance settings"""
    try:
        global attendance_cooldown
        data = request.json or {}
        settings_file = 'attendance_settings.json'
        with open(settings_file, 'w') as f:
            json.dump(data, f, indent=2)
        attendance_settings.update(data)
        attendance_cooldown = int(attendance_settings.get('duplicatePunchIntervalSec', attendance_cooldown))
        return jsonify({
            'success': True,
            'message': 'Attendance settings updated successfully',
            'settings': attendance_settings
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/time', methods=['GET'])
def get_system_time():
    """Get current time from configured source"""
    try:
        source = time_settings.get('timeSource', 'time.is')
        servers = time_settings.get('ntpServers', []) or []

        epoch_ms = None
        used_source = source
        used_server = None

        if source == 'auto':
            epoch_ms = _get_time_is_ms()
            used_source = 'time.is' if epoch_ms else 'ntp'
            if not epoch_ms:
                epoch_ms, used_server = _get_ntp_time_ms(servers)
            if not epoch_ms:
                epoch_ms = _get_system_time_ms()
                used_source = 'system'
        elif source == 'time.is':
            epoch_ms = _get_time_is_ms()
        elif source == 'ntp':
            epoch_ms, used_server = _get_ntp_time_ms(servers)
        elif source == 'system':
            epoch_ms = _get_system_time_ms()

        if not epoch_ms:
            epoch_ms = _get_system_time_ms()
            used_source = 'system'

        tz_offset = datetime.now().astimezone().utcoffset()
        tz_offset_sec = int(tz_offset.total_seconds()) if tz_offset else 0
        tz_name = datetime.now().astimezone().tzname()

        return jsonify({
            'epoch_ms': epoch_ms,
            'source': used_source,
            'ntp_server': used_server,
            'tz_offset_sec': tz_offset_sec,
            'tz_name': tz_name,
            'timeFormat': time_settings.get('timeFormat', '12h')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def cleanup_camera():
    """Cleanup camera resources on shutdown"""
    global camera_manager, camera_active
    
    # Stop camera and recognition pipeline
    if camera_active:
        print("🔄 Stopping camera and recognition pipeline...")
        camera_active = False
        stop_recognition_pipeline()
    
    # Then cleanup camera
    if camera_manager:
        camera_manager.close()
        print("✅ Camera cleanup completed")

if __name__ == '__main__':
    print("🚀 Starting Facial Recognition API Server...")
    print("Camera Configuration:")
    print(f"  - Camera Port: {Config.CAMERA_PORT}")
    print(f"  - Resolution: {Config.CAMERA_WIDTH}x{Config.CAMERA_HEIGHT} (16:9)")
    print(f"  - FPS: {Config.CAMERA_FPS}")
    print(f"  - Autofocus: {'Enabled' if Config.CAMERA_AUTOFOCUS else 'Disabled'}")
    print(f"  - AWB Mode: {Config.CAMERA_AWB_MODE}")
    print(f"  - Exposure Mode: {Config.CAMERA_EXPOSURE_MODE}")
    print(f"  - Horizontal Flip: {'Enabled' if Config.CAMERA_HORIZONTAL_FLIP else 'Disabled'}")
    print(f"  - Vertical Flip: {'Enabled' if Config.CAMERA_VERTICAL_FLIP else 'Disabled'}")
    print(f"  - Auto-Start Recognition: {'Enabled' if Config.AUTO_START_RECOGNITION else 'Disabled'}")
    print(f"  - Camera Debug: {'Enabled' if Config.CAMERA_DEBUG else 'Disabled'}")

    # Start system stats logger once
    try:
        if os.environ.get('WERKZEUG_RUN_MAIN') == 'true' or not Config.API_DEBUG:
            start_system_stats_logger()
    except Exception as e:
        print(f"⚠️  Could not start system stats logger: {e}")
    
    print("\nAvailable endpoints:")
    print("- GET  /api/health - Health check")
    print("- POST /api/recognize - Recognize faces from image")
    print("- POST /api/register-face - Register new face")
    print("- GET  /api/employees - Get employee list from ERPNext")
    print("- GET  /api/attendance - Get attendance log")
    print("- GET  /api/faces - Get registered faces")
    print("- DELETE /api/faces/<name> - Delete registered face")
    print("- POST /api/erpnext/authenticate - Authenticate with ERPNext")
    print("- GET  /api/erpnext/employees - Get ERPNext employees")
    print("- GET  /api/camera/stream - Stream camera feed (optimized MJPEG)")
    print("- GET  /api/camera/status - Get camera status")
    print("- POST /api/camera/start - Start camera with optimized recognition")
    print("- POST /api/camera/stop - Stop camera and recognition")
    print("- POST /api/camera/restart - Restart camera and recognition")
    print("- GET  /api/recognition/status - Get recognition status")
    print("- GET  /api/recognition/stream - Stream recognition results (SSE)")
    print("- GET  /api/recognition/latest - Get latest recognition results")
    
    try:
        app.run(
            host=Config.API_HOST,
            port=Config.API_PORT,
            debug=False,
            use_reloader=False,
            threaded=True
        )
    except KeyboardInterrupt:
        print("\nShutting down server...")
        cleanup_camera()
    except Exception as e:
        print(f"Server error: {e}")
        cleanup_camera()
