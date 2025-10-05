const https = require('https');

// Configuration from environment  
const ACCESS_TOKEN = 'EAAVramqNmOUBPmXA9DAvQUgwcRlmZBdZCWQDEr3547bEUDnPlz3VVGbkPJKrIMkk4wjgoB9Qk9HDZCJCRAW7sle6gfZCZCL8yvVKw2ssshqgqvwixmOrwdDdRWsip52JO8IzmwtXIZAvLN8KUsQphmypNcvzZCJFTKpSguM29JUCEnKjnmLLsxuXlgPVxPfe9zC3wZDZD';
const PHONE_NUMBER_ID = '769802949556238';
const RECIPIENT_PHONE = '919978783238';

const templateData = {
    messaging_product: 'whatsapp',
    to: RECIPIENT_PHONE,
    type: 'template',
    template: {
        name: 'tour_package_flow',
        language: {
            code: 'en'
        },
        components: [
            {
                type: 'BUTTON',
                sub_type: 'FLOW',
                index: 0,
                parameters: [
                    {
                        type: 'ACTION',
                        action: {
                            flow_token: 'tour_booking_' + Date.now(),
                            flow_action_payload: {
                                screen: 'TOUR_BOOKING',
                                data: {
                                    tour_type: 'premium',
                                    available_dates: ['2024-10-15', '2024-10-22', '2024-10-29']
                                }
                            }
                        }
                    }
                ]
            }
        ]
    }
};

function sendTemplate() {
    console.log('🚀 Sending WhatsApp template message...');
    console.log('📱 To:', RECIPIENT_PHONE);
    console.log('📝 Template:', 'tour_package_flow');
    
    const postData = JSON.stringify(templateData);
    console.log('📤 Payload:', JSON.stringify(templateData, null, 2));
    
    const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v22.0/${PHONE_NUMBER_ID}/messages`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
            data += chunk;
        });
        
        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                if (response.messages && response.messages[0]) {
                    console.log('\n✅ Template sent successfully!');
                    console.log('✅ Message ID:', response.messages[0].id);
                    console.log('📱 WhatsApp ID:', response.messages[0].wamid);
                    console.log('\n🎯 Now check your WhatsApp to see the template with Flow button!');
                } else {
                    console.log('\n❌ Error sending template:');
                    console.log('📊 Response:', JSON.stringify(response, null, 2));
                }
            } catch (error) {
                console.error('❌ Error parsing response:', error);
                console.log('Raw response:', data);
            }
        });
    });

    req.on('error', (error) => {
        console.error('❌ Request error:', error);
    });

    req.write(postData);
    req.end();
}

// Run the function
sendTemplate();