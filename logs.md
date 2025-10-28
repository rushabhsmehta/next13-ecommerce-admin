23:21:56.043 Running build in Washington, D.C., USA (East) – iad1
23:21:56.043 Build machine configuration: 2 cores, 8 GB
23:21:56.206 Cloning github.com/rushabhsmehta/next13-ecommerce-admin (Branch: master, Commit: 49f257b)
23:21:57.513 Cloning completed: 1.307s
23:21:58.301 Restored build cache from previous deployment (SfNgYBZGp2hPnG3gTrnDSuNWSjBH)
23:21:59.238 Running "vercel build"
23:21:59.638 Vercel CLI 48.6.0
23:22:00.099 Installing dependencies...
23:22:02.502 
23:22:02.503 > next13-ecommerce-admin@0.1.0 postinstall
23:22:02.503 > prisma generate --no-engine && prisma generate --schema=prisma/whatsapp-schema.prisma
23:22:02.504 
23:22:03.970 Prisma schema loaded from schema.prisma
23:22:05.415 
23:22:05.416 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 627ms
23:22:05.416 
23:22:05.417 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:22:05.417 
23:22:05.417 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:22:05.418 
23:22:06.617 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:22:07.273 ┌─────────────────────────────────────────────────────────┐
23:22:07.273 │  Update available 6.15.0 -> 6.18.0                      │
23:22:07.273 │  Run the following to update                            │
23:22:07.274 │    npm i --save-dev prisma@latest                       │
23:22:07.274 │    npm i @prisma/client@latest                          │
23:22:07.274 └─────────────────────────────────────────────────────────┘
23:22:07.274 
23:22:07.274 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 396ms
23:22:07.275 
23:22:07.275 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:22:07.275 
23:22:07.275 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:22:07.275 
23:22:07.297 
23:22:07.297 removed 1 package in 7s
23:22:07.297 
23:22:07.297 200 packages are looking for funding
23:22:07.298   run `npm fund` for details
23:22:07.328 Detected Next.js version: 13.5.7
23:22:07.329 Running "npm run vercel-build"
23:22:07.440 
23:22:07.440 > next13-ecommerce-admin@0.1.0 vercel-build
23:22:07.440 > prisma generate --no-engine && prisma generate --schema=prisma/whatsapp-schema.prisma && next build
23:22:07.441 
23:22:08.608 Prisma schema loaded from schema.prisma
23:22:09.932 
23:22:09.932 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 600ms
23:22:09.933 
23:22:09.933 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:22:09.933 
23:22:09.933 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:22:09.933 
23:22:11.007 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:22:12.289 
23:22:12.290 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 515ms
23:22:12.290 
23:22:12.290 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:22:12.291 
23:22:12.291 Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
23:22:12.291 
23:22:16.212    Creating an optimized production build ...
23:23:18.824 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (101kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
23:23:59.601  ⚠ Compiled with warnings
23:23:59.602 
23:23:59.602 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.603 A Node.js API is used (setImmediate at line: 51) which is not supported in the Edge Runtime.
23:23:59.606 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
23:23:59.606 
23:23:59.607 Import trace for requested module:
23:23:59.607 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.607 ./node_modules/scheduler/index.js
23:23:59.607 ./node_modules/react-dom/cjs/react-dom.production.min.js
23:23:59.607 ./node_modules/react-dom/index.js
23:23:59.608 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
23:23:59.608 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
23:23:59.608 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
23:23:59.608 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
23:23:59.609 ./node_modules/@clerk/clerk-react/dist/esm/index.js
23:23:59.609 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
23:23:59.609 ./node_modules/@clerk/nextjs/dist/esm/index.js
23:23:59.609 
23:23:59.609 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.610 A Node.js API is used (setImmediate at line: 51) which is not supported in the Edge Runtime.
23:23:59.612 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
23:23:59.613 
23:23:59.613 Import trace for requested module:
23:23:59.613 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.613 ./node_modules/scheduler/index.js
23:23:59.613 ./node_modules/react-dom/cjs/react-dom.production.min.js
23:23:59.613 ./node_modules/react-dom/index.js
23:23:59.614 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
23:23:59.615 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
23:23:59.615 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
23:23:59.615 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
23:23:59.616 ./node_modules/@clerk/clerk-react/dist/esm/index.js
23:23:59.616 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
23:23:59.616 ./node_modules/@clerk/nextjs/dist/esm/index.js
23:23:59.616 
23:23:59.616 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.616 A Node.js API is used (MessageChannel at line: 120) which is not supported in the Edge Runtime.
23:23:59.617 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
23:23:59.617 
23:23:59.617 Import trace for requested module:
23:23:59.617 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.617 ./node_modules/scheduler/index.js
23:23:59.617 ./node_modules/react-dom/cjs/react-dom.production.min.js
23:23:59.618 ./node_modules/react-dom/index.js
23:23:59.618 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
23:23:59.618 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
23:23:59.618 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
23:23:59.618 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
23:23:59.618 ./node_modules/@clerk/clerk-react/dist/esm/index.js
23:23:59.618 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
23:23:59.619 ./node_modules/@clerk/nextjs/dist/esm/index.js
23:23:59.619 
23:23:59.619 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.619 A Node.js API is used (MessageChannel at line: 121) which is not supported in the Edge Runtime.
23:23:59.619 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
23:23:59.619 
23:23:59.619 Import trace for requested module:
23:23:59.620 ./node_modules/scheduler/cjs/scheduler.production.min.js
23:23:59.620 ./node_modules/scheduler/index.js
23:23:59.620 ./node_modules/react-dom/cjs/react-dom.production.min.js
23:23:59.620 ./node_modules/react-dom/index.js
23:23:59.620 ./node_modules/@clerk/clerk-react/dist/esm/utils/useCustomElementPortal.js
23:23:59.620 ./node_modules/@clerk/clerk-react/dist/esm/utils/index.js
23:23:59.621 ./node_modules/@clerk/clerk-react/dist/esm/contexts/ClerkProvider.js
23:23:59.621 ./node_modules/@clerk/clerk-react/dist/esm/contexts/index.js
23:23:59.621 ./node_modules/@clerk/clerk-react/dist/esm/index.js
23:23:59.621 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
23:23:59.622 ./node_modules/@clerk/nextjs/dist/esm/index.js
23:23:59.622 
23:23:59.622 ./node_modules/@clerk/shared/dist/chunk-RSOCGYTF.mjs
23:23:59.622 A Node.js API is used (MessageEvent at line: 27) which is not supported in the Edge Runtime.
23:23:59.622 Learn more: https://nextjs.org/docs/api-reference/edge-runtime
23:23:59.622 
23:23:59.623 Import trace for requested module:
23:23:59.623 ./node_modules/@clerk/shared/dist/chunk-RSOCGYTF.mjs
23:23:59.623 ./node_modules/@clerk/shared/dist/index.mjs
23:23:59.623 ./node_modules/@clerk/clerk-react/dist/esm/components/uiComponents.js
23:23:59.623 ./node_modules/@clerk/clerk-react/dist/esm/components/index.js
23:23:59.623 ./node_modules/@clerk/clerk-react/dist/esm/index.js
23:23:59.624 ./node_modules/@clerk/nextjs/dist/esm/client-boundary/controlComponents.js
23:23:59.624 ./node_modules/@clerk/nextjs/dist/esm/index.js
23:23:59.624 
23:23:59.624    Linting and checking validity of types ...
23:24:31.938    Collecting page data ...
23:24:41.169    Generating static pages (0/175) ...
23:24:50.617 
   Generating static pages (43/175) 
23:24:52.717 prisma:error 
23:24:52.718 Invalid `prisma.associatePartner.findMany()` invocation:
23:24:52.718 
23:24:52.718 
23:24:52.718 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:52.810 prisma:error 
23:24:52.811 Invalid `prisma.associatePartner.findMany()` invocation:
23:24:52.811 
23:24:52.811 
23:24:52.811 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:54.248 
   Generating static pages (87/175) 
23:24:54.474 prisma:error 
23:24:54.475 Invalid `prisma.mealPlan.findMany()` invocation:
23:24:54.475 
23:24:54.475 
23:24:54.475 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:54.616 prisma:error 
23:24:54.617 Invalid `prisma.mealPlan.findMany()` invocation:
23:24:54.617 
23:24:54.617 
23:24:54.617 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:54.761 prisma:error 
23:24:54.762 Invalid `prisma.occupancyType.findMany()` invocation:
23:24:54.763 
23:24:54.763 
23:24:54.764 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:54.764 prisma:error 
23:24:54.764 Invalid `prisma.occupancyType.findMany()` invocation:
23:24:54.764 
23:24:54.764 
23:24:54.764 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.120 prisma:error 
23:24:55.120 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:24:55.120 
23:24:55.120 
23:24:55.122 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.152 prisma:error 
23:24:55.152 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:24:55.152 
23:24:55.152 
23:24:55.152 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.231 prisma:error 
23:24:55.232 Invalid `prisma.pricingComponent.findMany()` invocation:
23:24:55.232 
23:24:55.232 
23:24:55.232 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.258 prisma:error 
23:24:55.258 Invalid `prisma.pricingComponent.findMany()` invocation:
23:24:55.258 
23:24:55.258 
23:24:55.258 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.312 prisma:error 
23:24:55.312 Invalid `prisma.roomType.findMany()` invocation:
23:24:55.312 
23:24:55.312 
23:24:55.313 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.429 prisma:error 
23:24:55.429 Invalid `prisma.roomType.findMany()` invocation:
23:24:55.429 
23:24:55.429 
23:24:55.429 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.531 prisma:error 
23:24:55.531 Invalid `prisma.vehicleType.findMany()` invocation:
23:24:55.531 
23:24:55.531 
23:24:55.531 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.561 prisma:error 
23:24:55.561 Invalid `prisma.vehicleType.findMany()` invocation:
23:24:55.561 
23:24:55.562 
23:24:55.562 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.585 prisma:error 
23:24:55.585 Invalid `prisma.location.findMany()` invocation:
23:24:55.585 
23:24:55.585 
23:24:55.585 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.610 prisma:error 
23:24:55.611 Invalid `prisma.location.findMany()` invocation:
23:24:55.611 
23:24:55.611 
23:24:55.611 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.632 prisma:error 
23:24:55.633 Invalid `prisma.transportPricing.findMany()` invocation:
23:24:55.633 
23:24:55.633 
23:24:55.633 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.653 prisma:error 
23:24:55.653 Invalid `prisma.transportPricing.findMany()` invocation:
23:24:55.654 
23:24:55.654 
23:24:55.654 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.701 prisma:error 
23:24:55.702 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:24:55.702 
23:24:55.702 
23:24:55.702 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.702 prisma:error 
23:24:55.703 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:24:55.703 
23:24:55.703 
23:24:55.703 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.729 prisma:error 
23:24:55.729 Invalid `prisma.activity.findMany()` invocation:
23:24:55.729 
23:24:55.729 
23:24:55.730 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.790 prisma:error 
23:24:55.790 Invalid `prisma.activity.findMany()` invocation:
23:24:55.791 
23:24:55.792 
23:24:55.792 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.818 prisma:error 
23:24:55.818 Invalid `prisma.activityMaster.findMany()` invocation:
23:24:55.818 
23:24:55.818 
23:24:55.819 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.819 prisma:error 
23:24:55.819 Invalid `prisma.activityMaster.findMany()` invocation:
23:24:55.819 
23:24:55.819 
23:24:55.819 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.853 prisma:error 
23:24:55.853 Invalid `prisma.bankAccount.findMany()` invocation:
23:24:55.853 
23:24:55.854 
23:24:55.854 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:55.937 prisma:error 
23:24:55.937 Invalid `prisma.bankAccount.findMany()` invocation:
23:24:55.938 
23:24:55.938 
23:24:55.938 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.000 prisma:error 
23:24:56.001 Invalid `prisma.cashAccount.findMany()` invocation:
23:24:56.001 
23:24:56.001 
23:24:56.001 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.001 prisma:error 
23:24:56.002 Invalid `prisma.cashAccount.findMany()` invocation:
23:24:56.002 
23:24:56.002 
23:24:56.002 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.034 prisma:error 
23:24:56.034 Invalid `prisma.customer.findMany()` invocation:
23:24:56.034 
23:24:56.034 
23:24:56.034 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.091 prisma:error 
23:24:56.092 Invalid `prisma.customer.findMany()` invocation:
23:24:56.092 
23:24:56.092 
23:24:56.092 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.130 prisma:error 
23:24:56.130 Invalid `prisma.customer.findMany()` invocation:
23:24:56.130 
23:24:56.131 
23:24:56.131 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.131 prisma:error 
23:24:56.131 Invalid `prisma.customer.findMany()` invocation:
23:24:56.131 
23:24:56.132 
23:24:56.132 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.244 prisma:error 
23:24:56.244 Invalid `prisma.expenseCategory.findMany()` invocation:
23:24:56.245 
23:24:56.245 
23:24:56.245 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.245 prisma:error 
23:24:56.246 Invalid `prisma.expenseCategory.findMany()` invocation:
23:24:56.246 
23:24:56.246 
23:24:56.246 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.279 prisma:error 
23:24:56.280 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:56.280 
23:24:56.280 
23:24:56.280 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.301 prisma:error 
23:24:56.302 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:56.302 
23:24:56.302 
23:24:56.302 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.335 prisma:error 
23:24:56.335 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:56.336 
23:24:56.336 
23:24:56.336 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.448 prisma:error 
23:24:56.448 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:56.448 
23:24:56.448 
23:24:56.449 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.668 prisma:error 
23:24:56.668 Invalid `prisma.expenseCategory.findMany()` invocation:
23:24:56.669 
23:24:56.669 
23:24:56.669 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.669 prisma:error 
23:24:56.669 Invalid `prisma.bankAccount.findMany()` invocation:
23:24:56.669 
23:24:56.669 
23:24:56.669 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.670 prisma:error 
23:24:56.670 Invalid `prisma.cashAccount.findMany()` invocation:
23:24:56.670 
23:24:56.670 
23:24:56.670 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.670 prisma:error 
23:24:56.670 Invalid `prisma.expenseCategory.findMany()` invocation:
23:24:56.670 
23:24:56.670 
23:24:56.670 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.670 prisma:error 
23:24:56.670 Invalid `prisma.bankAccount.findMany()` invocation:
23:24:56.670 
23:24:56.670 
23:24:56.671 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.671 prisma:error 
23:24:56.671 Invalid `prisma.cashAccount.findMany()` invocation:
23:24:56.671 
23:24:56.671 
23:24:56.672 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.702 prisma:error 
23:24:56.703 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:56.703 
23:24:56.703 
23:24:56.703 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.703 prisma:error 
23:24:56.703 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:56.703 
23:24:56.703 
23:24:56.703 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.806 prisma:error 
23:24:56.806 Invalid `prisma.hotel.findMany()` invocation:
23:24:56.806 
23:24:56.806 
23:24:56.807 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.843 prisma:error 
23:24:56.843 Invalid `prisma.hotel.findMany()` invocation:
23:24:56.843 
23:24:56.843 
23:24:56.843 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.867 prisma:error 
23:24:56.868 Invalid `prisma.incomeCategory.findMany()` invocation:
23:24:56.868 
23:24:56.868 
23:24:56.868 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.904 prisma:error 
23:24:56.904 Invalid `prisma.incomeCategory.findMany()` invocation:
23:24:56.905 
23:24:56.905 
23:24:56.905 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.937 prisma:error 
23:24:56.937 Invalid `prisma.incomeDetail.findMany()` invocation:
23:24:56.937 
23:24:56.938 
23:24:56.938 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:56.962 prisma:error 
23:24:56.962 Invalid `prisma.incomeDetail.findMany()` invocation:
23:24:56.963 
23:24:56.963 
23:24:56.963 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:57.214 prisma:error 
23:24:57.214 Invalid `prisma.itinerary.findMany()` invocation:
23:24:57.214 
23:24:57.215 
23:24:57.215 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:57.255 prisma:error 
23:24:57.256 Invalid `prisma.itinerary.findMany()` invocation:
23:24:57.256 
23:24:57.256 
23:24:57.256 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:57.295 prisma:error 
23:24:57.295 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:24:57.295 
23:24:57.296 
23:24:57.296 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:57.296 prisma:error 
23:24:57.296 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:24:57.296 
23:24:57.296 
23:24:57.296 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:58.548 prisma:error 
23:24:58.549 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:58.549 
23:24:58.551 
23:24:58.551 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:58.551 prisma:error 
23:24:58.551 Invalid `prisma.expenseDetail.findMany()` invocation:
23:24:58.551 
23:24:58.552 
23:24:58.552 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:58.598 prisma:error 
23:24:58.598 Invalid `prisma.location.findMany()` invocation:
23:24:58.599 
23:24:58.599 
23:24:58.599 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:58.599 prisma:error 
23:24:58.599 Invalid `prisma.location.findMany()` invocation:
23:24:58.599 
23:24:58.599 
23:24:58.600 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:58.682 prisma:error 
23:24:58.683 Invalid `prisma.location.findMany()` invocation:
23:24:58.683 
23:24:58.683 
23:24:58.683 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:58.683 prisma:error 
23:24:58.684 Invalid `prisma.location.findMany()` invocation:
23:24:58.684 
23:24:58.684 
23:24:58.684 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:59.946 prisma:error 
23:24:59.946 Invalid `prisma.supplier.findMany()` invocation:
23:24:59.947 
23:24:59.947 
23:24:59.948 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:24:59.948 prisma:error 
23:24:59.948 Invalid `prisma.supplier.findMany()` invocation:
23:24:59.948 
23:24:59.948 
23:24:59.948 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.044 prisma:error 
23:25:00.044 Invalid `prisma.paymentDetail.findMany()` invocation:
23:25:00.045 
23:25:00.045 
23:25:00.045 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.045 prisma:error 
23:25:00.045 Invalid `prisma.paymentDetail.findMany()` invocation:
23:25:00.045 
23:25:00.045 
23:25:00.045 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.256 prisma:error 
23:25:00.257 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:00.257 
23:25:00.257 
23:25:00.257 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.257 prisma:error 
23:25:00.257 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:00.257 
23:25:00.257 
23:25:00.257 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.257 prisma:error 
23:25:00.257 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:00.257 
23:25:00.257 
23:25:00.257 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.257 prisma:error 
23:25:00.257 Invalid `prisma.supplier.findMany()` invocation:
23:25:00.257 
23:25:00.257 
23:25:00.257 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.257 prisma:error 
23:25:00.257 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:00.257 
23:25:00.258 
23:25:00.258 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.258 prisma:error 
23:25:00.258 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:00.258 
23:25:00.258 
23:25:00.258 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.258 prisma:error 
23:25:00.258 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:00.258 
23:25:00.258 
23:25:00.258 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.258 prisma:error 
23:25:00.258 Invalid `prisma.supplier.findMany()` invocation:
23:25:00.258 
23:25:00.258 
23:25:00.258 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.259 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:25:00.259 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:00.259 
23:25:00.259 
23:25:00.259 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.259     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.259     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.259     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.259     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.259     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:25:00.259     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:25:00.259   code: 'P6001',
23:25:00.260   meta: { modelName: 'PurchaseDetail' },
23:25:00.260   clientVersion: '6.15.0'
23:25:00.260 }
23:25:00.260 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:25:00.260 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:00.260 
23:25:00.260 
23:25:00.260 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.260     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.260     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.260     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.260     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.260     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:25:00.260     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:25:00.260   code: 'P6001',
23:25:00.260   meta: { modelName: 'TaxSlab' },
23:25:00.260   clientVersion: '6.15.0'
23:25:00.260 }
23:25:00.260 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:25:00.260 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:00.260 
23:25:00.260 
23:25:00.260 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.261     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.261     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.261     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.261     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.261     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:25:00.261     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:25:00.261   code: 'P6001',
23:25:00.261   meta: { modelName: 'UnitOfMeasure' },
23:25:00.261   clientVersion: '6.15.0'
23:25:00.261 }
23:25:00.261 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:25:00.262 Invalid `prisma.supplier.findMany()` invocation:
23:25:00.262 
23:25:00.263 
23:25:00.263 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.263     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.263     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.263     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.263     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.263     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:25:00.263     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:25:00.264   code: 'P6001',
23:25:00.264   meta: { modelName: 'Supplier' },
23:25:00.264   clientVersion: '6.15.0'
23:25:00.264 }
23:25:00.264 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:25:00.264 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:00.264 
23:25:00.264 
23:25:00.264 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.264     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.264     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.264     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.264     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.264     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:25:00.264     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:25:00.264   code: 'P6001',
23:25:00.264   meta: { modelName: 'PurchaseDetail' },
23:25:00.264   clientVersion: '6.15.0'
23:25:00.264 }
23:25:00.264 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:25:00.264 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:00.264 
23:25:00.264 
23:25:00.264 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.265     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.265     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.265     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.265     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.265     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:25:00.265     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:25:00.265   code: 'P6001',
23:25:00.265   meta: { modelName: 'TaxSlab' },
23:25:00.265   clientVersion: '6.15.0'
23:25:00.265 }
23:25:00.265 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:25:00.265 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:00.266 
23:25:00.266 
23:25:00.266 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.266     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.266     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.266     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.266     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.266     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:25:00.266     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:25:00.266   code: 'P6001',
23:25:00.266   meta: { modelName: 'UnitOfMeasure' },
23:25:00.266   clientVersion: '6.15.0'
23:25:00.266 }
23:25:00.266 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:25:00.266 Invalid `prisma.supplier.findMany()` invocation:
23:25:00.266 
23:25:00.266 
23:25:00.266 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:00.266     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:00.266     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:00.266     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:00.266     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:00.266     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:25:00.266     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:25:00.266   code: 'P6001',
23:25:00.266   meta: { modelName: 'Supplier' },
23:25:00.266   clientVersion: '6.15.0'
23:25:00.266 }
23:25:01.153 prisma:error 
23:25:01.153 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:25:01.153 
23:25:01.153 
23:25:01.153 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.153 prisma:error 
23:25:01.153 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:25:01.153 
23:25:01.153 
23:25:01.153 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.153 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:25:01.153 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:25:01.153 
23:25:01.153 
23:25:01.153 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.153     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:01.154     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:01.154     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:01.154     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:01.154     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:25:01.154     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:25:01.154   code: 'P6001',
23:25:01.154   meta: { modelName: 'PurchaseReturn' },
23:25:01.154   clientVersion: '6.15.0'
23:25:01.154 }
23:25:01.154 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:25:01.154 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:25:01.154 
23:25:01.154 
23:25:01.154 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.154     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:01.154     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:01.154     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:01.154     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:01.154     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:25:01.154     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:25:01.154   code: 'P6001',
23:25:01.154   meta: { modelName: 'PurchaseReturn' },
23:25:01.154   clientVersion: '6.15.0'
23:25:01.154 }
23:25:01.155 
   Generating static pages (131/175) 
23:25:01.387 prisma:error 
23:25:01.388 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:01.388 
23:25:01.388 
23:25:01.389 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.389 prisma:error 
23:25:01.389 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:01.389 
23:25:01.389 
23:25:01.389 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.390 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:25:01.390 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:01.390 
23:25:01.390 
23:25:01.391 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.391     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:01.391     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:01.391     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:01.391     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:01.392     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:25:01.392   code: 'P6001',
23:25:01.392   meta: { modelName: 'PurchaseDetail' },
23:25:01.392   clientVersion: '6.15.0'
23:25:01.392 }
23:25:01.393 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:25:01.393 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:01.393 
23:25:01.393 
23:25:01.393 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.394     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:01.394     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:01.394     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:01.395     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:01.398     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:25:01.399   code: 'P6001',
23:25:01.399   meta: { modelName: 'PurchaseDetail' },
23:25:01.399   clientVersion: '6.15.0'
23:25:01.400 }
23:25:01.593 prisma:error 
23:25:01.593 Invalid `prisma.supplier.findMany()` invocation:
23:25:01.598 
23:25:01.599 
23:25:01.599 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.599 prisma:error 
23:25:01.599 Invalid `prisma.supplier.findMany()` invocation:
23:25:01.599 
23:25:01.599 
23:25:01.599 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.689 prisma:error 
23:25:01.690 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:01.690 
23:25:01.690 
23:25:01.690 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.690 prisma:error 
23:25:01.690 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:01.690 
23:25:01.690 
23:25:01.690 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.782 prisma:error 
23:25:01.783 Invalid `prisma.customer.findMany()` invocation:
23:25:01.784 
23:25:01.785 
23:25:01.785 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.785 prisma:error 
23:25:01.785 Invalid `prisma.customer.findMany()` invocation:
23:25:01.785 
23:25:01.785 
23:25:01.785 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.995 prisma:error 
23:25:01.997 Invalid `prisma.receiptDetail.findMany()` invocation:
23:25:01.997 
23:25:01.998 
23:25:01.998 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:01.998 prisma:error 
23:25:01.998 Invalid `prisma.receiptDetail.findMany()` invocation:
23:25:01.998 
23:25:01.999 
23:25:01.999 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:02.663 prisma:error 
23:25:02.663 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:02.664 
23:25:02.664 
23:25:02.664 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:02.664 prisma:error 
23:25:02.666 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:25:02.666 
23:25:02.667 
23:25:02.667 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:02.938 prisma:error 
23:25:02.939 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:02.939 
23:25:02.939 
23:25:02.940 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:02.940 prisma:error 
23:25:02.940 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:02.940 
23:25:02.940 
23:25:02.940 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:02.976 prisma:error 
23:25:02.976 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:02.976 
23:25:02.976 
23:25:02.976 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:02.976 prisma:error 
23:25:02.976 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:02.976 
23:25:02.977 
23:25:02.977 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.111 prisma:error 
23:25:03.111 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.111 
23:25:03.111 
23:25:03.111 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.111 prisma:error 
23:25:03.111 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:03.111 
23:25:03.111 
23:25:03.111 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.111 prisma:error 
23:25:03.111 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:03.111 
23:25:03.112 
23:25:03.112 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.112 prisma:error 
23:25:03.112 Invalid `prisma.customer.findMany()` invocation:
23:25:03.112 
23:25:03.112 
23:25:03.112 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.112 [GET_SALES] PrismaClientKnownRequestError: 
23:25:03.112 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.112 
23:25:03.112 
23:25:03.112 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.112     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.112     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.112     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.112     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.113     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:25:03.113     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:25:03.113   code: 'P6001',
23:25:03.113   meta: { modelName: 'SaleDetail' },
23:25:03.113   clientVersion: '6.15.0'
23:25:03.113 }
23:25:03.113 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:25:03.113 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:03.113 
23:25:03.113 
23:25:03.113 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.113     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.113     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.113     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.113     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.113     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:25:03.113     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:25:03.113   code: 'P6001',
23:25:03.113   meta: { modelName: 'TaxSlab' },
23:25:03.113   clientVersion: '6.15.0'
23:25:03.113 }
23:25:03.113 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:25:03.113 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:03.113 
23:25:03.113 
23:25:03.113 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.113     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.114     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.114     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.114     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.114     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:25:03.114     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:25:03.114   code: 'P6001',
23:25:03.114   meta: { modelName: 'UnitOfMeasure' },
23:25:03.114   clientVersion: '6.15.0'
23:25:03.114 }
23:25:03.114 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:25:03.114 Invalid `prisma.customer.findMany()` invocation:
23:25:03.114 
23:25:03.114 
23:25:03.114 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.114     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.114     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.114     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.114     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.114     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:25:03.114     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:25:03.114   code: 'P6001',
23:25:03.114   meta: { modelName: 'Customer' },
23:25:03.114   clientVersion: '6.15.0'
23:25:03.114 }
23:25:03.140 prisma:error 
23:25:03.141 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.142 
23:25:03.142 
23:25:03.142 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.143 prisma:error 
23:25:03.143 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:03.143 
23:25:03.143 
23:25:03.144 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.144 prisma:error 
23:25:03.144 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:03.144 
23:25:03.144 
23:25:03.144 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.145 prisma:error 
23:25:03.145 Invalid `prisma.customer.findMany()` invocation:
23:25:03.145 
23:25:03.145 
23:25:03.145 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.146 [GET_SALES] PrismaClientKnownRequestError: 
23:25:03.146 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.146 
23:25:03.146 
23:25:03.146 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.147     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.147     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.147     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.147     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.147     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:25:03.148     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:25:03.148   code: 'P6001',
23:25:03.148   meta: { modelName: 'SaleDetail' },
23:25:03.148   clientVersion: '6.15.0'
23:25:03.148 }
23:25:03.148 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:25:03.149 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:03.149 
23:25:03.149 
23:25:03.149 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.149     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.150     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.150     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.150     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.150     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:25:03.150     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:25:03.150   code: 'P6001',
23:25:03.151   meta: { modelName: 'TaxSlab' },
23:25:03.151   clientVersion: '6.15.0'
23:25:03.151 }
23:25:03.151 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:25:03.151 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:03.151 
23:25:03.152 
23:25:03.152 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.152     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.152     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.152     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.152     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.153     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:25:03.153     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:25:03.153   code: 'P6001',
23:25:03.153   meta: { modelName: 'UnitOfMeasure' },
23:25:03.153   clientVersion: '6.15.0'
23:25:03.153 }
23:25:03.154 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:25:03.154 Invalid `prisma.customer.findMany()` invocation:
23:25:03.154 
23:25:03.154 
23:25:03.155 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.155     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.155     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.156     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.156     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.156     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:25:03.157     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:25:03.157   code: 'P6001',
23:25:03.158   meta: { modelName: 'Customer' },
23:25:03.158   clientVersion: '6.15.0'
23:25:03.158 }
23:25:03.178 prisma:error 
23:25:03.178 Invalid `prisma.saleReturn.findMany()` invocation:
23:25:03.178 
23:25:03.179 
23:25:03.179 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.179 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:25:03.179 Invalid `prisma.saleReturn.findMany()` invocation:
23:25:03.180 
23:25:03.180 
23:25:03.180 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.180     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.180     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.181     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.181     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.181     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:25:03.181     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:25:03.181   code: 'P6001',
23:25:03.182   meta: { modelName: 'SaleReturn' },
23:25:03.182   clientVersion: '6.15.0'
23:25:03.182 }
23:25:03.204 prisma:error 
23:25:03.204 Invalid `prisma.saleReturn.findMany()` invocation:
23:25:03.215 
23:25:03.215 
23:25:03.215 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.215 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:25:03.215 Invalid `prisma.saleReturn.findMany()` invocation:
23:25:03.215 
23:25:03.215 
23:25:03.215 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.215     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:25:03.215     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:25:03.215     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:25:03.215     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:25:03.215     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:25:03.215     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:25:03.215   code: 'P6001',
23:25:03.215   meta: { modelName: 'SaleReturn' },
23:25:03.215   clientVersion: '6.15.0'
23:25:03.215 }
23:25:03.220 prisma:error 
23:25:03.220 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.220 
23:25:03.220 
23:25:03.220 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.250 prisma:error 
23:25:03.250 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.251 
23:25:03.251 
23:25:03.251 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.270 prisma:error 
23:25:03.271 Invalid `prisma.customer.findMany()` invocation:
23:25:03.271 
23:25:03.271 
23:25:03.271 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.290 prisma:error 
23:25:03.290 Invalid `prisma.customer.findMany()` invocation:
23:25:03.290 
23:25:03.290 
23:25:03.290 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.308 prisma:error 
23:25:03.308 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.308 
23:25:03.309 
23:25:03.309 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.328 prisma:error 
23:25:03.328 Invalid `prisma.saleDetail.findMany()` invocation:
23:25:03.328 
23:25:03.328 
23:25:03.328 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.347 prisma:error 
23:25:03.347 Invalid `prisma.organization.findFirst()` invocation:
23:25:03.347 
23:25:03.348 
23:25:03.348 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.370 prisma:error 
23:25:03.371 Invalid `prisma.organization.findFirst()` invocation:
23:25:03.371 
23:25:03.371 
23:25:03.371 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.386 prisma:error 
23:25:03.387 Invalid `prisma.organization.findFirst()` invocation:
23:25:03.387 
23:25:03.387 
23:25:03.387 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.407 prisma:error 
23:25:03.407 Invalid `prisma.organization.findFirst()` invocation:
23:25:03.407 
23:25:03.407 
23:25:03.407 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.464 prisma:error 
23:25:03.465 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:03.465 
23:25:03.465 
23:25:03.465 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.465 prisma:error 
23:25:03.466 Invalid `prisma.taxSlab.findMany()` invocation:
23:25:03.466 
23:25:03.466 
23:25:03.466 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.482 prisma:error 
23:25:03.482 Invalid `prisma.tDSMaster.findMany()` invocation:
23:25:03.482 
23:25:03.482 
23:25:03.482 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.502 prisma:error 
23:25:03.502 Invalid `prisma.tDSMaster.findMany()` invocation:
23:25:03.502 
23:25:03.502 
23:25:03.503 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.520 prisma:error 
23:25:03.521 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:03.521 
23:25:03.521 
23:25:03.521 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.548 prisma:error 
23:25:03.548 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:25:03.548 
23:25:03.548 
23:25:03.548 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.592 prisma:error 
23:25:03.592 Invalid `prisma.supplier.findMany()` invocation:
23:25:03.592 
23:25:03.592 
23:25:03.592 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.684 prisma:error 
23:25:03.686 Invalid `prisma.supplier.findMany()` invocation:
23:25:03.686 
23:25:03.686 
23:25:03.687 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.697 prisma:error 
23:25:03.698 Invalid `prisma.supplier.findMany()` invocation:
23:25:03.698 
23:25:03.698 
23:25:03.698 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.717 prisma:error 
23:25:03.717 Invalid `prisma.supplier.findMany()` invocation:
23:25:03.718 
23:25:03.718 
23:25:03.718 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.853 prisma:error 
23:25:03.854 Invalid `prisma.tourPackage.findMany()` invocation:
23:25:03.854 
23:25:03.854 
23:25:03.854 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.871 prisma:error 
23:25:03.874 Invalid `prisma.tourPackage.findMany()` invocation:
23:25:03.874 
23:25:03.874 
23:25:03.875 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.886 prisma:error 
23:25:03.886 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:03.886 
23:25:03.886 
23:25:03.886 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.916 prisma:error 
23:25:03.917 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:03.917 
23:25:03.917 
23:25:03.917 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.940 prisma:error 
23:25:03.941 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:03.941 
23:25:03.942 
23:25:03.942 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.960 prisma:error 
23:25:03.960 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:03.960 
23:25:03.961 
23:25:03.961 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.970 prisma:error 
23:25:03.971 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:03.971 
23:25:03.971 
23:25:03.971 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:03.996 prisma:error 
23:25:03.997 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:25:03.998 
23:25:03.998 
23:25:03.998 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.045 prisma:error 
23:25:04.046 Invalid `prisma.tourPackage.findMany()` invocation:
23:25:04.046 
23:25:04.046 
23:25:04.047 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.084 prisma:error 
23:25:04.084 Invalid `prisma.tourPackage.findMany()` invocation:
23:25:04.084 
23:25:04.085 
23:25:04.085 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.102 prisma:error 
23:25:04.102 Invalid `prisma.location.findMany()` invocation:
23:25:04.102 
23:25:04.103 
23:25:04.103 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.103 prisma:error 
23:25:04.103 Invalid `prisma.tourPackage.findMany()` invocation:
23:25:04.103 
23:25:04.103 
23:25:04.104 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.122 prisma:error 
23:25:04.122 Invalid `prisma.location.findMany()` invocation:
23:25:04.123 
23:25:04.123 
23:25:04.123 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.123 prisma:error 
23:25:04.123 Invalid `prisma.tourPackage.findMany()` invocation:
23:25:04.123 
23:25:04.123 
23:25:04.123 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.143 prisma:error 
23:25:04.143 Invalid `prisma.transfer.findMany()` invocation:
23:25:04.143 
23:25:04.144 
23:25:04.144 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.178 prisma:error 
23:25:04.179 Invalid `prisma.transfer.findMany()` invocation:
23:25:04.179 
23:25:04.179 
23:25:04.180 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:25:04.596 
 ✓ Generating static pages (175/175) 
23:25:04.613 SIGINT received - disconnecting Prisma Client
23:25:04.781    Finalizing page optimization ...
23:25:04.783    Collecting build traces ...
23:25:07.065 
23:25:07.157 Route (app)                                                               Size     First Load JS
23:25:07.157 ┌ λ /                                                                     1.6 kB         82.5 kB
23:25:07.158 ├ λ /_not-found                                                           0 B                0 B
23:25:07.158 ├ λ /accounts                                                             6.96 kB         153 kB
23:25:07.158 ├ λ /accounts/[tourPackageQueryId]                                        13.1 kB         245 kB
23:25:07.158 ├ λ /activities                                                           11.2 kB         183 kB
23:25:07.158 ├ λ /activities/[activityId]                                              6.28 kB         220 kB
23:25:07.158 ├ λ /activitiesMaster                                                     11.2 kB         183 kB
23:25:07.158 ├ λ /activitiesMaster/[activityMasterId]                                  6.29 kB         220 kB
23:25:07.158 ├ λ /api/activities                                                       0 B                0 B
23:25:07.159 ├ λ /api/activities/[activityId]                                          0 B                0 B
23:25:07.159 ├ λ /api/activitiesMaster                                                 0 B                0 B
23:25:07.159 ├ λ /api/activitiesMaster/[activityMasterId]                              0 B                0 B
23:25:07.159 ├ λ /api/associate-partners                                               0 B                0 B
23:25:07.159 ├ λ /api/associate-partners/[associatePartnerId]                          0 B                0 B
23:25:07.159 ├ λ /api/associate-partners/me                                            0 B                0 B
23:25:07.159 ├ λ /api/associate-performance                                            0 B                0 B
23:25:07.159 ├ λ /api/audit-logs                                                       0 B                0 B
23:25:07.159 ├ λ /api/bank-accounts                                                    0 B                0 B
23:25:07.160 ├ λ /api/bank-accounts/[bankAccountId]                                    0 B                0 B
23:25:07.160 ├ λ /api/bank-accounts/[bankAccountId]/recalculate                        0 B                0 B
23:25:07.160 ├ λ /api/bank-accounts/[bankAccountId]/transactions                       0 B                0 B
23:25:07.160 ├ λ /api/bank-accounts/recalculate-all                                    0 B                0 B
23:25:07.160 ├ λ /api/cash-accounts                                                    0 B                0 B
23:25:07.161 ├ λ /api/cash-accounts/[cashAccountId]                                    0 B                0 B
23:25:07.161 ├ λ /api/cash-accounts/[cashAccountId]/recalculate                        0 B                0 B
23:25:07.161 ├ λ /api/cash-accounts/[cashAccountId]/transactions                       0 B                0 B
23:25:07.161 ├ λ /api/cash-accounts/recalculate-all                                    0 B                0 B
23:25:07.161 ├ λ /api/config/meal-plans                                                0 B                0 B
23:25:07.161 ├ λ /api/config/occupancy-types                                           0 B                0 B
23:25:07.161 ├ λ /api/config/room-types                                                0 B                0 B
23:25:07.161 ├ λ /api/config/vehicle-types                                             0 B                0 B
23:25:07.161 ├ λ /api/customers                                                        0 B                0 B
23:25:07.161 ├ λ /api/customers/[customerId]                                           0 B                0 B
23:25:07.161 ├ λ /api/debug-whatsapp                                                   0 B                0 B
23:25:07.161 ├ ○ /api/debug/env-check                                                  0 B                0 B
23:25:07.161 ├ λ /api/destinations                                                     0 B                0 B
23:25:07.161 ├ λ /api/destinations/[destinationId]                                     0 B                0 B
23:25:07.161 ├ λ /api/expense-categories                                               0 B                0 B
23:25:07.161 ├ λ /api/expense-categories/[categoryId]                                  0 B                0 B
23:25:07.161 ├ λ /api/expenses                                                         0 B                0 B
23:25:07.161 ├ λ /api/expenses/[expenseId]                                             0 B                0 B
23:25:07.162 ├ λ /api/expenses/[expenseId]/pay                                         0 B                0 B
23:25:07.162 ├ λ /api/expenses/accrued                                                 0 B                0 B
23:25:07.162 ├ λ /api/export/inquiries-contacts                                        0 B                0 B
23:25:07.162 ├ λ /api/export/queries-contacts                                          0 B                0 B
23:25:07.162 ├ λ /api/financial-records                                                0 B                0 B
23:25:07.162 ├ λ /api/flight-tickets                                                   0 B                0 B
23:25:07.162 ├ λ /api/flight-tickets/[pnr]                                             0 B                0 B
23:25:07.162 ├ λ /api/generate-pdf                                                     0 B                0 B
23:25:07.162 ├ λ /api/hotels                                                           0 B                0 B
23:25:07.162 ├ λ /api/hotels/[hotelId]                                                 0 B                0 B
23:25:07.162 ├ λ /api/hotels/[hotelId]/pricing                                         0 B                0 B
23:25:07.162 ├ λ /api/hotels/[hotelId]/pricing/[pricingId]                             0 B                0 B
23:25:07.162 ├ λ /api/income-categories                                                0 B                0 B
23:25:07.162 ├ λ /api/income-categories/[categoryId]                                   0 B                0 B
23:25:07.162 ├ λ /api/incomes                                                          0 B                0 B
23:25:07.162 ├ λ /api/incomes/[incomeId]                                               0 B                0 B
23:25:07.162 ├ λ /api/inquiries                                                        0 B                0 B
23:25:07.162 ├ λ /api/inquiries/[inquiryId]                                            0 B                0 B
23:25:07.162 ├ λ /api/inquiries/[inquiryId]/actions                                    0 B                0 B
23:25:07.162 ├ λ /api/inquiries/[inquiryId]/actions/[actionId]                         0 B                0 B
23:25:07.162 ├ λ /api/inquiries/[inquiryId]/assign-staff                               0 B                0 B
23:25:07.163 ├ λ /api/inquiries/[inquiryId]/status                                     0 B                0 B
23:25:07.163 ├ λ /api/inquiries/[inquiryId]/unassign-staff                             0 B                0 B
23:25:07.163 ├ λ /api/inquiry-summary                                                  0 B                0 B
23:25:07.163 ├ λ /api/itineraries                                                      0 B                0 B
23:25:07.163 ├ λ /api/itineraries/[itineraryId]                                        0 B                0 B
23:25:07.163 ├ λ /api/itinerariesMaster                                                0 B                0 B
23:25:07.163 ├ λ /api/itinerariesMaster/[itineraryMasterId]                            0 B                0 B
23:25:07.163 ├ λ /api/itineraryMaster                                                  0 B                0 B
23:25:07.163 ├ λ /api/locationBySlug/[slug]                                            0 B                0 B
23:25:07.163 ├ λ /api/locations                                                        0 B                0 B
23:25:07.163 ├ λ /api/locations-suppliers                                              0 B                0 B
23:25:07.163 ├ λ /api/locations/[locationId]                                           0 B                0 B
23:25:07.163 ├ λ /api/locations/[locationId]/seasonal-periods                          0 B                0 B
23:25:07.163 ├ λ /api/locations/[locationId]/seasonal-periods/[periodId]               0 B                0 B
23:25:07.163 ├ λ /api/me/role                                                          0 B                0 B
23:25:07.163 ├ λ /api/meal-plans                                                       0 B                0 B
23:25:07.163 ├ λ /api/meal-plans/[mealPlanId]                                          0 B                0 B
23:25:07.163 ├ λ /api/notifications                                                    0 B                0 B
23:25:07.163 ├ λ /api/notifications/[notificationId]                                   0 B                0 B
23:25:07.164 ├ λ /api/notifications/mark-all-read                                      0 B                0 B
23:25:07.164 ├ λ /api/occupancy-types                                                  0 B                0 B
23:25:07.164 ├ λ /api/occupancy-types/[occupancyTypeId]                                0 B                0 B
23:25:07.164 ├ λ /api/operational-staff                                                0 B                0 B
23:25:07.164 ├ λ /api/operational-staff/[staffId]                                      0 B                0 B
23:25:07.164 ├ λ /api/ops/my-inquiries                                                 0 B                0 B
23:25:07.164 ├ λ /api/ops/my-inquiries/[inquiryId]                                     0 B                0 B
23:25:07.164 ├ λ /api/package-variants                                                 0 B                0 B
23:25:07.164 ├ λ /api/package-variants/[variantId]                                     0 B                0 B
23:25:07.164 ├ λ /api/package-variants/[variantId]/hotel-mappings                      0 B                0 B
23:25:07.164 ├ λ /api/payments                                                         0 B                0 B
23:25:07.164 ├ λ /api/payments/[paymentId]                                             0 B                0 B
23:25:07.164 ├ λ /api/pricing-attributes                                               0 B                0 B
23:25:07.164 ├ λ /api/pricing-attributes/[pricingAttributeId]                          0 B                0 B
23:25:07.164 ├ λ /api/pricing-components                                               0 B                0 B
23:25:07.164 ├ λ /api/pricing-components/[pricingComponentId]                          0 B                0 B
23:25:07.164 ├ λ /api/pricing/calculate                                                0 B                0 B
23:25:07.164 ├ ○ /api/public-debug                                                     0 B                0 B
23:25:07.164 ├ λ /api/purchase-returns                                                 0 B                0 B
23:25:07.164 ├ λ /api/purchase-returns/[purchaseReturnId]                              0 B                0 B
23:25:07.165 ├ λ /api/purchases                                                        0 B                0 B
23:25:07.165 ├ λ /api/purchases/[purchaseId]                                           0 B                0 B
23:25:07.165 ├ λ /api/receipts                                                         0 B                0 B
23:25:07.165 ├ λ /api/receipts/[receiptId]                                             0 B                0 B
23:25:07.165 ├ λ /api/report/tds/summary                                               0 B                0 B
23:25:07.165 ├ λ /api/room-types                                                       0 B                0 B
23:25:07.165 ├ λ /api/room-types/[roomTypeId]                                          0 B                0 B
23:25:07.165 ├ λ /api/sale-returns                                                     0 B                0 B
23:25:07.165 ├ λ /api/sale-returns/[saleReturnId]                                      0 B                0 B
23:25:07.165 ├ λ /api/sales                                                            0 B                0 B
23:25:07.165 ├ λ /api/sales/[saleId]                                                   0 B                0 B
23:25:07.179 ├ λ /api/sales/[saleId]/items                                             0 B                0 B
23:25:07.179 ├ λ /api/searchTermLocations/[searchTerm]                                 0 B                0 B
23:25:07.179 ├ λ /api/settings/organization                                            0 B                0 B
23:25:07.179 ├ λ /api/settings/organization/[organizationId]                           0 B                0 B
23:25:07.179 ├ λ /api/settings/tax-slabs                                               0 B                0 B
23:25:07.180 ├ λ /api/settings/tax-slabs/[taxSlabId]                                   0 B                0 B
23:25:07.180 ├ λ /api/settings/tds-sections                                            0 B                0 B
23:25:07.180 ├ λ /api/settings/tds-sections/[id]                                       0 B                0 B
23:25:07.180 ├ λ /api/settings/units                                                   0 B                0 B
23:25:07.180 ├ λ /api/settings/units/[unitId]                                          0 B                0 B
23:25:07.180 ├ λ /api/suppliers                                                        0 B                0 B
23:25:07.180 ├ λ /api/suppliers/[supplierId]                                           0 B                0 B
23:25:07.180 ├ λ /api/tds/challans                                                     0 B                0 B
23:25:07.180 ├ λ /api/tds/deposit                                                      0 B                0 B
23:25:07.180 ├ λ /api/tds/transactions                                                 0 B                0 B
23:25:07.180 ├ ○ /api/test-env                                                         0 B                0 B
23:25:07.180 ├ λ /api/tourPackageBySlug/[slug]                                         0 B                0 B
23:25:07.180 ├ λ /api/tourPackageQuery                                                 0 B                0 B
23:25:07.180 ├ λ /api/tourPackageQuery/[tourPackageQueryId]                            0 B                0 B
23:25:07.180 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/accounting                 0 B                0 B
23:25:07.180 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/confirm                    0 B                0 B
23:25:07.180 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/hotel-details              0 B                0 B
23:25:07.180 ├ λ /api/tourPackages                                                     0 B                0 B
23:25:07.180 ├ λ /api/tourPackages/[tourPackageId]                                     0 B                0 B
23:25:07.180 ├ λ /api/tourPackages/[tourPackageId]/field-update                        0 B                0 B
23:25:07.180 ├ λ /api/tourPackages/[tourPackageId]/pricing                             0 B                0 B
23:25:07.180 ├ λ /api/tourPackages/[tourPackageId]/pricing/[pricingId]                 0 B                0 B
23:25:07.181 ├ λ /api/tourPackages/[tourPackageId]/related                             0 B                0 B
23:25:07.181 ├ λ /api/tourPackages/reorder                                             0 B                0 B
23:25:07.181 ├ λ /api/tourPackagesForWebsite                                           0 B                0 B
23:25:07.181 ├ λ /api/transfers                                                        0 B                0 B
23:25:07.184 ├ λ /api/transfers/[transferId]                                           0 B                0 B
23:25:07.184 ├ λ /api/transport-pricing                                                0 B                0 B
23:25:07.184 ├ λ /api/transport-pricing/[transportPricingId]                           0 B                0 B
23:25:07.184 ├ λ /api/uploads/images                                                   0 B                0 B
23:25:07.184 ├ λ /api/vehicle-types                                                    0 B                0 B
23:25:07.184 ├ λ /api/vehicle-types/[vehicleTypeId]                                    0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/campaigns                                               0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/campaigns/[id]                                          0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/campaigns/[id]/recipients                               0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/campaigns/[id]/send                                     0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/campaigns/[id]/stats                                    0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/catalog                                                 0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/catalog/packages                                        0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/catalog/packages/[packageId]                            0 B                0 B
23:25:07.184 ├ λ /api/whatsapp/catalog/packages/[packageId]/sync                       0 B                0 B
23:25:07.184 ├ ○ /api/whatsapp/config                                                  0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/customers                                               0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/customers/[id]                                          0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/customers/export                                        0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/customers/import                                        0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/database-health                                         0 B                0 B
23:25:07.185 ├ ○ /api/whatsapp/env-check                                               0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/flow-endpoint                                           0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/flows/manage                                            0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/flows/templates                                         0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/flows/versions                                          0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/media/[mediaId]                                         0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/messages                                                0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/send                                                    0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/send-message                                            0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/send-template                                           0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/templates                                               0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/templates/create                                        0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/templates/manage                                        0 B                0 B
23:25:07.185 ├ λ /api/whatsapp/templates/preview                                       0 B                0 B
23:25:07.186 ├ ○ /api/whatsapp/test-key                                                0 B                0 B
23:25:07.186 ├ λ /api/whatsapp/webhook                                                 0 B                0 B
23:25:07.186 ├ λ /associate-partners                                                   10.2 kB         187 kB
23:25:07.186 ├ λ /associate-partners/[associatePartnerId]                              7.35 kB         172 kB
23:25:07.186 ├ λ /audit-logs                                                           9.13 kB         150 kB
23:25:07.186 ├ λ /bank-book                                                            4.92 kB         123 kB
23:25:07.186 ├ λ /bank-book/[bankAccountId]                                            8.62 kB         412 kB
23:25:07.186 ├ λ /bankaccounts                                                         12.1 kB         407 kB
23:25:07.186 ├ λ /bankaccounts/[bankAccountId]                                         5.18 kB         170 kB
23:25:07.186 ├ λ /cash-book                                                            26.3 kB         145 kB
23:25:07.186 ├ λ /cash-book/[cashAccountId]                                            8.43 kB         412 kB
23:25:07.186 ├ λ /cashaccounts                                                         12.2 kB         407 kB
23:25:07.186 ├ λ /cashaccounts/[cashAccountId]                                         8.37 kB         173 kB
23:25:07.186 ├ λ /customers                                                            1.89 kB         280 kB
23:25:07.186 ├ λ /customers/[customerId]                                               38.5 kB         258 kB
23:25:07.186 ├ λ /customers/[customerId]/ledger                                        7.77 kB         380 kB
23:25:07.186 ├ λ /customers/ledger                                                     8.15 kB         400 kB
23:25:07.187 ├ λ /destinations                                                         11.4 kB         184 kB
23:25:07.187 ├ λ /destinations/[destinationId]                                         9.9 kB          224 kB
23:25:07.187 ├ λ /expense-categories                                                   8.3 kB          185 kB
23:25:07.187 ├ λ /expense-categories/[categoryId]                                      8.63 kB         173 kB
23:25:07.187 ├ λ /expenses                                                             13.9 kB         435 kB
23:25:07.187 ├ λ /expenses/[expenseId]                                                 3.85 kB         243 kB
23:25:07.187 ├ λ /expenses/[expenseId]/view                                            6.01 kB         102 kB
23:25:07.187 ├ λ /expenses/[expenseId]/voucher                                         152 B           114 kB
23:25:07.187 ├ λ /expenses/accrued                                                     10.3 kB         436 kB
23:25:07.187 ├ λ /expenses/ledger                                                      14.4 kB         436 kB
23:25:07.187 ├ λ /expenses/new                                                         4.91 kB         245 kB
23:25:07.187 ├ λ /export-contacts                                                      9.29 kB         106 kB
23:25:07.187 ├ λ /fetchaccounts/[tourPackageQueryId]                                   17.8 kB         433 kB
23:25:07.187 ├ λ /flight-tickets                                                       11.3 kB         196 kB
23:25:07.187 ├ λ /flight-tickets/[pnr]                                                 8.22 kB         123 kB
23:25:07.188 ├ λ /flight-tickets/[pnr]/edit                                            185 B           230 kB
23:25:07.188 ├ λ /flight-tickets/[pnr]/print                                           13.6 kB         134 kB
23:25:07.188 ├ λ /flight-tickets/new                                                   185 B           230 kB
23:25:07.188 ├ λ /hotels                                                               1.54 kB         184 kB
23:25:07.188 ├ λ /hotels/[hotelId]                                                     6.59 kB         228 kB
23:25:07.188 ├ λ /hotels/[hotelId]/pricing                                             8.86 kB         228 kB
23:25:07.188 ├ λ /income-categories                                                    8.3 kB          185 kB
23:25:07.188 ├ λ /income-categories/[categoryId]                                       8.63 kB         173 kB
23:25:07.188 ├ λ /incomes                                                              14.4 kB         455 kB
23:25:07.188 ├ λ /incomes/[incomeId]                                                   2.11 kB         242 kB
23:25:07.188 ├ λ /incomes/[incomeId]/edit                                              2.48 kB         261 kB
23:25:07.188 ├ λ /incomes/[incomeId]/view                                              5.94 kB         102 kB
23:25:07.188 ├ λ /incomes/[incomeId]/voucher                                           152 B           114 kB
23:25:07.188 ├ λ /incomes/ledger                                                       13.6 kB         435 kB
23:25:07.188 ├ λ /incomes/new                                                          3.53 kB         262 kB
23:25:07.188 ├ λ /inquiries                                                            42.6 kB         550 kB
23:25:07.188 ├ λ /inquiries/[inquiryId]                                                10.5 kB         249 kB
23:25:07.188 ├ λ /itineraries                                                          1.31 kB         184 kB
23:25:07.189 ├ λ /itineraries/[itineraryId]                                            10.4 kB         224 kB
23:25:07.189 ├ λ /itinerariesMaster                                                    1.32 kB         184 kB
23:25:07.189 ├ λ /itinerariesMaster/[itineraryMasterId]                                7.9 kB          225 kB
23:25:07.189 ├ λ /ledger                                                               4.36 kB         402 kB
23:25:07.189 ├ λ /ledger/category/[category]                                           3.46 kB         388 kB
23:25:07.189 ├ λ /locations                                                            11.6 kB         184 kB
23:25:07.189 ├ λ /locations-suppliers                                                  7.4 kB          108 kB
23:25:07.189 ├ λ /locations/[locationId]                                               9.31 kB         207 kB
23:25:07.189 ├ λ /locations/[locationId]/seasonal-periods                              5.26 kB         198 kB
23:25:07.189 ├ λ /operational-staff                                                    13.1 kB         149 kB
23:25:07.189 ├ λ /ops                                                                  9.91 kB         135 kB
23:25:07.189 ├ λ /ops/inquiry/[inquiryId]                                              13.1 kB         124 kB
23:25:07.189 ├ λ /payments                                                             3.34 kB         139 kB
23:25:07.189 ├ λ /payments/[paymentId]                                                 2.21 kB         243 kB
23:25:07.189 ├ λ /payments/[paymentId]/voucher                                         152 B           114 kB
23:25:07.189 ├ λ /payments/ledger                                                      13.5 kB         435 kB
23:25:07.189 ├ λ /purchase-returns                                                     11.3 kB         184 kB
23:25:07.189 ├ λ /purchase-returns/[purchaseReturnId]                                  186 B           211 kB
23:25:07.189 ├ λ /purchase-returns/new                                                 186 B           211 kB
23:25:07.189 ├ λ /purchases                                                            3.46 kB         139 kB
23:25:07.189 ├ λ /purchases/[purchaseId]                                               456 B           223 kB
23:25:07.189 ├ λ /purchases/[purchaseId]/items                                         8.73 kB         220 kB
23:25:07.190 ├ λ /purchases/[purchaseId]/voucher                                       151 B           114 kB
23:25:07.191 ├ λ /purchases/ledger                                                     3.81 kB         436 kB
23:25:07.191 ├ λ /purchases/new                                                        237 B           223 kB
23:25:07.191 ├ λ /receipts                                                             3.36 kB         139 kB
23:25:07.192 ├ λ /receipts/[receiptId]                                                 2.21 kB         243 kB
23:25:07.192 ├ λ /receipts/[receiptId]/voucher                                         151 B           114 kB
23:25:07.192 ├ λ /receipts/ledger                                                      13.4 kB         435 kB
23:25:07.192 ├ λ /reports/associatePerformance                                         3.19 kB         404 kB
23:25:07.192 ├ λ /reports/confirmedQueries                                             3.5 kB          207 kB
23:25:07.192 ├ λ /reports/gst                                                          5.23 kB         288 kB
23:25:07.192 ├ λ /reports/inquirySummary                                               3.08 kB         404 kB
23:25:07.192 ├ λ /reports/profit                                                       5.98 kB         282 kB
23:25:07.192 ├ λ /reports/unconfirmedQueries                                           1.6 kB          184 kB
23:25:07.192 ├ λ /reports/upcomingTrips                                                3.83 kB         217 kB
23:25:07.192 ├ λ /sale-returns                                                         12.1 kB         194 kB
23:25:07.192 ├ λ /sale-returns/[saleReturnId]                                          185 B           210 kB
23:25:07.192 ├ λ /sale-returns/[saleReturnId]/voucher                                  152 B           114 kB
23:25:07.192 ├ λ /sale-returns/new                                                     185 B           210 kB
23:25:07.192 ├ λ /sales                                                                3.45 kB         139 kB
23:25:07.192 ├ λ /sales/[saleId]                                                       2.9 kB          223 kB
23:25:07.193 ├ λ /sales/[saleId]/items                                                 8.73 kB         220 kB
23:25:07.193 ├ λ /sales/[saleId]/voucher                                               152 B           114 kB
23:25:07.193 ├ λ /sales/ledger                                                         3.52 kB         435 kB
23:25:07.193 ├ λ /sales/new                                                            12 kB           223 kB
23:25:07.193 ├ λ /settings/invoice                                                     4.46 kB         155 kB
23:25:07.193 ├ λ /settings/meal-plans                                                  5.5 kB          147 kB
23:25:07.193 ├ λ /settings/meal-plans/[mealPlanId]                                     171 B           173 kB
23:25:07.193 ├ λ /settings/meal-plans/new                                              170 B           173 kB
23:25:07.193 ├ λ /settings/occupancy-types                                             9.42 kB         178 kB
23:25:07.193 ├ λ /settings/occupancy-types/[occupancyTypeId]                           170 B           174 kB
23:25:07.193 ├ λ /settings/occupancy-types/new                                         169 B           174 kB
23:25:07.193 ├ λ /settings/organization                                                6.31 kB         191 kB
23:25:07.193 ├ λ /settings/pricing-attributes                                          8.58 kB         185 kB
23:25:07.193 ├ λ /settings/pricing-attributes/[pricingAttributeId]                     172 B           173 kB
23:25:07.193 ├ λ /settings/pricing-attributes/new                                      170 B           173 kB
23:25:07.193 ├ λ /settings/pricing-components                                          8.66 kB         185 kB
23:25:07.193 ├ λ /settings/pricing-components/[pricingComponentId]                     179 B           195 kB
23:25:07.194 ├ λ /settings/pricing-components/new                                      179 B           195 kB
23:25:07.194 ├ λ /settings/room-types                                                  5.5 kB          147 kB
23:25:07.194 ├ λ /settings/room-types/[roomTypeId]                                     170 B           173 kB
23:25:07.194 ├ λ /settings/room-types/new                                              169 B           173 kB
23:25:07.194 ├ λ /settings/tax-slabs                                                   11.4 kB         184 kB
23:25:07.194 ├ λ /settings/tax-slabs/[taxSlabId]                                       8.65 kB         173 kB
23:25:07.194 ├ λ /settings/tds                                                         7.1 kB          117 kB
23:25:07.194 ├ λ /settings/units                                                       11.4 kB         184 kB
23:25:07.194 ├ λ /settings/units/[unitId]                                              8.63 kB         173 kB
23:25:07.194 ├ λ /settings/vehicle-types                                               5.51 kB         147 kB
23:25:07.194 ├ λ /settings/vehicle-types/[vehicleTypeId]                               172 B           173 kB
23:25:07.194 ├ λ /settings/vehicle-types/new                                           171 B           173 kB
23:25:07.194 ├ λ /sign-in/[[...sign-in]]                                               2.76 kB         102 kB
23:25:07.195 ├ λ /sign-up/[[...sign-up]]                                               2.76 kB         102 kB
23:25:07.195 ├ λ /suppliers                                                            3.19 kB         215 kB
23:25:07.195 ├ λ /suppliers/[supplierId]                                               3.76 kB         184 kB
23:25:07.195 ├ λ /suppliers/[supplierId]/ledger                                        13.9 kB         427 kB
23:25:07.195 ├ λ /suppliers/ledger                                                     8.66 kB         410 kB
23:25:07.195 ├ λ /tds/challans                                                         6.66 kB         135 kB
23:25:07.195 ├ λ /tds/reports                                                          8.36 kB         105 kB
23:25:07.195 ├ λ /tourPackageCreateCopy                                                11.2 kB         183 kB
23:25:07.195 ├ λ /tourPackageCreateCopy/[tourPackageCreateCopyId]                      14.4 kB         502 kB
23:25:07.195 ├ λ /tourPackageDisplay/[tourPackageDisplayId]                            519 B          93.4 kB
23:25:07.195 ├ λ /tourPackageFromTourPackageQuery/[tourPackageFromTourPackageQueryId]  13.4 kB         501 kB
23:25:07.196 ├ λ /tourPackagePDFGenerator/[tourPackageId]                              9.97 kB        90.9 kB
23:25:07.196 ├ λ /tourPackagePDFGeneratorWithVariants/[tourPackageId]                  9.55 kB        90.4 kB
23:25:07.196 ├ λ /tourPackageQuery                                                     3.66 kB         200 kB
23:25:07.196 ├ λ /tourPackageQuery/[tourPackageQueryId]                                7.57 kB         566 kB
23:25:07.196 ├ λ /tourPackageQueryCreateCopy                                           11.2 kB         183 kB
23:25:07.196 ├ λ /tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]            6.33 kB         559 kB
23:25:07.196 ├ λ /tourPackageQueryDisplay                                              4.49 kB         212 kB
23:25:07.196 ├ λ /tourPackageQueryDisplay/[tourPackageQueryId]                         9.08 kB         127 kB
23:25:07.196 ├ λ /tourpackagequeryfrominquiry/[inquiryId]                              7.55 kB         561 kB
23:25:07.196 ├ λ /tourpackagequeryfrominquiry/associate/[inquiryId]                    34.2 kB         567 kB
23:25:07.199 ├ λ /tourPackageQueryFromTourPackage/[tourPackageQueryFromTourPackageId]  19 kB           530 kB
23:25:07.199 ├ λ /tourPackageQueryHotelUpdate/[tourPackageQueryId]                     12.9 kB         251 kB
23:25:07.199 ├ λ /tourPackageQueryPDFGenerator/[tourPackageQueryId]                    11.9 kB         100 kB
23:25:07.200 ├ λ /tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]        9.25 kB        97.4 kB
23:25:07.200 ├ λ /tourPackageQueryVoucherDisplay/[tourPackageQueryVoucherId]           10.9 kB         136 kB
23:25:07.200 ├ λ /tourPackages                                                         10.4 kB         218 kB
23:25:07.200 ├ λ /tourPackages/[tourPackageId]                                         31.6 kB         547 kB
23:25:07.201 ├ λ /tourPackages/[tourPackageId]/pricing                                 12.2 kB         236 kB
23:25:07.201 ├ λ /tourPackages/website-management                                      11.5 kB         222 kB
23:25:07.201 ├ λ /transfers                                                            9.12 kB         244 kB
23:25:07.201 ├ λ /transfers/[transferId]                                               4.4 kB          210 kB
23:25:07.201 ├ λ /transport-pricing                                                    12.4 kB         191 kB
23:25:07.201 ├ λ /transport-pricing/[transportPricingId]                               9.08 kB         220 kB
23:25:07.201 ├ λ /transport-pricing/new                                                9.33 kB         231 kB
23:25:07.201 ├ λ /viewpdfpage/[PDFPageID]                                              446 kB          544 kB
23:25:07.201 ├ λ /whatsapp                                                             6.72 kB         103 kB
23:25:07.201 ├ λ /whatsapp/campaigns                                                   11.4 kB         108 kB
23:25:07.201 ├ λ /whatsapp/campaigns/[id]                                              9.76 kB         129 kB
23:25:07.201 ├ λ /whatsapp/campaigns/[id]/stats                                        4.47 kB         108 kB
23:25:07.201 ├ λ /whatsapp/campaigns/new                                               15.8 kB         159 kB
23:25:07.201 ├ λ /whatsapp/catalog                                                     19.1 kB         169 kB
23:25:07.201 ├ λ /whatsapp/chat                                                        102 kB          260 kB
23:25:07.201 ├ λ /whatsapp/customers                                                   19.9 kB         152 kB
23:25:07.201 ├ λ /whatsapp/flows                                                       38.1 kB         180 kB
23:25:07.202 ├ λ /whatsapp/media                                                       9.7 kB          111 kB
23:25:07.202 └ λ /whatsapp/templates                                                   18.9 kB         155 kB
23:25:07.202 + First Load JS shared by all                                             80.9 kB
23:25:07.202   ├ chunks/2472-eb9bc76fb9bc33cb.js                                       27.6 kB
23:25:07.202   ├ chunks/fd9d1056-294e6a544314e9b9.js                                   51.1 kB
23:25:07.202   ├ chunks/main-app-8ed6d57d180fb331.js                                   237 B
23:25:07.202   └ chunks/webpack-394aeac5243dcd56.js                                    1.97 kB
23:25:07.202 
23:25:07.202 
23:25:07.202 ƒ Middleware                                                              205 kB
23:25:07.207 
23:25:07.207 λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
23:25:07.207 ○  (Static)  automatically rendered as static HTML (uses no initial props)
23:25:07.207 
23:25:08.116 Traced Next.js server files in: 389.929ms
23:25:09.950 WARNING: Unable to find source file for page /_not-found with extensions: tsx, ts, jsx, js, this can cause functions config from `vercel.json` to not be applied
23:25:10.124 Created all serverless functions in: 2.008s
23:25:10.309 Collected static files (public/, static/, .next/static): 51.77ms
23:25:10.744 Build Completed in /vercel/output [3m]
23:25:11.238 Deploying outputs...
23:25:35.683 Deployment completed
23:25:36.692 Creating build cache...
23:26:13.668 Created build cache: 36.972s
23:26:13.669 Uploading build cache [398.50 MB]
23:26:18.596 Build cache uploaded: 4.930s