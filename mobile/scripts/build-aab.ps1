# Build a signed release AAB for Google Play (local Gradle).
# Prerequisite: mobile/android/keystore.properties (copy from keystore.properties.example)

$ErrorActionPreference = "Stop"
$MobileRoot = Split-Path -Parent $PSScriptRoot
$AndroidRoot = Join-Path $MobileRoot "android"
$KeystoreProps = Join-Path $AndroidRoot "keystore.properties"

if (-not (Test-Path $KeystoreProps)) {
    Write-Host "Missing android/keystore.properties" -ForegroundColor Red
    Write-Host "  1. Copy android/keystore.properties.example -> android/keystore.properties"
    Write-Host "  2. Set storeFile to your .jks path (relative to android/ or absolute)"
    Write-Host "  3. Set storePassword, keyAlias, keyPassword"
    exit 1
}

Write-Host "Building release AAB (this may take several minutes)..." -ForegroundColor Cyan
Push-Location $AndroidRoot
try {
    & .\gradlew.bat bundleRelease
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

$Aab = Join-Path $AndroidRoot "app\build\outputs\bundle\release\app-release.aab"
if (Test-Path $Aab) {
    $mb = [math]::Round((Get-Item $Aab).Length / 1MB, 2)
    Write-Host ""
    Write-Host "Done. Upload this file to Google Play Console:" -ForegroundColor Green
    Write-Host "  $Aab" -ForegroundColor White
    Write-Host "  Size: $mb MB" -ForegroundColor Gray
} else {
    Write-Host "Gradle finished but AAB not found at expected path." -ForegroundColor Yellow
    exit 1
}
