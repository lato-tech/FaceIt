# Face It!

## 🛠️ System Setup

### 1. Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Required Dependencies
```bash
sudo apt install -y \
  git \
  nodejs \
  npm \
  python3-pip \
  python3-opencv \
  libatlas-base-dev \
  libhdf5-dev \
  libhdf5-serial-dev \
  libjasper-dev \
  libqtgui4 \
  libqt4-test \
  libwebp-dev
```

### 3. Install PM2
```bash
sudo npm install -g pm2
```

---

## 📦 Install Face It!

### Clone the Repository
```bash
git clone https://github.com/lato-tech/face-it.git
cd face-it
```

### Install Dependencies
```bash
npm install
```

### Set Up Environment Variables
```bash
cp .env.example .env
nano .env
```

### Build the Application
```bash
npm run build
```

---

## 🎥 Camera Setup

### Enable Camera Interface
```bash
sudo raspi-config
# Navigate to: Interface Options > Camera > Enable
```

### Test Camera
```bash
libcamera-still -o test.jpg
python3 scripts/test_camera.py
```

---

## ⚙️ Configure Face It!

Edit your `.env` file:

```env
# Basic Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Camera Settings
CAMERA_TYPE=raspicam
CAMERA_RESOLUTION=1920x1080
FACE_DETECTION_THRESHOLD=0.85

# ERPNext Integration
ERPNEXT_URL=your_erp_url
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret

# AI Features
ENABLE_AGE_DETECTION=true
ENABLE_EMOTION_DETECTION=true
ENABLE_MASK_DETECTION=true
ENABLE_BEHAVIOR_ANALYSIS=false

# Performance
GPU_ACCELERATION=true
BATCH_PROCESSING=false
MODEL_OPTIMIZATION=balanced
```

---

## 🚀 Run the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
pm2 start npm --name "face-it" -- start
pm2 save
pm2 startup
```

### View Logs
```bash
pm2 logs face-it
```

---

## 🎯 Usage

### Face Registration
1. Navigate to **Employees > Add Employee**
2. Fill in employee details
3. Click **"Register Face"**
4. Follow on-screen guide to capture multiple angles
5. Verify registration with test recognition

### Daily Operation
- Start the system and ensure the camera is working
- Employees check in/out by facing the camera
- System detects face, verifies identity, logs attendance
- View real-time status and logs in dashboard

---

## 🔧 Configuration

### Camera Settings

| Setting              | Description                | Default     |
|----------------------|----------------------------|-------------|
| Resolution           | Camera resolution          | 1920x1080   |
| FPS                  | Frames per second          | 30          |
| Detection Threshold  | Face detection confidence  | 0.85        |
| Enhanced Lighting    | Auto lighting adjustment   | true        |

### AI Features

| Feature               | Description                | Default     |
|------------------------|----------------------------|-------------|
| Multi-Person Detection | Detect multiple faces      | true        |
| Emotion Detection      | Detect emotions            | false       |
| Age Estimation         | Estimate age               | false       |
| Mask Detection         | Detect face masks          | true        |
| Behavior Analysis      | Analyze behavior patterns  | false       |

---

## 🔌 API Documentation

- REST API Endpoints  
- [More details to be added]

---

## 🔍 Troubleshooting

### Common Issues

**Camera not detected:**
```bash
sudo modprobe bcm2835-v4l2
```

**Permission issues:**
```bash
sudo usermod -a -G video $USER
sudo usermod -a -G gpio $USER
```

**Performance issues:**
```bash
vcgencmd measure_temp
htop
npm cache clean --force
```

### Error Codes

| Code  | Description                   | Solution                     |
|-------|-------------------------------|------------------------------|
| E001  | Camera initialization failed  | Check camera connection      |
| E002  | Face detection error          | Adjust lighting conditions   |
| E003  | Database connection error     | Verify ERPNext settings      |

---

## 🔒 Security

- Change default passwords  
- Enable UFW firewall  
- Perform regular system updates  
- Secure ERPNext credentials  
- Enable HTTPS  
- Take regular backups  

---

## 📚 Additional Resources

- Complete Documentation  
- API Reference  
- Video Tutorials  
- Community Forum  

---

## 🤝 Support

**Email:** support@getlato.com  
**Website:** [www.getlato.com](https://www.getlato.com)  
**Discord:** Join our community

---

## 📄 License

© 2024 Lato Technologies. All rights reserved.

<div align="center">
  <img src="https://namiex.com/wp-content/uploads/2021/11/Go.png" alt="Powered by Lato Technologies" width="150"/>
</div>
