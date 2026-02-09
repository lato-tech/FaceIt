export interface Employee {
  id: string;
  name: string;
  department: string;
  photo?: string;
  active?: boolean;
  joinDate?: string;
  faceRegistered?: boolean;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'check-in' | 'check-out' | 'register';
  timestamp: string;
  status: string;
  modified?: {
    by: string;
    reason: string;
    originalTimestamp?: string;
  };
}

export interface EventLog {
  id: string;
  eventType: string;
  message?: string;
  timestamp: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}
