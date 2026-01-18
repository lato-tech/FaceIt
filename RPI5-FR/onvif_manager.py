"""
ONVIF Manager - Controls ONVIF server (rpos) and integrates with Flask backend
"""
import os
import subprocess
import json
import logging
import signal
from typing import Optional, Dict
from pathlib import Path

logger = logging.getLogger(__name__)

RPOS_DIR = Path("/home/pi/rpos")
RPOS_CONFIG = RPOS_DIR / "rposConfig.json"
RPOS_SCRIPT = RPOS_DIR / "rpos.js"
RPOS_PID_FILE = Path("/tmp/rpos.pid")


class ONVIFManager:
    """Manages ONVIF server (rpos) process"""
    
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.is_running = False
        
    def _get_pid(self) -> Optional[int]:
        """Get rpos process ID from PID file"""
        try:
            if RPOS_PID_FILE.exists():
                with open(RPOS_PID_FILE, 'r') as f:
                    pid = int(f.read().strip())
                    # Check if process is still running
                    try:
                        os.kill(pid, 0)
                        return pid
                    except OSError:
                        return None
        except Exception as e:
            logger.error(f"Error reading PID file: {e}")
        return None
    
    def _save_pid(self, pid: int):
        """Save process ID to file"""
        try:
            with open(RPOS_PID_FILE, 'w') as f:
                f.write(str(pid))
        except Exception as e:
            logger.error(f"Error saving PID: {e}")
    
    def _load_config(self) -> Dict:
        """Load rpos configuration"""
        try:
            if RPOS_CONFIG.exists():
                with open(RPOS_CONFIG, 'r') as f:
                    return json.load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
        return {}
    
    def _save_config(self, config: Dict):
        """Save rpos configuration"""
        try:
            with open(RPOS_CONFIG, 'w') as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def update_config(self, **kwargs) -> bool:
        """Update ONVIF configuration"""
        try:
            config = self._load_config()
            config.update(kwargs)
            self._save_config(config)
            return True
        except Exception as e:
            logger.error(f"Error updating config: {e}")
            return False
    
    def start(self) -> bool:
        """Start ONVIF server"""
        if self.is_running or self._get_pid():
            logger.warning("ONVIF server already running")
            return True
        
        # Check if rpos.js exists
        if not RPOS_SCRIPT.exists():
            logger.error(f"rpos.js not found at {RPOS_SCRIPT}")
            return False
        
        try:
            # Start rpos process
            self.process = subprocess.Popen(
                ['node', str(RPOS_SCRIPT)],
                cwd=RPOS_DIR,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                preexec_fn=os.setsid  # Create new process group
            )
            
            self._save_pid(self.process.pid)
            self.is_running = True
            logger.info(f"ONVIF server started (PID: {self.process.pid})")
            return True
        except Exception as e:
            logger.error(f"Failed to start ONVIF server: {e}")
            self.is_running = False
            return False
    
    def stop(self) -> bool:
        """Stop ONVIF server"""
        if not self.is_running and not self._get_pid():
            logger.warning("ONVIF server not running")
            return True
        
        try:
            pid = self._get_pid()
            if pid:
                # Kill process group
                try:
                    os.killpg(os.getpgid(pid), signal.SIGTERM)
                    logger.info(f"ONVIF server stopped (PID: {pid})")
                except ProcessLookupError:
                    pass
            
            if self.process:
                self.process.terminate()
                try:
                    self.process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.process.kill()
            
            if RPOS_PID_FILE.exists():
                RPOS_PID_FILE.unlink()
            
            self.is_running = False
            return True
        except Exception as e:
            logger.error(f"Error stopping ONVIF server: {e}")
            return False
    
    def restart(self) -> bool:
        """Restart ONVIF server"""
        self.stop()
        import time
        time.sleep(1)
        return self.start()
    
    def get_status(self) -> Dict:
        """Get ONVIF server status"""
        pid = self._get_pid()
        config = self._load_config()
        
        return {
            'running': self.is_running or pid is not None,
            'pid': pid,
            'port': config.get('ServicePort', 8081),
            'rtsp_port': config.get('RTSPPort', 8554),
            'ip_address': config.get('IpAddress', ''),
            'rtsp_url': f"rtsp://{config.get('IpAddress', 'localhost')}:{config.get('RTSPPort', 8554)}/{config.get('RTSPName', 'h264')}",
            'onvif_url': f"http://{config.get('IpAddress', 'localhost')}:{config.get('ServicePort', 8081)}/onvif/device_service"
        }
    
    def get_config(self) -> Dict:
        """Get current configuration"""
        return self._load_config()


# Global ONVIF manager instance
onvif_manager = ONVIFManager()
