#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Hospital IoT Monitoring System - Quick Start                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✓ Node.js detected: $(node --version)"
echo ""

# Install Backend
echo "📦 Installing Backend Dependencies..."
cd backend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Backend installation failed"
    exit 1
fi

echo "✓ Backend dependencies installed"
echo ""

# Install Frontend
echo "📦 Installing Frontend Dependencies..."
cd ../frontend
npm install

if [ $? -ne 0 ]; then
    echo "❌ Frontend installation failed"
    exit 1
fi

echo "✓ Frontend dependencies installed"
echo ""

# Back to root
cd ..

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   Installation Complete! 🎉                                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🚀 Next Steps:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   $ cd backend && npm run dev"
echo "   → Server will start on http://localhost:3001"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   $ cd frontend && npm run dev"
echo "   → Application will start on http://localhost:5173"
echo ""
echo "   Terminal 3 (Simulator):"
echo "   $ cd backend && npm run simulate"
echo "   → 12 virtual devices will start sending data"
echo ""
echo "📖 For more information, see README.md"
echo ""
