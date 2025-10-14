require('dotenv').config();
const https = require('https');
const { URL } = require('url');

const ACCESS_TOKEN = process.env.META_WHATSAPP_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.META_WHATSAPP_PHONE_NUMBER_ID || '';
const API_VERSION = process.env.META_GRAPH_API_VERSION || 'v22.0';
const BUSINESS_ACCOUNT_ID = process.env.META_WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.META_WHATSAPP_BUSINESS_ID || '';

const TEMPLATE_NAME = process.env.TEMPLATE_NAME || 'deep_test_kashmir_27500';
const TEMPLATE_LANGUAGE = process.env.TEMPLATE_LANGUAGE || 'en';
const HEADER_IMAGE_URL = process.env.HEADER_IMAGE || 'https://images.pexels.com/photos/3974036/pexels-photo-3974036.jpeg';
const RECIPIENTS = process.env.RECIPIENTS
  ? process.env.RECIPIENTS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['+919978783238'];

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.error('Please set META_WHATSAPP_ACCESS_TOKEN and META_WHATSAPP_PHONE_NUMBER_ID in your environment');
  process.exit(1);
}

function requestJson(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

async function uploadMediaFromUrl(url) {
  // First try business endpoint if provided (may lack permissions); otherwise upload via multipart to phone-number node
  if (BUSINESS_ACCOUNT_ID) {
    try {
      const bodyObj = { file_url: url, type: 'image', messaging_product: 'whatsapp' };
      const body = JSON.stringify(bodyObj);
      const businessPath = `/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/media`;
      const businessOptions = {
        hostname: 'graph.facebook.com',
        port: 443,
        path: businessPath,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const businessRes = await requestJson(businessOptions, body);
      if (!businessRes.body || !businessRes.body.error) return businessRes;
      console.warn('Business media upload failed, falling back to phone-number upload:', businessRes.body);
    } catch (err) {
      console.warn('Business media upload attempt error, falling back to phone-number upload:', err && err.message ? err.message : err);
    }
  }

  if (!PHONE_NUMBER_ID) {
    throw new Error('No PHONE_NUMBER_ID available to upload media');
  }

  // Download the image into a buffer
  const downloadFile = (fileUrl) =>
    new Promise((resolve, reject) => {
      const parsed = new URL(fileUrl);
      const opts = { hostname: parsed.hostname, path: parsed.pathname + (parsed.search || ''), method: 'GET' };
      const req = https.request(parsed, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error('Failed to download file, status ' + res.statusCode));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const contentType = res.headers['content-type'] || 'application/octet-stream';
          const disposition = res.headers['content-disposition'] || '';
          // Try to infer filename
          let filename = undefined;
          const m = disposition.match(/filename=\"?([^\";]+)\"?/);
          if (m) filename = m[1];
          if (!filename) {
            const parts = parsed.pathname.split('/');
            filename = parts[parts.length - 1] || `upload.${contentType.split('/')[1] || 'bin'}`;
          }
          resolve({ buffer, filename, contentType });
        });
      });
      req.on('error', reject);
      req.end();
    });

  const { buffer, filename, contentType } = await downloadFile(url);

  // Build multipart/form-data body
  const boundary = '----NodeFormBoundary' + Math.random().toString(16).slice(2);
  const delim = `--${boundary}`;
  const ending = `--${boundary}--`;

  const parts = [];
  // file part
  const fileHeader = Buffer.from(`${delim}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`);
  const fileFooter = Buffer.from('\r\n');
  parts.push(fileHeader);
  parts.push(buffer);
  parts.push(fileFooter);

  // messaging_product field
  const mp = Buffer.from(`${delim}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`);
  parts.push(mp);

  // closing boundary
  parts.push(Buffer.from(`${ending}\r\n`));

  const bodyBuffer = Buffer.concat(parts);

  const phonePath = `/${API_VERSION}/${PHONE_NUMBER_ID}/media`;
  const phoneOptions = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: phonePath,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': bodyBuffer.length,
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(phoneOptions, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (err) => reject(err));
    req.write(bodyBuffer);
    req.end();
  });
}

async function sendTemplateWithMedia(mediaId, to) {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: TEMPLATE_NAME,
      language: { code: TEMPLATE_LANGUAGE },
      components: [
        {
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: { id: mediaId }
            }
          ]
        }
      ]
    }
  };

  const body = JSON.stringify(payload);
  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/${API_VERSION}/${PHONE_NUMBER_ID}/messages`,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    }
  };

  return await requestJson(options, body);
}

(async () => {
  console.log('Uploading media from URL:', HEADER_IMAGE_URL);
  try {
    const uploadRes = await uploadMediaFromUrl(HEADER_IMAGE_URL);
    console.log('Upload response:', JSON.stringify(uploadRes, null, 2));

    if (!uploadRes.body || uploadRes.body.error) {
      console.error('Media upload failed', uploadRes.body || uploadRes);
      process.exit(1);
    }

    const mediaId = uploadRes.body.id || uploadRes.body.media && uploadRes.body.media.id;
    if (!mediaId) {
      console.error('Could not determine media id from upload response', uploadRes.body);
      process.exit(1);
    }

    console.log('Media id obtained:', mediaId);

    for (const to of RECIPIENTS) {
      console.log('\nSending template to', to, 'with media id', mediaId);
      const sendRes = await sendTemplateWithMedia(mediaId, to);
      console.log('Send response:', JSON.stringify(sendRes, null, 2));
      await new Promise((r) => setTimeout(r, 500));
    }
  } catch (err) {
    console.error('Error during upload/send:', err);
    process.exit(1);
  }
})();
