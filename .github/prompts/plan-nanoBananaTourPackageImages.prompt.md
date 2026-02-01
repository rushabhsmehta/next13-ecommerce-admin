## Plan: AI Image Generation for Tour Packages

Add an “AI Generate” option next to the existing Tour Package image upload, so admins can type a prompt and generate images via Nano Banana Pro (using your existing Google API key), then auto-save those images into the same storage + DB fields as uploaded images. This keeps the feature consistent with your current R2 upload flow, avoids new storage logic, and makes generated images behave exactly like manually uploaded ones (reorder/delete/preview).

### Steps
1. Locate the Tour Package create/edit UI and current uploader (likely in src/app/(dashboard)/…/tour-packages/**/components and a shared uploader under src/components/**).
2. Confirm how images are stored in Prisma (single URL vs array vs Image model) by checking schema.prisma and the TourPackage create/update API route(s) in src/app/api/**/route.ts.
3. Add a new API route “generate images” (src/app/api/ai/images/route.ts) using your standard handleApi()/jsonError() pattern plus dynamic = 'force-dynamic' and admin-only auth.
4. In that route, call Nano Banana Pro (Google-backed) with a prompt + optional style params, receive image bytes/base64, then upload to R2 via the same existing upload helper/route (so you reuse naming, folders, ACL, and content-type handling).
5. Update the Tour Package form UI: add a “Generate with AI” dialog (prompt, count, aspect ratio), then insert returned URLs into the existing images list exactly like uploads.
6. Enforce domain/role restrictions: block associates from generating or mutating (use isCurrentUserAssociate()/authz guards) and ensure any errors show consistent toasts/messages.

### Further Considerations
1. Which exact provider/API is “Nano Banana Pro” in your setup (Vertex AI Imagen, Gemini image, or a vendor wrapper)? Share endpoint/docs name to match request/response.
2. Output format: store only URLs (recommended) vs also storing prompt/metadata (optional new table/fields).
3. Quotas/safety: add max images per request and prompt logging to avoid runaway usage.
