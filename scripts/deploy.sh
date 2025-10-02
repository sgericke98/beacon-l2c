#!/bin/bash

# Beacon L2C Analytics - Production Deployment Script
# This script helps validate and deploy the application to production

set -e  # Exit on any error

echo "🚀 Beacon L2C Analytics - Production Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_status "Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "npm version: $(npm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install
print_status "Dependencies installed"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local file not found"
    if [ -f ".env.example" ]; then
        print_warning "Please copy .env.example to .env.local and configure your environment variables"
        echo "Run: cp .env.example .env.local"
        exit 1
    else
        print_error ".env.example file not found. Please create environment configuration."
        exit 1
    fi
fi

# Validate environment variables
echo ""
echo "🔍 Validating environment variables..."
if npm run validate-env; then
    print_status "Environment validation passed"
else
    print_error "Environment validation failed. Please check your .env.local file"
    exit 1
fi

# Run linting
echo ""
echo "🔍 Running linter..."
if npm run lint; then
    print_status "Linting passed"
else
    print_warning "Linting found issues. Please fix them before deployment."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Build the application
echo ""
echo "🏗️  Building application..."
if npm run build; then
    print_status "Build successful"
else
    print_error "Build failed. Please fix the issues and try again."
    exit 1
fi

# Check if .next directory exists
if [ ! -d ".next" ]; then
    print_error "Build output not found. Build may have failed."
    exit 1
fi

print_status "Build output created in .next directory"

# Display deployment options
echo ""
echo "🎯 Deployment Options:"
echo "======================"
echo "1. Vercel (Recommended)"
echo "2. Railway"
echo "3. Docker"
echo "4. Manual deployment"
echo ""

read -p "Select deployment option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Vercel Deployment:"
        echo "1. Connect your GitHub repository to Vercel"
        echo "2. Set environment variables in Vercel dashboard"
        echo "3. Deploy automatically on push to main branch"
        echo ""
        echo "Environment variables to set in Vercel:"
        echo "======================================"
        if [ -f ".env.local" ]; then
            grep -v '^#' .env.local | grep -v '^$' | while IFS='=' read -r key value; do
                echo "$key"
            done
        fi
        ;;
    2)
        echo ""
        echo "🚀 Railway Deployment:"
        echo "1. Connect your GitHub repository to Railway"
        echo "2. Set environment variables in Railway dashboard"
        echo "3. Deploy automatically on push to main branch"
        ;;
    3)
        echo ""
        echo "🐳 Docker Deployment:"
        echo "1. Build Docker image: docker build -t beacon-l2c ."
        echo "2. Run container: docker run -p 3000:3000 beacon-l2c"
        echo "3. Set environment variables in docker-compose.yml or docker run command"
        ;;
    4)
        echo ""
        echo "📋 Manual Deployment:"
        echo "1. Upload .next directory to your server"
        echo "2. Install dependencies: npm install --production"
        echo "3. Set environment variables"
        echo "4. Start application: npm start"
        ;;
    *)
        print_error "Invalid option selected"
        exit 1
        ;;
esac

echo ""
print_status "Deployment preparation complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. Deploy using your chosen method"
echo "2. Verify environment variables are set correctly"
echo "3. Test the application after deployment"
echo "4. Monitor logs for any issues"
echo "5. Set up monitoring and alerts"
echo ""
echo "🔍 Post-Deployment Checks:"
echo "=========================="
echo "- Visit your application URL"
echo "- Test authentication"
echo "- Verify data integration"
echo "- Check API endpoints"
echo "- Monitor performance"
echo ""
print_status "Good luck with your deployment! 🚀"
