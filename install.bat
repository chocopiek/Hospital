@echo off
setlocal enabledelayedexpansion

cls

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║   Hospital IoT Monitoring System - Quick Start                 ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ first.
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js detected: %NODE_VERSION%
echo.

REM Install Backend
echo 📦 Installing Backend Dependencies...
cd backend
call npm install

if errorlevel 1 (
    echo ❌ Backend installation failed
    cd ..
    exit /b 1
)

echo ✓ Backend dependencies installed
echo.

REM Install Frontend
echo 📦 Installing Frontend Dependencies...
cd ..\frontend
call npm install

if errorlevel 1 (
    echo ❌ Frontend installation failed
    cd ..\..
    exit /b 1
)

echo ✓ Frontend dependencies installed
echo.

cd ..

cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║   Installation Complete! 🎉                                   ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 🚀 Next Steps:
echo.
echo    Terminal 1 (Backend):
echo    ^> cd backend ^&^& npm run dev
echo    → Server will start on http://localhost:3001
echo.
echo    Terminal 2 (Frontend):
echo    ^> cd frontend ^&^& npm run dev
echo    → Application will start on http://localhost:5173
echo.
echo    Terminal 3 (Simulator):
echo    ^> cd backend ^&^& npm run simulate
echo    → 12 virtual devices will start sending data
echo.
echo 📖 For more information, see README.md
echo.
pause
