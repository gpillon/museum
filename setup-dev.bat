@echo off
echo 🚀 Setting up YOLO Pose Detection Development Environment

echo 📦 Setting up Python backend...

cd backend

REM Remove existing venv if it exists
if exist venv (
    echo Removing existing virtual environment...
    rmdir /s /q venv
)

echo Creating new virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Upgrading pip...
python -m pip install --upgrade pip

echo Installing Python dependencies...
pip install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install Python dependencies
    echo Trying alternative installation method...
    pip install --upgrade setuptools wheel
    pip install -r requirements.txt
)

echo ✅ Backend setup complete!

echo 📦 Setting up React frontend...

cd ..\frontend

if exist node_modules (
    echo Removing existing node_modules...
    rmdir /s /q node_modules
)

if exist package-lock.json (
    del package-lock.json
)

echo Installing Node.js dependencies...
npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install Node.js dependencies
    echo Trying with npm cache clean...
    npm cache clean --force
    npm install
)

echo ✅ Frontend setup complete!

echo.
echo 🎉 Setup complete! You can now run the application:
echo.
echo Development mode:
echo 1. Backend: cd backend ^&^& venv\Scripts\activate ^&^& uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
echo 2. Frontend: cd frontend ^&^& npm start
echo.
echo Or use Docker Compose:
echo docker-compose up
echo.
echo Access the application at:
echo - Frontend: http://localhost:3000
echo - Backend API: http://localhost:8000
echo - API Docs: http://localhost:8000/docs

pause 