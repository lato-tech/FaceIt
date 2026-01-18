## Faceit

Faceit is a Raspberry Pi 5 facial-recognition punch‑clock system with a
browser-based UI, attendance logging, and ERPNext integration hooks.

### Features
- Live camera feed with recognition overlays
- Auto face registration with 8‑image capture
- Attendance logging with cooldowns
- Employee management (add/edit/deactivate)
- System stats and logs
- ONVIF/RTSP planning notes for NVR integration
- Lightweight polling and CPU alerts

### Project Structure
- `RPI5-FR/` — Backend (Flask, recognition pipeline, database)
- `Facial-Recognition-Punch-Clock-UI/` — Frontend (Vite + React)
- `To-Dos/` — Task tracking and UI guidelines

### Quick Start (Backend)
```bash
cd RPI5-FR
./run_backend.sh
```

### Quick Start (Frontend)
```bash
cd Facial-Recognition-Punch-Clock-UI
npm install
npm run dev
```

### Notes
- Configure ERPNext credentials via environment variables.
- Biometric data, logs, and local databases are excluded by `.gitignore`.
- Use `RPI5-FR/fix_camera_conflicts.sh` if the camera gets locked.
