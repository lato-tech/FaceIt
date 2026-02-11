"""
Database module for Facial Recognition System
Handles SQLite database operations for employees and attendance logs
"""
import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

# Database file path
DB_DIR = os.path.join(os.path.dirname(__file__))
DB_FILE = os.path.join(DB_DIR, 'facial_recognition.db')


class Database:
    """Database manager for facial recognition system"""
    
    def __init__(self, db_file: str = DB_FILE):
        self.db_file = db_file
        self.init_database()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_file)
        conn.row_factory = sqlite3.Row  # Enable column access by name
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            conn.close()
    
    def init_database(self):
        """Initialize database tables if they don't exist"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Employees table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS employees (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    department TEXT NOT NULL,
                    photo TEXT,
                    join_date TEXT NOT NULL,
                    active INTEGER DEFAULT 1,
                    face_registered INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            ''')
            
            # Attendance logs table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS attendance_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    employee_id TEXT NOT NULL,
                    employee_name TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    confidence REAL,
                    status TEXT DEFAULT 'Present',
                    event_type TEXT DEFAULT 'check-in',
                    synced INTEGER DEFAULT 0,
                    manual INTEGER DEFAULT 0,
                    modified_by TEXT,
                    modified_reason TEXT,
                    modified_at TEXT,
                    original_timestamp TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (employee_id) REFERENCES employees(id)
                )
            ''')

            # Event logs table (anti-spoofing, multi-face, system events)
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS event_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    message TEXT,
                    image_path TEXT,
                    metadata TEXT,
                    timestamp TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            ''')
            
            # Create indexes for better performance
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_attendance_employee_id 
                ON attendance_logs(employee_id)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_attendance_timestamp 
                ON attendance_logs(timestamp)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_event_logs_timestamp
                ON event_logs(timestamp)
            ''')

            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_event_logs_type
                ON event_logs(event_type)
            ''')
            
            cursor.execute('''
                CREATE INDEX IF NOT EXISTS idx_employees_active 
                ON employees(active)
            ''')
            # WAL mode: smoother reads during writes, better for concurrent access
            cursor.execute('PRAGMA journal_mode=WAL')
            cursor.execute('PRAGMA synchronous=NORMAL')
            logger.info("Database initialized successfully")

        # Ensure new columns exist for older DBs
        self._ensure_column('attendance_logs', 'event_type', "TEXT DEFAULT 'check-in'")
        self._ensure_column('attendance_logs', 'synced', "INTEGER DEFAULT 0")
        self._ensure_column('attendance_logs', 'manual', "INTEGER DEFAULT 0")
        self._ensure_column('attendance_logs', 'modified_by', 'TEXT')
        self._ensure_column('attendance_logs', 'modified_reason', 'TEXT')
        self._ensure_column('attendance_logs', 'modified_at', 'TEXT')
        self._ensure_column('attendance_logs', 'original_timestamp', 'TEXT')
        self._ensure_column('attendance_logs', 'snapshot_path', 'TEXT')
        self._ensure_column('event_logs', 'event_type', 'TEXT')
        self._ensure_column('event_logs', 'message', 'TEXT')
        self._ensure_column('event_logs', 'image_path', 'TEXT')
        self._ensure_column('event_logs', 'metadata', 'TEXT')
        self._ensure_column('event_logs', 'timestamp', 'TEXT')
        self._ensure_column('event_logs', 'created_at', 'TEXT')

    def _ensure_column(self, table: str, column: str, definition: str):
        """Add missing column to a table if it does not exist."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(f"PRAGMA table_info({table})")
                existing = {row['name'] for row in cursor.fetchall()}
                if column not in existing:
                    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
                    logger.info(f"Added column {column} to {table}")
        except Exception as e:
            logger.error(f"Error ensuring column {column} on {table}: {e}")
    
    # Employee operations
    def create_employee(self, employee_data: Dict) -> bool:
        """Create a new employee"""
        try:
            now = datetime.now().isoformat()
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO employees 
                    (id, name, department, photo, join_date, active, face_registered, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    employee_data['id'],
                    employee_data['name'],
                    employee_data['department'],
                    employee_data.get('photo', ''),
                    employee_data.get('join_date', ''),
                    int(employee_data.get('active', True)),
                    int(employee_data.get('face_registered', False)),
                    now,
                    now
                ))
                logger.info(f"Employee created: {employee_data['id']}")
                return True
        except sqlite3.IntegrityError:
            logger.error(f"Employee {employee_data['id']} already exists")
            return False
        except Exception as e:
            logger.error(f"Error creating employee: {e}")
            return False
    
    def get_employee(self, employee_id: str) -> Optional[Dict]:
        """Get employee by ID"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM employees WHERE id = ?', (employee_id,))
                row = cursor.fetchone()
                if row:
                    return dict(row)
                return None
        except Exception as e:
            logger.error(f"Error getting employee: {e}")
            return None
    
    def get_all_employees(self, active_only: bool = False) -> List[Dict]:
        """Get all employees"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                if active_only:
                    cursor.execute('SELECT * FROM employees WHERE active = 1 ORDER BY name')
                else:
                    cursor.execute('SELECT * FROM employees ORDER BY name')
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting employees: {e}")
            return []
    
    def update_employee(self, employee_id: str, employee_data: Dict) -> bool:
        """Update employee information"""
        try:
            now = datetime.now().isoformat()
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE employees 
                    SET name = ?, department = ?, photo = ?, 
                        active = ?, updated_at = ?
                    WHERE id = ?
                ''', (
                    employee_data['name'],
                    employee_data['department'],
                    employee_data.get('photo', ''),
                    int(employee_data.get('active', True)),
                    now,
                    employee_id
                ))
                if cursor.rowcount > 0:
                    logger.info(f"Employee updated: {employee_id}")
                    return True
                return False
        except Exception as e:
            logger.error(f"Error updating employee: {e}")
            return False
    
    def delete_employee(self, employee_id: str) -> bool:
        """Delete an employee"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('DELETE FROM employees WHERE id = ?', (employee_id,))
                if cursor.rowcount > 0:
                    logger.info(f"Employee deleted: {employee_id}")
                    return True
                return False
        except Exception as e:
            logger.error(f"Error deleting employee: {e}")
            return False
    
    def set_face_registered(self, employee_id: str, registered: bool = True) -> bool:
        """Mark employee as having face registered"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE employees 
                    SET face_registered = ?, updated_at = ?
                    WHERE id = ?
                ''', (int(registered), datetime.now().isoformat(), employee_id))
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating face registration status: {e}")
            return False
    
    # Attendance operations
    def log_attendance(self, employee_id: str, employee_name: str,
                      confidence: float = None, status: str = 'Present',
                      event_type: str = 'check-in',
                      synced: bool = False,
                      manual: bool = False,
                      snapshot_path: str = None) -> Optional[int]:
        """Log attendance for an employee"""
        try:
            now = datetime.now().isoformat()
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO attendance_logs 
                    (employee_id, employee_name, timestamp, confidence, status, event_type, synced, manual, snapshot_path, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (employee_id, employee_name, timestamp, confidence, status, event_type, int(synced), int(manual), snapshot_path or '', now))
                logger.info(f"Attendance logged: {employee_name} ({employee_id}) at {timestamp}")
                return cursor.lastrowid
        except Exception as e:
            logger.error(f"Error logging attendance: {e}")
            return None

    def update_attendance_log(self, log_id: int, timestamp: str,
                              event_type: str, status: str,
                              employee_id: str, employee_name: str,
                              modified_by: str, modified_reason: str,
                              original_timestamp: str) -> bool:
        """Update an attendance log entry."""
        try:
            now = datetime.now().isoformat()
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    UPDATE attendance_logs
                    SET timestamp = ?, event_type = ?, status = ?,
                        employee_id = ?, employee_name = ?,
                        manual = 1,
                        modified_by = ?, modified_reason = ?, modified_at = ?,
                        original_timestamp = ?
                    WHERE id = ?
                ''', (
                    timestamp, event_type, status,
                    employee_id, employee_name,
                    modified_by, modified_reason, now,
                    original_timestamp, log_id
                ))
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating attendance log {log_id}: {e}")
            return False

    def mark_attendance_synced(self, log_ids: List[int]) -> int:
        """Mark attendance logs as synced."""
        if not log_ids:
            return 0
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                placeholders = ','.join(['?'] * len(log_ids))
                cursor.execute(f'''
                    UPDATE attendance_logs
                    SET synced = 1
                    WHERE id IN ({placeholders})
                ''', log_ids)
                return cursor.rowcount
        except Exception as e:
            logger.error(f"Error marking attendance logs synced: {e}")
            return 0
    
    def get_attendance_logs(self, limit: int = 100, 
                           employee_id: Optional[str] = None,
                           start_date: Optional[str] = None,
                           end_date: Optional[str] = None) -> List[Dict]:
        """Get attendance logs with optional filters"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                query = 'SELECT * FROM attendance_logs WHERE 1=1'
                params = []
                
                if employee_id:
                    query += ' AND employee_id = ?'
                    params.append(employee_id)
                
                if start_date:
                    query += ' AND timestamp >= ?'
                    params.append(start_date)
                
                if end_date:
                    query += ' AND timestamp <= ?'
                    params.append(end_date)
                
                query += ' ORDER BY timestamp DESC LIMIT ?'
                params.append(limit)
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting attendance logs: {e}")
            return []

    def delete_attendance_log(self, log_id: int) -> bool:
        """Delete an attendance log entry and its snapshot file if any."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('SELECT snapshot_path FROM attendance_logs WHERE id = ?', (log_id,))
                row = cursor.fetchone()
                snapshot_path = row['snapshot_path'] if row and row['snapshot_path'] else None
                cursor.execute('DELETE FROM attendance_logs WHERE id = ?', (log_id,))
                deleted = cursor.rowcount > 0
            if deleted and snapshot_path:
                try:
                    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    snap_dir = os.path.join(base_dir, 'logs', 'attendance_snapshots')
                    filepath = os.path.join(snap_dir, snapshot_path)
                    if os.path.isfile(filepath):
                        os.remove(filepath)
                except Exception as e:
                    logger.warning(f"Could not remove attendance snapshot {snapshot_path}: {e}")
            return deleted
        except Exception as e:
            logger.error(f"Error deleting attendance log {log_id}: {e}")
            return False

    def log_event(self, event_type: str, message: str = '',
                  image_path: Optional[str] = None,
                  metadata: Optional[str] = None,
                  timestamp: Optional[str] = None) -> bool:
        """Log a system/event entry."""
        try:
            now = datetime.now().isoformat()
            event_timestamp = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO event_logs
                    (event_type, message, image_path, metadata, timestamp, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (event_type, message, image_path, metadata, event_timestamp, now))
                logger.info(f"Event logged: {event_type} {event_timestamp}")
                return True
        except Exception as e:
            logger.error(f"Error logging event: {e}")
            return False

    def get_event_logs(self, limit: int = 200,
                       event_type: Optional[str] = None,
                       start_date: Optional[str] = None,
                       end_date: Optional[str] = None) -> List[Dict]:
        """Get event logs with optional filters."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                query = 'SELECT * FROM event_logs WHERE 1=1'
                params = []

                if event_type:
                    query += ' AND event_type = ?'
                    params.append(event_type)

                if start_date:
                    query += ' AND timestamp >= ?'
                    params.append(start_date)

                if end_date:
                    query += ' AND timestamp <= ?'
                    params.append(end_date)

                query += ' ORDER BY timestamp DESC LIMIT ?'
                params.append(limit)

                cursor.execute(query, params)
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting event logs: {e}")
            return []
    
    def get_attendance_stats(self, employee_id: Optional[str] = None,
                            start_date: Optional[str] = None,
                            end_date: Optional[str] = None) -> Dict:
        """Get attendance statistics"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                query = 'SELECT COUNT(*) as total FROM attendance_logs WHERE 1=1'
                params = []
                
                if employee_id:
                    query += ' AND employee_id = ?'
                    params.append(employee_id)
                
                if start_date:
                    query += ' AND timestamp >= ?'
                    params.append(start_date)
                
                if end_date:
                    query += ' AND timestamp <= ?'
                    params.append(end_date)
                
                cursor.execute(query, params)
                result = cursor.fetchone()
                return {'total_records': result['total'] if result else 0}
        except Exception as e:
            logger.error(f"Error getting attendance stats: {e}")
            return {'total_records': 0}
    
    def get_recent_attendance(self, hours: int = 24) -> List[Dict]:
        """Get recent attendance within specified hours"""
        try:
            from datetime import timedelta
            cutoff = (datetime.now() - timedelta(hours=hours)).strftime("%Y-%m-%d %H:%M:%S")
            return self.get_attendance_logs(start_date=cutoff, limit=1000)
        except Exception as e:
            logger.error(f"Error getting recent attendance: {e}")
            return []


# Global database instance
db = Database()
