#!/bin/bash

echo "🚀 Setting up YOLO Pose Detection Development Environment"

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11 or later."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or later."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You can still run the application locally."
fi

echo "📦 Setting up Python backend..."

# Create virtual environment
cd backend
python -m venv venv

# Activate virtual environment
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    source venv/Scripts/activate
else
    source venv/bin/activate
fi

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

echo "✅ Backend setup complete!"

echo "📦 Setting up React frontend..."

# Install Node.js dependencies
cd ../frontend
npm install

echo "✅ Frontend setup complete!"

echo ""
echo "🎉 Setup complete! You can now run the application:"
echo ""
echo "Development mode:"
echo "1. Backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo "2. Frontend: cd frontend && npm start"
echo ""
echo "Or use Docker Compose:"
echo "docker-compose up"
echo ""
echo "Access the application at:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- API Docs: http://localhost:8000/docs" 