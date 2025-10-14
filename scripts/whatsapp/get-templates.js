const https = require('https');

// Configuration from environment
const ACCESS_TOKEN = 'EAAVramqNmOUBPtEe4FDERasA5t0utGyAl7FhLLDAMWBJ4M4sbm6Ld5OjAuxJg6U9HxWmW1OUYz4cIEiueegKv8mKW6UIxURj8iS51jJzuwVVq60r1XUmRyJo8mWDN6dsKj4lTDcx5j7xItKSNczPNxZAaJqZAAerLanwvZCqbFhvTLKf3DfGaQJ9WAdQiICqQZDZD';
const BUSINESS_ACCOUNT_ID = '1163477029017210';

function getTemplates() {
    console.log('📋 Getting templates from business account...');
    
    const options = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: `/v22.0/${BUSINESS_ACCOUNT_ID}/message_templates?fields=name,status,components,language,category&limit=10`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
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
                console.log('\n✅ Templates retrieved successfully!');
                
                if (response.data && response.data.length > 0) {
                    response.data.forEach((template, index) => {
                        console.log(`\n📝 Template ${index + 1}:`);
                        console.log(`   Name: ${template.name}`);
                        console.log(`   Status: ${template.status}`);
                        console.log(`   Language: ${template.language}`);
                        console.log(`   Category: ${template.category}`);
                        
                        if (template.components) {
                            console.log(`   Components:`);
                            template.components.forEach((comp, i) => {
                                console.log(`     ${i + 1}. Type: ${comp.type}`);
                                if (comp.sub_type) console.log(`        Sub-type: ${comp.sub_type}`);
                                if (comp.text) console.log(`        Text: ${comp.text}`);
                                if (comp.buttons) {
                                    console.log(`        Buttons:`);
                                    comp.buttons.forEach((btn, j) => {
                                        console.log(`          ${j + 1}. Type: ${btn.type}, Text: ${btn.text}`);
                                        if (btn.action) {
                                            console.log(`             Action: ${JSON.stringify(btn.action, null, 12)}`);
                                        }
                                    });
                                }
                            });
                        }
                        console.log('---');
                    });
                } else {
                    console.log('❌ No templates found');
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

    req.end();
}

// Run the function
getTemplates();