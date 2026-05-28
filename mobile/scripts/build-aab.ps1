#!/usr/bin/env pwsh
# Build signed release AABs locally for all three app variants (public, staff, finance).
# Ensures each variant compiles and embeds its own corresponding JS bundle.
#
# Prereqs:
#   - Android SDK + JDK (Android Studio)
#   - mobile/android/keystore.properties (copy from keystore.properties.example)

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

# Production environment configuration for all variants
$env:EXPO_PUBLIC_API_BASE_URL = "https://admin.aagamholidays.com"
$env:EXPO_PUBLIC_WEBSITE_URL = "https://aagamholidays.com"
$env:EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_bWFueS1mbGFtaW5nby02LmNsZXJrLmFjY291bnRzLmRldiQ"

# Clean build artifacts first
Write-Host "Cleaning gradle project..." -ForegroundColor Cyan
Push-Location $AndroidDir
try {
    if (Test-Path ".\gradlew.bat") {
        & .\gradlew.bat clean --no-daemon
    } else {
        & .\gradlew clean --no-daemon
    }
} finally {
    Pop-Location
}

$variants = @(
    @{ name = "public"; flavor = "publicApp"; task = "bundlePublicAppRelease"; outPath = "publicAppRelease/app-publicApp-release.aab"; finalName = "aagam-holidays-public-1.0.2-v42.aab" },
    @{ name = "staff"; flavor = "staff"; task = "bundleStaffRelease"; outPath = "staffRelease/app-staff-release.aab"; finalName = "aagam-operations-staff-1.0.2-v42.aab" },
    @{ name = "finance"; flavor = "finance"; task = "bundleFinanceRelease"; outPath = "financeRelease/app-finance-release.aab"; finalName = "aagam-accounts-finance-1.0.2-v42.aab" }
)

$ArtifactsDir = Join-Path $MobileRoot "artifacts\play-store"
if (-not (Test-Path $ArtifactsDir)) {
    New-Item -ItemType Directory -Force -Path $ArtifactsDir | Out-Null
}

foreach ($v in $variants) {
    Write-Host ""
    Write-Host "=========================================================================" -ForegroundColor Green
    Write-Host " BUILDING APP VARIANT: $($v.name) (flavor: $($v.flavor))" -ForegroundColor Green
    Write-Host "=========================================================================" -ForegroundColor Green
    
    # CRITICAL: Set APP_VARIANT so that the Expo config and React Native bundler
    # compile the correct JS bundle layout (routes, keys, icons, configuration).
    $env:APP_VARIANT = $v.name
    
    Push-Location $AndroidDir
    try {
        if (Test-Path ".\gradlew.bat") {
            & .\gradlew.bat $($v.task) --no-daemon
        } else {
            & .\gradlew $($v.task) --no-daemon
        }
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Build failed for variant $($v.name)" -ForegroundColor Red
            exit $LASTEXITCODE
        }
        
        $builtFile = Join-Path $AndroidDir "app\build\outputs\bundle\$($v.outPath)"
        if (Test-Path $builtFile) {
            $destFile = Join-Path $ArtifactsDir $v.finalName
            Copy-Item -Path $builtFile -Destination $destFile -Force
            $sizeMb = [math]::Round((Get-Item $destFile).Length / 1MB, 1)
            Write-Host "Success: Created and copied to $destFile ($sizeMb MB)" -ForegroundColor Green
        } else {
            Write-Host "Build finished but AAB not found at expected path: $builtFile" -ForegroundColor Red
            exit 1
        }
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "All variants built successfully! Output files are located in mobile/artifacts/play-store/:" -ForegroundColor Green
Get-ChildItem -Path $ArtifactsDir -Filter *v42.aab | Select-Object Name, Length, LastWriteTime
Write-Host ""
