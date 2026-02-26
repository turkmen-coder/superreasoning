#!/bin/bash

# Super Reasoning v3.2 - Deploy Script
# Target: srv1327766.hstgr.cloud

set -e

# Configuration
VPS_HOST="srv1327766.hstgr.cloud"
VPS_USER="root"  # Change if needed
VPS_PATH="/var/www/super-reasoning"
LOCAL_DIST="./dist"
BACKUP_PATH="/var/www/backups/super-reasoning"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if dist folder exists
if [ ! -d "$LOCAL_DIST" ]; then
    log_error "Dist folder not found. Please run 'npm run build' first."
    exit 1
fi

log_info "Starting deployment to $VPS_HOST..."

# Test SSH connection
log_info "Testing SSH connection..."
if ! ssh -o ConnectTimeout=10 $VPS_USER@$VPS_HOST "echo 'Connection successful'" 2>/dev/null; then
    log_error "Cannot connect to VPS. Please check SSH configuration."
    exit 1
fi
log_success "SSH connection successful"

# Create backup on VPS
log_info "Creating backup on VPS..."
ssh $VPS_USER@$VPS_HOST "
    mkdir -p $BACKUP_PATH
    if [ -d '$VPS_PATH' ]; then
        cp -r $VPS_PATH $BACKUP_PATH/backup-$(date +%Y%m%d-%H%M%S)
        echo 'Backup created'
    else
        echo 'No existing installation found, skipping backup'
    fi
"

# Create directory structure
log_info "Creating directory structure..."
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"

# Upload files
log_info "Uploading files to VPS..."
rsync -avz --delete \
    --exclude='._*' \
    --exclude='.DS_Store' \
    -e "ssh" \
    $LOCAL_DIST/ \
    $VPS_USER@$VPS_HOST:$VPS_PATH/

# Set proper permissions
log_info "Setting file permissions..."
ssh $VPS_USER@$VPS_HOST "
    find $VPS_PATH -name '._*' -delete
    find $VPS_PATH -name '.DS_Store' -delete
    chown -R www-data:www-data $VPS_PATH
    chmod -R 755 $VPS_PATH
    find $VPS_PATH -type f -name '*.html' -exec chmod 644 {} \;
    find $VPS_PATH -type f -name '*.css' -exec chmod 644 {} \;
    find $VPS_PATH -type f -name '*.js' -exec chmod 644 {} \;
"

# Restart Nginx
log_info "Restarting Nginx..."
ssh $VPS_USER@$VPS_HOST "systemctl reload nginx"

# Verify deployment
log_info "Verifying deployment..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://$VPS_HOST/ || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    log_success "Deployment successful! Website is responding with HTTP 200"
else
    log_warning "Website responded with HTTP $HTTP_STATUS"
    log_info "Checking Nginx status..."
    ssh $VPS_USER@$VPS_HOST "systemctl status nginx --no-pager"
fi

# Show deployment summary
log_info "Deployment Summary:"
echo "  - Target: $VPS_HOST"
echo "  - Path: $VPS_PATH"
echo "  - Files uploaded: $(find $LOCAL_DIST -type f | wc -l)"
echo "  - HTTP Status: $HTTP_STATUS"
echo "  - URL: http://$VPS_HOST"

log_success "Deploy completed!"
