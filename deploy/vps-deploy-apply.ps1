# MCP VPS Deploy — Uygula
# 1) Bu scripti calistir (yerel hazirlik)
# 2) Projeyi GitHub'a push et
# 3) Cursor'u yeniden baslattiktan sonra AI'a "MCP ile VPS'e deploy et" de

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Write-Host "=== Super Reasoning VPS Deploy Uygulaniyor ===" -ForegroundColor Cyan
Write-Host ""

# Docker compose kontrol
if (-not (Test-Path (Join-Path $root "docker-compose.yaml"))) {
    Write-Host "HATA: docker-compose.yaml bulunamadi." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] docker-compose.yaml mevcut" -ForegroundColor Green

# Build test (opsiyonel - hizli gecmek icin atlanabilir)
Write-Host ""
Write-Host "Yerel build test ediliyor (npm run build)..." -ForegroundColor Yellow
Push-Location $root
try {
    npm run build 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
    Write-Host "[OK] Build basarili" -ForegroundColor Green
} catch {
    Write-Host "[UYARI] Build atlandi veya hata: $_" -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Deploy zip (Node.js alternatifi icin)
$zipScript = Join-Path $root "deploy\create-deploy-zip.ps1"
if (Test-Path $zipScript) {
    Write-Host ""
    Write-Host "Deploy zip olusturuluyor..." -ForegroundColor Yellow
    & $zipScript
}

Write-Host ""
Write-Host "=== Sonraki adimlar ===" -ForegroundColor Cyan
Write-Host '1. Projeyi GitHub a push edin (docker-compose.yaml root ta olmali)'
Write-Host '2. Cursor u tamamen kapatip acin (MCP token icin)'
Write-Host '3. Cursor da AI a soyleyin: MCP ile VPS e deploy et'
Write-Host ""
Write-Host 'Hostinger API Unauthenticated veriyorsa: hPanel -> Account -> API dan yeni token olusturup .cursor mcp.json icindeki API_TOKEN guncelleyin.' -ForegroundColor Yellow
Write-Host ""
