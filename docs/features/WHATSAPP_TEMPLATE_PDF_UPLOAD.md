# WhatsApp Template PDF Upload

## Overview
- Template Builder now supports uploading PDF header examples directly to Cloudflare R2.
- The upload helper returns a public URL that is automatically set as the required Meta "example" value.
- API route: `POST /api/whatsapp/templates/upload-document` (multipart form-data).

## Requirements
- Ensure the following environment variables are set (already added to `.env` / `.env.local`):
  - `CLOUDFLARE_R2_ACCOUNT_ID`
  - `CLOUDFLARE_R2_ACCESS_KEY_ID`
  - `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
  - `CLOUDFLARE_R2_BUCKET`
  - `CLOUDFLARE_R2_S3_ENDPOINT`
  - `CLOUDFLARE_R2_PUBLIC_BASE_URL`
  - `CLOUDFLARE_R2_REGION` (use `auto`)
- Optional but recommended: set `MEDIA_LIBRARY_MAX_FILE_SIZE_MB` (server) and `NEXT_PUBLIC_MEDIA_LIBRARY_MAX_FILE_SIZE_MB` (client) to keep UI + API aligned. Default is the Meta limit (100 MB).
- Bucket must allow public access through the configured R2 public domain.

## Upload Workflow
1. Add a header component in Template Builder and choose the `Document` header format.
2. Pick a PDF (`≤ 100 MB`, Meta Cloud API limit per [Cloud API media constraints](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#media-message-download-constraints)). The control validates the file type/size before upload.
3. Click **Upload PDF**. On success:
   - File is written to R2 under `whatsapp/templates/<template-slug>/<slug>-<timestamp>-<uuid>.pdf`.
   - The returned public URL is stored inside the header `example` field.
   - A copy button is shown so the URL can be re-used elsewhere if needed.
4. Use **Clear link** to remove the stored example and/or upload a replacement file.

## API Response Shape
```json
{
  "success": true,
  "document": {
    "url": "https://pub-<hash>.r2.dev/whatsapp/templates/<slug>/<file>.pdf",
    "key": "whatsapp/templates/<slug>/<file>.pdf",
    "bucket": "<bucket-name>",
    "size": 123456,
    "fileName": "brochure.pdf",
    "uploadedAt": "2025-11-12T05:30:00.000Z"
  }
}
```

## Notes
- Requests are rejected for non-PDF mimetypes, empty bodies, or files larger than `100 MB`.
- Associates remain read-only: authorization guards reuse the existing `isCurrentUserAssociate` check.
- Uploaded objects receive long-lived cache headers (`public, max-age=31536000, immutable`).
- The helper adds metadata (`source`, `uploaded-by`, `template-name`) to each object for future auditing.
