# Test WhatsApp Webhook with Sample Message Data
# This simulates Meta sending an incoming message to your webhook

$webhookUrl = "https://admin.aagamholidays.com/api/whatsapp/webhook"
# For local testing, use: "http://localhost:3000/api/whatsapp/webhook"

$samplePayload = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "1259119921508566"
            changes = @(
                @{
                    field = "messages"
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "16505551111"
                            phone_number_id = "769802949556238"
                        }
                        contacts = @(
                            @{
                                profile = @{
                                    name = "Test Customer"
                                }
                                wa_id = "919978783238"
                            }
                        )
                        messages = @(
                            @{
                                from = "919978783238"
                                id = "wamid.TEST123456789"
                                timestamp = [string](Get-Date -UFormat %s)
                                type = "text"
                                text = @{
                                    body = "Hello! I'm interested in your tour packages."
                                }
                            }
                        )
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "🧪 Testing WhatsApp Webhook..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📤 Sending sample incoming message payload to:" -ForegroundColor Yellow
Write-Host "   $webhookUrl" -ForegroundColor White
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri $webhookUrl `
        -Method Post `
        -Body $samplePayload `
        -ContentType "application/json"
    
    Write-Host "✅ Webhook Response:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 5
    Write-Host ""
    Write-Host "🎉 Success! Check your database for the new message:" -ForegroundColor Green
    Write-Host "   FROM: 919978783238" -ForegroundColor White
    Write-Host "   MESSAGE: 'Hello! I'm interested in your tour packages.'" -ForegroundColor White
    Write-Host ""
    Write-Host "📍 View in UI: https://admin.aagamholidays.com/whatsapp/chat" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    
    if ($_.ErrorDetails.Message) {
        Write-Host ""
        Write-Host "Response Body:" -ForegroundColor Yellow
        $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json -Depth 5
    }
}

Write-Host ""
Write-Host "💡 Tip: Check your application logs for detailed webhook processing info" -ForegroundColor Cyan
