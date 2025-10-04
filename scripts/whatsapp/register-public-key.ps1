# Register WhatsApp Flow Public Key with Meta API
# This registers your business public key for Flow encryption
# Run after generating keys with generate-flow-keys.js

# Load environment variables from .env file
$envFile = "..\..\\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($name, $value, 'Process')
        }
    }
}

$phoneNumberId = $env:META_WHATSAPP_PHONE_NUMBER_ID
$accessToken = $env:META_WHATSAPP_ACCESS_TOKEN
$apiVersion = if ($env:META_GRAPH_API_VERSION) { $env:META_GRAPH_API_VERSION } else { "v22.0" }

if (-not $phoneNumberId -or -not $accessToken) {
    Write-Host "Error: Missing credentials in .env file" -ForegroundColor Red
    Write-Host "Please ensure META_WHATSAPP_PHONE_NUMBER_ID and META_WHATSAPP_ACCESS_TOKEN are set" -ForegroundColor Red
    exit 1
}

# Read public key
$publicKeyPath = "..\..\flow-keys\public.pem"
if (-not (Test-Path $publicKeyPath)) {
    Write-Host "Error: Public key not found at $publicKeyPath" -ForegroundColor Red
    Write-Host "Please run: node scripts/whatsapp/generate-flow-keys.js" -ForegroundColor Yellow
    exit 1
}

$publicKey = Get-Content $publicKeyPath -Raw

Write-Host "=== Registering WhatsApp Flow Public Key ===" -ForegroundColor Cyan
Write-Host "Phone Number ID: $phoneNumberId" -ForegroundColor Yellow
Write-Host "API Version: $apiVersion" -ForegroundColor Yellow
Write-Host ""

# Register public key
$uri = "https://graph.facebook.com/$apiVersion/$phoneNumberId/whatsapp_business_encryption"

try {
    Write-Host "Sending request to Meta API..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $uri `
        -Method Post `
        -Headers @{
            'Authorization' = "Bearer $accessToken"
        } `
        -ContentType 'application/x-www-form-urlencoded' `
        -Body @{
            business_public_key = $publicKey
        }
    
    Write-Host "SUCCESS! Public key registered successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json
    Write-Host ""
    
    Write-Host "=== Next Steps ===" -ForegroundColor Green
    Write-Host "1. Public key is now registered with Meta"
    Write-Host "2. Go to Meta Flow Builder > Endpoint tab"
    Write-Host "3. 'Sign public key' should now show as completed"
    Write-Host "4. Continue with 'Connect Meta app' and 'Health check'"
    Write-Host ""
    
} catch {
    Write-Host "ERROR: Failed to register public key" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    
    if ($_.ErrorDetails.Message) {
        try {
            $errorJson = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host ""
            Write-Host "Meta API Error:" -ForegroundColor Yellow
            $errorJson | ConvertTo-Json -Depth 5
        } catch {
            Write-Host $_.ErrorDetails.Message
        }
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "- Verify ACCESS_TOKEN has whatsapp_business_messaging permission"
    Write-Host "- Verify PHONE_NUMBER_ID is correct"
    Write-Host "- Ensure public key was generated correctly"
    exit 1
}

# Verify registration by getting the key back
Write-Host "=== Verifying Registration ===" -ForegroundColor Cyan

try {
    $verifyResponse = Invoke-RestMethod -Uri $uri `
        -Method Get `
        -Headers @{
            'Authorization' = "Bearer $accessToken"
        }
    
    Write-Host "Verification successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Signature Status: $($verifyResponse.business_public_key_signature_status)" -ForegroundColor Yellow
    
    if ($verifyResponse.business_public_key_signature_status -eq "VALID") {
        Write-Host "Public key is VALID and ready to use!" -ForegroundColor Green
    } elseif ($verifyResponse.business_public_key_signature_status -eq "MISMATCH") {
        Write-Host "WARNING: Signature status is MISMATCH" -ForegroundColor Yellow
        Write-Host "This may resolve itself in a few minutes. Try again later." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Registered Public Key (first 100 chars):" -ForegroundColor Cyan
    Write-Host $verifyResponse.business_public_key.Substring(0, [Math]::Min(100, $verifyResponse.business_public_key.Length))
    Write-Host "..."
    
} catch {
    Write-Host "WARNING: Could not verify registration" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host "Your WhatsApp Flow is now ready for encryption!" -ForegroundColor Green
