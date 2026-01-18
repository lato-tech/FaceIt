# Raspberry Pi 5 Face Recognition API: Production Deployment Guide

This guide explains how to deploy and run your Flask face recognition API on a Raspberry Pi 5 for 24/7, production-style operation using **Gunicorn** and **systemd**.

---

## 1. **Install Required Packages**

Activate your virtual environment (if using one):

```sh
source /home/pi/FaceRecognization-120725/RPI5-FR/venv/bin/activate
```

Install Gunicorn and gevent:

```sh
pip install gunicorn gevent
```

---

## 2. **Test Gunicorn Locally**

From your project directory, run:

```sh
gunicorn -k gevent -w 1 api_server:app --bind 0.0.0.0:5000
```

- This starts your API using Gunicorn (production server) instead of Flask's built-in server.
- Test your endpoints in the browser or with curl.

---

## 3. **Create a systemd Service File**

Create `/etc/systemd/system/faceapi.service` with the following content:

```ini
[Unit]
Description=Face Recognition API Server
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/FaceRecognization-120725/RPI5-FR
ExecStart=/home/pi/FaceRecognization-120725/RPI5-FR/venv/bin/gunicorn -k gevent -w 1 api_server:app --bind 0.0.0.0:5000
Restart=always
StandardOutput=append:/home/pi/FaceRecognization-120725/RPI5-FR/server.log
StandardError=append:/home/pi/FaceRecognization-120725/RPI5-FR/server.log

[Install]
WantedBy=multi-user.target
```

**Adjust paths if your project or venv is elsewhere!**

---

## 4. **Enable and Start the Service**

```sh
sudo systemctl daemon-reload
sudo systemctl enable faceapi
sudo systemctl start faceapi
```

---

## 5. **Managing the Service**

- **Start:**
  ```sh
  sudo systemctl start faceapi
  ```
- **Stop:**
  ```sh
  sudo systemctl stop faceapi
  ```
- **Restart (after code changes):**
  ```sh
  sudo systemctl restart faceapi
  ```
- **Status:**
  ```sh
  sudo systemctl status faceapi
  ```
- **View logs:**
  ```sh
  tail -f /home/pi/FaceRecognization-120725/RPI5-FR/server.log
  ```

---

## 6. **FAQ**

### **Q: Do I still need `api_server.py`?**
**A:**
- **Yes!** `api_server.py` contains your main application code (Flask routes, logic, etc.).
- In production, you do **not** run it directly with `python3 api_server.py`.
- Instead, Gunicorn (via systemd) loads and runs your `app` object from `api_server.py`.
- **Do not delete or rename `api_server.py` unless you update the service file accordingly.**

### **Q: What happens if the server crashes or the Pi reboots?**
- systemd will automatically restart the API server process.
- On reboot, the service will start automatically if enabled.

### **Q: How do I update the code?**
- Pull or copy your new code, then run:
  ```sh
  sudo systemctl restart faceapi
  ```

---

## 7. **Summary Table**

| Action                        | Command                                 |
|-------------------------------|-----------------------------------------|
| Start service                 | `sudo systemctl start faceapi`          |
| Stop service                  | `sudo systemctl stop faceapi`           |
| Restart service (after update)| `sudo systemctl restart faceapi`        |
| Check status                  | `sudo systemctl status faceapi`         |
| View logs                     | `tail -f server.log`                    |

---

## **You do NOT need to run `python3 api_server.py` in production.**

Use systemd and Gunicorn for all production/real use. Only use `python3 api_server.py` for local development or debugging. 