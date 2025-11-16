# Cloudflare R2 signature mismatch (PDF uploads)

If you see this error while uploading a WhatsApp template PDF:

```
The request signature we calculated does not match the signature you provided. Check your secret access key and signing method.
```

then the upload is reaching Cloudflare, but the AWS-style signature that the SDK generated (using `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY`) no longer matches what Cloudflare expects.

## What to double-check

- **Use the Access Key pair, not an API token.** R2 uploads are signed with AWS credentials. The values for `CLOUDFLARE_R2_ACCESS_KEY_ID` and `CLOUDFLARE_R2_SECRET_ACCESS_KEY` must be the ones generated under **R2 → Access keys** inside the Cloudflare dashboard. An `API token` cannot be substituted there.
- **Match the bucket/account endpoint.** `CLOUDFLARE_R2_S3_ENDPOINT` needs to be `https://<Account ID>.r2.cloudflarestorage.com` (without the bucket name), and `CLOUDFLARE_R2_BUCKET` must be the bucket that backs the `aagamholidayspdf` store. The SDK builds the request as `/bucket/key`, so both pieces have to align.
- **Avoid stray whitespace/quotes.** Environment variables should not include surrounding quotes or newline characters. Our helper trims values, but copy/pasting from a GUI that injects escapes (e.g., `"secret"`) will corrupt the signature.
- **Propagate the same secrets to your deployment.** If the upload works locally but fails in Preview/Prod, verify that the Vercel/Cloud environment variables use the exact same key pair. If you rotate keys inside Cloudflare, update every environment that uses them.
- **Rotate the key if unsure.** Regenerate the access key pair from Cloudflare, update `CLOUDFLARE_R2_ACCESS_KEY_ID` + `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, and restart the deployment.

## How our upload code signs the request

The API route at `src/app/api/whatsapp/templates/upload-document/route.ts` sends the PDF buffer to `src/lib/r2-client.ts`, which uses `@aws-sdk/client-s3` with the following configuration:

```ts
new S3Client({
  region: 'auto',
  endpoint: env(CLOUDFLARE_R2_S3_ENDPOINT),
  credentials: {
    accessKeyId: env(CLOUDFLARE_R2_ACCESS_KEY_ID),
    secretAccessKey: env(CLOUDFLARE_R2_SECRET_ACCESS_KEY),
  },
  forcePathStyle: true,
})
```

so Cloudflare expects a standard AWS4 signature for `PUT /bucket/…` requests. A mismatched key pair or an incorrect endpoint/region is what drives the `signature mismatch` response.

## Quick verification commands

To validate the pair from any machine that has the AWS CLI installed, run:

```bash
AWS_ACCESS_KEY_ID=<AccessKeyID> \
AWS_SECRET_ACCESS_KEY=<SecretAccessKey> \
AWS_DEFAULT_REGION=auto \
aws --endpoint-url=https://<AccountID>.r2.cloudflarestorage.com s3 ls <BucketName>
```

If this command succeeds, the key/secret is valid and the issue is likely an environment variable mismatch inside the deployed app.

If it fails with the same signature message, rotate the key pair via the Cloudflare dashboard and replace both values everywhere the app runs.
