# ERPNext Integration - To-Do List

This document outlines all tasks required to integrate the Facial Recognition Punch Clock System with ERPNext for automated attendance tracking and salary computation.

---

## Phase 1: Database & Backend Foundation ✅ (In Progress)

### Completed
- [x] Create database folder structure (`/db/`)
- [x] Implement SQLite database for employees
- [x] Implement SQLite database for attendance logs
- [x] Create database models and helper functions
- [x] Add employee CRUD operations to database

### In Progress
- [ ] Update backend API to use database instead of in-memory storage
- [ ] Update `record_attendance()` function to use database
- [ ] Update face registration to mark employees as face_registered in database
- [ ] Update frontend to use backend API endpoints instead of localStorage
- [ ] Test full workflow: add employee → register face → recognition → logging

---

## Face Recognition Runtime & Logs (High Priority)

### Recognition Stream + Home Page
- [ ] Align backend SSE payloads with UI expectations (event `type` + `faces`)
- [ ] Or update UI to parse backend `recognitions` format
- [ ] Confirm recognition events render on home page feed
- [ ] Add/restore recognized-person pop-up if required

### Attendance Logs
- [ ] Persist attendance logs in DB (one row per recognition/check-in)
- [ ] Add API endpoints to list/edit logs (GET + PUT/PATCH)
- [ ] Wire Logs page to backend edits instead of in-memory state
- [ ] Decide whether face registration should create a log entry

---

## Phase 2: ERPNext API Integration Setup

### Authentication & Configuration
- [ ] Verify ERPNext API credentials in `config.py`
  - [ ] Test ERPNext base URL connectivity
  - [ ] Test API authentication (username/password)
  - [ ] Add API key authentication support (if needed)
  - [ ] Implement token-based authentication for better security
  - [ ] Add error handling for authentication failures

### ERPNext API Client Module
- [ ] Create `erpnext/` folder in backend
- [ ] Create `erpnext/api_client.py` - Main API client
  - [ ] Implement `get_employees()` - Fetch employee list from ERPNext
  - [ ] Implement `sync_employees()` - Sync ERPNext employees to local DB
  - [ ] Implement `create_attendance()` - Post attendance to ERPNext
  - [ ] Implement `update_attendance()` - Update existing attendance records
  - [ ] Implement `get_attendance()` - Fetch attendance from ERPNext
  - [ ] Add retry logic for failed API calls
  - [ ] Add rate limiting to respect ERPNext API limits
  - [ ] Add request/response logging

### ERPNext Data Models
- [ ] Create `erpnext/models.py` - Data models for ERPNext
  - [ ] Employee model mapping (ERPNext → Local DB)
  - [ ] Attendance model mapping (Local DB → ERPNext)
  - [ ] Field mapping documentation
  - [ ] Data validation functions

---

## Phase 3: Employee Synchronization

### Employee Sync Implementation
- [ ] Implement bidirectional sync between ERPNext and local database
  - [ ] ERPNext → Local: Fetch employees from ERPNext on startup
  - [ ] ERPNext → Local: Periodic sync (every X hours)
  - [ ] Local → ERPNext: Create new employees in ERPNext (if needed)
  - [ ] Handle employee updates (name, department changes)
  - [ ] Handle employee deactivation/reactivation
  - [ ] Conflict resolution strategy (ERPNext is source of truth)

### Employee ID Mapping
- [ ] Ensure employee IDs match between systems
  - [ ] Use ERPNext employee ID as primary key
  - [ ] Map ERPNext employee code to local employee ID
  - [ ] Handle cases where employee exists in ERPNext but not locally
  - [ ] Handle cases where employee exists locally but not in ERPNext

### Employee Data Fields
- [ ] Map ERPNext employee fields to local database:
  - [ ] Employee Code (ID)
  - [ ] Employee Name
  - [ ] Department
  - [ ] Designation
  - [ ] Company
  - [ ] Branch
  - [ ] Employment Type
  - [ ] Date of Joining
  - [ ] Status (Active/Inactive)
  - [ ] Photo URL (if available in ERPNext)

---

## Phase 4: Attendance Logging to ERPNext

### Attendance Record Creation
- [ ] Implement `create_erpnext_attendance()` function
  - [ ] Map local attendance log to ERPNext Attendance doctype
  - [ ] Include required fields:
    - [ ] Employee (link to Employee)
    - [ ] Attendance Date
    - [ ] Status (Present/Absent/Half Day)
    - [ ] Check In Time
    - [ ] Check Out Time (if applicable)
    - [ ] Late Entry (if applicable)
    - [ ] Early Exit (if applicable)
    - [ ] Working Hours (if applicable)
  - [ ] Handle duplicate attendance prevention
  - [ ] Handle attendance for same employee on same day

### Real-time vs Batch Upload
- [ ] Decide on upload strategy:
  - [ ] Option A: Real-time upload (immediate sync)
  - [ ] Option B: Batch upload (periodic sync every X minutes)
  - [ ] Option C: Hybrid (real-time with batch fallback)
- [ ] Implement chosen strategy
- [ ] Add queue system for failed uploads
- [ ] Add retry mechanism for failed uploads

### Attendance Status Logic
- [ ] Implement attendance status determination:
  - [ ] Present: Face recognized during working hours
  - [ ] Absent: No face recognition on working day
  - [ ] Half Day: Face recognized but less than X hours
  - [ ] Late Entry: Face recognized after start time + grace period
  - [ ] Early Exit: Face recognized but left before end time
- [ ] Add working hours calculation
- [ ] Add overtime calculation (if applicable)

### Attendance Data Validation
- [ ] Validate attendance data before sending to ERPNext:
  - [ ] Employee exists in ERPNext
  - [ ] Date is valid
  - [ ] Time is within reasonable range
  - [ ] No duplicate records
  - [ ] Required fields are present

---

## Phase 5: Error Handling & Reliability

### Error Handling
- [ ] Implement comprehensive error handling:
  - [ ] Network errors (connection timeout, DNS failure)
  - [ ] Authentication errors (invalid credentials, expired token)
  - [ ] API errors (rate limiting, validation errors)
  - [ ] Data errors (missing fields, invalid format)
  - [ ] Database errors (connection issues, constraint violations)

### Retry Logic
- [ ] Implement exponential backoff for retries
- [ ] Add maximum retry attempts
- [ ] Log failed attempts for manual review
- [ ] Alert system for persistent failures

### Offline Mode
- [ ] Handle offline scenarios:
  - [ ] Queue attendance logs when ERPNext is unreachable
  - [ ] Store failed uploads in database
  - [ ] Auto-retry when connection restored
  - [ ] Manual retry option in admin panel

### Data Integrity
- [ ] Implement data validation before upload
- [ ] Add checksums/validation for critical data
- [ ] Implement rollback mechanism for failed transactions
- [ ] Add data reconciliation tools

---

## Phase 6: Background Jobs & Scheduling

### Scheduled Tasks
- [ ] Implement background job scheduler:
  - [ ] Periodic employee sync (daily/weekly)
  - [ ] Batch attendance upload (every X minutes)
  - [ ] Failed upload retry (hourly)
  - [ ] Database cleanup (old logs, etc.)
  - [ ] Health check reports

### Job Queue System
- [ ] Implement job queue for async operations:
  - [ ] Use Celery or similar (if needed)
  - [ ] Or implement simple queue in database
  - [ ] Process queue items in background thread
  - [ ] Monitor queue size and processing time

### Cron Jobs / Systemd Timers
- [ ] Set up systemd timers or cron jobs:
  - [ ] Daily employee sync at specific time
  - [ ] Periodic attendance batch upload
  - [ ] Database backup
  - [ ] Log rotation

---

## Phase 7: Admin Panel & Monitoring

### Admin Dashboard
- [ ] Create admin panel for ERPNext integration:
  - [ ] Sync status display
  - [ ] Last sync timestamp
  - [ ] Failed uploads list
  - [ ] Manual sync trigger button
  - [ ] Manual retry for failed uploads
  - [ ] Connection test button
  - [ ] Sync statistics (success/failure counts)

### Logging & Monitoring
- [ ] Enhanced logging for ERPNext operations:
  - [ ] Log all API calls (request/response)
  - [ ] Log sync operations
  - [ ] Log errors with stack traces
  - [ ] Log performance metrics (API response times)
- [ ] Create monitoring dashboard:
  - [ ] Real-time sync status
  - [ ] API call success rate
  - [ ] Queue size monitoring
  - [ ] Error rate tracking

### Alerts & Notifications
- [ ] Implement alert system:
  - [ ] Email/SMS alerts for sync failures
  - [ ] Alert for queue size exceeding threshold
  - [ ] Alert for API rate limit approaching
  - [ ] Daily summary report

---

## Phase 8: Testing & Validation

### Unit Tests
- [ ] Write unit tests for ERPNext API client
- [ ] Write unit tests for employee sync
- [ ] Write unit tests for attendance upload
- [ ] Write unit tests for error handling
- [ ] Write unit tests for data validation

### Integration Tests
- [ ] Test full sync workflow (ERPNext → Local → Recognition → Upload)
- [ ] Test with real ERPNext instance (staging)
- [ ] Test error scenarios (network failure, API errors)
- [ ] Test data consistency between systems
- [ ] Test performance under load

### User Acceptance Testing
- [ ] Test with real employees
- [ ] Verify attendance appears correctly in ERPNext
- [ ] Verify salary computation uses correct attendance data
- [ ] Test edge cases (holidays, leaves, overtime)
- [ ] Get feedback from HR/payroll team

---

## Phase 9: Documentation & Deployment

### Documentation
- [ ] Write ERPNext integration guide
- [ ] Document API endpoints and usage
- [ ] Document configuration options
- [ ] Document error codes and troubleshooting
- [ ] Create setup/deployment guide
- [ ] Document data flow diagrams

### Configuration Management
- [ ] Add ERPNext settings to config.py:
  - [ ] ERPNext URL
  - [ ] API credentials
  - [ ] Sync intervals
  - [ ] Batch upload settings
  - [ ] Retry settings
- [ ] Add environment variable support
- [ ] Add configuration validation on startup

### Deployment Checklist
- [ ] Update production deployment scripts
- [ ] Add database migration scripts (if needed)
- [ ] Create backup/restore procedures
- [ ] Document rollback procedure
- [ ] Create monitoring setup guide

---

## Phase 10: Advanced Features (Future Enhancements)

### Multi-Company Support
- [ ] Support multiple companies in ERPNext
- [ ] Company-specific employee sync
- [ ] Company-specific attendance upload

### Leave Integration
- [ ] Fetch leave records from ERPNext
- [ ] Exclude leave days from attendance
- [ ] Handle half-day leaves
- [ ] Handle holiday calendars

### Shift Management
- [ ] Fetch shift schedules from ERPNext
- [ ] Apply shift-specific attendance rules
- [ ] Handle shift rotations
- [ ] Calculate working hours based on shift

### Overtime Calculation
- [ ] Calculate overtime hours
- [ ] Send overtime data to ERPNext
- [ ] Handle overtime approval workflow

### Reports & Analytics
- [ ] Generate attendance reports
- [ ] Compare local vs ERPNext data
- [ ] Generate sync statistics
- [ ] Export data for analysis

---

## Priority Levels

### 🔴 High Priority (Must Have)
- Phase 1: Database & Backend Foundation
- Phase 2: ERPNext API Integration Setup
- Phase 3: Employee Synchronization
- Phase 4: Attendance Logging to ERPNext
- Phase 5: Error Handling & Reliability

### 🟡 Medium Priority (Should Have)
- Phase 6: Background Jobs & Scheduling
- Phase 7: Admin Panel & Monitoring
- Phase 8: Testing & Validation

### 🟢 Low Priority (Nice to Have)
- Phase 9: Documentation & Deployment
- Phase 10: Advanced Features

---

## Notes

- **ERPNext API Documentation**: Refer to ERPNext REST API docs for doctype structure
- **Attendance Doctype**: ERPNext uses "Attendance" doctype for attendance records
- **Employee Doctype**: ERPNext uses "Employee" doctype for employee records
- **API Rate Limits**: Be aware of ERPNext API rate limits to avoid throttling
- **Data Privacy**: Ensure compliance with data privacy regulations when syncing employee data
- **Backup Strategy**: Always backup local database before major sync operations

---

## ONVIF Server Integration for UniFi UDM/UNVR (High Priority)

### Current Status
- ❌ ONVIF server is NOT currently working
- ❌ ONVIF libraries not installed
- ❌ No RTSP server configured
- ✅ Basic skeleton code exists

### Implementation Plan
- [ ] **Option 1 (Recommended):** Install and configure rpos (Node.js ONVIF server)
  - [ ] Install Node.js if not present
  - [ ] Clone and install rpos from GitHub
  - [ ] Configure rpos for Raspberry Pi camera
  - [ ] Test ONVIF discovery with ONVIF Device Manager
  - [ ] Test with UniFi UDM/UNVR
  - [ ] Verify ONVIF Profile S compatibility
  - [ ] Verify RTSP streaming works
  - [ ] Add rpos control to Flask API
  - [ ] Integrate ONVIF controls in Camera Settings UI

- [ ] **Option 2 (Alternative):** Build Python-based ONVIF server
  - [ ] Install onvif-zeep or python-onvif-zeep
  - [ ] Install mediamtx or rtsp-simple-server for RTSP
  - [ ] Implement ONVIF device service
  - [ ] Implement ONVIF media service
  - [ ] Implement WS-Discovery for device discovery
  - [ ] Add authentication support
  - [ ] Test with UniFi UDM/UNVR

### UniFi Compatibility Requirements
- [ ] ONVIF Profile S (Streaming) - Required
- [ ] ONVIF Profile T (Advanced Streaming) - Recommended
- [ ] RTSP streaming (H.264/H.265)
- [ ] WS-Discovery for device discovery
- [ ] Digest authentication (username/password)
- [ ] Proper device information (manufacturer, model, serial)

### Testing Checklist
- [ ] ONVIF Device Manager can discover device
- [ ] UniFi UDM/UNVR can discover device
- [ ] RTSP stream accessible
- [ ] Can add device to UniFi Protect
- [ ] Live view works in UniFi
- [ ] Recording works in UniFi
- [ ] All ONVIF operations work correctly

**Note:** rpos is recommended as it's proven to work with UniFi systems and is actively maintained.

---

## ONVIF Server Integration (High Priority)

### ONVIF Server Implementation
- [ ] Install ONVIF Python library (onvif-zeep or onvif-python)
- [ ] Create ONVIF server module to expose Raspberry Pi camera as ONVIF device
- [ ] Implement ONVIF device discovery (WS-Discovery)
- [ ] Implement ONVIF device management service
- [ ] Implement ONVIF media service (streaming)
- [ ] Implement ONVIF imaging service (camera settings)
- [ ] Add RTSP stream endpoint for ONVIF compatibility
- [ ] Configure ONVIF device information (manufacturer, model, serial number)
- [ ] Add ONVIF authentication support
- [ ] Test ONVIF compatibility with popular NVR systems

### ONVIF Settings UI
- [ ] Add ONVIF server settings to Camera Setup page
- [ ] Enable/disable ONVIF server toggle
- [ ] ONVIF server port configuration
- [ ] ONVIF device name and location settings
- [ ] ONVIF authentication settings (username/password)
- [ ] ONVIF stream profile configuration
- [ ] ONVIF device discovery status indicator
- [ ] Test connection button for NVR integration

### RTSP Stream Integration
- [ ] Set up RTSP server (using mediamtx or similar)
- [ ] Configure RTSP stream from Raspberry Pi camera
- [ ] Map RTSP stream to ONVIF media profile
- [ ] Add RTSP authentication
- [ ] Test RTSP stream with VLC and NVR systems

---

## UI Design Guidelines (Critical)

### No Scrolling Policy
- [x] Documented in `/To-Dos/UI-GUIDELINES.md`
- [ ] Home page must have no vertical scrolling - all content fits in viewport
- [ ] All modals must have no scrolling - content fits within modal bounds
- [ ] Use responsive design to adjust content size
- [ ] Use tabs/accordions for overflow content instead of scrolling
- [ ] Test on different screen sizes to ensure no scroll

### Border Styling
- [x] Use thin borders (borderWidth: 1)
- [x] Use variant="outlined" for Paper components
- [x] Keep borders aesthetically pleasing and minimal

---

## Face Registration UI Improvements - iPhone Style (High Priority)

### iPhone-Style Circular Interface
- [ ] Make video feed a big circle (like iPhone Face ID)
- [ ] Add circular progress bar on the edge of the circle
- [ ] Progress bar only advances clockwise when captured images are validated as OK
- [ ] Grey out buttons below until face registration is complete
- [ ] Fix manual capture button functionality
- [ ] Fix register face button - should work automatically
- [ ] Auto-submit registration when all angles are captured and validated
- [ ] Remove angle selection buttons - use overlay guidance only
- [ ] Add smooth animations matching iPhone Face ID style
- [ ] Make interface polished and minimal like iPhone

### Automatic Registration Flow
- [ ] System automatically validates each captured image
- [ ] Only advance progress when image quality is good
- [ ] Auto-capture when face is in correct position
- [ ] Auto-advance to next angle after successful capture
- [ ] Auto-submit when all 5 angles are captured and validated
- [ ] Show visual feedback for each validated angle

---

## Face Registration UI Improvements (High Priority)

### Video Overlay & Automatic Capture System
- [ ] Replace angle selection buttons with video feed overlay
- [ ] Add animated overlay guidance (look left, right, up, down) directly on video
- [ ] Implement automatic face detection and validation
- [ ] Add real-time face quality checking (too close, too far, angle not correct)
- [ ] Auto-capture when face is in correct position and validated
- [ ] Add smooth animations for overlay (lightweight, not too heavy)
- [ ] Implement automatic progression through angles (minimal human interference)
- [ ] Add visual feedback for face quality status
- [ ] Polish UI to match modern phone facial registration systems
- [ ] Add progress indicator showing which angle is being captured

### Technical Requirements
- [ ] Use face detection API to validate captured frames before accepting
- [ ] Check face size (not too close/too far)
- [ ] Check face angle/position matches required direction
- [ ] Validate face quality (blur, lighting, etc.)
- [ ] Auto-advance to next angle after successful capture
- [ ] Show clear visual indicators on video feed

---

## Current Status

**Last Updated**: [Date will be updated as tasks are completed]

**Overall Progress**: 0% (Foundation phase in progress)

**Next Steps**: 
1. Complete Phase 1 (Database & Backend Foundation)
2. Implement Face Registration UI Improvements (Video Overlay & Auto-Capture)
3. Begin Phase 2 (ERPNext API Integration Setup)

---

## Questions to Resolve

- [ ] What is the exact ERPNext Attendance doctype structure?
- [ ] What fields are required vs optional for attendance?
- [ ] How should we handle multiple check-ins/check-outs per day?
- [ ] Should we support shift-based attendance?
- [ ] What is the expected sync frequency?
- [ ] How should we handle employees who don't exist in ERPNext?
- [ ] What is the approval workflow for attendance in ERPNext?
