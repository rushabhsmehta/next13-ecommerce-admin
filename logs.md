06:48:05.958 Running build in Washington, D.C., USA (East) – iad1
06:48:05.958 Build machine configuration: 2 cores, 8 GB
06:48:05.985 Cloning github.com/rushabhsmehta/next13-ecommerce-admin (Branch: master, Commit: 30994a7)
06:48:05.993 Skipping build cache, deployment was triggered without cache.
06:48:06.836 Cloning completed: 850.000ms
06:48:07.509 Running "vercel build"
06:48:07.909 Vercel CLI 48.6.0
06:48:08.401 Installing dependencies...
06:48:14.420 npm warn deprecated mkdirp@0.5.1: Legacy versions of mkdirp are no longer supported. Please update to mkdirp 1.x. (Note that the API surface has changed to use Promises in 1.x.)
06:48:18.526 npm warn deprecated glob@7.1.2: Glob versions prior to v9 are no longer supported
06:48:45.977 
06:48:45.977 > next13-ecommerce-admin@0.1.0 postinstall
06:48:45.977 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma
06:48:45.978 
06:48:47.450 Prisma schema loaded from schema.prisma
06:48:48.837 
06:48:48.838 ✔ Generated Prisma Client (v6.18.0, engine=none) to ./node_modules/@prisma/client in 599ms
06:48:48.838 
06:48:48.839 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
06:48:48.839 
06:48:48.839 Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
06:48:48.839 
06:48:49.938 Prisma schema loaded from prisma/whatsapp-schema.prisma
06:48:50.520 
06:48:50.521 ✔ Generated Prisma Client (v6.18.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 307ms
06:48:50.521 
06:48:50.521 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
06:48:50.521 
06:48:50.521 Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
06:48:50.521 
06:48:50.557 
06:48:50.557 added 1104 packages in 42s
06:48:50.557 
06:48:50.558 200 packages are looking for funding
06:48:50.558   run `npm fund` for details
06:48:50.606 Detected Next.js version: 13.5.7
06:48:50.607 Running "npm run vercel-build"
06:48:50.718 
06:48:50.719 > next13-ecommerce-admin@0.1.0 vercel-build
06:48:50.719 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build
06:48:50.719 
06:48:51.799 Prisma schema loaded from schema.prisma
06:48:53.163 
06:48:53.164 ✔ Generated Prisma Client (v6.18.0, engine=none) to ./node_modules/@prisma/client in 576ms
06:48:53.164 
06:48:53.164 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
06:48:53.164 
06:48:53.164 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
06:48:53.164 
06:48:54.249 Prisma schema loaded from prisma/whatsapp-schema.prisma
06:48:54.868 
06:48:54.869 ✔ Generated Prisma Client (v6.18.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 336ms
06:48:54.869 
06:48:54.869 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
06:48:54.869 
06:48:54.869 Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
06:48:54.869 
06:48:55.415 Attention: Next.js now collects completely anonymous telemetry regarding usage.
06:48:55.416 This information is used to shape Next.js' roadmap and prioritize features.
06:48:55.416 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
06:48:55.416 https://nextjs.org/telemetry
06:48:55.416 
06:48:55.494    Creating an optimized production build ...
06:49:56.125 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (101kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
06:50:35.467  ⚠ Compiled with warnings
06:50:35.468 
06:50:35.468 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.468 A Node.js API is used (setImmediate at line: 51) which is not supported in the Edge Runtime.
06:50:35.468 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
06:50:35.469 
06:50:35.469 Import trace for requested module:
06:50:35.469 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.469 ./node_modules/scheduler/index.js
06:50:35.469 ./node_modules/react-dom/cjs/react-dom.production.min.js
06:50:35.470 ./node_modules/react-dom/index.js
06:50:35.470 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
06:50:35.470 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
06:50:35.470 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
06:50:35.470 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
06:50:35.471 ./node_modules/@clerk/clerk-react/dist/esm/index.js
06:50:35.471 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
06:50:35.471 ./node_modules/@clerk/nextjs/dist/esm/index.js
06:50:35.471 
06:50:35.471 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.472 A Node.js API is used (setImmediate at line: 51) which is not supported in the Edge Runtime.
06:50:35.472 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
06:50:35.472 
06:50:35.472 Import trace for requested module:
06:50:35.472 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.473 ./node_modules/scheduler/index.js
06:50:35.473 ./node_modules/react-dom/cjs/react-dom.production.min.js
06:50:35.473 ./node_modules/react-dom/index.js
06:50:35.473 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
06:50:35.473 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
06:50:35.473 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
06:50:35.474 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
06:50:35.474 ./node_modules/@clerk/clerk-react/dist/esm/index.js
06:50:35.474 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
06:50:35.474 ./node_modules/@clerk/nextjs/dist/esm/index.js
06:50:35.474 
06:50:35.475 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.475 A Node.js API is used (MessageChannel at line: 120) which is not supported in the Edge Runtime.
06:50:35.475 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
06:50:35.475 
06:50:35.475 Import trace for requested module:
06:50:35.476 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.476 ./node_modules/scheduler/index.js
06:50:35.476 ./node_modules/react-dom/cjs/react-dom.production.min.js
06:50:35.476 ./node_modules/react-dom/index.js
06:50:35.476 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
06:50:35.477 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
06:50:35.477 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
06:50:35.481 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
06:50:35.481 ./node_modules/@clerk/clerk-react/dist/esm/index.js
06:50:35.481 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
06:50:35.490 ./node_modules/@clerk/nextjs/dist/esm/index.js
06:50:35.490 
06:50:35.491 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.491 A Node.js API is used (MessageChannel at line: 121) which is not supported in the Edge Runtime.
06:50:35.493 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
06:50:35.493 
06:50:35.493 Import trace for requested module:
06:50:35.493 ./node_modules/scheduler/cjs/scheduler.production.min.js
06:50:35.494 ./node_modules/scheduler/index.js
06:50:35.494 ./node_modules/react-dom/cjs/react-dom.production.min.js
06:50:35.495 ./node_modules/react-dom/index.js
06:50:35.495 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
06:50:35.495 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
06:50:35.495 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
06:50:35.495 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
06:50:35.495 ./node_modules/@clerk/clerk-react/dist/esm/index.js
06:50:35.496 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
06:50:35.496 ./node_modules/@clerk/nextjs/dist/esm/index.js
06:50:35.496 
06:50:35.496 ./node_modules/@clerk/shared/dist/chunk-RSOCGYTF.mjs
06:50:35.496 A Node.js API is used (MessageEvent at line: 27) which is not supported in the Edge Runtime.
06:50:35.496 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
06:50:35.496 
06:50:35.497 Import trace for requested module:
06:50:35.497 ./node_modules/@clerk/shared/dist/chunk-RSOCGYTF.mjs
06:50:35.497 ./node_modules/@clerk/shared/dist/index.mjs
06:50:35.497 ./node_modules/@clerk/clerk-react/dist/esm/components/uiComponents.js
06:50:35.497 ./node_modules/@clerk/clerk-react/dist/esm/components/index.js
06:50:35.497 ./node_modules/@clerk/clerk-react/dist/esm/index.js
06:50:35.497 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
06:50:35.498 ./node_modules/@clerk/nextjs/dist/esm/index.js
06:50:35.498 
06:50:35.498    Linting and checking validity of types ...
06:51:58.289    Collecting page data ...
06:52:07.395    Generating static pages (0/175) ...
06:52:16.025 
   Generating static pages (43/175) 
06:52:17.937 prisma:error 
06:52:17.938 Invalid `prisma.associatePartner.findMany()` invocation:
06:52:17.938 
06:52:17.938 
06:52:17.938 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:17.939 prisma:error 
06:52:17.939 Invalid `prisma.associatePartner.findMany()` invocation:
06:52:17.939 
06:52:17.939 
06:52:17.939 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:19.188 
   Generating static pages (87/175) 
06:52:19.435 prisma:error 
06:52:19.435 Invalid `prisma.mealPlan.findMany()` invocation:
06:52:19.435 
06:52:19.435 
06:52:19.435 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:19.435 prisma:error 
06:52:19.435 Invalid `prisma.mealPlan.findMany()` invocation:
06:52:19.435 
06:52:19.436 
06:52:19.436 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:19.855 prisma:error 
06:52:19.855 Invalid `prisma.occupancyType.findMany()` invocation:
06:52:19.855 
06:52:19.855 
06:52:19.855 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:19.855 prisma:error 
06:52:19.856 Invalid `prisma.occupancyType.findMany()` invocation:
06:52:19.856 
06:52:19.856 
06:52:19.856 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:19.969 prisma:error 
06:52:19.969 Invalid `prisma.pricingAttribute.findMany()` invocation:
06:52:19.969 
06:52:19.970 
06:52:19.970 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.006 prisma:error 
06:52:20.006 Invalid `prisma.pricingAttribute.findMany()` invocation:
06:52:20.006 
06:52:20.006 
06:52:20.006 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.079 prisma:error 
06:52:20.079 Invalid `prisma.pricingComponent.findMany()` invocation:
06:52:20.080 
06:52:20.080 
06:52:20.080 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.131 prisma:error 
06:52:20.136 Invalid `prisma.pricingComponent.findMany()` invocation:
06:52:20.136 
06:52:20.136 
06:52:20.137 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.246 prisma:error 
06:52:20.246 Invalid `prisma.roomType.findMany()` invocation:
06:52:20.247 
06:52:20.247 
06:52:20.247 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.247 prisma:error 
06:52:20.248 Invalid `prisma.roomType.findMany()` invocation:
06:52:20.248 
06:52:20.248 
06:52:20.248 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.326 prisma:error 
06:52:20.327 Invalid `prisma.vehicleType.findMany()` invocation:
06:52:20.327 
06:52:20.327 
06:52:20.327 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.327 prisma:error 
06:52:20.327 Invalid `prisma.vehicleType.findMany()` invocation:
06:52:20.327 
06:52:20.327 
06:52:20.327 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.355 prisma:error 
06:52:20.356 Invalid `prisma.location.findMany()` invocation:
06:52:20.356 
06:52:20.356 
06:52:20.356 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.376 prisma:error 
06:52:20.377 Invalid `prisma.location.findMany()` invocation:
06:52:20.377 
06:52:20.377 
06:52:20.377 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.406 prisma:error 
06:52:20.406 Invalid `prisma.transportPricing.findMany()` invocation:
06:52:20.406 
06:52:20.407 
06:52:20.407 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.445 prisma:error 
06:52:20.446 Invalid `prisma.transportPricing.findMany()` invocation:
06:52:20.446 
06:52:20.446 
06:52:20.446 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.469 prisma:error 
06:52:20.470 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:20.470 
06:52:20.470 
06:52:20.470 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.525 prisma:error 
06:52:20.525 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:20.526 
06:52:20.526 
06:52:20.526 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.555 prisma:error 
06:52:20.556 Invalid `prisma.activity.findMany()` invocation:
06:52:20.556 
06:52:20.556 
06:52:20.556 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.582 prisma:error 
06:52:20.582 Invalid `prisma.activity.findMany()` invocation:
06:52:20.582 
06:52:20.583 
06:52:20.583 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.607 prisma:error 
06:52:20.607 Invalid `prisma.activityMaster.findMany()` invocation:
06:52:20.608 
06:52:20.608 
06:52:20.608 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.608 prisma:error 
06:52:20.608 Invalid `prisma.activityMaster.findMany()` invocation:
06:52:20.609 
06:52:20.609 
06:52:20.609 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.651 prisma:error 
06:52:20.651 Invalid `prisma.bankAccount.findMany()` invocation:
06:52:20.651 
06:52:20.651 
06:52:20.651 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.698 prisma:error 
06:52:20.699 Invalid `prisma.bankAccount.findMany()` invocation:
06:52:20.699 
06:52:20.699 
06:52:20.699 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.740 prisma:error 
06:52:20.741 Invalid `prisma.cashAccount.findMany()` invocation:
06:52:20.741 
06:52:20.741 
06:52:20.741 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.741 prisma:error 
06:52:20.741 Invalid `prisma.cashAccount.findMany()` invocation:
06:52:20.741 
06:52:20.741 
06:52:20.741 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.783 prisma:error 
06:52:20.783 Invalid `prisma.customer.findMany()` invocation:
06:52:20.784 
06:52:20.784 
06:52:20.784 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.784 prisma:error 
06:52:20.784 Invalid `prisma.customer.findMany()` invocation:
06:52:20.784 
06:52:20.784 
06:52:20.784 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.802 prisma:error 
06:52:20.802 Invalid `prisma.customer.findMany()` invocation:
06:52:20.802 
06:52:20.803 
06:52:20.803 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.839 prisma:error 
06:52:20.840 Invalid `prisma.customer.findMany()` invocation:
06:52:20.840 
06:52:20.840 
06:52:20.840 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.914 prisma:error 
06:52:20.914 Invalid `prisma.expenseCategory.findMany()` invocation:
06:52:20.915 
06:52:20.915 
06:52:20.921 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.945 prisma:error 
06:52:20.945 Invalid `prisma.expenseCategory.findMany()` invocation:
06:52:20.945 
06:52:20.945 
06:52:20.946 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:20.967 prisma:error 
06:52:20.968 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:20.968 
06:52:20.968 
06:52:20.968 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.082 prisma:error 
06:52:21.082 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:21.082 
06:52:21.082 
06:52:21.082 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.132 prisma:error 
06:52:21.132 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:21.133 
06:52:21.133 
06:52:21.133 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.133 prisma:error 
06:52:21.133 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:21.133 
06:52:21.133 
06:52:21.133 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.161 prisma:error 
06:52:21.161 Invalid `prisma.expenseCategory.findMany()` invocation:
06:52:21.161 
06:52:21.161 
06:52:21.161 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.161 prisma:error 
06:52:21.161 Invalid `prisma.bankAccount.findMany()` invocation:
06:52:21.161 
06:52:21.161 
06:52:21.161 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.162 prisma:error 
06:52:21.162 Invalid `prisma.cashAccount.findMany()` invocation:
06:52:21.162 
06:52:21.162 
06:52:21.162 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.184 prisma:error 
06:52:21.184 Invalid `prisma.expenseCategory.findMany()` invocation:
06:52:21.184 
06:52:21.184 
06:52:21.184 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.184 prisma:error 
06:52:21.185 Invalid `prisma.bankAccount.findMany()` invocation:
06:52:21.185 
06:52:21.185 
06:52:21.185 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.185 prisma:error 
06:52:21.185 Invalid `prisma.cashAccount.findMany()` invocation:
06:52:21.185 
06:52:21.185 
06:52:21.185 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.208 prisma:error 
06:52:21.209 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:21.209 
06:52:21.209 
06:52:21.209 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.238 prisma:error 
06:52:21.239 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:21.239 
06:52:21.239 
06:52:21.239 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.367 prisma:error 
06:52:21.367 Invalid `prisma.hotel.findMany()` invocation:
06:52:21.367 
06:52:21.367 
06:52:21.368 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.368 prisma:error 
06:52:21.368 Invalid `prisma.hotel.findMany()` invocation:
06:52:21.368 
06:52:21.368 
06:52:21.368 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.391 prisma:error 
06:52:21.392 Invalid `prisma.incomeCategory.findMany()` invocation:
06:52:21.392 
06:52:21.392 
06:52:21.392 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.393 prisma:error 
06:52:21.393 Invalid `prisma.incomeCategory.findMany()` invocation:
06:52:21.393 
06:52:21.393 
06:52:21.393 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.573 prisma:error 
06:52:21.574 Invalid `prisma.incomeDetail.findMany()` invocation:
06:52:21.574 
06:52:21.574 
06:52:21.574 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.574 prisma:error 
06:52:21.574 Invalid `prisma.incomeDetail.findMany()` invocation:
06:52:21.574 
06:52:21.574 
06:52:21.574 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.701 prisma:error 
06:52:21.703 Invalid `prisma.itinerary.findMany()` invocation:
06:52:21.703 
06:52:21.703 
06:52:21.703 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:21.703 prisma:error 
06:52:21.703 Invalid `prisma.itinerary.findMany()` invocation:
06:52:21.703 
06:52:21.703 
06:52:21.704 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:22.857 prisma:error 
06:52:22.857 Invalid `prisma.itineraryMaster.findMany()` invocation:
06:52:22.857 
06:52:22.857 
06:52:22.858 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:22.858 prisma:error 
06:52:22.858 Invalid `prisma.itineraryMaster.findMany()` invocation:
06:52:22.858 
06:52:22.858 
06:52:22.858 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:22.915 prisma:error 
06:52:22.915 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:22.915 
06:52:22.915 
06:52:22.915 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:22.915 prisma:error 
06:52:22.915 Invalid `prisma.expenseDetail.findMany()` invocation:
06:52:22.915 
06:52:22.915 
06:52:22.915 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:22.958 prisma:error 
06:52:22.958 Invalid `prisma.location.findMany()` invocation:
06:52:22.958 
06:52:22.958 
06:52:22.958 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:22.958 prisma:error 
06:52:22.958 Invalid `prisma.location.findMany()` invocation:
06:52:22.959 
06:52:22.959 
06:52:22.959 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:23.334 prisma:error 
06:52:23.335 Invalid `prisma.location.findMany()` invocation:
06:52:23.335 
06:52:23.335 
06:52:23.335 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:23.335 prisma:error 
06:52:23.335 Invalid `prisma.location.findMany()` invocation:
06:52:23.335 
06:52:23.335 
06:52:23.335 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:24.393 prisma:error 
06:52:24.393 Invalid `prisma.supplier.findMany()` invocation:
06:52:24.393 
06:52:24.393 
06:52:24.393 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:24.393 prisma:error 
06:52:24.393 Invalid `prisma.supplier.findMany()` invocation:
06:52:24.393 
06:52:24.394 
06:52:24.394 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:24.610 prisma:error 
06:52:24.612 Invalid `prisma.paymentDetail.findMany()` invocation:
06:52:24.612 
06:52:24.613 
06:52:24.613 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:24.613 prisma:error 
06:52:24.613 Invalid `prisma.paymentDetail.findMany()` invocation:
06:52:24.613 
06:52:24.614 
06:52:24.614 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.202 prisma:error 
06:52:25.203 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.203 
06:52:25.203 
06:52:25.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.203 prisma:error 
06:52:25.203 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:25.203 
06:52:25.203 
06:52:25.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.203 prisma:error 
06:52:25.203 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:25.203 
06:52:25.203 
06:52:25.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.203 prisma:error 
06:52:25.203 Invalid `prisma.supplier.findMany()` invocation:
06:52:25.203 
06:52:25.203 
06:52:25.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.204 prisma:error 
06:52:25.204 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.204 
06:52:25.204 
06:52:25.204 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.204 prisma:error 
06:52:25.204 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:25.204 
06:52:25.204 
06:52:25.204 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.204 prisma:error 
06:52:25.204 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:25.204 
06:52:25.204 
06:52:25.204 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.204 prisma:error 
06:52:25.204 Invalid `prisma.supplier.findMany()` invocation:
06:52:25.204 
06:52:25.204 
06:52:25.204 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.205 [GET_PURCHASES] PrismaClientKnownRequestError: 
06:52:25.206 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.206 
06:52:25.206 
06:52:25.206 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.206     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.206     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.206     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.206     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.206     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
06:52:25.206     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
06:52:25.206   code: 'P6001',
06:52:25.206   meta: { modelName: 'PurchaseDetail' },
06:52:25.206   clientVersion: '6.18.0'
06:52:25.206 }
06:52:25.206 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
06:52:25.206 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:25.206 
06:52:25.206 
06:52:25.206 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.206     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.207     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.207     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.207     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.207     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
06:52:25.207     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
06:52:25.207   code: 'P6001',
06:52:25.207   meta: { modelName: 'TaxSlab' },
06:52:25.207   clientVersion: '6.18.0'
06:52:25.207 }
06:52:25.207 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
06:52:25.207 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:25.207 
06:52:25.207 
06:52:25.207 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.207     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.207     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.207     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.207     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.207     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
06:52:25.207     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
06:52:25.207   code: 'P6001',
06:52:25.207   meta: { modelName: 'UnitOfMeasure' },
06:52:25.207   clientVersion: '6.18.0'
06:52:25.207 }
06:52:25.207 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
06:52:25.207 Invalid `prisma.supplier.findMany()` invocation:
06:52:25.207 
06:52:25.207 
06:52:25.207 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.207     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.207     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.207     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.207     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.207     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
06:52:25.208     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
06:52:25.208   code: 'P6001',
06:52:25.208   meta: { modelName: 'Supplier' },
06:52:25.208   clientVersion: '6.18.0'
06:52:25.208 }
06:52:25.208 [GET_PURCHASES] PrismaClientKnownRequestError: 
06:52:25.208 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.208 
06:52:25.208 
06:52:25.208 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.208     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.208     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.208     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.208     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.208     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
06:52:25.208     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
06:52:25.208   code: 'P6001',
06:52:25.208   meta: { modelName: 'PurchaseDetail' },
06:52:25.208   clientVersion: '6.18.0'
06:52:25.208 }
06:52:25.208 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
06:52:25.208 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:25.208 
06:52:25.208 
06:52:25.208 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.208     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.208     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.208     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.208     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.208     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
06:52:25.208     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
06:52:25.209   code: 'P6001',
06:52:25.209   meta: { modelName: 'TaxSlab' },
06:52:25.209   clientVersion: '6.18.0'
06:52:25.209 }
06:52:25.209 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
06:52:25.209 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:25.209 
06:52:25.209 
06:52:25.209 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.209     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.210     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.210     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.210     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.210     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
06:52:25.210     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
06:52:25.210   code: 'P6001',
06:52:25.210   meta: { modelName: 'UnitOfMeasure' },
06:52:25.210   clientVersion: '6.18.0'
06:52:25.210 }
06:52:25.210 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
06:52:25.210 Invalid `prisma.supplier.findMany()` invocation:
06:52:25.210 
06:52:25.210 
06:52:25.210 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.210     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.210     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.210     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.210     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.210     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
06:52:25.210     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
06:52:25.210   code: 'P6001',
06:52:25.210   meta: { modelName: 'Supplier' },
06:52:25.210   clientVersion: '6.18.0'
06:52:25.210 }
06:52:25.279 prisma:error 
06:52:25.280 Invalid `prisma.purchaseReturn.findMany()` invocation:
06:52:25.280 
06:52:25.280 
06:52:25.280 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.281 prisma:error 
06:52:25.281 Invalid `prisma.purchaseReturn.findMany()` invocation:
06:52:25.281 
06:52:25.281 
06:52:25.281 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.282 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
06:52:25.282 Invalid `prisma.purchaseReturn.findMany()` invocation:
06:52:25.282 
06:52:25.282 
06:52:25.282 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.282     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.282     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.283     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.283     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.283     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
06:52:25.283     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
06:52:25.283   code: 'P6001',
06:52:25.283   meta: { modelName: 'PurchaseReturn' },
06:52:25.283   clientVersion: '6.18.0'
06:52:25.284 }
06:52:25.284 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
06:52:25.284 Invalid `prisma.purchaseReturn.findMany()` invocation:
06:52:25.284 
06:52:25.284 
06:52:25.284 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.284     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.285     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.285     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.285     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.285     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
06:52:25.285     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
06:52:25.285   code: 'P6001',
06:52:25.285   meta: { modelName: 'PurchaseReturn' },
06:52:25.286   clientVersion: '6.18.0'
06:52:25.286 }
06:52:25.286 
   Generating static pages (131/175) 
06:52:25.505 prisma:error 
06:52:25.507 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.515 
06:52:25.515 
06:52:25.515 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.515 prisma:error 
06:52:25.515 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.515 
06:52:25.515 
06:52:25.515 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.515 Error in PurchasesPage: PrismaClientKnownRequestError: 
06:52:25.515 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.515 
06:52:25.515 
06:52:25.516 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.516     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.516     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.516     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.516     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.516     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
06:52:25.516   code: 'P6001',
06:52:25.516   meta: { modelName: 'PurchaseDetail' },
06:52:25.516   clientVersion: '6.18.0'
06:52:25.516 }
06:52:25.516 Error in PurchasesPage: PrismaClientKnownRequestError: 
06:52:25.516 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.516 
06:52:25.516 
06:52:25.542 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.542     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:25.542     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:25.542     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:25.543     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:25.543     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
06:52:25.543   code: 'P6001',
06:52:25.543   meta: { modelName: 'PurchaseDetail' },
06:52:25.543   clientVersion: '6.18.0'
06:52:25.543 }
06:52:25.742 prisma:error 
06:52:25.742 Invalid `prisma.supplier.findMany()` invocation:
06:52:25.743 
06:52:25.743 
06:52:25.744 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.744 prisma:error 
06:52:25.744 Invalid `prisma.supplier.findMany()` invocation:
06:52:25.744 
06:52:25.747 
06:52:25.747 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.842 prisma:error 
06:52:25.843 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.843 
06:52:25.843 
06:52:25.843 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.843 prisma:error 
06:52:25.843 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:25.843 
06:52:25.843 
06:52:25.843 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.930 prisma:error 
06:52:25.930 Invalid `prisma.customer.findMany()` invocation:
06:52:25.930 
06:52:25.930 
06:52:25.930 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:25.930 prisma:error 
06:52:25.930 Invalid `prisma.customer.findMany()` invocation:
06:52:25.930 
06:52:25.930 
06:52:25.930 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:26.151 prisma:error 
06:52:26.151 Invalid `prisma.receiptDetail.findMany()` invocation:
06:52:26.151 
06:52:26.151 
06:52:26.151 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:26.152 prisma:error 
06:52:26.152 Invalid `prisma.receiptDetail.findMany()` invocation:
06:52:26.152 
06:52:26.154 
06:52:26.154 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:26.809 prisma:error 
06:52:26.810 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:26.810 
06:52:26.811 
06:52:26.811 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:26.811 prisma:error 
06:52:26.812 Invalid `prisma.purchaseDetail.findMany()` invocation:
06:52:26.812 
06:52:26.812 
06:52:26.813 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.104 prisma:error 
06:52:27.106 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:27.106 
06:52:27.106 
06:52:27.106 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.107 prisma:error 
06:52:27.107 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:27.107 
06:52:27.107 
06:52:27.108 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.134 prisma:error 
06:52:27.134 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:27.135 
06:52:27.135 
06:52:27.135 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.135 prisma:error 
06:52:27.135 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:27.135 
06:52:27.135 
06:52:27.135 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.284 prisma:error 
06:52:27.284 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.284 
06:52:27.284 
06:52:27.284 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.284 prisma:error 
06:52:27.284 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:27.284 
06:52:27.284 
06:52:27.284 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.285 prisma:error 
06:52:27.285 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:27.285 
06:52:27.285 
06:52:27.285 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.285 prisma:error 
06:52:27.285 Invalid `prisma.customer.findMany()` invocation:
06:52:27.285 
06:52:27.285 
06:52:27.285 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.285 prisma:error 
06:52:27.285 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.285 
06:52:27.285 
06:52:27.285 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.285 prisma:error 
06:52:27.285 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:27.286 
06:52:27.286 
06:52:27.286 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.286 prisma:error 
06:52:27.286 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:27.286 
06:52:27.286 
06:52:27.286 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.286 prisma:error 
06:52:27.286 Invalid `prisma.customer.findMany()` invocation:
06:52:27.286 
06:52:27.286 
06:52:27.286 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.287 [GET_SALES] PrismaClientKnownRequestError: 
06:52:27.287 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.287 
06:52:27.287 
06:52:27.287 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.287     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.287     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.287     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.287     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.287     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
06:52:27.287     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
06:52:27.287   code: 'P6001',
06:52:27.288   meta: { modelName: 'SaleDetail' },
06:52:27.288   clientVersion: '6.18.0'
06:52:27.288 }
06:52:27.288 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
06:52:27.288 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:27.288 
06:52:27.288 
06:52:27.288 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.288     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.288     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.288     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.288     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.288     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
06:52:27.288     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
06:52:27.288   code: 'P6001',
06:52:27.288   meta: { modelName: 'TaxSlab' },
06:52:27.289   clientVersion: '6.18.0'
06:52:27.289 }
06:52:27.289 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
06:52:27.289 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:27.289 
06:52:27.289 
06:52:27.289 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.289     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.289     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.289     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.289     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.289     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
06:52:27.289     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
06:52:27.289   code: 'P6001',
06:52:27.289   meta: { modelName: 'UnitOfMeasure' },
06:52:27.289   clientVersion: '6.18.0'
06:52:27.289 }
06:52:27.290 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
06:52:27.290 Invalid `prisma.customer.findMany()` invocation:
06:52:27.290 
06:52:27.290 
06:52:27.290 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.291     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.291     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.291     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.291     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.291     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
06:52:27.291     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
06:52:27.291   code: 'P6001',
06:52:27.291   meta: { modelName: 'Customer' },
06:52:27.291   clientVersion: '6.18.0'
06:52:27.291 }
06:52:27.291 [GET_SALES] PrismaClientKnownRequestError: 
06:52:27.291 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.291 
06:52:27.291 
06:52:27.291 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.292     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.292     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.292     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.292     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.292     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
06:52:27.292     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
06:52:27.292   code: 'P6001',
06:52:27.292   meta: { modelName: 'SaleDetail' },
06:52:27.292   clientVersion: '6.18.0'
06:52:27.292 }
06:52:27.292 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
06:52:27.292 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:27.292 
06:52:27.292 
06:52:27.292 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.292     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.292     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.292     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.292     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.292     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
06:52:27.292     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
06:52:27.293   code: 'P6001',
06:52:27.293   meta: { modelName: 'TaxSlab' },
06:52:27.293   clientVersion: '6.18.0'
06:52:27.293 }
06:52:27.293 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
06:52:27.293 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:27.293 
06:52:27.293 
06:52:27.293 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.293     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.293     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.293     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.293     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.293     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
06:52:27.293     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
06:52:27.293   code: 'P6001',
06:52:27.293   meta: { modelName: 'UnitOfMeasure' },
06:52:27.293   clientVersion: '6.18.0'
06:52:27.293 }
06:52:27.293 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
06:52:27.293 Invalid `prisma.customer.findMany()` invocation:
06:52:27.293 
06:52:27.293 
06:52:27.293 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.293     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.293     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.293     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.293     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.293     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
06:52:27.293     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
06:52:27.293   code: 'P6001',
06:52:27.293   meta: { modelName: 'Customer' },
06:52:27.293   clientVersion: '6.18.0'
06:52:27.293 }
06:52:27.326 prisma:error 
06:52:27.326 Invalid `prisma.saleReturn.findMany()` invocation:
06:52:27.326 
06:52:27.326 
06:52:27.326 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.326 prisma:error 
06:52:27.326 Invalid `prisma.saleReturn.findMany()` invocation:
06:52:27.326 
06:52:27.326 
06:52:27.326 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.327 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
06:52:27.327 Invalid `prisma.saleReturn.findMany()` invocation:
06:52:27.327 
06:52:27.327 
06:52:27.327 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.327     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.327     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.327     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.327     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.327     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
06:52:27.327     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
06:52:27.327   code: 'P6001',
06:52:27.327   meta: { modelName: 'SaleReturn' },
06:52:27.327   clientVersion: '6.18.0'
06:52:27.327 }
06:52:27.327 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
06:52:27.327 Invalid `prisma.saleReturn.findMany()` invocation:
06:52:27.328 
06:52:27.328 
06:52:27.328 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.328     at bl.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:7270)
06:52:27.328     at bl.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6594)
06:52:27.328     at bl.request (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:258:6301)
06:52:27.328     at async o (/vercel/path0/node_modules/@prisma/client/runtime/binary.js:267:9560)
06:52:27.328     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
06:52:27.328     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
06:52:27.329   code: 'P6001',
06:52:27.330   meta: { modelName: 'SaleReturn' },
06:52:27.330   clientVersion: '6.18.0'
06:52:27.330 }
06:52:27.376 prisma:error 
06:52:27.386 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.386 
06:52:27.386 
06:52:27.386 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.386 prisma:error 
06:52:27.386 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.386 
06:52:27.386 
06:52:27.386 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.418 prisma:error 
06:52:27.418 Invalid `prisma.customer.findMany()` invocation:
06:52:27.418 
06:52:27.419 
06:52:27.419 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.437 prisma:error 
06:52:27.438 Invalid `prisma.customer.findMany()` invocation:
06:52:27.438 
06:52:27.438 
06:52:27.438 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.468 prisma:error 
06:52:27.469 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.469 
06:52:27.469 
06:52:27.469 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.491 prisma:error 
06:52:27.491 Invalid `prisma.saleDetail.findMany()` invocation:
06:52:27.491 
06:52:27.491 
06:52:27.491 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.523 prisma:error 
06:52:27.523 Invalid `prisma.organization.findFirst()` invocation:
06:52:27.524 
06:52:27.524 
06:52:27.524 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.524 prisma:error 
06:52:27.524 Invalid `prisma.organization.findFirst()` invocation:
06:52:27.524 
06:52:27.524 
06:52:27.524 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.540 prisma:error 
06:52:27.540 Invalid `prisma.organization.findFirst()` invocation:
06:52:27.540 
06:52:27.540 
06:52:27.540 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.559 prisma:error 
06:52:27.559 Invalid `prisma.organization.findFirst()` invocation:
06:52:27.559 
06:52:27.559 
06:52:27.559 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.592 prisma:error 
06:52:27.592 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:27.593 
06:52:27.593 
06:52:27.593 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.593 prisma:error 
06:52:27.593 Invalid `prisma.taxSlab.findMany()` invocation:
06:52:27.593 
06:52:27.594 
06:52:27.594 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.608 prisma:error 
06:52:27.608 Invalid `prisma.tDSMaster.findMany()` invocation:
06:52:27.608 
06:52:27.608 
06:52:27.609 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.629 prisma:error 
06:52:27.629 Invalid `prisma.tDSMaster.findMany()` invocation:
06:52:27.630 
06:52:27.630 
06:52:27.630 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.689 prisma:error 
06:52:27.690 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:27.690 
06:52:27.690 
06:52:27.690 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.690 prisma:error 
06:52:27.691 Invalid `prisma.unitOfMeasure.findMany()` invocation:
06:52:27.691 
06:52:27.691 
06:52:27.691 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.718 prisma:error 
06:52:27.719 Invalid `prisma.supplier.findMany()` invocation:
06:52:27.719 
06:52:27.719 
06:52:27.719 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.719 prisma:error 
06:52:27.719 Invalid `prisma.supplier.findMany()` invocation:
06:52:27.719 
06:52:27.719 
06:52:27.719 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.736 prisma:error 
06:52:27.736 Invalid `prisma.supplier.findMany()` invocation:
06:52:27.736 
06:52:27.736 
06:52:27.736 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.817 prisma:error 
06:52:27.817 Invalid `prisma.supplier.findMany()` invocation:
06:52:27.822 
06:52:27.822 
06:52:27.822 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.916 prisma:error 
06:52:27.916 Invalid `prisma.tourPackage.findMany()` invocation:
06:52:27.916 
06:52:27.916 
06:52:27.921 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.944 prisma:error 
06:52:27.945 Invalid `prisma.tourPackage.findMany()` invocation:
06:52:27.945 
06:52:27.948 
06:52:27.948 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.971 prisma:error 
06:52:27.971 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:27.971 
06:52:27.972 
06:52:27.972 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:27.989 prisma:error 
06:52:27.989 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:27.989 
06:52:27.989 
06:52:27.989 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.026 prisma:error 
06:52:28.027 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:28.027 
06:52:28.027 
06:52:28.027 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.027 prisma:error 
06:52:28.027 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:28.027 
06:52:28.027 
06:52:28.027 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.067 prisma:error 
06:52:28.067 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:28.067 
06:52:28.067 
06:52:28.067 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.067 prisma:error 
06:52:28.067 Invalid `prisma.tourPackageQuery.findMany()` invocation:
06:52:28.067 
06:52:28.067 
06:52:28.067 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.084 prisma:error 
06:52:28.084 Invalid `prisma.tourPackage.findMany()` invocation:
06:52:28.085 
06:52:28.085 
06:52:28.085 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.103 prisma:error 
06:52:28.103 Invalid `prisma.tourPackage.findMany()` invocation:
06:52:28.103 
06:52:28.104 
06:52:28.104 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.117 prisma:error 
06:52:28.117 Invalid `prisma.location.findMany()` invocation:
06:52:28.117 
06:52:28.117 
06:52:28.117 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.117 prisma:error 
06:52:28.117 Invalid `prisma.tourPackage.findMany()` invocation:
06:52:28.117 
06:52:28.117 
06:52:28.117 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.146 prisma:error 
06:52:28.147 Invalid `prisma.location.findMany()` invocation:
06:52:28.147 
06:52:28.147 
06:52:28.147 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.147 prisma:error 
06:52:28.147 Invalid `prisma.tourPackage.findMany()` invocation:
06:52:28.147 
06:52:28.147 
06:52:28.147 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.164 prisma:error 
06:52:28.165 Invalid `prisma.transfer.findMany()` invocation:
06:52:28.165 
06:52:28.165 
06:52:28.165 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.191 prisma:error 
06:52:28.191 Invalid `prisma.transfer.findMany()` invocation:
06:52:28.192 
06:52:28.192 
06:52:28.192 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
06:52:28.623 
 ✓ Generating static pages (175/175) 
06:52:28.640 SIGINT received - disconnecting Prisma Client
06:52:28.712    Finalizing page optimization ...
06:52:28.712    Collecting build traces ...
06:52:31.558 
06:52:31.649 Route (app)                                                               Size     First Load JS
06:52:31.649 ┌ λ /                                                                     1.6 kB         82.5 kB
06:52:31.650 ├ λ /_not-found                                                           0 B                0 B
06:52:31.650 ├ λ /accounts                                                             6.96 kB         153 kB
06:52:31.650 ├ λ /accounts/[tourPackageQueryId]                                        13.1 kB         245 kB
06:52:31.650 ├ λ /activities                                                           11.2 kB         183 kB
06:52:31.650 ├ λ /activities/[activityId]                                              6.28 kB         220 kB
06:52:31.650 ├ λ /activitiesMaster                                                     11.2 kB         183 kB
06:52:31.651 ├ λ /activitiesMaster/[activityMasterId]                                  6.29 kB         220 kB
06:52:31.651 ├ λ /api/activities                                                       0 B                0 B
06:52:31.651 ├ λ /api/activities/[activityId]                                          0 B                0 B
06:52:31.652 ├ λ /api/activitiesMaster                                                 0 B                0 B
06:52:31.652 ├ λ /api/activitiesMaster/[activityMasterId]                              0 B                0 B
06:52:31.652 ├ λ /api/associate-partners                                               0 B                0 B
06:52:31.652 ├ λ /api/associate-partners/[associatePartnerId]                          0 B                0 B
06:52:31.652 ├ λ /api/associate-partners/me                                            0 B                0 B
06:52:31.652 ├ λ /api/associate-performance                                            0 B                0 B
06:52:31.652 ├ λ /api/audit-logs                                                       0 B                0 B
06:52:31.652 ├ λ /api/bank-accounts                                                    0 B                0 B
06:52:31.652 ├ λ /api/bank-accounts/[bankAccountId]                                    0 B                0 B
06:52:31.652 ├ λ /api/bank-accounts/[bankAccountId]/recalculate                        0 B                0 B
06:52:31.652 ├ λ /api/bank-accounts/[bankAccountId]/transactions                       0 B                0 B
06:52:31.652 ├ λ /api/bank-accounts/recalculate-all                                    0 B                0 B
06:52:31.652 ├ λ /api/cash-accounts                                                    0 B                0 B
06:52:31.653 ├ λ /api/cash-accounts/[cashAccountId]                                    0 B                0 B
06:52:31.653 ├ λ /api/cash-accounts/[cashAccountId]/recalculate                        0 B                0 B
06:52:31.653 ├ λ /api/cash-accounts/[cashAccountId]/transactions                       0 B                0 B
06:52:31.653 ├ λ /api/cash-accounts/recalculate-all                                    0 B                0 B
06:52:31.653 ├ λ /api/config/meal-plans                                                0 B                0 B
06:52:31.653 ├ λ /api/config/occupancy-types                                           0 B                0 B
06:52:31.653 ├ λ /api/config/room-types                                                0 B                0 B
06:52:31.653 ├ λ /api/config/vehicle-types                                             0 B                0 B
06:52:31.653 ├ λ /api/customers                                                        0 B                0 B
06:52:31.653 ├ λ /api/customers/[customerId]                                           0 B                0 B
06:52:31.653 ├ λ /api/debug-whatsapp                                                   0 B                0 B
06:52:31.653 ├ ○ /api/debug/env-check                                                  0 B                0 B
06:52:31.653 ├ λ /api/destinations                                                     0 B                0 B
06:52:31.654 ├ λ /api/destinations/[destinationId]                                     0 B                0 B
06:52:31.654 ├ λ /api/expense-categories                                               0 B                0 B
06:52:31.654 ├ λ /api/expense-categories/[categoryId]                                  0 B                0 B
06:52:31.654 ├ λ /api/expenses                                                         0 B                0 B
06:52:31.654 ├ λ /api/expenses/[expenseId]                                             0 B                0 B
06:52:31.654 ├ λ /api/expenses/[expenseId]/pay                                         0 B                0 B
06:52:31.654 ├ λ /api/expenses/accrued                                                 0 B                0 B
06:52:31.654 ├ λ /api/export/inquiries-contacts                                        0 B                0 B
06:52:31.654 ├ λ /api/export/queries-contacts                                          0 B                0 B
06:52:31.654 ├ λ /api/financial-records                                                0 B                0 B
06:52:31.654 ├ λ /api/flight-tickets                                                   0 B                0 B
06:52:31.654 ├ λ /api/flight-tickets/[pnr]                                             0 B                0 B
06:52:31.655 ├ λ /api/generate-pdf                                                     0 B                0 B
06:52:31.655 ├ λ /api/hotels                                                           0 B                0 B
06:52:31.655 ├ λ /api/hotels/[hotelId]                                                 0 B                0 B
06:52:31.655 ├ λ /api/hotels/[hotelId]/pricing                                         0 B                0 B
06:52:31.656 ├ λ /api/hotels/[hotelId]/pricing/[pricingId]                             0 B                0 B
06:52:31.656 ├ λ /api/income-categories                                                0 B                0 B
06:52:31.656 ├ λ /api/income-categories/[categoryId]                                   0 B                0 B
06:52:31.656 ├ λ /api/incomes                                                          0 B                0 B
06:52:31.656 ├ λ /api/incomes/[incomeId]                                               0 B                0 B
06:52:31.656 ├ λ /api/inquiries                                                        0 B                0 B
06:52:31.656 ├ λ /api/inquiries/[inquiryId]                                            0 B                0 B
06:52:31.656 ├ λ /api/inquiries/[inquiryId]/actions                                    0 B                0 B
06:52:31.656 ├ λ /api/inquiries/[inquiryId]/actions/[actionId]                         0 B                0 B
06:52:31.656 ├ λ /api/inquiries/[inquiryId]/assign-staff                               0 B                0 B
06:52:31.656 ├ λ /api/inquiries/[inquiryId]/status                                     0 B                0 B
06:52:31.656 ├ λ /api/inquiries/[inquiryId]/unassign-staff                             0 B                0 B
06:52:31.656 ├ λ /api/inquiry-summary                                                  0 B                0 B
06:52:31.656 ├ λ /api/itineraries                                                      0 B                0 B
06:52:31.657 ├ λ /api/itineraries/[itineraryId]                                        0 B                0 B
06:52:31.657 ├ λ /api/itinerariesMaster                                                0 B                0 B
06:52:31.657 ├ λ /api/itinerariesMaster/[itineraryMasterId]                            0 B                0 B
06:52:31.657 ├ λ /api/itineraryMaster                                                  0 B                0 B
06:52:31.657 ├ λ /api/locationBySlug/[slug]                                            0 B                0 B
06:52:31.657 ├ λ /api/locations                                                        0 B                0 B
06:52:31.657 ├ λ /api/locations-suppliers                                              0 B                0 B
06:52:31.657 ├ λ /api/locations/[locationId]                                           0 B                0 B
06:52:31.657 ├ λ /api/locations/[locationId]/seasonal-periods                          0 B                0 B
06:52:31.657 ├ λ /api/locations/[locationId]/seasonal-periods/[periodId]               0 B                0 B
06:52:31.657 ├ λ /api/me/role                                                          0 B                0 B
06:52:31.657 ├ λ /api/meal-plans                                                       0 B                0 B
06:52:31.657 ├ λ /api/meal-plans/[mealPlanId]                                          0 B                0 B
06:52:31.657 ├ λ /api/notifications                                                    0 B                0 B
06:52:31.658 ├ λ /api/notifications/[notificationId]                                   0 B                0 B
06:52:31.658 ├ λ /api/notifications/mark-all-read                                      0 B                0 B
06:52:31.658 ├ λ /api/occupancy-types                                                  0 B                0 B
06:52:31.658 ├ λ /api/occupancy-types/[occupancyTypeId]                                0 B                0 B
06:52:31.658 ├ λ /api/operational-staff                                                0 B                0 B
06:52:31.658 ├ λ /api/operational-staff/[staffId]                                      0 B                0 B
06:52:31.658 ├ λ /api/ops/my-inquiries                                                 0 B                0 B
06:52:31.658 ├ λ /api/ops/my-inquiries/[inquiryId]                                     0 B                0 B
06:52:31.659 ├ λ /api/package-variants                                                 0 B                0 B
06:52:31.659 ├ λ /api/package-variants/[variantId]                                     0 B                0 B
06:52:31.659 ├ λ /api/package-variants/[variantId]/hotel-mappings                      0 B                0 B
06:52:31.659 ├ λ /api/payments                                                         0 B                0 B
06:52:31.659 ├ λ /api/payments/[paymentId]                                             0 B                0 B
06:52:31.659 ├ λ /api/pricing-attributes                                               0 B                0 B
06:52:31.660 ├ λ /api/pricing-attributes/[pricingAttributeId]                          0 B                0 B
06:52:31.660 ├ λ /api/pricing-components                                               0 B                0 B
06:52:31.660 ├ λ /api/pricing-components/[pricingComponentId]                          0 B                0 B
06:52:31.660 ├ λ /api/pricing/calculate                                                0 B                0 B
06:52:31.662 ├ ○ /api/public-debug                                                     0 B                0 B
06:52:31.662 ├ λ /api/purchase-returns                                                 0 B                0 B
06:52:31.662 ├ λ /api/purchase-returns/[purchaseReturnId]                              0 B                0 B
06:52:31.662 ├ λ /api/purchases                                                        0 B                0 B
06:52:31.663 ├ λ /api/purchases/[purchaseId]                                           0 B                0 B
06:52:31.663 ├ λ /api/receipts                                                         0 B                0 B
06:52:31.663 ├ λ /api/receipts/[receiptId]                                             0 B                0 B
06:52:31.663 ├ λ /api/report/tds/summary                                               0 B                0 B
06:52:31.663 ├ λ /api/room-types                                                       0 B                0 B
06:52:31.663 ├ λ /api/room-types/[roomTypeId]                                          0 B                0 B
06:52:31.673 ├ λ /api/sale-returns                                                     0 B                0 B
06:52:31.674 ├ λ /api/sale-returns/[saleReturnId]                                      0 B                0 B
06:52:31.674 ├ λ /api/sales                                                            0 B                0 B
06:52:31.674 ├ λ /api/sales/[saleId]                                                   0 B                0 B
06:52:31.674 ├ λ /api/sales/[saleId]/items                                             0 B                0 B
06:52:31.674 ├ λ /api/searchTermLocations/[searchTerm]                                 0 B                0 B
06:52:31.674 ├ λ /api/settings/organization                                            0 B                0 B
06:52:31.674 ├ λ /api/settings/organization/[organizationId]                           0 B                0 B
06:52:31.674 ├ λ /api/settings/tax-slabs                                               0 B                0 B
06:52:31.674 ├ λ /api/settings/tax-slabs/[taxSlabId]                                   0 B                0 B
06:52:31.674 ├ λ /api/settings/tds-sections                                            0 B                0 B
06:52:31.675 ├ λ /api/settings/tds-sections/[id]                                       0 B                0 B
06:52:31.675 ├ λ /api/settings/units                                                   0 B                0 B
06:52:31.675 ├ λ /api/settings/units/[unitId]                                          0 B                0 B
06:52:31.675 ├ λ /api/suppliers                                                        0 B                0 B
06:52:31.675 ├ λ /api/suppliers/[supplierId]                                           0 B                0 B
06:52:31.675 ├ λ /api/tds/challans                                                     0 B                0 B
06:52:31.675 ├ λ /api/tds/deposit                                                      0 B                0 B
06:52:31.675 ├ λ /api/tds/transactions                                                 0 B                0 B
06:52:31.675 ├ ○ /api/test-env                                                         0 B                0 B
06:52:31.675 ├ λ /api/tourPackageBySlug/[slug]                                         0 B                0 B
06:52:31.675 ├ λ /api/tourPackageQuery                                                 0 B                0 B
06:52:31.675 ├ λ /api/tourPackageQuery/[tourPackageQueryId]                            0 B                0 B
06:52:31.675 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/accounting                 0 B                0 B
06:52:31.675 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/confirm                    0 B                0 B
06:52:31.675 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/hotel-details              0 B                0 B
06:52:31.676 ├ λ /api/tourPackages                                                     0 B                0 B
06:52:31.676 ├ λ /api/tourPackages/[tourPackageId]                                     0 B                0 B
06:52:31.676 ├ λ /api/tourPackages/[tourPackageId]/field-update                        0 B                0 B
06:52:31.676 ├ λ /api/tourPackages/[tourPackageId]/pricing                             0 B                0 B
06:52:31.676 ├ λ /api/tourPackages/[tourPackageId]/pricing/[pricingId]                 0 B                0 B
06:52:31.676 ├ λ /api/tourPackages/[tourPackageId]/related                             0 B                0 B
06:52:31.676 ├ λ /api/tourPackages/reorder                                             0 B                0 B
06:52:31.676 ├ λ /api/tourPackagesForWebsite                                           0 B                0 B
06:52:31.676 ├ λ /api/transfers                                                        0 B                0 B
06:52:31.676 ├ λ /api/transfers/[transferId]                                           0 B                0 B
06:52:31.676 ├ λ /api/transport-pricing                                                0 B                0 B
06:52:31.676 ├ λ /api/transport-pricing/[transportPricingId]                           0 B                0 B
06:52:31.676 ├ λ /api/uploads/images                                                   0 B                0 B
06:52:31.676 ├ λ /api/vehicle-types                                                    0 B                0 B
06:52:31.676 ├ λ /api/vehicle-types/[vehicleTypeId]                                    0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/campaigns                                               0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/campaigns/[id]                                          0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/campaigns/[id]/recipients                               0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/campaigns/[id]/send                                     0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/campaigns/[id]/stats                                    0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/catalog                                                 0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/catalog/packages                                        0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/catalog/packages/[packageId]                            0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/catalog/packages/[packageId]/sync                       0 B                0 B
06:52:31.677 ├ ○ /api/whatsapp/config                                                  0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/customers                                               0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/customers/[id]                                          0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/customers/export                                        0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/customers/import                                        0 B                0 B
06:52:31.677 ├ λ /api/whatsapp/database-health                                         0 B                0 B
06:52:31.678 ├ ○ /api/whatsapp/env-check                                               0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/flow-endpoint                                           0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/flows/manage                                            0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/flows/templates                                         0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/flows/versions                                          0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/media/[mediaId]                                         0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/messages                                                0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/send                                                    0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/send-message                                            0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/send-template                                           0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/templates                                               0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/templates/create                                        0 B                0 B
06:52:31.678 ├ λ /api/whatsapp/templates/manage                                        0 B                0 B
06:52:31.679 ├ λ /api/whatsapp/templates/preview                                       0 B                0 B
06:52:31.679 ├ ○ /api/whatsapp/test-key                                                0 B                0 B
06:52:31.679 ├ λ /api/whatsapp/webhook                                                 0 B                0 B
06:52:31.679 ├ λ /associate-partners                                                   10.2 kB         187 kB
06:52:31.679 ├ λ /associate-partners/[associatePartnerId]                              7.35 kB         172 kB
06:52:31.679 ├ λ /audit-logs                                                           9.13 kB         150 kB
06:52:31.679 ├ λ /bank-book                                                            4.92 kB         123 kB
06:52:31.679 ├ λ /bank-book/[bankAccountId]                                            8.62 kB         412 kB
06:52:31.679 ├ λ /bankaccounts                                                         12.1 kB         407 kB
06:52:31.679 ├ λ /bankaccounts/[bankAccountId]                                         5.18 kB         170 kB
06:52:31.679 ├ λ /cash-book                                                            26.3 kB         145 kB
06:52:31.679 ├ λ /cash-book/[cashAccountId]                                            8.43 kB         412 kB
06:52:31.679 ├ λ /cashaccounts                                                         12.2 kB         407 kB
06:52:31.679 ├ λ /cashaccounts/[cashAccountId]                                         8.37 kB         173 kB
06:52:31.679 ├ λ /customers                                                            1.89 kB         280 kB
06:52:31.679 ├ λ /customers/[customerId]                                               38.5 kB         258 kB
06:52:31.679 ├ λ /customers/[customerId]/ledger                                        7.77 kB         380 kB
06:52:31.680 ├ λ /customers/ledger                                                     8.15 kB         400 kB
06:52:31.680 ├ λ /destinations                                                         11.4 kB         184 kB
06:52:31.680 ├ λ /destinations/[destinationId]                                         9.9 kB          224 kB
06:52:31.680 ├ λ /expense-categories                                                   8.3 kB          185 kB
06:52:31.687 ├ λ /expense-categories/[categoryId]                                      8.63 kB         173 kB
06:52:31.687 ├ λ /expenses                                                             13.9 kB         435 kB
06:52:31.687 ├ λ /expenses/[expenseId]                                                 3.85 kB         243 kB
06:52:31.687 ├ λ /expenses/[expenseId]/view                                            6.01 kB         102 kB
06:52:31.687 ├ λ /expenses/[expenseId]/voucher                                         152 B           114 kB
06:52:31.687 ├ λ /expenses/accrued                                                     10.3 kB         436 kB
06:52:31.687 ├ λ /expenses/ledger                                                      14.4 kB         436 kB
06:52:31.687 ├ λ /expenses/new                                                         4.91 kB         245 kB
06:52:31.687 ├ λ /export-contacts                                                      9.29 kB         106 kB
06:52:31.687 ├ λ /fetchaccounts/[tourPackageQueryId]                                   17.8 kB         433 kB
06:52:31.688 ├ λ /flight-tickets                                                       11.3 kB         196 kB
06:52:31.688 ├ λ /flight-tickets/[pnr]                                                 8.22 kB         123 kB
06:52:31.688 ├ λ /flight-tickets/[pnr]/edit                                            185 B           230 kB
06:52:31.688 ├ λ /flight-tickets/[pnr]/print                                           13.6 kB         134 kB
06:52:31.688 ├ λ /flight-tickets/new                                                   185 B           230 kB
06:52:31.688 ├ λ /hotels                                                               1.54 kB         184 kB
06:52:31.688 ├ λ /hotels/[hotelId]                                                     6.59 kB         228 kB
06:52:31.688 ├ λ /hotels/[hotelId]/pricing                                             8.86 kB         228 kB
06:52:31.688 ├ λ /income-categories                                                    8.3 kB          185 kB
06:52:31.688 ├ λ /income-categories/[categoryId]                                       8.63 kB         173 kB
06:52:31.688 ├ λ /incomes                                                              14.4 kB         455 kB
06:52:31.688 ├ λ /incomes/[incomeId]                                                   2.11 kB         242 kB
06:52:31.688 ├ λ /incomes/[incomeId]/edit                                              2.48 kB         261 kB
06:52:31.688 ├ λ /incomes/[incomeId]/view                                              5.94 kB         102 kB
06:52:31.688 ├ λ /incomes/[incomeId]/voucher                                           152 B           114 kB
06:52:31.688 ├ λ /incomes/ledger                                                       13.6 kB         435 kB
06:52:31.688 ├ λ /incomes/new                                                          3.53 kB         262 kB
06:52:31.688 ├ λ /inquiries                                                            42.6 kB         550 kB
06:52:31.688 ├ λ /inquiries/[inquiryId]                                                10.5 kB         249 kB
06:52:31.690 ├ λ /itineraries                                                          1.31 kB         184 kB
06:52:31.690 ├ λ /itineraries/[itineraryId]                                            10.4 kB         224 kB
06:52:31.691 ├ λ /itinerariesMaster                                                    1.32 kB         184 kB
06:52:31.691 ├ λ /itinerariesMaster/[itineraryMasterId]                                7.9 kB          225 kB
06:52:31.691 ├ λ /ledger                                                               4.36 kB         402 kB
06:52:31.691 ├ λ /ledger/category/[category]                                           3.46 kB         388 kB
06:52:31.691 ├ λ /locations                                                            11.6 kB         184 kB
06:52:31.691 ├ λ /locations-suppliers                                                  7.4 kB          108 kB
06:52:31.691 ├ λ /locations/[locationId]                                               9.31 kB         207 kB
06:52:31.691 ├ λ /locations/[locationId]/seasonal-periods                              5.26 kB         198 kB
06:52:31.692 ├ λ /operational-staff                                                    13.1 kB         149 kB
06:52:31.692 ├ λ /ops                                                                  9.91 kB         135 kB
06:52:31.692 ├ λ /ops/inquiry/[inquiryId]                                              13.1 kB         124 kB
06:52:31.692 ├ λ /payments                                                             3.34 kB         139 kB
06:52:31.692 ├ λ /payments/[paymentId]                                                 2.21 kB         243 kB
06:52:31.692 ├ λ /payments/[paymentId]/voucher                                         152 B           114 kB
06:52:31.692 ├ λ /payments/ledger                                                      13.5 kB         435 kB
06:52:31.692 ├ λ /purchase-returns                                                     11.3 kB         184 kB
06:52:31.692 ├ λ /purchase-returns/[purchaseReturnId]                                  186 B           211 kB
06:52:31.692 ├ λ /purchase-returns/new                                                 186 B           211 kB
06:52:31.692 ├ λ /purchases                                                            3.46 kB         139 kB
06:52:31.692 ├ λ /purchases/[purchaseId]                                               456 B           223 kB
06:52:31.692 ├ λ /purchases/[purchaseId]/items                                         8.73 kB         220 kB
06:52:31.692 ├ λ /purchases/[purchaseId]/voucher                                       151 B           114 kB
06:52:31.692 ├ λ /purchases/ledger                                                     3.81 kB         436 kB
06:52:31.693 ├ λ /purchases/new                                                        237 B           223 kB
06:52:31.693 ├ λ /receipts                                                             3.36 kB         139 kB
06:52:31.693 ├ λ /receipts/[receiptId]                                                 2.21 kB         243 kB
06:52:31.693 ├ λ /receipts/[receiptId]/voucher                                         151 B           114 kB
06:52:31.693 ├ λ /receipts/ledger                                                      13.4 kB         435 kB
06:52:31.693 ├ λ /reports/associatePerformance                                         3.19 kB         404 kB
06:52:31.693 ├ λ /reports/confirmedQueries                                             3.5 kB          207 kB
06:52:31.693 ├ λ /reports/gst                                                          5.23 kB         288 kB
06:52:31.693 ├ λ /reports/inquirySummary                                               3.08 kB         404 kB
06:52:31.693 ├ λ /reports/profit                                                       5.98 kB         282 kB
06:52:31.693 ├ λ /reports/unconfirmedQueries                                           1.6 kB          184 kB
06:52:31.693 ├ λ /reports/upcomingTrips                                                3.83 kB         217 kB
06:52:31.693 ├ λ /sale-returns                                                         12.1 kB         194 kB
06:52:31.693 ├ λ /sale-returns/[saleReturnId]                                          185 B           210 kB
06:52:31.693 ├ λ /sale-returns/[saleReturnId]/voucher                                  152 B           114 kB
06:52:31.693 ├ λ /sale-returns/new                                                     185 B           210 kB
06:52:31.694 ├ λ /sales                                                                3.45 kB         139 kB
06:52:31.694 ├ λ /sales/[saleId]                                                       2.9 kB          223 kB
06:52:31.694 ├ λ /sales/[saleId]/items                                                 8.73 kB         220 kB
06:52:31.694 ├ λ /sales/[saleId]/voucher                                               152 B           114 kB
06:52:31.694 ├ λ /sales/ledger                                                         3.52 kB         435 kB
06:52:31.694 ├ λ /sales/new                                                            12 kB           223 kB
06:52:31.694 ├ λ /settings/invoice                                                     4.46 kB         155 kB
06:52:31.694 ├ λ /settings/meal-plans                                                  5.5 kB          147 kB
06:52:31.694 ├ λ /settings/meal-plans/[mealPlanId]                                     171 B           173 kB
06:52:31.694 ├ λ /settings/meal-plans/new                                              170 B           173 kB
06:52:31.694 ├ λ /settings/occupancy-types                                             9.42 kB         178 kB
06:52:31.694 ├ λ /settings/occupancy-types/[occupancyTypeId]                           170 B           174 kB
06:52:31.694 ├ λ /settings/occupancy-types/new                                         169 B           174 kB
06:52:31.694 ├ λ /settings/organization                                                6.31 kB         191 kB
06:52:31.694 ├ λ /settings/pricing-attributes                                          8.58 kB         185 kB
06:52:31.694 ├ λ /settings/pricing-attributes/[pricingAttributeId]                     172 B           173 kB
06:52:31.694 ├ λ /settings/pricing-attributes/new                                      170 B           173 kB
06:52:31.695 ├ λ /settings/pricing-components                                          8.66 kB         185 kB
06:52:31.695 ├ λ /settings/pricing-components/[pricingComponentId]                     179 B           195 kB
06:52:31.695 ├ λ /settings/pricing-components/new                                      179 B           195 kB
06:52:31.695 ├ λ /settings/room-types                                                  5.5 kB          147 kB
06:52:31.695 ├ λ /settings/room-types/[roomTypeId]                                     170 B           173 kB
06:52:31.695 ├ λ /settings/room-types/new                                              169 B           173 kB
06:52:31.695 ├ λ /settings/tax-slabs                                                   11.4 kB         184 kB
06:52:31.695 ├ λ /settings/tax-slabs/[taxSlabId]                                       8.65 kB         173 kB
06:52:31.695 ├ λ /settings/tds                                                         7.1 kB          117 kB
06:52:31.695 ├ λ /settings/units                                                       11.4 kB         184 kB
06:52:31.695 ├ λ /settings/units/[unitId]                                              8.63 kB         173 kB
06:52:31.695 ├ λ /settings/vehicle-types                                               5.51 kB         147 kB
06:52:31.695 ├ λ /settings/vehicle-types/[vehicleTypeId]                               172 B           173 kB
06:52:31.695 ├ λ /settings/vehicle-types/new                                           171 B           173 kB
06:52:31.695 ├ λ /sign-in/[[...sign-in]]                                               2.76 kB         102 kB
06:52:31.695 ├ λ /sign-up/[[...sign-up]]                                               2.76 kB         102 kB
06:52:31.695 ├ λ /suppliers                                                            3.19 kB         215 kB
06:52:31.695 ├ λ /suppliers/[supplierId]                                               3.76 kB         184 kB
06:52:31.695 ├ λ /suppliers/[supplierId]/ledger                                        13.9 kB         427 kB
06:52:31.696 ├ λ /suppliers/ledger                                                     8.66 kB         410 kB
06:52:31.696 ├ λ /tds/challans                                                         6.66 kB         135 kB
06:52:31.696 ├ λ /tds/reports                                                          8.36 kB         105 kB
06:52:31.696 ├ λ /tourPackageCreateCopy                                                11.2 kB         183 kB
06:52:31.696 ├ λ /tourPackageCreateCopy/[tourPackageCreateCopyId]                      14.4 kB         502 kB
06:52:31.696 ├ λ /tourPackageDisplay/[tourPackageDisplayId]                            519 B          93.4 kB
06:52:31.696 ├ λ /tourPackageFromTourPackageQuery/[tourPackageFromTourPackageQueryId]  13.4 kB         501 kB
06:52:31.696 ├ λ /tourPackagePDFGenerator/[tourPackageId]                              9.97 kB        90.9 kB
06:52:31.696 ├ λ /tourPackagePDFGeneratorWithVariants/[tourPackageId]                  9.55 kB        90.4 kB
06:52:31.696 ├ λ /tourPackageQuery                                                     3.66 kB         200 kB
06:52:31.696 ├ λ /tourPackageQuery/[tourPackageQueryId]                                7.57 kB         566 kB
06:52:31.696 ├ λ /tourPackageQueryCreateCopy                                           11.2 kB         183 kB
06:52:31.696 ├ λ /tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]            6.33 kB         559 kB
06:52:31.696 ├ λ /tourPackageQueryDisplay                                              4.49 kB         212 kB
06:52:31.696 ├ λ /tourPackageQueryDisplay/[tourPackageQueryId]                         9.08 kB         127 kB
06:52:31.696 ├ λ /tourpackagequeryfrominquiry/[inquiryId]                              7.55 kB         561 kB
06:52:31.697 ├ λ /tourpackagequeryfrominquiry/associate/[inquiryId]                    34.2 kB         567 kB
06:52:31.697 ├ λ /tourPackageQueryFromTourPackage/[tourPackageQueryFromTourPackageId]  19 kB           530 kB
06:52:31.697 ├ λ /tourPackageQueryHotelUpdate/[tourPackageQueryId]                     12.9 kB         251 kB
06:52:31.697 ├ λ /tourPackageQueryPDFGenerator/[tourPackageQueryId]                    11.9 kB         100 kB
06:52:31.697 ├ λ /tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]        9.25 kB        97.4 kB
06:52:31.697 ├ λ /tourPackageQueryVoucherDisplay/[tourPackageQueryVoucherId]           10.9 kB         136 kB
06:52:31.697 ├ λ /tourPackages                                                         10.4 kB         218 kB
06:52:31.697 ├ λ /tourPackages/[tourPackageId]                                         31.6 kB         547 kB
06:52:31.697 ├ λ /tourPackages/[tourPackageId]/pricing                                 12.2 kB         236 kB
06:52:31.698 ├ λ /tourPackages/website-management                                      11.5 kB         222 kB
06:52:31.698 ├ λ /transfers                                                            9.12 kB         244 kB
06:52:31.698 ├ λ /transfers/[transferId]                                               4.4 kB          210 kB
06:52:31.698 ├ λ /transport-pricing                                                    12.4 kB         191 kB
06:52:31.698 ├ λ /transport-pricing/[transportPricingId]                               9.08 kB         220 kB
06:52:31.698 ├ λ /transport-pricing/new                                                9.33 kB         231 kB
06:52:31.698 ├ λ /viewpdfpage/[PDFPageID]                                              446 kB          544 kB
06:52:31.698 ├ λ /whatsapp                                                             6.72 kB         103 kB
06:52:31.698 ├ λ /whatsapp/campaigns                                                   11.4 kB         108 kB
06:52:31.698 ├ λ /whatsapp/campaigns/[id]                                              9.76 kB         129 kB
06:52:31.698 ├ λ /whatsapp/campaigns/[id]/stats                                        4.47 kB         108 kB
06:52:31.698 ├ λ /whatsapp/campaigns/new                                               15.8 kB         159 kB
06:52:31.698 ├ λ /whatsapp/catalog                                                     19.1 kB         169 kB
06:52:31.698 ├ λ /whatsapp/chat                                                        102 kB          260 kB
06:52:31.698 ├ λ /whatsapp/customers                                                   19.9 kB         152 kB
06:52:31.698 ├ λ /whatsapp/flows                                                       38.1 kB         180 kB
06:52:31.698 ├ λ /whatsapp/media                                                       9.7 kB          111 kB
06:52:31.698 └ λ /whatsapp/templates                                                   18.9 kB         155 kB
06:52:31.698 + First Load JS shared by all                                             80.9 kB
06:52:31.698   ├ chunks/2472-eb9bc76fb9bc33cb.js                                       27.6 kB
06:52:31.698   ├ chunks/fd9d1056-294e6a544314e9b9.js                                   51.1 kB
06:52:31.698   ├ chunks/main-app-8ed6d57d180fb331.js                                   237 B
06:52:31.699   └ chunks/webpack-394aeac5243dcd56.js                                    1.97 kB
06:52:31.699 
06:52:31.699 
06:52:31.699 ƒ Middleware                                                              205 kB
06:52:31.699 
06:52:31.704 λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
06:52:31.704 ○  (Static)  automatically rendered as static HTML (uses no initial props)
06:52:31.704 
06:52:32.582 Traced Next.js server files in: 384.531ms
06:52:34.204 WARNING: Unable to find source file for page /_not-found with extensions: tsx, ts, jsx, js, this can cause functions config from `vercel.json` to not be applied
06:52:34.362 Created all serverless functions in: 1.779s
06:52:34.538 Collected static files (public/, static/, .next/static): 39.316ms
06:52:34.921 Build Completed in /vercel/output [4m]
06:52:35.363 Deploying outputs...