#!/bin/bash

# Super Reasoning VPS Deployment Script
# Run this on your VPS (srv1327766.hstgr.cloud - 187.77.34.104)

set -e

echo "🚀 Super Reasoning VPS Deployment Script"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "📦 Docker kuruluyor..."
    apt update
    apt install -y docker.io docker-compose
    systemctl start docker
    systemctl enable docker
    echo "✅ Docker kuruldu"
else
    echo "✅ Docker zaten kurulu"
fi

# Check if SSH key exists
if [ ! -f ~/.ssh/id_ed25519 ]; then
    echo "🔑 SSH anahtarı oluşturuluyor..."
    ssh-keygen -t ed25519 -C "vps@super-reasoning" -f ~/.ssh/id_ed25519 -N ""
    echo "✅ SSH anahtarı oluşturuldu"
    echo ""
    echo "⚠️  ÖNEMLİ: Aşağıdaki public anahtarı GitHub'a ekleyin:"
    echo ""
    cat ~/.ssh/id_ed25519.pub
    echo ""
    echo "GitHub → Settings → SSH and GPG keys → New SSH key"
    echo "Anahtarı ekledikten sonra bu scripti tekrar çalıştırın"
    exit 1
fi

# Test SSH connection to GitHub
echo "🔍 GitHub bağlantısı test ediliyor..."
if ! ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    echo "❌ GitHub SSH bağlantısı başarısız"
    echo "Lütfen SSH anahtarınızı GitHub'a ekleyin:"
    cat ~/.ssh/id_ed25519.pub
    exit 1
fi
echo "✅ GitHub bağlantısı başarılı"

# Clone repository
echo "📥 Repository klonlanıyor..."
if [ -d "super-reasoning" ]; then
    echo "⚠️  super-reasoning klasörü zaten var, güncelleniyor..."
    cd super-reasoning
    git pull
else
    git clone git@github.com:gokhanturkmeen/super-reasoning.git
    cd super-reasoning
fi
echo "✅ Repository hazır"

# Build and run with Docker
echo "🐳 Docker container'ları başlatılıyor..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

# Check status
echo ""
echo "📊 Container durumu:"
docker-compose ps

echo ""
echo "🎉 DAĞITIM TAMAMLANDI!"
echo "======================"
echo ""
echo "🌐 Uygulamanıza erişim:"
echo "   http://187.77.34.104:4000"
echo ""
echo "📋 Logları görüntülemek için:"
echo "   docker-compose logs -f"
echo ""
echo "🔄 Yeniden başlatmak için:"
echo "   docker-compose restart"
