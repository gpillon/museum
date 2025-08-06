# Manual Setup Guide

If the automated setup scripts fail, follow this manual setup guide.

## Prerequisites

- Python 3.11+ (Python 3.12 may have compatibility issues)
- Node.js 18+
- Git

## Backend Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2. Activate Virtual Environment

**Windows:**
```cmd
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Upgrade pip and install dependencies

```bash
python -m pip install --upgrade pip
pip install --upgrade setuptools wheel
pip install -r requirements.txt
```

### 4. Test Backend

```bash
python -c "from app.models.yolo_detector import YOLODetector; print('Backend setup successful!')"
```

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Test Frontend

```bash
npm start
```

## Troubleshooting

### Python Issues

1. **Permission Denied**: Run as Administrator or use a different directory
2. **Numpy Installation Error**: Try installing numpy separately first:
   ```bash
   pip install numpy>=1.26.0
   pip install -r requirements.txt
   ```
3. **Python 3.12 Issues**: Consider downgrading to Python 3.11

### Node.js Issues

1. **npm install fails**: Clear cache and retry:
   ```bash
   npm cache clean --force
   npm install
   ```
2. **Permission issues**: Run as Administrator

### YOLO Model Issues

1. **Model not found**: Ensure `yolo11n-pose.pt` is in the project root
2. **CUDA issues**: Install CPU-only version if GPU not available

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

### Docker Mode

```bash
docker-compose up
```

## Access Points

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Common Issues

### 1. WebSocket Connection Failed
- Ensure backend is running on port 8000
- Check CORS settings in backend
- Verify firewall settings

### 2. Webcam Not Working
- Check browser permissions
- Try HTTPS (required for webcam in some browsers)
- Test with different browsers

### 3. YOLO Model Loading Error
- Verify model file exists and is accessible
- Check file permissions
- Ensure sufficient disk space

### 4. Performance Issues
- Reduce frame rate in PoseDetector.tsx (change interval from 100ms to 200ms)
- Use smaller model if available
- Consider GPU acceleration 