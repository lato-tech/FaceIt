export interface Employee {
  id: string;
  name: string;
  department: string;
  photo: string;
  active: boolean;
  joinDate: string;
}
export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'check-in' | 'check-out' | 'register';
  timestamp: string;
  status: 'valid' | 'modified' | 'error' | 'registered';
  synced?: boolean;
  manual?: boolean;
  modified?: {
    by: string;
    reason: string;
    originalTimestamp: string;
  };
}

export interface EventLog {
  id: string;
  eventType: string;
  message: string;
  timestamp: string;
  imageUrl?: string;
  metadata?: string;
}
export interface CameraConfig {
  type: 'onvif' | 'raspicam';
  url?: string;
  username?: string;
  password?: string;
  resolution: string;
  fps: number;
}
export interface ERPNextConfig {
  serverUrl: string;
  username: string;
  password: string;
  apiKey: string;
  apiSecret: string;
  company: string;
  syncInterval: number;
  sendLogs: {
    recognition: boolean;
    registration: boolean;
    unknown: boolean;
  };
}