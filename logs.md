23:38:00.174 Running build in Washington, D.C., USA (East) – iad1
23:38:00.176 Build machine configuration: 2 cores, 8 GB
23:38:00.562 Cloning github.com/rushabhsmehta/next13-ecommerce-admin (Branch: master, Commit: 07d1046)
23:38:02.168 Cloning completed: 1.606s
23:38:03.826 Restored build cache from previous deployment (EjvT3iJKrQ9iqYwMEb16BhZLufVM)
23:38:04.709 Running "vercel build"
23:38:05.077 Vercel CLI 48.6.0
23:38:05.505 Installing dependencies...
23:38:08.325 
23:38:08.325 > next13-ecommerce-admin@0.1.0 postinstall
23:38:08.326 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma
23:38:08.326 
23:38:11.020 Prisma schema loaded from schema.prisma
23:38:12.484 
23:38:12.485 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 574ms
23:38:12.485 
23:38:12.486 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:38:12.486 
23:38:12.486 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:38:12.486 
23:38:13.686 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:38:14.257 ┌─────────────────────────────────────────────────────────┐
23:38:14.257 │  Update available 6.15.0 -> 6.18.0                      │
23:38:14.258 │  Run the following to update                            │
23:38:14.258 │    npm i --save-dev prisma@latest                       │
23:38:14.258 │    npm i @prisma/client@latest                          │
23:38:14.258 └─────────────────────────────────────────────────────────┘
23:38:14.258 
23:38:14.259 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 287ms
23:38:14.259 
23:38:14.259 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:38:14.259 
23:38:14.259 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:38:14.259 
23:38:14.280 
23:38:14.280 removed 1 package in 8s
23:38:14.280 
23:38:14.280 200 packages are looking for funding
23:38:14.281   run `npm fund` for details
23:38:14.309 Detected Next.js version: 13.5.7
23:38:14.310 Running "npm run vercel-build"
23:38:14.414 
23:38:14.414 > next13-ecommerce-admin@0.1.0 vercel-build
23:38:14.415 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build
23:38:14.415 
23:38:15.588 Prisma schema loaded from schema.prisma
23:38:16.901 
23:38:16.902 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 574ms
23:38:16.902 
23:38:16.902 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:38:16.902 
23:38:16.902 Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
23:38:16.903 
23:38:18.076 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:38:18.678 
23:38:18.678 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 306ms
23:38:18.678 
23:38:18.679 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:38:18.679 
23:38:18.679 Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
23:38:18.679 
23:38:19.489    Creating an optimized production build ...
23:38:43.119  ✓ Compiled successfully
23:38:43.129    Linting and checking validity of types ...
23:39:15.920    Collecting page data ...
23:39:23.782    Generating static pages (0/175) ...
23:39:31.461 
   Generating static pages (43/175) 
23:39:33.094 prisma:error 
23:39:33.095 Invalid `prisma.associatePartner.findMany()` invocation:
23:39:33.095 
23:39:33.096 
23:39:33.096 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:33.177 prisma:error 
23:39:33.178 Invalid `prisma.associatePartner.findMany()` invocation:
23:39:33.178 
23:39:33.178 
23:39:33.179 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:34.519 
   Generating static pages (87/175) 
23:39:34.695 prisma:error 
23:39:34.695 Invalid `prisma.mealPlan.findMany()` invocation:
23:39:34.695 
23:39:34.695 
23:39:34.695 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:34.714 prisma:error 
23:39:34.715 Invalid `prisma.mealPlan.findMany()` invocation:
23:39:34.715 
23:39:34.715 
23:39:34.715 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:34.872 prisma:error 
23:39:34.873 Invalid `prisma.occupancyType.findMany()` invocation:
23:39:34.873 
23:39:34.874 
23:39:34.874 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:34.909 prisma:error 
23:39:34.909 Invalid `prisma.occupancyType.findMany()` invocation:
23:39:34.910 
23:39:34.910 
23:39:34.910 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.034 prisma:error 
23:39:35.034 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:39:35.035 
23:39:35.035 
23:39:35.042 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.042 prisma:error 
23:39:35.042 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:39:35.042 
23:39:35.042 
23:39:35.043 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.347 prisma:error 
23:39:35.350 Invalid `prisma.pricingComponent.findMany()` invocation:
23:39:35.353 
23:39:35.353 
23:39:35.353 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.380 prisma:error 
23:39:35.380 Invalid `prisma.pricingComponent.findMany()` invocation:
23:39:35.380 
23:39:35.380 
23:39:35.380 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.440 prisma:error 
23:39:35.441 Invalid `prisma.roomType.findMany()` invocation:
23:39:35.441 
23:39:35.441 
23:39:35.441 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.462 prisma:error 
23:39:35.463 Invalid `prisma.roomType.findMany()` invocation:
23:39:35.463 
23:39:35.463 
23:39:35.463 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.592 prisma:error 
23:39:35.594 Invalid `prisma.vehicleType.findMany()` invocation:
23:39:35.594 
23:39:35.595 
23:39:35.595 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.595 prisma:error 
23:39:35.596 Invalid `prisma.vehicleType.findMany()` invocation:
23:39:35.596 
23:39:35.596 
23:39:35.596 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.656 prisma:error 
23:39:35.657 Invalid `prisma.location.findMany()` invocation:
23:39:35.658 
23:39:35.659 
23:39:35.659 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.659 prisma:error 
23:39:35.659 Invalid `prisma.location.findMany()` invocation:
23:39:35.659 
23:39:35.659 
23:39:35.660 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.697 prisma:error 
23:39:35.697 Invalid `prisma.transportPricing.findMany()` invocation:
23:39:35.697 
23:39:35.697 
23:39:35.697 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.697 prisma:error 
23:39:35.697 Invalid `prisma.transportPricing.findMany()` invocation:
23:39:35.698 
23:39:35.698 
23:39:35.698 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.748 prisma:error 
23:39:35.749 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:35.749 
23:39:35.749 
23:39:35.749 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.749 prisma:error 
23:39:35.749 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:35.749 
23:39:35.750 
23:39:35.750 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.781 prisma:error 
23:39:35.781 Invalid `prisma.activity.findMany()` invocation:
23:39:35.782 
23:39:35.782 
23:39:35.782 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.795 prisma:error 
23:39:35.795 Invalid `prisma.activity.findMany()` invocation:
23:39:35.795 
23:39:35.796 
23:39:35.796 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.815 prisma:error 
23:39:35.815 Invalid `prisma.activityMaster.findMany()` invocation:
23:39:35.815 
23:39:35.815 
23:39:35.815 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.828 prisma:error 
23:39:35.828 Invalid `prisma.activityMaster.findMany()` invocation:
23:39:35.828 
23:39:35.828 
23:39:35.829 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.867 prisma:error 
23:39:35.867 Invalid `prisma.bankAccount.findMany()` invocation:
23:39:35.867 
23:39:35.867 
23:39:35.867 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.913 prisma:error 
23:39:35.914 Invalid `prisma.bankAccount.findMany()` invocation:
23:39:35.914 
23:39:35.914 
23:39:35.914 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.943 prisma:error 
23:39:35.943 Invalid `prisma.cashAccount.findMany()` invocation:
23:39:35.943 
23:39:35.944 
23:39:35.945 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.945 prisma:error 
23:39:35.945 Invalid `prisma.cashAccount.findMany()` invocation:
23:39:35.945 
23:39:35.946 
23:39:35.946 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.981 prisma:error 
23:39:35.982 Invalid `prisma.customer.findMany()` invocation:
23:39:35.982 
23:39:35.982 
23:39:35.983 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:35.983 prisma:error 
23:39:35.983 Invalid `prisma.customer.findMany()` invocation:
23:39:35.983 
23:39:35.984 
23:39:35.984 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.076 prisma:error 
23:39:36.077 Invalid `prisma.customer.findMany()` invocation:
23:39:36.077 
23:39:36.078 
23:39:36.078 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.113 prisma:error 
23:39:36.114 Invalid `prisma.customer.findMany()` invocation:
23:39:36.114 
23:39:36.114 
23:39:36.114 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.225 prisma:error 
23:39:36.226 Invalid `prisma.expenseCategory.findMany()` invocation:
23:39:36.226 
23:39:36.226 
23:39:36.226 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.226 prisma:error 
23:39:36.226 Invalid `prisma.expenseCategory.findMany()` invocation:
23:39:36.227 
23:39:36.227 
23:39:36.227 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.249 prisma:error 
23:39:36.249 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:36.249 
23:39:36.250 
23:39:36.250 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.278 prisma:error 
23:39:36.279 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:36.279 
23:39:36.280 
23:39:36.280 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.333 prisma:error 
23:39:36.334 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:36.334 
23:39:36.334 
23:39:36.334 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.334 prisma:error 
23:39:36.334 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:36.335 
23:39:36.335 
23:39:36.335 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.396 prisma:error 
23:39:36.397 Invalid `prisma.expenseCategory.findMany()` invocation:
23:39:36.397 
23:39:36.397 
23:39:36.397 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.397 prisma:error 
23:39:36.397 Invalid `prisma.bankAccount.findMany()` invocation:
23:39:36.397 
23:39:36.397 
23:39:36.397 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.397 prisma:error 
23:39:36.398 Invalid `prisma.cashAccount.findMany()` invocation:
23:39:36.398 
23:39:36.398 
23:39:36.398 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.424 prisma:error 
23:39:36.424 Invalid `prisma.expenseCategory.findMany()` invocation:
23:39:36.424 
23:39:36.425 
23:39:36.425 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.425 prisma:error 
23:39:36.426 Invalid `prisma.bankAccount.findMany()` invocation:
23:39:36.426 
23:39:36.426 
23:39:36.426 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.426 prisma:error 
23:39:36.426 Invalid `prisma.cashAccount.findMany()` invocation:
23:39:36.426 
23:39:36.426 
23:39:36.426 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.462 prisma:error 
23:39:36.463 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:36.463 
23:39:36.463 
23:39:36.463 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.463 prisma:error 
23:39:36.463 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:36.464 
23:39:36.464 
23:39:36.464 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.644 prisma:error 
23:39:36.645 Invalid `prisma.hotel.findMany()` invocation:
23:39:36.645 
23:39:36.645 
23:39:36.646 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.675 prisma:error 
23:39:36.676 Invalid `prisma.hotel.findMany()` invocation:
23:39:36.676 
23:39:36.676 
23:39:36.676 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.698 prisma:error 
23:39:36.698 Invalid `prisma.incomeCategory.findMany()` invocation:
23:39:36.698 
23:39:36.698 
23:39:36.698 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.713 prisma:error 
23:39:36.713 Invalid `prisma.incomeCategory.findMany()` invocation:
23:39:36.713 
23:39:36.714 
23:39:36.714 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.739 prisma:error 
23:39:36.740 Invalid `prisma.incomeDetail.findMany()` invocation:
23:39:36.740 
23:39:36.740 
23:39:36.740 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.758 prisma:error 
23:39:36.759 Invalid `prisma.incomeDetail.findMany()` invocation:
23:39:36.759 
23:39:36.759 
23:39:36.759 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.997 prisma:error 
23:39:36.997 Invalid `prisma.itinerary.findMany()` invocation:
23:39:36.997 
23:39:36.997 
23:39:36.997 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:36.998 prisma:error 
23:39:36.998 Invalid `prisma.itinerary.findMany()` invocation:
23:39:36.998 
23:39:36.998 
23:39:36.998 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:37.033 prisma:error 
23:39:37.033 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:39:37.033 
23:39:37.033 
23:39:37.033 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:37.074 prisma:error 
23:39:37.075 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:39:37.075 
23:39:37.075 
23:39:37.075 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:37.095 prisma:error 
23:39:37.095 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:37.095 
23:39:37.095 
23:39:37.095 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:38.055 prisma:error 
23:39:38.055 Invalid `prisma.expenseDetail.findMany()` invocation:
23:39:38.056 
23:39:38.056 
23:39:38.056 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:38.104 prisma:error 
23:39:38.104 Invalid `prisma.location.findMany()` invocation:
23:39:38.105 
23:39:38.105 
23:39:38.105 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:38.105 prisma:error 
23:39:38.105 Invalid `prisma.location.findMany()` invocation:
23:39:38.105 
23:39:38.105 
23:39:38.105 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:38.139 prisma:error 
23:39:38.139 Invalid `prisma.location.findMany()` invocation:
23:39:38.139 
23:39:38.139 
23:39:38.140 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:38.140 prisma:error 
23:39:38.140 Invalid `prisma.location.findMany()` invocation:
23:39:38.140 
23:39:38.140 
23:39:38.140 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:38.202 prisma:error 
23:39:38.202 Invalid `prisma.supplier.findMany()` invocation:
23:39:38.203 
23:39:38.203 
23:39:38.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:38.203 prisma:error 
23:39:38.203 Invalid `prisma.supplier.findMany()` invocation:
23:39:38.203 
23:39:38.203 
23:39:38.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.282 prisma:error 
23:39:39.282 Invalid `prisma.paymentDetail.findMany()` invocation:
23:39:39.282 
23:39:39.282 
23:39:39.282 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.282 prisma:error 
23:39:39.283 Invalid `prisma.paymentDetail.findMany()` invocation:
23:39:39.283 
23:39:39.283 
23:39:39.283 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.372 prisma:error 
23:39:39.373 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:39.373 
23:39:39.373 
23:39:39.373 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.373 prisma:error 
23:39:39.373 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:39.373 
23:39:39.373 
23:39:39.373 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.373 prisma:error 
23:39:39.373 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:39.373 
23:39:39.374 
23:39:39.374 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.374 prisma:error 
23:39:39.374 Invalid `prisma.supplier.findMany()` invocation:
23:39:39.374 
23:39:39.374 
23:39:39.374 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.374 prisma:error 
23:39:39.374 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:39.374 
23:39:39.374 
23:39:39.374 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.374 prisma:error 
23:39:39.374 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:39.375 
23:39:39.375 
23:39:39.375 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.375 prisma:error 
23:39:39.375 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:39.375 
23:39:39.375 
23:39:39.375 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.375 prisma:error 
23:39:39.375 Invalid `prisma.supplier.findMany()` invocation:
23:39:39.375 
23:39:39.375 
23:39:39.375 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.375 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:39:39.376 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:39.376 
23:39:39.376 
23:39:39.376 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.376     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.376     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.376     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.377     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.377     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:39:39.377     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:39:39.377   code: 'P6001',
23:39:39.377   meta: { modelName: 'PurchaseDetail' },
23:39:39.378   clientVersion: '6.15.0'
23:39:39.378 }
23:39:39.378 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:39:39.378 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:39.378 
23:39:39.378 
23:39:39.379 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.379     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.379     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.379     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.379     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.379     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:39:39.379     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:39:39.379   code: 'P6001',
23:39:39.379   meta: { modelName: 'TaxSlab' },
23:39:39.379   clientVersion: '6.15.0'
23:39:39.379 }
23:39:39.380 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:39:39.380 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:39.380 
23:39:39.380 
23:39:39.380 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.380     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.380     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.380     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.380     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.380     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:39:39.380     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:39:39.380   code: 'P6001',
23:39:39.380   meta: { modelName: 'UnitOfMeasure' },
23:39:39.380   clientVersion: '6.15.0'
23:39:39.381 }
23:39:39.381 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:39:39.381 Invalid `prisma.supplier.findMany()` invocation:
23:39:39.381 
23:39:39.381 
23:39:39.381 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.381     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.381     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.381     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.381     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.381     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:39:39.381     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:39:39.381   code: 'P6001',
23:39:39.381   meta: { modelName: 'Supplier' },
23:39:39.381   clientVersion: '6.15.0'
23:39:39.382 }
23:39:39.383 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:39:39.383 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:39.384 
23:39:39.384 
23:39:39.384 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.384     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.385     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.385     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.385     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.385     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:39:39.386     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:39:39.386   code: 'P6001',
23:39:39.386   meta: { modelName: 'PurchaseDetail' },
23:39:39.386   clientVersion: '6.15.0'
23:39:39.386 }
23:39:39.386 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:39:39.386 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:39.386 
23:39:39.386 
23:39:39.386 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.386     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.386     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.386     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.387     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.387     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:39:39.387     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:39:39.387   code: 'P6001',
23:39:39.387   meta: { modelName: 'TaxSlab' },
23:39:39.387   clientVersion: '6.15.0'
23:39:39.387 }
23:39:39.387 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:39:39.387 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:39.388 
23:39:39.388 
23:39:39.388 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.388     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.388     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.388     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.388     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.389     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:39:39.390     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:39:39.390   code: 'P6001',
23:39:39.390   meta: { modelName: 'UnitOfMeasure' },
23:39:39.390   clientVersion: '6.15.0'
23:39:39.391 }
23:39:39.391 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:39:39.391 Invalid `prisma.supplier.findMany()` invocation:
23:39:39.392 
23:39:39.392 
23:39:39.392 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.392     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.392     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.393     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.393     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.393     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:39:39.393     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:39:39.394   code: 'P6001',
23:39:39.394   meta: { modelName: 'Supplier' },
23:39:39.394   clientVersion: '6.15.0'
23:39:39.394 }
23:39:39.580 prisma:error 
23:39:39.589 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:39:39.589 
23:39:39.589 
23:39:39.589 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.589 prisma:error 
23:39:39.590 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:39:39.590 
23:39:39.590 
23:39:39.590 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.590 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:39:39.590 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:39:39.590 
23:39:39.590 
23:39:39.590 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.590     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.590     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.590     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.590     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.590     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:39:39.590     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:39:39.590   code: 'P6001',
23:39:39.590   meta: { modelName: 'PurchaseReturn' },
23:39:39.590   clientVersion: '6.15.0'
23:39:39.590 }
23:39:39.590 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:39:39.590 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:39:39.590 
23:39:39.590 
23:39:39.590 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:39.590     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:39.590     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:39.590     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:39.590     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:39.590     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:39:39.590     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:39:39.591   code: 'P6001',
23:39:39.591   meta: { modelName: 'PurchaseReturn' },
23:39:39.591   clientVersion: '6.15.0'
23:39:39.591 }
23:39:40.042 
   Generating static pages (131/175) 
23:39:40.102 prisma:error 
23:39:40.103 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:40.103 
23:39:40.103 
23:39:40.104 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.104 prisma:error 
23:39:40.104 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:40.104 
23:39:40.104 
23:39:40.105 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.105 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:39:40.105 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:40.105 
23:39:40.105 
23:39:40.109 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.109     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:40.109     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:40.109     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:40.109     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:40.110     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:39:40.111   code: 'P6001',
23:39:40.112   meta: { modelName: 'PurchaseDetail' },
23:39:40.112   clientVersion: '6.15.0'
23:39:40.112 }
23:39:40.112 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:39:40.112 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:40.113 
23:39:40.113 
23:39:40.113 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.113     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:40.113     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:40.113     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:40.114     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:40.114     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:39:40.114   code: 'P6001',
23:39:40.114   meta: { modelName: 'PurchaseDetail' },
23:39:40.114   clientVersion: '6.15.0'
23:39:40.115 }
23:39:40.288 prisma:error 
23:39:40.289 Invalid `prisma.supplier.findMany()` invocation:
23:39:40.290 
23:39:40.290 
23:39:40.291 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.291 prisma:error 
23:39:40.291 Invalid `prisma.supplier.findMany()` invocation:
23:39:40.291 
23:39:40.291 
23:39:40.291 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.475 prisma:error 
23:39:40.476 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:40.477 
23:39:40.477 
23:39:40.477 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.477 prisma:error 
23:39:40.477 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:40.478 
23:39:40.479 
23:39:40.480 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.537 prisma:error 
23:39:40.538 Invalid `prisma.customer.findMany()` invocation:
23:39:40.538 
23:39:40.538 
23:39:40.538 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.539 prisma:error 
23:39:40.539 Invalid `prisma.customer.findMany()` invocation:
23:39:40.539 
23:39:40.539 
23:39:40.539 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.628 prisma:error 
23:39:40.628 Invalid `prisma.receiptDetail.findMany()` invocation:
23:39:40.628 
23:39:40.629 
23:39:40.629 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:40.629 prisma:error 
23:39:40.629 Invalid `prisma.receiptDetail.findMany()` invocation:
23:39:40.629 
23:39:40.629 
23:39:40.629 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.082 prisma:error 
23:39:41.083 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:41.083 
23:39:41.083 
23:39:41.083 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.083 prisma:error 
23:39:41.084 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:39:41.084 
23:39:41.084 
23:39:41.084 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.455 prisma:error 
23:39:41.456 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:41.456 
23:39:41.456 
23:39:41.457 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.695 prisma:error 
23:39:41.696 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:41.696 
23:39:41.696 
23:39:41.696 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.725 prisma:error 
23:39:41.725 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:41.725 
23:39:41.725 
23:39:41.726 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.726 prisma:error 
23:39:41.726 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:41.726 
23:39:41.726 
23:39:41.727 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.853 prisma:error 
23:39:41.853 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:41.854 
23:39:41.854 
23:39:41.854 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.854 prisma:error 
23:39:41.854 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:41.854 
23:39:41.855 
23:39:41.855 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.855 prisma:error 
23:39:41.855 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:41.855 
23:39:41.855 
23:39:41.856 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.856 prisma:error 
23:39:41.856 Invalid `prisma.customer.findMany()` invocation:
23:39:41.856 
23:39:41.856 
23:39:41.857 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.857 prisma:error 
23:39:41.857 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:41.857 
23:39:41.857 
23:39:41.857 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.859 prisma:error 
23:39:41.859 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:41.859 
23:39:41.859 
23:39:41.860 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.860 prisma:error 
23:39:41.860 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:41.860 
23:39:41.860 
23:39:41.861 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.861 prisma:error 
23:39:41.861 Invalid `prisma.customer.findMany()` invocation:
23:39:41.861 
23:39:41.861 
23:39:41.861 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.862 [GET_SALES] PrismaClientKnownRequestError: 
23:39:41.862 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:41.862 
23:39:41.862 
23:39:41.862 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.863     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.863     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.863     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.863     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.863     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:39:41.863     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:39:41.864   code: 'P6001',
23:39:41.864   meta: { modelName: 'SaleDetail' },
23:39:41.864   clientVersion: '6.15.0'
23:39:41.864 }
23:39:41.864 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:39:41.865 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:41.865 
23:39:41.865 
23:39:41.866 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.866     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.867     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.867     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.867     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.868     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:39:41.868     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:39:41.868   code: 'P6001',
23:39:41.868   meta: { modelName: 'TaxSlab' },
23:39:41.868   clientVersion: '6.15.0'
23:39:41.869 }
23:39:41.869 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:39:41.869 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:41.869 
23:39:41.869 
23:39:41.869 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.870     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.870     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.870     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.870     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.870     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:39:41.870     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:39:41.871   code: 'P6001',
23:39:41.871   meta: { modelName: 'UnitOfMeasure' },
23:39:41.871   clientVersion: '6.15.0'
23:39:41.871 }
23:39:41.871 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:39:41.872 Invalid `prisma.customer.findMany()` invocation:
23:39:41.872 
23:39:41.872 
23:39:41.872 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.872     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.872     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.873     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.873     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.873     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:39:41.873     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:39:41.873   code: 'P6001',
23:39:41.873   meta: { modelName: 'Customer' },
23:39:41.874   clientVersion: '6.15.0'
23:39:41.874 }
23:39:41.874 [GET_SALES] PrismaClientKnownRequestError: 
23:39:41.874 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:41.874 
23:39:41.874 
23:39:41.875 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.875     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.875     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.875     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.875     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.876     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:39:41.876     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:39:41.876   code: 'P6001',
23:39:41.876   meta: { modelName: 'SaleDetail' },
23:39:41.876   clientVersion: '6.15.0'
23:39:41.876 }
23:39:41.877 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:39:41.877 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:41.877 
23:39:41.877 
23:39:41.877 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.877     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.878     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.885     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.885     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.885     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:39:41.886     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:39:41.886   code: 'P6001',
23:39:41.886   meta: { modelName: 'TaxSlab' },
23:39:41.886   clientVersion: '6.15.0'
23:39:41.886 }
23:39:41.886 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:39:41.887 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:41.887 
23:39:41.887 
23:39:41.887 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.887     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.887     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.887     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.888     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.888     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:39:41.888     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:39:41.888   code: 'P6001',
23:39:41.888   meta: { modelName: 'UnitOfMeasure' },
23:39:41.888   clientVersion: '6.15.0'
23:39:41.888 }
23:39:41.889 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:39:41.889 Invalid `prisma.customer.findMany()` invocation:
23:39:41.889 
23:39:41.889 
23:39:41.889 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.889     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.889     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.890     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.890     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.890     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:39:41.890     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:39:41.890   code: 'P6001',
23:39:41.890   meta: { modelName: 'Customer' },
23:39:41.890   clientVersion: '6.15.0'
23:39:41.890 }
23:39:41.915 prisma:error 
23:39:41.915 Invalid `prisma.saleReturn.findMany()` invocation:
23:39:41.915 
23:39:41.915 
23:39:41.915 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.916 prisma:error 
23:39:41.916 Invalid `prisma.saleReturn.findMany()` invocation:
23:39:41.916 
23:39:41.916 
23:39:41.916 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.916 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:39:41.916 Invalid `prisma.saleReturn.findMany()` invocation:
23:39:41.916 
23:39:41.916 
23:39:41.916 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.916     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.916     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.916     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.916     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.916     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:39:41.916     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:39:41.916   code: 'P6001',
23:39:41.916   meta: { modelName: 'SaleReturn' },
23:39:41.916   clientVersion: '6.15.0'
23:39:41.916 }
23:39:41.916 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:39:41.917 Invalid `prisma.saleReturn.findMany()` invocation:
23:39:41.917 
23:39:41.917 
23:39:41.917 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.917     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:39:41.917     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:39:41.917     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:39:41.917     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:39:41.917     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:39:41.917     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:39:41.917   code: 'P6001',
23:39:41.917   meta: { modelName: 'SaleReturn' },
23:39:41.917   clientVersion: '6.15.0'
23:39:41.917 }
23:39:41.935 prisma:error 
23:39:41.936 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:41.936 
23:39:41.936 
23:39:41.936 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.959 prisma:error 
23:39:41.959 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:41.959 
23:39:41.959 
23:39:41.959 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.987 prisma:error 
23:39:41.987 Invalid `prisma.customer.findMany()` invocation:
23:39:41.988 
23:39:41.988 
23:39:41.988 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:41.995 prisma:error 
23:39:41.995 Invalid `prisma.customer.findMany()` invocation:
23:39:41.996 
23:39:41.996 
23:39:41.996 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.017 prisma:error 
23:39:42.017 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:42.017 
23:39:42.017 
23:39:42.018 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.029 prisma:error 
23:39:42.029 Invalid `prisma.saleDetail.findMany()` invocation:
23:39:42.030 
23:39:42.030 
23:39:42.030 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.047 prisma:error 
23:39:42.047 Invalid `prisma.organization.findFirst()` invocation:
23:39:42.047 
23:39:42.047 
23:39:42.047 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.066 prisma:error 
23:39:42.066 Invalid `prisma.organization.findFirst()` invocation:
23:39:42.067 
23:39:42.067 
23:39:42.067 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.082 prisma:error 
23:39:42.083 Invalid `prisma.organization.findFirst()` invocation:
23:39:42.083 
23:39:42.083 
23:39:42.083 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.095 prisma:error 
23:39:42.095 Invalid `prisma.organization.findFirst()` invocation:
23:39:42.095 
23:39:42.095 
23:39:42.096 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.119 prisma:error 
23:39:42.119 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:42.119 
23:39:42.120 
23:39:42.120 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.158 prisma:error 
23:39:42.158 Invalid `prisma.taxSlab.findMany()` invocation:
23:39:42.159 
23:39:42.159 
23:39:42.159 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.168 prisma:error 
23:39:42.168 Invalid `prisma.tDSMaster.findMany()` invocation:
23:39:42.169 
23:39:42.169 
23:39:42.169 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.189 prisma:error 
23:39:42.189 Invalid `prisma.tDSMaster.findMany()` invocation:
23:39:42.189 
23:39:42.189 
23:39:42.189 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.249 prisma:error 
23:39:42.250 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:42.250 
23:39:42.250 
23:39:42.250 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.250 prisma:error 
23:39:42.250 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:39:42.250 
23:39:42.250 
23:39:42.250 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.324 prisma:error 
23:39:42.325 Invalid `prisma.supplier.findMany()` invocation:
23:39:42.325 
23:39:42.325 
23:39:42.325 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.325 prisma:error 
23:39:42.326 Invalid `prisma.supplier.findMany()` invocation:
23:39:42.326 
23:39:42.326 
23:39:42.326 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.371 prisma:error 
23:39:42.371 Invalid `prisma.supplier.findMany()` invocation:
23:39:42.371 
23:39:42.371 
23:39:42.372 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.410 prisma:error 
23:39:42.410 Invalid `prisma.supplier.findMany()` invocation:
23:39:42.410 
23:39:42.410 
23:39:42.411 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.485 prisma:error 
23:39:42.485 Invalid `prisma.tourPackage.findMany()` invocation:
23:39:42.485 
23:39:42.485 
23:39:42.485 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.502 prisma:error 
23:39:42.502 Invalid `prisma.tourPackage.findMany()` invocation:
23:39:42.502 
23:39:42.503 
23:39:42.503 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.515 prisma:error 
23:39:42.515 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:42.515 
23:39:42.515 
23:39:42.515 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.529 prisma:error 
23:39:42.529 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:42.529 
23:39:42.529 
23:39:42.529 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.550 prisma:error 
23:39:42.551 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:42.551 
23:39:42.551 
23:39:42.551 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.575 prisma:error 
23:39:42.575 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:42.575 
23:39:42.576 
23:39:42.576 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.598 prisma:error 
23:39:42.598 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:42.598 
23:39:42.598 
23:39:42.598 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.616 prisma:error 
23:39:42.616 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:39:42.616 
23:39:42.616 
23:39:42.616 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.630 prisma:error 
23:39:42.630 Invalid `prisma.tourPackage.findMany()` invocation:
23:39:42.630 
23:39:42.630 
23:39:42.630 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.663 prisma:error 
23:39:42.663 Invalid `prisma.tourPackage.findMany()` invocation:
23:39:42.663 
23:39:42.663 
23:39:42.664 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.692 prisma:error 
23:39:42.693 Invalid `prisma.location.findMany()` invocation:
23:39:42.693 
23:39:42.693 
23:39:42.693 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.693 prisma:error 
23:39:42.693 Invalid `prisma.tourPackage.findMany()` invocation:
23:39:42.693 
23:39:42.693 
23:39:42.693 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.725 prisma:error 
23:39:42.726 Invalid `prisma.location.findMany()` invocation:
23:39:42.726 
23:39:42.726 
23:39:42.726 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.726 prisma:error 
23:39:42.726 Invalid `prisma.tourPackage.findMany()` invocation:
23:39:42.726 
23:39:42.727 
23:39:42.727 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.736 prisma:error 
23:39:42.736 Invalid `prisma.transfer.findMany()` invocation:
23:39:42.736 
23:39:42.736 
23:39:42.736 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:42.753 prisma:error 
23:39:42.753 Invalid `prisma.transfer.findMany()` invocation:
23:39:42.753 
23:39:42.753 
23:39:42.753 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:39:43.205 
 ✓ Generating static pages (175/175) 
23:39:43.215 SIGINT received - disconnecting Prisma Client
23:39:43.293    Finalizing page optimization ...
23:39:43.294    Collecting build traces ...
23:39:45.162 
23:39:45.247 Route (app)                                                               Size     First Load JS
23:39:45.248 ┌ λ /                                                                     1.6 kB         82.5 kB
23:39:45.248 ├ λ /_not-found                                                           0 B                0 B
23:39:45.248 ├ λ /accounts                                                             6.96 kB         153 kB
23:39:45.248 ├ λ /accounts/[tourPackageQueryId]                                        13.1 kB         245 kB
23:39:45.248 ├ λ /activities                                                           11.2 kB         183 kB
23:39:45.248 ├ λ /activities/[activityId]                                              6.28 kB         220 kB
23:39:45.248 ├ λ /activitiesMaster                                                     11.2 kB         183 kB
23:39:45.248 ├ λ /activitiesMaster/[activityMasterId]                                  6.29 kB         220 kB
23:39:45.248 ├ λ /api/activities                                                       0 B                0 B
23:39:45.249 ├ λ /api/activities/[activityId]                                          0 B                0 B
23:39:45.249 ├ λ /api/activitiesMaster                                                 0 B                0 B
23:39:45.249 ├ λ /api/activitiesMaster/[activityMasterId]                              0 B                0 B
23:39:45.249 ├ λ /api/associate-partners                                               0 B                0 B
23:39:45.249 ├ λ /api/associate-partners/[associatePartnerId]                          0 B                0 B
23:39:45.249 ├ λ /api/associate-partners/me                                            0 B                0 B
23:39:45.249 ├ λ /api/associate-performance                                            0 B                0 B
23:39:45.249 ├ λ /api/audit-logs                                                       0 B                0 B
23:39:45.249 ├ λ /api/bank-accounts                                                    0 B                0 B
23:39:45.249 ├ λ /api/bank-accounts/[bankAccountId]                                    0 B                0 B
23:39:45.249 ├ λ /api/bank-accounts/[bankAccountId]/recalculate                        0 B                0 B
23:39:45.249 ├ λ /api/bank-accounts/[bankAccountId]/transactions                       0 B                0 B
23:39:45.249 ├ λ /api/bank-accounts/recalculate-all                                    0 B                0 B
23:39:45.250 ├ λ /api/cash-accounts                                                    0 B                0 B
23:39:45.250 ├ λ /api/cash-accounts/[cashAccountId]                                    0 B                0 B
23:39:45.250 ├ λ /api/cash-accounts/[cashAccountId]/recalculate                        0 B                0 B
23:39:45.250 ├ λ /api/cash-accounts/[cashAccountId]/transactions                       0 B                0 B
23:39:45.250 ├ λ /api/cash-accounts/recalculate-all                                    0 B                0 B
23:39:45.250 ├ λ /api/config/meal-plans                                                0 B                0 B
23:39:45.250 ├ λ /api/config/occupancy-types                                           0 B                0 B
23:39:45.250 ├ λ /api/config/room-types                                                0 B                0 B
23:39:45.250 ├ λ /api/config/vehicle-types                                             0 B                0 B
23:39:45.250 ├ λ /api/customers                                                        0 B                0 B
23:39:45.250 ├ λ /api/customers/[customerId]                                           0 B                0 B
23:39:45.250 ├ λ /api/debug-whatsapp                                                   0 B                0 B
23:39:45.250 ├ ○ /api/debug/env-check                                                  0 B                0 B
23:39:45.250 ├ λ /api/destinations                                                     0 B                0 B
23:39:45.251 ├ λ /api/destinations/[destinationId]                                     0 B                0 B
23:39:45.251 ├ λ /api/expense-categories                                               0 B                0 B
23:39:45.251 ├ λ /api/expense-categories/[categoryId]                                  0 B                0 B
23:39:45.251 ├ λ /api/expenses                                                         0 B                0 B
23:39:45.251 ├ λ /api/expenses/[expenseId]                                             0 B                0 B
23:39:45.251 ├ λ /api/expenses/[expenseId]/pay                                         0 B                0 B
23:39:45.251 ├ λ /api/expenses/accrued                                                 0 B                0 B
23:39:45.251 ├ λ /api/export/inquiries-contacts                                        0 B                0 B
23:39:45.251 ├ λ /api/export/queries-contacts                                          0 B                0 B
23:39:45.251 ├ λ /api/financial-records                                                0 B                0 B
23:39:45.251 ├ λ /api/flight-tickets                                                   0 B                0 B
23:39:45.251 ├ λ /api/flight-tickets/[pnr]                                             0 B                0 B
23:39:45.251 ├ λ /api/generate-pdf                                                     0 B                0 B
23:39:45.251 ├ λ /api/hotels                                                           0 B                0 B
23:39:45.252 ├ λ /api/hotels/[hotelId]                                                 0 B                0 B
23:39:45.252 ├ λ /api/hotels/[hotelId]/pricing                                         0 B                0 B
23:39:45.252 ├ λ /api/hotels/[hotelId]/pricing/[pricingId]                             0 B                0 B
23:39:45.252 ├ λ /api/income-categories                                                0 B                0 B
23:39:45.252 ├ λ /api/income-categories/[categoryId]                                   0 B                0 B
23:39:45.253 ├ λ /api/incomes                                                          0 B                0 B
23:39:45.253 ├ λ /api/incomes/[incomeId]                                               0 B                0 B
23:39:45.253 ├ λ /api/inquiries                                                        0 B                0 B
23:39:45.253 ├ λ /api/inquiries/[inquiryId]                                            0 B                0 B
23:39:45.253 ├ λ /api/inquiries/[inquiryId]/actions                                    0 B                0 B
23:39:45.253 ├ λ /api/inquiries/[inquiryId]/actions/[actionId]                         0 B                0 B
23:39:45.253 ├ λ /api/inquiries/[inquiryId]/assign-staff                               0 B                0 B
23:39:45.253 ├ λ /api/inquiries/[inquiryId]/status                                     0 B                0 B
23:39:45.253 ├ λ /api/inquiries/[inquiryId]/unassign-staff                             0 B                0 B
23:39:45.253 ├ λ /api/inquiry-summary                                                  0 B                0 B
23:39:45.253 ├ λ /api/itineraries                                                      0 B                0 B
23:39:45.254 ├ λ /api/itineraries/[itineraryId]                                        0 B                0 B
23:39:45.254 ├ λ /api/itinerariesMaster                                                0 B                0 B
23:39:45.254 ├ λ /api/itinerariesMaster/[itineraryMasterId]                            0 B                0 B
23:39:45.254 ├ λ /api/itineraryMaster                                                  0 B                0 B
23:39:45.254 ├ λ /api/locationBySlug/[slug]                                            0 B                0 B
23:39:45.254 ├ λ /api/locations                                                        0 B                0 B
23:39:45.254 ├ λ /api/locations-suppliers                                              0 B                0 B
23:39:45.254 ├ λ /api/locations/[locationId]                                           0 B                0 B
23:39:45.255 ├ λ /api/locations/[locationId]/seasonal-periods                          0 B                0 B
23:39:45.255 ├ λ /api/locations/[locationId]/seasonal-periods/[periodId]               0 B                0 B
23:39:45.255 ├ λ /api/me/role                                                          0 B                0 B
23:39:45.255 ├ λ /api/meal-plans                                                       0 B                0 B
23:39:45.255 ├ λ /api/meal-plans/[mealPlanId]                                          0 B                0 B
23:39:45.255 ├ λ /api/notifications                                                    0 B                0 B
23:39:45.255 ├ λ /api/notifications/[notificationId]                                   0 B                0 B
23:39:45.255 ├ λ /api/notifications/mark-all-read                                      0 B                0 B
23:39:45.255 ├ λ /api/occupancy-types                                                  0 B                0 B
23:39:45.255 ├ λ /api/occupancy-types/[occupancyTypeId]                                0 B                0 B
23:39:45.255 ├ λ /api/operational-staff                                                0 B                0 B
23:39:45.255 ├ λ /api/operational-staff/[staffId]                                      0 B                0 B
23:39:45.255 ├ λ /api/ops/my-inquiries                                                 0 B                0 B
23:39:45.255 ├ λ /api/ops/my-inquiries/[inquiryId]                                     0 B                0 B
23:39:45.255 ├ λ /api/package-variants                                                 0 B                0 B
23:39:45.255 ├ λ /api/package-variants/[variantId]                                     0 B                0 B
23:39:45.256 ├ λ /api/package-variants/[variantId]/hotel-mappings                      0 B                0 B
23:39:45.256 ├ λ /api/payments                                                         0 B                0 B
23:39:45.256 ├ λ /api/payments/[paymentId]                                             0 B                0 B
23:39:45.256 ├ λ /api/pricing-attributes                                               0 B                0 B
23:39:45.256 ├ λ /api/pricing-attributes/[pricingAttributeId]                          0 B                0 B
23:39:45.256 ├ λ /api/pricing-components                                               0 B                0 B
23:39:45.256 ├ λ /api/pricing-components/[pricingComponentId]                          0 B                0 B
23:39:45.256 ├ λ /api/pricing/calculate                                                0 B                0 B
23:39:45.256 ├ ○ /api/public-debug                                                     0 B                0 B
23:39:45.256 ├ λ /api/purchase-returns                                                 0 B                0 B
23:39:45.256 ├ λ /api/purchase-returns/[purchaseReturnId]                              0 B                0 B
23:39:45.256 ├ λ /api/purchases                                                        0 B                0 B
23:39:45.256 ├ λ /api/purchases/[purchaseId]                                           0 B                0 B
23:39:45.256 ├ λ /api/receipts                                                         0 B                0 B
23:39:45.256 ├ λ /api/receipts/[receiptId]                                             0 B                0 B
23:39:45.257 ├ λ /api/report/tds/summary                                               0 B                0 B
23:39:45.257 ├ λ /api/room-types                                                       0 B                0 B
23:39:45.257 ├ λ /api/room-types/[roomTypeId]                                          0 B                0 B
23:39:45.257 ├ λ /api/sale-returns                                                     0 B                0 B
23:39:45.257 ├ λ /api/sale-returns/[saleReturnId]                                      0 B                0 B
23:39:45.257 ├ λ /api/sales                                                            0 B                0 B
23:39:45.257 ├ λ /api/sales/[saleId]                                                   0 B                0 B
23:39:45.257 ├ λ /api/sales/[saleId]/items                                             0 B                0 B
23:39:45.257 ├ λ /api/searchTermLocations/[searchTerm]                                 0 B                0 B
23:39:45.257 ├ λ /api/settings/organization                                            0 B                0 B
23:39:45.257 ├ λ /api/settings/organization/[organizationId]                           0 B                0 B
23:39:45.257 ├ λ /api/settings/tax-slabs                                               0 B                0 B
23:39:45.257 ├ λ /api/settings/tax-slabs/[taxSlabId]                                   0 B                0 B
23:39:45.257 ├ λ /api/settings/tds-sections                                            0 B                0 B
23:39:45.257 ├ λ /api/settings/tds-sections/[id]                                       0 B                0 B
23:39:45.258 ├ λ /api/settings/units                                                   0 B                0 B
23:39:45.258 ├ λ /api/settings/units/[unitId]                                          0 B                0 B
23:39:45.258 ├ λ /api/suppliers                                                        0 B                0 B
23:39:45.258 ├ λ /api/suppliers/[supplierId]                                           0 B                0 B
23:39:45.258 ├ λ /api/tds/challans                                                     0 B                0 B
23:39:45.258 ├ λ /api/tds/deposit                                                      0 B                0 B
23:39:45.258 ├ λ /api/tds/transactions                                                 0 B                0 B
23:39:45.258 ├ ○ /api/test-env                                                         0 B                0 B
23:39:45.258 ├ λ /api/tourPackageBySlug/[slug]                                         0 B                0 B
23:39:45.258 ├ λ /api/tourPackageQuery                                                 0 B                0 B
23:39:45.258 ├ λ /api/tourPackageQuery/[tourPackageQueryId]                            0 B                0 B
23:39:45.258 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/accounting                 0 B                0 B
23:39:45.258 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/confirm                    0 B                0 B
23:39:45.258 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/hotel-details              0 B                0 B
23:39:45.258 ├ λ /api/tourPackages                                                     0 B                0 B
23:39:45.259 ├ λ /api/tourPackages/[tourPackageId]                                     0 B                0 B
23:39:45.259 ├ λ /api/tourPackages/[tourPackageId]/field-update                        0 B                0 B
23:39:45.259 ├ λ /api/tourPackages/[tourPackageId]/pricing                             0 B                0 B
23:39:45.259 ├ λ /api/tourPackages/[tourPackageId]/pricing/[pricingId]                 0 B                0 B
23:39:45.259 ├ λ /api/tourPackages/[tourPackageId]/related                             0 B                0 B
23:39:45.259 ├ λ /api/tourPackages/reorder                                             0 B                0 B
23:39:45.259 ├ λ /api/tourPackagesForWebsite                                           0 B                0 B
23:39:45.259 ├ λ /api/transfers                                                        0 B                0 B
23:39:45.259 ├ λ /api/transfers/[transferId]                                           0 B                0 B
23:39:45.259 ├ λ /api/transport-pricing                                                0 B                0 B
23:39:45.259 ├ λ /api/transport-pricing/[transportPricingId]                           0 B                0 B
23:39:45.259 ├ λ /api/uploads/images                                                   0 B                0 B
23:39:45.259 ├ λ /api/vehicle-types                                                    0 B                0 B
23:39:45.259 ├ λ /api/vehicle-types/[vehicleTypeId]                                    0 B                0 B
23:39:45.259 ├ λ /api/whatsapp/campaigns                                               0 B                0 B
23:39:45.259 ├ λ /api/whatsapp/campaigns/[id]                                          0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/campaigns/[id]/recipients                               0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/campaigns/[id]/send                                     0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/campaigns/[id]/stats                                    0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/catalog                                                 0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/catalog/packages                                        0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/catalog/packages/[packageId]                            0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/catalog/packages/[packageId]/sync                       0 B                0 B
23:39:45.260 ├ ○ /api/whatsapp/config                                                  0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/customers                                               0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/customers/[id]                                          0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/customers/export                                        0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/customers/import                                        0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/database-health                                         0 B                0 B
23:39:45.260 ├ ○ /api/whatsapp/env-check                                               0 B                0 B
23:39:45.260 ├ λ /api/whatsapp/flow-endpoint                                           0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/flows/manage                                            0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/flows/templates                                         0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/flows/versions                                          0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/media/[mediaId]                                         0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/messages                                                0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/send                                                    0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/send-message                                            0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/send-template                                           0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/templates                                               0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/templates/create                                        0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/templates/manage                                        0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/templates/preview                                       0 B                0 B
23:39:45.261 ├ ○ /api/whatsapp/test-key                                                0 B                0 B
23:39:45.261 ├ λ /api/whatsapp/webhook                                                 0 B                0 B
23:39:45.261 ├ λ /associate-partners                                                   10.2 kB         187 kB
23:39:45.262 ├ λ /associate-partners/[associatePartnerId]                              7.35 kB         172 kB
23:39:45.262 ├ λ /audit-logs                                                           9.13 kB         150 kB
23:39:45.262 ├ λ /bank-book                                                            4.92 kB         123 kB
23:39:45.262 ├ λ /bank-book/[bankAccountId]                                            8.62 kB         412 kB
23:39:45.262 ├ λ /bankaccounts                                                         12.1 kB         407 kB
23:39:45.262 ├ λ /bankaccounts/[bankAccountId]                                         5.18 kB         170 kB
23:39:45.262 ├ λ /cash-book                                                            26.3 kB         145 kB
23:39:45.262 ├ λ /cash-book/[cashAccountId]                                            8.43 kB         412 kB
23:39:45.262 ├ λ /cashaccounts                                                         12.2 kB         407 kB
23:39:45.262 ├ λ /cashaccounts/[cashAccountId]                                         8.37 kB         173 kB
23:39:45.262 ├ λ /customers                                                            1.89 kB         280 kB
23:39:45.262 ├ λ /customers/[customerId]                                               38.5 kB         258 kB
23:39:45.262 ├ λ /customers/[customerId]/ledger                                        7.77 kB         380 kB
23:39:45.262 ├ λ /customers/ledger                                                     8.15 kB         400 kB
23:39:45.262 ├ λ /destinations                                                         11.4 kB         184 kB
23:39:45.263 ├ λ /destinations/[destinationId]                                         9.9 kB          224 kB
23:39:45.263 ├ λ /expense-categories                                                   8.3 kB          185 kB
23:39:45.263 ├ λ /expense-categories/[categoryId]                                      8.63 kB         173 kB
23:39:45.263 ├ λ /expenses                                                             13.9 kB         435 kB
23:39:45.263 ├ λ /expenses/[expenseId]                                                 3.85 kB         243 kB
23:39:45.263 ├ λ /expenses/[expenseId]/view                                            6.01 kB         102 kB
23:39:45.263 ├ λ /expenses/[expenseId]/voucher                                         152 B           114 kB
23:39:45.263 ├ λ /expenses/accrued                                                     10.3 kB         436 kB
23:39:45.263 ├ λ /expenses/ledger                                                      14.4 kB         436 kB
23:39:45.263 ├ λ /expenses/new                                                         4.91 kB         245 kB
23:39:45.263 ├ λ /export-contacts                                                      9.29 kB         106 kB
23:39:45.263 ├ λ /fetchaccounts/[tourPackageQueryId]                                   17.8 kB         433 kB
23:39:45.263 ├ λ /flight-tickets                                                       11.3 kB         196 kB
23:39:45.263 ├ λ /flight-tickets/[pnr]                                                 8.22 kB         123 kB
23:39:45.263 ├ λ /flight-tickets/[pnr]/edit                                            185 B           230 kB
23:39:45.263 ├ λ /flight-tickets/[pnr]/print                                           13.6 kB         134 kB
23:39:45.263 ├ λ /flight-tickets/new                                                   185 B           230 kB
23:39:45.264 ├ λ /hotels                                                               1.54 kB         184 kB
23:39:45.264 ├ λ /hotels/[hotelId]                                                     6.59 kB         228 kB
23:39:45.264 ├ λ /hotels/[hotelId]/pricing                                             8.86 kB         228 kB
23:39:45.264 ├ λ /income-categories                                                    8.3 kB          185 kB
23:39:45.264 ├ λ /income-categories/[categoryId]                                       8.63 kB         173 kB
23:39:45.265 ├ λ /incomes                                                              14.4 kB         455 kB
23:39:45.265 ├ λ /incomes/[incomeId]                                                   2.11 kB         242 kB
23:39:45.265 ├ λ /incomes/[incomeId]/edit                                              2.48 kB         261 kB
23:39:45.265 ├ λ /incomes/[incomeId]/view                                              5.94 kB         102 kB
23:39:45.265 ├ λ /incomes/[incomeId]/voucher                                           152 B           114 kB
23:39:45.265 ├ λ /incomes/ledger                                                       13.6 kB         435 kB
23:39:45.265 ├ λ /incomes/new                                                          3.53 kB         262 kB
23:39:45.265 ├ λ /inquiries                                                            42.6 kB         550 kB
23:39:45.265 ├ λ /inquiries/[inquiryId]                                                10.5 kB         249 kB
23:39:45.266 ├ λ /itineraries                                                          1.31 kB         184 kB
23:39:45.266 ├ λ /itineraries/[itineraryId]                                            10.4 kB         224 kB
23:39:45.266 ├ λ /itinerariesMaster                                                    1.32 kB         184 kB
23:39:45.266 ├ λ /itinerariesMaster/[itineraryMasterId]                                7.9 kB          225 kB
23:39:45.266 ├ λ /ledger                                                               4.36 kB         402 kB
23:39:45.266 ├ λ /ledger/category/[category]                                           3.46 kB         388 kB
23:39:45.266 ├ λ /locations                                                            11.6 kB         184 kB
23:39:45.266 ├ λ /locations-suppliers                                                  7.4 kB          108 kB
23:39:45.266 ├ λ /locations/[locationId]                                               9.31 kB         207 kB
23:39:45.266 ├ λ /locations/[locationId]/seasonal-periods                              5.26 kB         198 kB
23:39:45.266 ├ λ /operational-staff                                                    13.1 kB         149 kB
23:39:45.266 ├ λ /ops                                                                  9.91 kB         135 kB
23:39:45.267 ├ λ /ops/inquiry/[inquiryId]                                              13.1 kB         124 kB
23:39:45.267 ├ λ /payments                                                             3.34 kB         139 kB
23:39:45.267 ├ λ /payments/[paymentId]                                                 2.21 kB         243 kB
23:39:45.267 ├ λ /payments/[paymentId]/voucher                                         152 B           114 kB
23:39:45.267 ├ λ /payments/ledger                                                      13.5 kB         435 kB
23:39:45.267 ├ λ /purchase-returns                                                     11.3 kB         184 kB
23:39:45.267 ├ λ /purchase-returns/[purchaseReturnId]                                  186 B           211 kB
23:39:45.267 ├ λ /purchase-returns/new                                                 186 B           211 kB
23:39:45.267 ├ λ /purchases                                                            3.46 kB         139 kB
23:39:45.267 ├ λ /purchases/[purchaseId]                                               456 B           223 kB
23:39:45.267 ├ λ /purchases/[purchaseId]/items                                         8.73 kB         220 kB
23:39:45.267 ├ λ /purchases/[purchaseId]/voucher                                       151 B           114 kB
23:39:45.268 ├ λ /purchases/ledger                                                     3.81 kB         436 kB
23:39:45.268 ├ λ /purchases/new                                                        237 B           223 kB
23:39:45.268 ├ λ /receipts                                                             3.36 kB         139 kB
23:39:45.268 ├ λ /receipts/[receiptId]                                                 2.21 kB         243 kB
23:39:45.268 ├ λ /receipts/[receiptId]/voucher                                         151 B           114 kB
23:39:45.268 ├ λ /receipts/ledger                                                      13.4 kB         435 kB
23:39:45.268 ├ λ /reports/associatePerformance                                         3.19 kB         404 kB
23:39:45.268 ├ λ /reports/confirmedQueries                                             3.5 kB          207 kB
23:39:45.268 ├ λ /reports/gst                                                          5.23 kB         288 kB
23:39:45.268 ├ λ /reports/inquirySummary                                               3.08 kB         404 kB
23:39:45.268 ├ λ /reports/profit                                                       5.98 kB         282 kB
23:39:45.268 ├ λ /reports/unconfirmedQueries                                           1.6 kB          184 kB
23:39:45.268 ├ λ /reports/upcomingTrips                                                3.83 kB         217 kB
23:39:45.269 ├ λ /sale-returns                                                         12.1 kB         194 kB
23:39:45.269 ├ λ /sale-returns/[saleReturnId]                                          185 B           210 kB
23:39:45.269 ├ λ /sale-returns/[saleReturnId]/voucher                                  152 B           114 kB
23:39:45.269 ├ λ /sale-returns/new                                                     185 B           210 kB
23:39:45.269 ├ λ /sales                                                                3.45 kB         139 kB
23:39:45.269 ├ λ /sales/[saleId]                                                       2.9 kB          223 kB
23:39:45.269 ├ λ /sales/[saleId]/items                                                 8.73 kB         220 kB
23:39:45.269 ├ λ /sales/[saleId]/voucher                                               152 B           114 kB
23:39:45.269 ├ λ /sales/ledger                                                         3.52 kB         435 kB
23:39:45.269 ├ λ /sales/new                                                            12 kB           223 kB
23:39:45.269 ├ λ /settings/invoice                                                     4.46 kB         155 kB
23:39:45.269 ├ λ /settings/meal-plans                                                  5.5 kB          147 kB
23:39:45.270 ├ λ /settings/meal-plans/[mealPlanId]                                     171 B           173 kB
23:39:45.270 ├ λ /settings/meal-plans/new                                              170 B           173 kB
23:39:45.270 ├ λ /settings/occupancy-types                                             9.42 kB         178 kB
23:39:45.270 ├ λ /settings/occupancy-types/[occupancyTypeId]                           170 B           174 kB
23:39:45.270 ├ λ /settings/occupancy-types/new                                         169 B           174 kB
23:39:45.270 ├ λ /settings/organization                                                6.31 kB         191 kB
23:39:45.270 ├ λ /settings/pricing-attributes                                          8.58 kB         185 kB
23:39:45.270 ├ λ /settings/pricing-attributes/[pricingAttributeId]                     172 B           173 kB
23:39:45.270 ├ λ /settings/pricing-attributes/new                                      170 B           173 kB
23:39:45.270 ├ λ /settings/pricing-components                                          8.66 kB         185 kB
23:39:45.270 ├ λ /settings/pricing-components/[pricingComponentId]                     179 B           195 kB
23:39:45.270 ├ λ /settings/pricing-components/new                                      179 B           195 kB
23:39:45.271 ├ λ /settings/room-types                                                  5.5 kB          147 kB
23:39:45.271 ├ λ /settings/room-types/[roomTypeId]                                     170 B           173 kB
23:39:45.271 ├ λ /settings/room-types/new                                              169 B           173 kB
23:39:45.271 ├ λ /settings/tax-slabs                                                   11.4 kB         184 kB
23:39:45.271 ├ λ /settings/tax-slabs/[taxSlabId]                                       8.65 kB         173 kB
23:39:45.271 ├ λ /settings/tds                                                         7.1 kB          117 kB
23:39:45.271 ├ λ /settings/units                                                       11.4 kB         184 kB
23:39:45.271 ├ λ /settings/units/[unitId]                                              8.63 kB         173 kB
23:39:45.271 ├ λ /settings/vehicle-types                                               5.51 kB         147 kB
23:39:45.271 ├ λ /settings/vehicle-types/[vehicleTypeId]                               172 B           173 kB
23:39:45.271 ├ λ /settings/vehicle-types/new                                           171 B           173 kB
23:39:45.271 ├ λ /sign-in/[[...sign-in]]                                               2.76 kB         102 kB
23:39:45.271 ├ λ /sign-up/[[...sign-up]]                                               2.76 kB         102 kB
23:39:45.271 ├ λ /suppliers                                                            3.19 kB         215 kB
23:39:45.272 ├ λ /suppliers/[supplierId]                                               3.76 kB         184 kB
23:39:45.272 ├ λ /suppliers/[supplierId]/ledger                                        13.9 kB         427 kB
23:39:45.272 ├ λ /suppliers/ledger                                                     8.66 kB         410 kB
23:39:45.272 ├ λ /tds/challans                                                         6.66 kB         135 kB
23:39:45.272 ├ λ /tds/reports                                                          8.36 kB         105 kB
23:39:45.272 ├ λ /tourPackageCreateCopy                                                11.2 kB         183 kB
23:39:45.272 ├ λ /tourPackageCreateCopy/[tourPackageCreateCopyId]                      14.4 kB         502 kB
23:39:45.272 ├ λ /tourPackageDisplay/[tourPackageDisplayId]                            519 B          93.4 kB
23:39:45.272 ├ λ /tourPackageFromTourPackageQuery/[tourPackageFromTourPackageQueryId]  13.4 kB         501 kB
23:39:45.272 ├ λ /tourPackagePDFGenerator/[tourPackageId]                              9.97 kB        90.9 kB
23:39:45.272 ├ λ /tourPackagePDFGeneratorWithVariants/[tourPackageId]                  9.55 kB        90.4 kB
23:39:45.272 ├ λ /tourPackageQuery                                                     3.66 kB         200 kB
23:39:45.272 ├ λ /tourPackageQuery/[tourPackageQueryId]                                7.57 kB         566 kB
23:39:45.273 ├ λ /tourPackageQueryCreateCopy                                           11.2 kB         183 kB
23:39:45.273 ├ λ /tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]            6.33 kB         559 kB
23:39:45.273 ├ λ /tourPackageQueryDisplay                                              4.49 kB         212 kB
23:39:45.273 ├ λ /tourPackageQueryDisplay/[tourPackageQueryId]                         9.08 kB         127 kB
23:39:45.273 ├ λ /tourpackagequeryfrominquiry/[inquiryId]                              7.55 kB         561 kB
23:39:45.273 ├ λ /tourpackagequeryfrominquiry/associate/[inquiryId]                    34.2 kB         567 kB
23:39:45.273 ├ λ /tourPackageQueryFromTourPackage/[tourPackageQueryFromTourPackageId]  19 kB           530 kB
23:39:45.273 ├ λ /tourPackageQueryHotelUpdate/[tourPackageQueryId]                     12.9 kB         251 kB
23:39:45.273 ├ λ /tourPackageQueryPDFGenerator/[tourPackageQueryId]                    11.9 kB         100 kB
23:39:45.273 ├ λ /tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]        9.25 kB        97.4 kB
23:39:45.273 ├ λ /tourPackageQueryVoucherDisplay/[tourPackageQueryVoucherId]           10.9 kB         136 kB
23:39:45.273 ├ λ /tourPackages                                                         10.4 kB         218 kB
23:39:45.274 ├ λ /tourPackages/[tourPackageId]                                         31.6 kB         547 kB
23:39:45.274 ├ λ /tourPackages/[tourPackageId]/pricing                                 12.2 kB         236 kB
23:39:45.274 ├ λ /tourPackages/website-management                                      11.5 kB         222 kB
23:39:45.274 ├ λ /transfers                                                            9.12 kB         244 kB
23:39:45.274 ├ λ /transfers/[transferId]                                               4.4 kB          210 kB
23:39:45.274 ├ λ /transport-pricing                                                    12.4 kB         191 kB
23:39:45.274 ├ λ /transport-pricing/[transportPricingId]                               9.08 kB         220 kB
23:39:45.274 ├ λ /transport-pricing/new                                                9.33 kB         231 kB
23:39:45.274 ├ λ /viewpdfpage/[PDFPageID]                                              446 kB          544 kB
23:39:45.274 ├ λ /whatsapp                                                             6.72 kB         103 kB
23:39:45.274 ├ λ /whatsapp/campaigns                                                   11.4 kB         108 kB
23:39:45.274 ├ λ /whatsapp/campaigns/[id]                                              9.76 kB         129 kB
23:39:45.275 ├ λ /whatsapp/campaigns/[id]/stats                                        4.47 kB         108 kB
23:39:45.275 ├ λ /whatsapp/campaigns/new                                               15.8 kB         159 kB
23:39:45.275 ├ λ /whatsapp/catalog                                                     19.1 kB         169 kB
23:39:45.275 ├ λ /whatsapp/chat                                                        102 kB          260 kB
23:39:45.275 ├ λ /whatsapp/customers                                                   19.9 kB         152 kB
23:39:45.275 ├ λ /whatsapp/flows                                                       38.1 kB         180 kB
23:39:45.275 ├ λ /whatsapp/media                                                       9.7 kB          111 kB
23:39:45.275 └ λ /whatsapp/templates                                                   18.9 kB         155 kB
23:39:45.275 + First Load JS shared by all                                             80.9 kB
23:39:45.275   ├ chunks/2472-eb9bc76fb9bc33cb.js                                       27.6 kB
23:39:45.275   ├ chunks/fd9d1056-294e6a544314e9b9.js                                   51.1 kB
23:39:45.275   ├ chunks/main-app-8ed6d57d180fb331.js                                   237 B
23:39:45.275   └ chunks/webpack-394aeac5243dcd56.js                                    1.97 kB
23:39:45.276 
23:39:45.276 
23:39:45.276 ƒ Middleware                                                              205 kB
23:39:45.276 
23:39:45.289 λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
23:39:45.289 ○  (Static)  automatically rendered as static HTML (uses no initial props)
23:39:45.289 
23:39:46.055 Traced Next.js server files in: 344.1ms
23:39:47.526 WARNING: Unable to find source file for page /_not-found with extensions: tsx, ts, jsx, js, this can cause functions config from `vercel.json` to not be applied
23:39:47.683 Created all serverless functions in: 1.627s
23:39:47.855 Collected static files (public/, static/, .next/static): 39.922ms
23:39:48.215 Build Completed in /vercel/output [2m]
23:39:48.662 Deploying outputs...