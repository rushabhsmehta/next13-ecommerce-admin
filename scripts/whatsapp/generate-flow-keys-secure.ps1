# Generate RSA-2048 Key Pair for WhatsApp Flow Encryption
# Following Meta's Official Documentation
# https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
#
# This script generates an ENCRYPTED private key with passphrase protection

param()

$ErrorActionPreference = "Stop"

$keyDirectory = ".\flow-keys"
New-Item -ItemType Directory -Force -Path $keyDirectory | Out-Null

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "WhatsApp Flow RSA Key Generator (Secure Version)" -ForegroundColor Cyan
Write-Host "Following Meta's Official Documentation" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will generate an RSA-2048 key pair with passphrase protection." -ForegroundColor White
Write-Host "You will be prompted to enter a passphrase twice." -ForegroundColor Yellow
Write-Host ""

Write-Host "[!] IMPORTANT: Remember your passphrase! You'll need it to decrypt messages." -ForegroundColor Red
Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor White
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Generating private key with DES3 encryption..." -ForegroundColor Cyan

# Generate private key WITH DES3 encryption (as per Meta documentation)
# User will be prompted to enter passphrase
openssl genrsa -des3 -out "$keyDirectory\private.pem" 2048

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[X] Error generating private key!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Extracting public key..." -ForegroundColor Cyan
Write-Host "(You'll be asked for your passphrase again)" -ForegroundColor Yellow
Write-Host ""

# Extract public key (will ask for passphrase)
openssl rsa -in "$keyDirectory\private.pem" -outform PEM -pubout -out "$keyDirectory\public.pem"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[X] Error extracting public key!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Key pair generated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Files created:" -ForegroundColor White
Write-Host "  [*] Private key: $keyDirectory\private.pem (ENCRYPTED)" -ForegroundColor Yellow
Write-Host "  [*] Public key:  $keyDirectory\public.pem" -ForegroundColor Yellow

# Display public key
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "PUBLIC KEY (Copy to Meta Flow Builder)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Get-Content "$keyDirectory\public.pem"

# Display private key
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "PRIVATE KEY (Encrypted with your passphrase)" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Get-Content "$keyDirectory\private.pem"

# Display .env format
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Add to .env file" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

$privateKeyContent = Get-Content "$keyDirectory\private.pem" -Raw

Write-Host "# WhatsApp Flow Encryption Keys" -ForegroundColor Gray
Write-Host "# Private key is encrypted - requires passphrase to use" -ForegroundColor Gray
Write-Host ""
Write-Host 'WHATSAPP_FLOW_PRIVATE_KEY="' -NoNewline
Write-Host $privateKeyContent.Trim()
Write-Host '"'
Write-Host ""
Write-Host '# The passphrase you entered when generating the key'
Write-Host 'WHATSAPP_FLOW_KEY_PASSPHRASE="your-passphrase-here"' -ForegroundColor Yellow
Write-Host ""

# Security notes
Write-Host ""
Write-Host "================================================" -ForegroundColor Red
Write-Host "SECURITY NOTES" -ForegroundColor Red
Write-Host "================================================" -ForegroundColor Red
Write-Host "[OK] Private key is ENCRYPTED with your passphrase" -ForegroundColor Green
Write-Host "[OK] Follows Meta's official documentation" -ForegroundColor Green
Write-Host "[OK] Matches WhatsApp-Flows-Tools examples" -ForegroundColor Green
Write-Host ""
Write-Host "[!] Store private key in .env file" -ForegroundColor Yellow
Write-Host "[!] Store passphrase separately (different secret)" -ForegroundColor Yellow
Write-Host "[!] NEVER commit .env to Git" -ForegroundColor Yellow
Write-Host "[!] Add flow-keys/ to .gitignore" -ForegroundColor Yellow
Write-Host ""
Write-Host "[*] For production: Use encrypted secrets manager" -ForegroundColor Cyan
Write-Host "   - Vercel: Environment Variables (encrypted)" -ForegroundColor Gray
Write-Host "   - Railway: Secret Variables" -ForegroundColor Gray
Write-Host "   - AWS: Secrets Manager" -ForegroundColor Gray

# Next steps
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "1. Copy the PUBLIC KEY above" -ForegroundColor White
Write-Host "2. Go to Meta Flow Builder > Your Flow > ... > Endpoint" -ForegroundColor White
Write-Host "3. Click [Sign public key] and paste the PUBLIC KEY" -ForegroundColor White
Write-Host "4. Copy the .env configuration above" -ForegroundColor White
Write-Host "5. Add to your .env.local file" -ForegroundColor White
Write-Host "6. Replace [your-passphrase-here] with your actual passphrase" -ForegroundColor White
Write-Host "7. Test your endpoint" -ForegroundColor White
Write-Host ""

# Check if .gitignore includes flow-keys
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    if ($gitignore -notmatch "flow-keys") {
        Write-Host "[!] Warning: flow-keys/ is not in .gitignore" -ForegroundColor Yellow
        Write-Host "   Run: echo flow-keys/ >> .gitignore" -ForegroundColor Gray
    } else {
        Write-Host "[OK] flow-keys/ is already in .gitignore" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "[OK] Done!" -ForegroundColor Green
Write-Host ""

