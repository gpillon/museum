# YOLO Pose Detection Application

A real-time pose detection application using YOLO11n-pose model with Python backend and React frontend.

## Features

- Real-time webcam pose detection
- Python FastAPI backend with YOLO11n-pose model
- React frontend with live video streaming
- WebSocket communication for real-time results
- Docker containerization ready
- Development mode with hot reload

## Project Structure

```
yolo-pose/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── models/         # YOLO model handling
│   │   ├── api/            # API routes
│   │   └── websocket/      # WebSocket handlers
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   └── services/       # API services
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml      # Development environment
├── .github/               # CI/CD workflows
└── models/                # YOLO model files
```

## Quick Start

### Development Mode

1. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Production Build

```bash
# Build containers
docker-compose -f docker-compose.prod.yml build

# Run containers
docker-compose -f docker-compose.prod.yml up -d
```

## API Endpoints

- `GET /health` - Health check
- `POST /api/detect` - Single image pose detection
- `WS /ws/detect` - WebSocket for real-time detection

## Development Features

- **Backend Hot Reload**: FastAPI with uvicorn --reload
- **Frontend Hot Reload**: React development server
- **WebSocket**: Real-time pose detection results
- **CORS**: Configured for development

## Future Enhancements

- Event streaming to external processors
- Advanced pose analytics
- User authentication
- Pose history and analytics
- Mobile responsive design
- Performance optimizations

## Technologies Used

### Backend
- FastAPI (Python web framework)
- YOLO11n-pose (Pose detection model)
- WebSockets (Real-time communication)
- Uvicorn (ASGI server)

### Frontend
- React 18
- TypeScript
- WebSocket client
- Canvas API for pose visualization
- Tailwind CSS (styling)

### DevOps
- Docker
- Docker Compose
- GitHub Actions (CI/CD ready) 