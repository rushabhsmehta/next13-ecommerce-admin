# Generate RSA-2048 Key Pair for WhatsApp Flow Encryption
# Run this script in PowerShell to generate private and public keys

$keyDirectory = ".\flow-keys"
New-Item -ItemType Directory -Force -Path $keyDirectory | Out-Null

Write-Host "Generating RSA-2048 key pair for WhatsApp Flow..." -ForegroundColor Cyan

# Generate private key
openssl genrsa -out "$keyDirectory\private.pem" 2048

# Extract public key
openssl rsa -in "$keyDirectory\private.pem" -pubout -out "$keyDirectory\public.pem"

Write-Host "`nKey pair generated successfully!" -ForegroundColor Green
Write-Host "Private key: $keyDirectory\private.pem" -ForegroundColor Yellow
Write-Host "Public key: $keyDirectory\public.pem" -ForegroundColor Yellow

Write-Host "`n=== PUBLIC KEY (Copy this to Meta Flow Builder) ===" -ForegroundColor Cyan
Get-Content "$keyDirectory\public.pem"

Write-Host "`n=== IMPORTANT SECURITY NOTES ===" -ForegroundColor Red
Write-Host "1. Store private.pem securely - NEVER commit to Git!"
Write-Host "2. Add flow-keys/ to .gitignore"
Write-Host "3. Add WHATSAPP_FLOW_PRIVATE_KEY to .env file"

# Display .env format
Write-Host "`n=== Add to .env ===" -ForegroundColor Cyan
$privateKeyContent = Get-Content "$keyDirectory\private.pem" -Raw
$privateKeyBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($privateKeyContent))
Write-Host "WHATSAPP_FLOW_PRIVATE_KEY=`"$privateKeyBase64`""

Write-Host "`nNext steps:" -ForegroundColor Green
Write-Host "1. Copy the PUBLIC KEY above"
Write-Host "2. Paste it in Meta Flow Builder > Sign public key"
Write-Host "3. Add the WHATSAPP_FLOW_PRIVATE_KEY to your .env file"
Write-Host "4. Update the endpoint to decrypt requests"
