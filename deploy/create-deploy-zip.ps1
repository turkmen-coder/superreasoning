# Hostinger'a yuklenecek kaynak arsivi olusturur.
# node_modules ve dist HARIC - sunucuda "npm install" ve "npm run build" calistirilacak.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root "dist-deploy"
$zipName = "super-reasoning_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
$zipPath = Join-Path $outDir $zipName

$exclude = @(
    "node_modules",
    "nul",
    "dist",
    "dist-ssr",
    "dist-deploy",
    ".git",
    ".env",
    ".env.*",
    "*.log",
    ".vscode",
    ".idea",
    "*.suo",
    "._*"
)

if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$files = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
    $rel = $_.FullName.Substring($root.Length + 1)
    $skip = $false
    foreach ($e in $exclude) {
        if ($e -like "*.*") {
            if ($rel -like $e) { $skip = $true; break }
        } elseif ($rel -like "$e*" -or $rel -like "*\$e\*") {
            $skip = $true
            break
        }
    }
    -not $skip
}

$tempDir = Join-Path $env:TEMP "sr-deploy-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$baseName = (Split-Path -Leaf $root)
$destRoot = Join-Path $tempDir $baseName
New-Item -ItemType Directory -Path $destRoot -Force | Out-Null

foreach ($f in $files) {
    $rel = $f.FullName.Substring($root.Length + 1)
    $dest = Join-Path $destRoot $rel
    $destDir = Split-Path -Parent $dest
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item -Path $f.FullName -Destination $dest -Force
}

Compress-Archive -Path (Join-Path $tempDir $baseName) -DestinationPath $zipPath -Force
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Olusturuldu: $zipPath"
Write-Host "Hostinger Node.js: Bu zip'i yukleyin; Build: npm ci && npm run build, Start: npm start"
