## To‑Do

### Core Functionality
- [ ] Ensure face registration enforces missing angles (left/right) before completion
- [ ] Add “missing angles” notification only on submit
- [ ] Confirm profile photo uses best front image
- [ ] Verify attendance logs are written on recognition

### Performance
- [ ] Keep CPU below 85% under load
- [ ] Tune recognition interval and camera FPS for stability
- [ ] Add automatic backoff when CPU is high

### Reliability
- [ ] Improve camera init retries without restart loops
- [ ] Add camera health status on UI
- [ ] Add auto‑recovery when stream stalls

### ERPNext (Later)
- [ ] Wire employee sync with ERPNext
- [ ] Push attendance to ERPNext (batch + retry)
- [ ] Add credential config UI

### ONVIF (Later)
- [ ] Finalize ONVIF server path (rpos vs Python)
- [ ] Add RTSP stream and discovery checks
