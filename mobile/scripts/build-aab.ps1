#!/usr/bin/env pwsh
# Build a signed release AAB locally (Option B — no EAS cloud quota).
#
# Prereqs:
#   - Android SDK + JDK (Android Studio)
#   - mobile/android/keystore.properties (copy from keystore.properties.example)
#
# Output:
#   mobile/android/app/build/outputs/bundle/release/app-release.aab

$ErrorActionPreference = "Stop"
$MobileRoot = Split-Path $PSScriptRoot -Parent
$AndroidDir = Join-Path $MobileRoot "android"
$KeystoreProps = Join-Path $AndroidDir "keystore.properties"

if (-not (Test-Path $KeystoreProps)) {
    Write-Host ""
    Write-Host "Missing $KeystoreProps" -ForegroundColor Red
    Write-Host "Copy android/keystore.properties.example -> android/keystore.properties"
    Write-Host "and fill in storePassword, keyAlias, keyPassword."
    Write-Host ""
    Write-Host "Keystore file on disk: mobile/@rushabh2310__aagam-holidays.jks"
    Write-Host "Get credentials: cd mobile; npx eas-cli credentials -p android"
    Write-Host ""
    exit 1
}

$storeFileLine = Get-Content $KeystoreProps | Where-Object { $_ -match '^\s*storeFile\s*=' } | Select-Object -First 1
if ($storeFileLine) {
    $storeFileValue = ($storeFileLine -split '=', 2)[1].Trim()
    $resolvedKeystore = if ([System.IO.Path]::IsPathRooted($storeFileValue)) {
        $storeFileValue
    } else {
        Join-Path $AndroidDir $storeFileValue
    }
    if (-not (Test-Path $resolvedKeystore)) {
        Write-Host ""
        Write-Host "Keystore file not found: $resolvedKeystore" -ForegroundColor Red
        Write-Host "storeFile in keystore.properties is relative to mobile/android/."
        Write-Host "Expected: storeFile=../@rushabh2310__aagam-holidays.jks"
        Write-Host ""
        exit 1
    }
}

# Production env baked into the JS bundle at build time
$env:EXPO_PUBLIC_API_BASE_URL = "https://admin.aagamholidays.com"
$env:EXPO_PUBLIC_WEBSITE_URL = "https://aagamholidays.com"
$env:EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_bWFueS1mbGFtaW5nby02LmNsZXJrLmFjY291bnRzLmRldiQ"

Write-Host "Building release AAB (1.0.2 / versionCode from build.gradle)..." -ForegroundColor Cyan
Push-Location $AndroidDir
try {
    if (Test-Path ".\gradlew.bat") {
        & .\gradlew.bat bundleRelease --no-daemon
    } else {
        & .\gradlew bundleRelease --no-daemon
    }
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    $aab = Join-Path $AndroidDir "app\build\outputs\bundle\release\app-release.aab"
    if (Test-Path $aab) {
        $sizeMb = [math]::Round((Get-Item $aab).Length / 1MB, 1)
        Write-Host ""
        Write-Host "Success: $aab ($sizeMb MB)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Upload in Play Console:"
        Write-Host "  https://play.google.com/console -> Aagam Holidays -> Testing -> Internal testing -> Create release"
        Write-Host ""
        Write-Host "Or submit via EAS (uses google-service-account-key.json):"
        Write-Host "  npx eas-cli submit --platform android --path `"$aab`" --profile production"
    } else {
        Write-Host "Build finished but AAB not found at expected path." -ForegroundColor Yellow
        exit 1
    }
} finally {
    Pop-Location
}
