23:30:13.644 Running build in Washington, D.C., USA (East) – iad1
23:30:13.644 Build machine configuration: 2 cores, 8 GB
23:30:13.806 Cloning github.com/rushabhsmehta/next13-ecommerce-admin (Branch: master, Commit: c209f50)
23:30:15.098 Cloning completed: 1.292s
23:30:16.008 Restored build cache from previous deployment (99CHWoerDVizbCaHjouRii5hMbEJ)
23:30:16.922 Running "vercel build"
23:30:17.329 Vercel CLI 48.6.0
23:30:17.819 Installing dependencies...
23:30:20.342 
23:30:20.342 > next13-ecommerce-admin@0.1.0 postinstall
23:30:20.342 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma
23:30:20.342 
23:30:21.776 Prisma schema loaded from schema.prisma
23:30:23.182 
23:30:23.183 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 600ms
23:30:23.183 
23:30:23.184 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:30:23.184 
23:30:23.185 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:30:23.185 
23:30:24.346 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:30:24.984 ┌─────────────────────────────────────────────────────────┐
23:30:24.985 │  Update available 6.15.0 -> 6.18.0                      │
23:30:24.985 │  Run the following to update                            │
23:30:24.985 │    npm i --save-dev prisma@latest                       │
23:30:24.985 │    npm i @prisma/client@latest                          │
23:30:24.985 └─────────────────────────────────────────────────────────┘
23:30:24.986 
23:30:24.986 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 383ms
23:30:24.986 
23:30:24.986 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:30:24.986 
23:30:24.986 Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
23:30:24.986 
23:30:25.008 
23:30:25.009 removed 1 package in 7s
23:30:25.009 
23:30:25.010 200 packages are looking for funding
23:30:25.010   run `npm fund` for details
23:30:25.039 Detected Next.js version: 13.5.7
23:30:25.040 Running "npm run vercel-build"
23:30:25.156 
23:30:25.156 > next13-ecommerce-admin@0.1.0 vercel-build
23:30:25.157 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build
23:30:25.157 
23:30:26.291 Prisma schema loaded from schema.prisma
23:30:27.645 
23:30:27.646 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 607ms
23:30:27.646 
23:30:27.646 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:30:27.646 
23:30:27.646 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:30:27.647 
23:30:28.776 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:30:30.149 
23:30:30.150 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 601ms
23:30:30.150 
23:30:30.150 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:30:30.151 
23:30:30.151 Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate
23:30:30.151 
23:30:30.865    Creating an optimized production build ...
23:30:53.868 <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (101kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
23:31:05.451  ✓ Compiled successfully
23:31:05.451    Linting and checking validity of types ...
23:31:32.744    Collecting page data ...
23:31:41.561    Generating static pages (0/175) ...
23:31:49.770 
   Generating static pages (43/175) 
23:31:52.319 prisma:error 
23:31:52.321 Invalid `prisma.associatePartner.findMany()` invocation:
23:31:52.323 
23:31:52.323 
23:31:52.323 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:52.323 prisma:error 
23:31:52.324 Invalid `prisma.associatePartner.findMany()` invocation:
23:31:52.324 
23:31:52.324 
23:31:52.324 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:53.384 
   Generating static pages (87/175) 
23:31:53.661 prisma:error 
23:31:53.661 Invalid `prisma.mealPlan.findMany()` invocation:
23:31:53.661 
23:31:53.661 
23:31:53.661 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:53.686 prisma:error 
23:31:53.687 Invalid `prisma.mealPlan.findMany()` invocation:
23:31:53.687 
23:31:53.687 
23:31:53.688 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:53.829 prisma:error 
23:31:53.830 Invalid `prisma.occupancyType.findMany()` invocation:
23:31:53.830 
23:31:53.830 
23:31:53.830 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:53.831 prisma:error 
23:31:53.831 Invalid `prisma.occupancyType.findMany()` invocation:
23:31:53.832 
23:31:53.832 
23:31:53.832 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.199 prisma:error 
23:31:54.199 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:31:54.199 
23:31:54.200 
23:31:54.200 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.233 prisma:error 
23:31:54.235 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:31:54.236 
23:31:54.236 
23:31:54.236 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.321 prisma:error 
23:31:54.322 Invalid `prisma.pricingComponent.findMany()` invocation:
23:31:54.322 
23:31:54.322 
23:31:54.322 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.322 prisma:error 
23:31:54.322 Invalid `prisma.pricingComponent.findMany()` invocation:
23:31:54.322 
23:31:54.322 
23:31:54.322 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.398 prisma:error 
23:31:54.399 Invalid `prisma.roomType.findMany()` invocation:
23:31:54.399 
23:31:54.399 
23:31:54.399 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.399 prisma:error 
23:31:54.399 Invalid `prisma.roomType.findMany()` invocation:
23:31:54.399 
23:31:54.400 
23:31:54.400 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.545 prisma:error 
23:31:54.546 Invalid `prisma.vehicleType.findMany()` invocation:
23:31:54.546 
23:31:54.546 
23:31:54.546 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.546 prisma:error 
23:31:54.547 Invalid `prisma.vehicleType.findMany()` invocation:
23:31:54.547 
23:31:54.547 
23:31:54.547 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.601 prisma:error 
23:31:54.601 Invalid `prisma.location.findMany()` invocation:
23:31:54.602 
23:31:54.603 
23:31:54.603 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.603 prisma:error 
23:31:54.603 Invalid `prisma.location.findMany()` invocation:
23:31:54.603 
23:31:54.603 
23:31:54.603 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.641 prisma:error 
23:31:54.642 Invalid `prisma.transportPricing.findMany()` invocation:
23:31:54.642 
23:31:54.642 
23:31:54.642 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.642 prisma:error 
23:31:54.642 Invalid `prisma.transportPricing.findMany()` invocation:
23:31:54.642 
23:31:54.642 
23:31:54.643 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.688 prisma:error 
23:31:54.688 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:31:54.689 
23:31:54.689 
23:31:54.689 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.689 prisma:error 
23:31:54.689 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:31:54.689 
23:31:54.689 
23:31:54.690 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.733 prisma:error 
23:31:54.733 Invalid `prisma.activity.findMany()` invocation:
23:31:54.733 
23:31:54.733 
23:31:54.733 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.768 prisma:error 
23:31:54.768 Invalid `prisma.activity.findMany()` invocation:
23:31:54.768 
23:31:54.768 
23:31:54.768 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.813 prisma:error 
23:31:54.813 Invalid `prisma.activityMaster.findMany()` invocation:
23:31:54.813 
23:31:54.813 
23:31:54.813 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.813 prisma:error 
23:31:54.813 Invalid `prisma.activityMaster.findMany()` invocation:
23:31:54.813 
23:31:54.814 
23:31:54.814 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.893 prisma:error 
23:31:54.893 Invalid `prisma.bankAccount.findMany()` invocation:
23:31:54.894 
23:31:54.894 
23:31:54.894 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.894 prisma:error 
23:31:54.894 Invalid `prisma.bankAccount.findMany()` invocation:
23:31:54.894 
23:31:54.894 
23:31:54.894 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.928 prisma:error 
23:31:54.928 Invalid `prisma.cashAccount.findMany()` invocation:
23:31:54.928 
23:31:54.928 
23:31:54.928 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.928 prisma:error 
23:31:54.928 Invalid `prisma.cashAccount.findMany()` invocation:
23:31:54.928 
23:31:54.929 
23:31:54.929 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:54.963 prisma:error 
23:31:54.963 Invalid `prisma.customer.findMany()` invocation:
23:31:54.963 
23:31:54.963 
23:31:54.964 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.051 prisma:error 
23:31:55.051 Invalid `prisma.customer.findMany()` invocation:
23:31:55.052 
23:31:55.052 
23:31:55.052 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.113 prisma:error 
23:31:55.113 Invalid `prisma.customer.findMany()` invocation:
23:31:55.113 
23:31:55.113 
23:31:55.113 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.113 prisma:error 
23:31:55.113 Invalid `prisma.customer.findMany()` invocation:
23:31:55.113 
23:31:55.113 
23:31:55.113 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.230 prisma:error 
23:31:55.230 Invalid `prisma.expenseCategory.findMany()` invocation:
23:31:55.231 
23:31:55.231 
23:31:55.231 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.231 prisma:error 
23:31:55.232 Invalid `prisma.expenseCategory.findMany()` invocation:
23:31:55.232 
23:31:55.232 
23:31:55.232 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.258 prisma:error 
23:31:55.258 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:55.258 
23:31:55.258 
23:31:55.259 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.304 prisma:error 
23:31:55.304 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:55.305 
23:31:55.305 
23:31:55.305 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.343 prisma:error 
23:31:55.343 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:55.343 
23:31:55.343 
23:31:55.343 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.344 prisma:error 
23:31:55.344 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:55.344 
23:31:55.344 
23:31:55.344 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.380 prisma:error 
23:31:55.380 Invalid `prisma.expenseCategory.findMany()` invocation:
23:31:55.380 
23:31:55.380 
23:31:55.380 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.381 prisma:error 
23:31:55.381 Invalid `prisma.bankAccount.findMany()` invocation:
23:31:55.381 
23:31:55.381 
23:31:55.381 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.381 prisma:error 
23:31:55.381 Invalid `prisma.cashAccount.findMany()` invocation:
23:31:55.381 
23:31:55.381 
23:31:55.381 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.408 prisma:error 
23:31:55.409 Invalid `prisma.expenseCategory.findMany()` invocation:
23:31:55.409 
23:31:55.410 
23:31:55.410 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.410 prisma:error 
23:31:55.410 Invalid `prisma.bankAccount.findMany()` invocation:
23:31:55.411 
23:31:55.411 
23:31:55.411 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.411 prisma:error 
23:31:55.411 Invalid `prisma.cashAccount.findMany()` invocation:
23:31:55.412 
23:31:55.412 
23:31:55.412 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.427 prisma:error 
23:31:55.427 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:55.428 
23:31:55.428 
23:31:55.428 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.492 prisma:error 
23:31:55.492 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:55.492 
23:31:55.492 
23:31:55.492 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.659 prisma:error 
23:31:55.660 Invalid `prisma.hotel.findMany()` invocation:
23:31:55.660 
23:31:55.660 
23:31:55.660 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.687 prisma:error 
23:31:55.688 Invalid `prisma.hotel.findMany()` invocation:
23:31:55.688 
23:31:55.689 
23:31:55.689 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.712 prisma:error 
23:31:55.713 Invalid `prisma.incomeCategory.findMany()` invocation:
23:31:55.713 
23:31:55.713 
23:31:55.714 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.741 prisma:error 
23:31:55.741 Invalid `prisma.incomeCategory.findMany()` invocation:
23:31:55.741 
23:31:55.741 
23:31:55.741 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.764 prisma:error 
23:31:55.764 Invalid `prisma.incomeDetail.findMany()` invocation:
23:31:55.764 
23:31:55.764 
23:31:55.764 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:55.789 prisma:error 
23:31:55.790 Invalid `prisma.incomeDetail.findMany()` invocation:
23:31:55.790 
23:31:55.790 
23:31:55.790 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:56.080 prisma:error 
23:31:56.080 Invalid `prisma.itinerary.findMany()` invocation:
23:31:56.081 
23:31:56.081 
23:31:56.081 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:56.102 prisma:error 
23:31:56.102 Invalid `prisma.itinerary.findMany()` invocation:
23:31:56.103 
23:31:56.103 
23:31:56.103 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:56.158 prisma:error 
23:31:56.158 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:31:56.159 
23:31:56.159 
23:31:56.159 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:56.159 prisma:error 
23:31:56.159 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:31:56.160 
23:31:56.160 
23:31:56.160 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:56.220 prisma:error 
23:31:56.220 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:56.220 
23:31:56.221 
23:31:56.221 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:56.221 prisma:error 
23:31:56.221 Invalid `prisma.expenseDetail.findMany()` invocation:
23:31:56.221 
23:31:56.221 
23:31:56.221 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.473 prisma:error 
23:31:57.473 Invalid `prisma.location.findMany()` invocation:
23:31:57.473 
23:31:57.473 
23:31:57.473 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.473 prisma:error 
23:31:57.473 Invalid `prisma.location.findMany()` invocation:
23:31:57.473 
23:31:57.474 
23:31:57.474 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.518 prisma:error 
23:31:57.519 Invalid `prisma.location.findMany()` invocation:
23:31:57.519 
23:31:57.519 
23:31:57.519 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.519 prisma:error 
23:31:57.519 Invalid `prisma.location.findMany()` invocation:
23:31:57.519 
23:31:57.519 
23:31:57.519 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.573 prisma:error 
23:31:57.573 Invalid `prisma.supplier.findMany()` invocation:
23:31:57.574 
23:31:57.574 
23:31:57.574 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.574 prisma:error 
23:31:57.574 Invalid `prisma.supplier.findMany()` invocation:
23:31:57.574 
23:31:57.575 
23:31:57.575 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.649 prisma:error 
23:31:57.649 Invalid `prisma.paymentDetail.findMany()` invocation:
23:31:57.650 
23:31:57.650 
23:31:57.650 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:57.650 prisma:error 
23:31:57.650 Invalid `prisma.paymentDetail.findMany()` invocation:
23:31:57.651 
23:31:57.651 
23:31:57.651 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.984 prisma:error 
23:31:58.985 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:58.985 
23:31:58.985 
23:31:58.986 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.986 prisma:error 
23:31:58.986 Invalid `prisma.taxSlab.findMany()` invocation:
23:31:58.986 
23:31:58.986 
23:31:58.986 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.986 prisma:error 
23:31:58.987 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:31:58.987 
23:31:58.987 
23:31:58.987 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.987 prisma:error 
23:31:58.988 Invalid `prisma.supplier.findMany()` invocation:
23:31:58.988 
23:31:58.988 
23:31:58.988 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.988 prisma:error 
23:31:58.988 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:58.988 
23:31:58.988 
23:31:58.988 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.988 prisma:error 
23:31:58.989 Invalid `prisma.taxSlab.findMany()` invocation:
23:31:58.989 
23:31:58.989 
23:31:58.989 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.989 prisma:error 
23:31:58.989 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:31:58.989 
23:31:58.989 
23:31:58.989 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.989 prisma:error 
23:31:58.989 Invalid `prisma.supplier.findMany()` invocation:
23:31:58.989 
23:31:58.990 
23:31:58.990 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.990 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:31:58.990 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:58.990 
23:31:58.990 
23:31:58.991 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.991     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:58.991     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:58.991     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:58.991     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:58.991     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:31:58.991     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:31:58.991   code: 'P6001',
23:31:58.991   meta: { modelName: 'PurchaseDetail' },
23:31:58.991   clientVersion: '6.15.0'
23:31:58.991 }
23:31:58.991 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:31:58.992 Invalid `prisma.taxSlab.findMany()` invocation:
23:31:58.992 
23:31:58.992 
23:31:58.992 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.992     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:58.992     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:58.992     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:58.992     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:58.992     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:31:58.992     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:31:58.992   code: 'P6001',
23:31:58.992   meta: { modelName: 'TaxSlab' },
23:31:58.993   clientVersion: '6.15.0'
23:31:58.993 }
23:31:58.993 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:31:58.993 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:31:58.993 
23:31:58.993 
23:31:58.993 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.993     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:58.993     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:58.993     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:58.994     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:58.994     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:31:58.994     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:31:58.994   code: 'P6001',
23:31:58.994   meta: { modelName: 'UnitOfMeasure' },
23:31:58.994   clientVersion: '6.15.0'
23:31:58.994 }
23:31:58.994 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:31:58.994 Invalid `prisma.supplier.findMany()` invocation:
23:31:58.994 
23:31:58.994 
23:31:58.994 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.995     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:58.995     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:58.995     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:58.996     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:58.996     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:31:58.996     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:31:58.996   code: 'P6001',
23:31:58.996   meta: { modelName: 'Supplier' },
23:31:58.996   clientVersion: '6.15.0'
23:31:58.996 }
23:31:58.996 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:31:58.996 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:58.997 
23:31:58.997 
23:31:58.997 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.997     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:58.997     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:58.997     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:58.997     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:58.997     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:31:58.997     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:31:58.997   code: 'P6001',
23:31:58.997   meta: { modelName: 'PurchaseDetail' },
23:31:58.997   clientVersion: '6.15.0'
23:31:58.998 }
23:31:58.998 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:31:58.998 Invalid `prisma.taxSlab.findMany()` invocation:
23:31:58.998 
23:31:58.998 
23:31:58.998 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.998     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:58.998     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:58.998     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:58.998     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:58.998     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:31:58.998     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:31:58.998   code: 'P6001',
23:31:58.999   meta: { modelName: 'TaxSlab' },
23:31:58.999   clientVersion: '6.15.0'
23:31:58.999 }
23:31:58.999 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:31:58.999 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:31:58.999 
23:31:58.999 
23:31:58.999 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:58.999     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:58.999     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:58.999     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:58.999     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:59.000     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:31:59.000     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:31:59.000   code: 'P6001',
23:31:59.000   meta: { modelName: 'UnitOfMeasure' },
23:31:59.000   clientVersion: '6.15.0'
23:31:59.000 }
23:31:59.000 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:31:59.000 Invalid `prisma.supplier.findMany()` invocation:
23:31:59.000 
23:31:59.000 
23:31:59.000 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.000     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:59.000     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:59.001     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:59.001     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:59.001     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:31:59.001     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:31:59.001   code: 'P6001',
23:31:59.001   meta: { modelName: 'Supplier' },
23:31:59.001   clientVersion: '6.15.0'
23:31:59.001 }
23:31:59.105 prisma:error 
23:31:59.106 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:31:59.115 
23:31:59.115 
23:31:59.115 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.115 prisma:error 
23:31:59.115 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:31:59.115 
23:31:59.115 
23:31:59.115 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.116 
   Generating static pages (131/175) 
23:31:59.116 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:31:59.116 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:31:59.116 
23:31:59.116 
23:31:59.116 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.116     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:59.116     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:59.116     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:59.116     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:59.116     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:31:59.116     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:31:59.116   code: 'P6001',
23:31:59.116   meta: { modelName: 'PurchaseReturn' },
23:31:59.116   clientVersion: '6.15.0'
23:31:59.116 }
23:31:59.116 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:31:59.116 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:31:59.116 
23:31:59.116 
23:31:59.116 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.116     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:59.116     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:59.116     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:59.116     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:59.116     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:31:59.116     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:31:59.116   code: 'P6001',
23:31:59.116   meta: { modelName: 'PurchaseReturn' },
23:31:59.116   clientVersion: '6.15.0'
23:31:59.116 }
23:31:59.315 prisma:error 
23:31:59.315 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:59.315 
23:31:59.315 
23:31:59.316 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.316 prisma:error 
23:31:59.316 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:59.316 
23:31:59.316 
23:31:59.316 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.316 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:31:59.316 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:59.316 
23:31:59.316 
23:31:59.316 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.317     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:59.317     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:59.317     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:59.317     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:59.317     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:31:59.317   code: 'P6001',
23:31:59.317   meta: { modelName: 'PurchaseDetail' },
23:31:59.317   clientVersion: '6.15.0'
23:31:59.317 }
23:31:59.317 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:31:59.317 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:59.317 
23:31:59.317 
23:31:59.317 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.318     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:31:59.318     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:31:59.318     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:31:59.318     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:31:59.318     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:31:59.318   code: 'P6001',
23:31:59.318   meta: { modelName: 'PurchaseDetail' },
23:31:59.319   clientVersion: '6.15.0'
23:31:59.319 }
23:31:59.918 prisma:error 
23:31:59.919 Invalid `prisma.supplier.findMany()` invocation:
23:31:59.920 
23:31:59.920 
23:31:59.920 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.920 prisma:error 
23:31:59.920 Invalid `prisma.supplier.findMany()` invocation:
23:31:59.920 
23:31:59.920 
23:31:59.921 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.985 prisma:error 
23:31:59.985 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:59.985 
23:31:59.985 
23:31:59.985 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:31:59.985 prisma:error 
23:31:59.986 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:31:59.986 
23:31:59.986 
23:31:59.986 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:00.205 prisma:error 
23:32:00.208 Invalid `prisma.customer.findMany()` invocation:
23:32:00.208 
23:32:00.210 
23:32:00.210 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:00.210 prisma:error 
23:32:00.210 Invalid `prisma.customer.findMany()` invocation:
23:32:00.210 
23:32:00.210 
23:32:00.211 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:00.422 prisma:error 
23:32:00.423 Invalid `prisma.receiptDetail.findMany()` invocation:
23:32:00.423 
23:32:00.423 
23:32:00.423 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:00.423 prisma:error 
23:32:00.423 Invalid `prisma.receiptDetail.findMany()` invocation:
23:32:00.423 
23:32:00.423 
23:32:00.423 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:00.812 prisma:error 
23:32:00.813 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:32:00.813 
23:32:00.813 
23:32:00.813 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:00.813 prisma:error 
23:32:00.813 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:32:00.813 
23:32:00.813 
23:32:00.813 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.108 prisma:error 
23:32:01.109 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:01.110 
23:32:01.110 
23:32:01.110 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.110 prisma:error 
23:32:01.110 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:01.110 
23:32:01.110 
23:32:01.110 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.474 prisma:error 
23:32:01.475 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:01.476 
23:32:01.476 
23:32:01.476 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.476 prisma:error 
23:32:01.476 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:01.476 
23:32:01.476 
23:32:01.476 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.796 prisma:error 
23:32:01.797 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:01.798 
23:32:01.798 
23:32:01.798 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.798 prisma:error 
23:32:01.799 Invalid `prisma.taxSlab.findMany()` invocation:
23:32:01.799 
23:32:01.799 
23:32:01.799 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.800 prisma:error 
23:32:01.800 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:32:01.800 
23:32:01.800 
23:32:01.800 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.803 prisma:error 
23:32:01.804 Invalid `prisma.customer.findMany()` invocation:
23:32:01.804 
23:32:01.804 
23:32:01.804 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.805 prisma:error 
23:32:01.805 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:01.805 
23:32:01.805 
23:32:01.805 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.806 prisma:error 
23:32:01.806 Invalid `prisma.taxSlab.findMany()` invocation:
23:32:01.806 
23:32:01.807 
23:32:01.807 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.808 prisma:error 
23:32:01.808 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:32:01.808 
23:32:01.808 
23:32:01.808 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.808 prisma:error 
23:32:01.808 Invalid `prisma.customer.findMany()` invocation:
23:32:01.808 
23:32:01.808 
23:32:01.809 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.810 [GET_SALES] PrismaClientKnownRequestError: 
23:32:01.810 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:01.811 
23:32:01.811 
23:32:01.811 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.811     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.811     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.811     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.811     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.811     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:32:01.811     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:32:01.811   code: 'P6001',
23:32:01.811   meta: { modelName: 'SaleDetail' },
23:32:01.813   clientVersion: '6.15.0'
23:32:01.813 }
23:32:01.813 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:32:01.814 Invalid `prisma.taxSlab.findMany()` invocation:
23:32:01.814 
23:32:01.814 
23:32:01.815 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.815     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.815     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.816     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.816     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.817     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:32:01.818     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:32:01.818   code: 'P6001',
23:32:01.818   meta: { modelName: 'TaxSlab' },
23:32:01.818   clientVersion: '6.15.0'
23:32:01.819 }
23:32:01.819 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:32:01.819 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:32:01.819 
23:32:01.820 
23:32:01.820 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.820     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.821     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.821     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.821     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.821     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:32:01.822     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:32:01.822   code: 'P6001',
23:32:01.822   meta: { modelName: 'UnitOfMeasure' },
23:32:01.822   clientVersion: '6.15.0'
23:32:01.823 }
23:32:01.823 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:32:01.823 Invalid `prisma.customer.findMany()` invocation:
23:32:01.823 
23:32:01.824 
23:32:01.824 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.824     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.825     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.825     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.825     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.826     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:32:01.826     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:32:01.826   code: 'P6001',
23:32:01.827   meta: { modelName: 'Customer' },
23:32:01.827   clientVersion: '6.15.0'
23:32:01.827 }
23:32:01.827 [GET_SALES] PrismaClientKnownRequestError: 
23:32:01.828 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:01.828 
23:32:01.828 
23:32:01.828 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.829     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.829     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.829     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.829     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.829     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:32:01.829     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:32:01.829   code: 'P6001',
23:32:01.829   meta: { modelName: 'SaleDetail' },
23:32:01.829   clientVersion: '6.15.0'
23:32:01.829 }
23:32:01.830 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:32:01.831 Invalid `prisma.taxSlab.findMany()` invocation:
23:32:01.831 
23:32:01.839 
23:32:01.839 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.840     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.840     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.841     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.841     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.842     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:32:01.842     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:32:01.843   code: 'P6001',
23:32:01.843   meta: { modelName: 'TaxSlab' },
23:32:01.843   clientVersion: '6.15.0'
23:32:01.843 }
23:32:01.844 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:32:01.844 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:32:01.844 
23:32:01.844 
23:32:01.845 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.845     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.845     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.845     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.845     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.845     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:32:01.845     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:32:01.845   code: 'P6001',
23:32:01.845   meta: { modelName: 'UnitOfMeasure' },
23:32:01.845   clientVersion: '6.15.0'
23:32:01.846 }
23:32:01.846 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:32:01.847 Invalid `prisma.customer.findMany()` invocation:
23:32:01.847 
23:32:01.847 
23:32:01.847 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.847     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.847     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.847     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.847     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.848     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:32:01.848     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:32:01.849   code: 'P6001',
23:32:01.849   meta: { modelName: 'Customer' },
23:32:01.849   clientVersion: '6.15.0'
23:32:01.850 }
23:32:01.852 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:32:01.852 Invalid `prisma.saleReturn.findMany()` invocation:
23:32:01.852 
23:32:01.852 
23:32:01.853 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.853     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.853     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.853     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.853     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.853     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:32:01.853     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:32:01.854   code: 'P6001',
23:32:01.854   meta: { modelName: 'SaleReturn' },
23:32:01.854   clientVersion: '6.15.0'
23:32:01.854 }
23:32:01.854 prisma:error 
23:32:01.854 Invalid `prisma.saleReturn.findMany()` invocation:
23:32:01.854 
23:32:01.854 
23:32:01.854 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.882 prisma:error 
23:32:01.884 Invalid `prisma.saleReturn.findMany()` invocation:
23:32:01.884 
23:32:01.885 
23:32:01.885 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.885 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:32:01.886 Invalid `prisma.saleReturn.findMany()` invocation:
23:32:01.886 
23:32:01.886 
23:32:01.886 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.886     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:32:01.886     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:32:01.887     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:32:01.888     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:32:01.888     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:32:01.889     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:32:01.889   code: 'P6001',
23:32:01.889   meta: { modelName: 'SaleReturn' },
23:32:01.889   clientVersion: '6.15.0'
23:32:01.890 }
23:32:01.914 prisma:error 
23:32:01.914 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:01.914 
23:32:01.914 
23:32:01.915 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:01.915 prisma:error 
23:32:01.915 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:01.915 
23:32:01.915 
23:32:01.915 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.013 prisma:error 
23:32:02.013 Invalid `prisma.customer.findMany()` invocation:
23:32:02.013 
23:32:02.013 
23:32:02.013 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.013 prisma:error 
23:32:02.013 Invalid `prisma.customer.findMany()` invocation:
23:32:02.013 
23:32:02.013 
23:32:02.013 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.061 prisma:error 
23:32:02.061 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:02.061 
23:32:02.061 
23:32:02.061 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.062 prisma:error 
23:32:02.062 Invalid `prisma.saleDetail.findMany()` invocation:
23:32:02.062 
23:32:02.062 
23:32:02.062 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.103 prisma:error 
23:32:02.103 Invalid `prisma.organization.findFirst()` invocation:
23:32:02.103 
23:32:02.103 
23:32:02.103 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.127 prisma:error 
23:32:02.127 Invalid `prisma.organization.findFirst()` invocation:
23:32:02.127 
23:32:02.127 
23:32:02.127 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.164 prisma:error 
23:32:02.164 Invalid `prisma.organization.findFirst()` invocation:
23:32:02.165 
23:32:02.165 
23:32:02.165 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.165 prisma:error 
23:32:02.165 Invalid `prisma.organization.findFirst()` invocation:
23:32:02.165 
23:32:02.165 
23:32:02.165 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.177 prisma:error 
23:32:02.178 Invalid `prisma.taxSlab.findMany()` invocation:
23:32:02.178 
23:32:02.178 
23:32:02.178 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.203 prisma:error 
23:32:02.203 Invalid `prisma.taxSlab.findMany()` invocation:
23:32:02.203 
23:32:02.203 
23:32:02.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.213 prisma:error 
23:32:02.214 Invalid `prisma.tDSMaster.findMany()` invocation:
23:32:02.214 
23:32:02.214 
23:32:02.214 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.237 prisma:error 
23:32:02.237 Invalid `prisma.tDSMaster.findMany()` invocation:
23:32:02.237 
23:32:02.238 
23:32:02.238 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.261 prisma:error 
23:32:02.262 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:32:02.262 
23:32:02.262 
23:32:02.262 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.277 prisma:error 
23:32:02.277 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:32:02.278 
23:32:02.278 
23:32:02.278 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.294 prisma:error 
23:32:02.295 Invalid `prisma.supplier.findMany()` invocation:
23:32:02.295 
23:32:02.295 
23:32:02.295 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.345 prisma:error 
23:32:02.345 Invalid `prisma.supplier.findMany()` invocation:
23:32:02.345 
23:32:02.345 
23:32:02.345 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.365 prisma:error 
23:32:02.365 Invalid `prisma.supplier.findMany()` invocation:
23:32:02.365 
23:32:02.366 
23:32:02.366 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.388 prisma:error 
23:32:02.388 Invalid `prisma.supplier.findMany()` invocation:
23:32:02.389 
23:32:02.389 
23:32:02.389 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.518 prisma:error 
23:32:02.518 Invalid `prisma.tourPackage.findMany()` invocation:
23:32:02.519 
23:32:02.519 
23:32:02.519 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.519 prisma:error 
23:32:02.519 Invalid `prisma.tourPackage.findMany()` invocation:
23:32:02.519 
23:32:02.519 
23:32:02.519 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.533 prisma:error 
23:32:02.533 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:02.534 
23:32:02.534 
23:32:02.534 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.550 prisma:error 
23:32:02.551 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:02.551 
23:32:02.552 
23:32:02.552 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.581 prisma:error 
23:32:02.581 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:02.582 
23:32:02.582 
23:32:02.583 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.591 prisma:error 
23:32:02.591 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:02.591 
23:32:02.592 
23:32:02.592 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.607 prisma:error 
23:32:02.608 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:02.608 
23:32:02.609 
23:32:02.609 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.645 prisma:error 
23:32:02.645 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:32:02.646 
23:32:02.646 
23:32:02.646 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.663 prisma:error 
23:32:02.663 Invalid `prisma.tourPackage.findMany()` invocation:
23:32:02.663 
23:32:02.663 
23:32:02.663 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.683 prisma:error 
23:32:02.684 Invalid `prisma.tourPackage.findMany()` invocation:
23:32:02.684 
23:32:02.684 
23:32:02.684 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.702 prisma:error 
23:32:02.702 Invalid `prisma.location.findMany()` invocation:
23:32:02.702 
23:32:02.702 
23:32:02.702 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.702 prisma:error 
23:32:02.702 Invalid `prisma.tourPackage.findMany()` invocation:
23:32:02.702 
23:32:02.702 
23:32:02.702 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.727 prisma:error 
23:32:02.727 Invalid `prisma.location.findMany()` invocation:
23:32:02.728 
23:32:02.728 
23:32:02.728 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.728 prisma:error 
23:32:02.728 Invalid `prisma.tourPackage.findMany()` invocation:
23:32:02.728 
23:32:02.728 
23:32:02.728 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.737 prisma:error 
23:32:02.737 Invalid `prisma.transfer.findMany()` invocation:
23:32:02.738 
23:32:02.738 
23:32:02.738 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:02.757 prisma:error 
23:32:02.758 Invalid `prisma.transfer.findMany()` invocation:
23:32:02.758 
23:32:02.758 
23:32:02.758 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:32:03.206 
 ✓ Generating static pages (175/175) 
23:32:03.229 SIGINT received - disconnecting Prisma Client
23:32:03.314    Finalizing page optimization ...
23:32:03.314    Collecting build traces ...
23:32:05.502 
23:32:05.591 Route (app)                                                               Size     First Load JS
23:32:05.591 ┌ λ /                                                                     1.6 kB         82.5 kB
23:32:05.592 ├ λ /_not-found                                                           0 B                0 B
23:32:05.592 ├ λ /accounts                                                             6.96 kB         153 kB
23:32:05.592 ├ λ /accounts/[tourPackageQueryId]                                        13.1 kB         245 kB
23:32:05.592 ├ λ /activities                                                           11.2 kB         183 kB
23:32:05.592 ├ λ /activities/[activityId]                                              6.28 kB         220 kB
23:32:05.592 ├ λ /activitiesMaster                                                     11.2 kB         183 kB
23:32:05.592 ├ λ /activitiesMaster/[activityMasterId]                                  6.29 kB         220 kB
23:32:05.593 ├ λ /api/activities                                                       0 B                0 B
23:32:05.593 ├ λ /api/activities/[activityId]                                          0 B                0 B
23:32:05.593 ├ λ /api/activitiesMaster                                                 0 B                0 B
23:32:05.593 ├ λ /api/activitiesMaster/[activityMasterId]                              0 B                0 B
23:32:05.593 ├ λ /api/associate-partners                                               0 B                0 B
23:32:05.593 ├ λ /api/associate-partners/[associatePartnerId]                          0 B                0 B
23:32:05.593 ├ λ /api/associate-partners/me                                            0 B                0 B
23:32:05.593 ├ λ /api/associate-performance                                            0 B                0 B
23:32:05.593 ├ λ /api/audit-logs                                                       0 B                0 B
23:32:05.594 ├ λ /api/bank-accounts                                                    0 B                0 B
23:32:05.594 ├ λ /api/bank-accounts/[bankAccountId]                                    0 B                0 B
23:32:05.594 ├ λ /api/bank-accounts/[bankAccountId]/recalculate                        0 B                0 B
23:32:05.594 ├ λ /api/bank-accounts/[bankAccountId]/transactions                       0 B                0 B
23:32:05.594 ├ λ /api/bank-accounts/recalculate-all                                    0 B                0 B
23:32:05.594 ├ λ /api/cash-accounts                                                    0 B                0 B
23:32:05.594 ├ λ /api/cash-accounts/[cashAccountId]                                    0 B                0 B
23:32:05.594 ├ λ /api/cash-accounts/[cashAccountId]/recalculate                        0 B                0 B
23:32:05.594 ├ λ /api/cash-accounts/[cashAccountId]/transactions                       0 B                0 B
23:32:05.594 ├ λ /api/cash-accounts/recalculate-all                                    0 B                0 B
23:32:05.594 ├ λ /api/config/meal-plans                                                0 B                0 B
23:32:05.594 ├ λ /api/config/occupancy-types                                           0 B                0 B
23:32:05.595 ├ λ /api/config/room-types                                                0 B                0 B
23:32:05.595 ├ λ /api/config/vehicle-types                                             0 B                0 B
23:32:05.595 ├ λ /api/customers                                                        0 B                0 B
23:32:05.595 ├ λ /api/customers/[customerId]                                           0 B                0 B
23:32:05.595 ├ λ /api/debug-whatsapp                                                   0 B                0 B
23:32:05.595 ├ ○ /api/debug/env-check                                                  0 B                0 B
23:32:05.595 ├ λ /api/destinations                                                     0 B                0 B
23:32:05.595 ├ λ /api/destinations/[destinationId]                                     0 B                0 B
23:32:05.595 ├ λ /api/expense-categories                                               0 B                0 B
23:32:05.595 ├ λ /api/expense-categories/[categoryId]                                  0 B                0 B
23:32:05.595 ├ λ /api/expenses                                                         0 B                0 B
23:32:05.595 ├ λ /api/expenses/[expenseId]                                             0 B                0 B
23:32:05.595 ├ λ /api/expenses/[expenseId]/pay                                         0 B                0 B
23:32:05.595 ├ λ /api/expenses/accrued                                                 0 B                0 B
23:32:05.595 ├ λ /api/export/inquiries-contacts                                        0 B                0 B
23:32:05.596 ├ λ /api/export/queries-contacts                                          0 B                0 B
23:32:05.596 ├ λ /api/financial-records                                                0 B                0 B
23:32:05.596 ├ λ /api/flight-tickets                                                   0 B                0 B
23:32:05.596 ├ λ /api/flight-tickets/[pnr]                                             0 B                0 B
23:32:05.596 ├ λ /api/generate-pdf                                                     0 B                0 B
23:32:05.596 ├ λ /api/hotels                                                           0 B                0 B
23:32:05.596 ├ λ /api/hotels/[hotelId]                                                 0 B                0 B
23:32:05.596 ├ λ /api/hotels/[hotelId]/pricing                                         0 B                0 B
23:32:05.596 ├ λ /api/hotels/[hotelId]/pricing/[pricingId]                             0 B                0 B
23:32:05.596 ├ λ /api/income-categories                                                0 B                0 B
23:32:05.596 ├ λ /api/income-categories/[categoryId]                                   0 B                0 B
23:32:05.596 ├ λ /api/incomes                                                          0 B                0 B
23:32:05.596 ├ λ /api/incomes/[incomeId]                                               0 B                0 B
23:32:05.596 ├ λ /api/inquiries                                                        0 B                0 B
23:32:05.597 ├ λ /api/inquiries/[inquiryId]                                            0 B                0 B
23:32:05.597 ├ λ /api/inquiries/[inquiryId]/actions                                    0 B                0 B
23:32:05.597 ├ λ /api/inquiries/[inquiryId]/actions/[actionId]                         0 B                0 B
23:32:05.597 ├ λ /api/inquiries/[inquiryId]/assign-staff                               0 B                0 B
23:32:05.597 ├ λ /api/inquiries/[inquiryId]/status                                     0 B                0 B
23:32:05.597 ├ λ /api/inquiries/[inquiryId]/unassign-staff                             0 B                0 B
23:32:05.598 ├ λ /api/inquiry-summary                                                  0 B                0 B
23:32:05.598 ├ λ /api/itineraries                                                      0 B                0 B
23:32:05.598 ├ λ /api/itineraries/[itineraryId]                                        0 B                0 B
23:32:05.598 ├ λ /api/itinerariesMaster                                                0 B                0 B
23:32:05.598 ├ λ /api/itinerariesMaster/[itineraryMasterId]                            0 B                0 B
23:32:05.598 ├ λ /api/itineraryMaster                                                  0 B                0 B
23:32:05.598 ├ λ /api/locationBySlug/[slug]                                            0 B                0 B
23:32:05.598 ├ λ /api/locations                                                        0 B                0 B
23:32:05.598 ├ λ /api/locations-suppliers                                              0 B                0 B
23:32:05.598 ├ λ /api/locations/[locationId]                                           0 B                0 B
23:32:05.599 ├ λ /api/locations/[locationId]/seasonal-periods                          0 B                0 B
23:32:05.599 ├ λ /api/locations/[locationId]/seasonal-periods/[periodId]               0 B                0 B
23:32:05.599 ├ λ /api/me/role                                                          0 B                0 B
23:32:05.599 ├ λ /api/meal-plans                                                       0 B                0 B
23:32:05.599 ├ λ /api/meal-plans/[mealPlanId]                                          0 B                0 B
23:32:05.599 ├ λ /api/notifications                                                    0 B                0 B
23:32:05.599 ├ λ /api/notifications/[notificationId]                                   0 B                0 B
23:32:05.599 ├ λ /api/notifications/mark-all-read                                      0 B                0 B
23:32:05.599 ├ λ /api/occupancy-types                                                  0 B                0 B
23:32:05.599 ├ λ /api/occupancy-types/[occupancyTypeId]                                0 B                0 B
23:32:05.599 ├ λ /api/operational-staff                                                0 B                0 B
23:32:05.599 ├ λ /api/operational-staff/[staffId]                                      0 B                0 B
23:32:05.599 ├ λ /api/ops/my-inquiries                                                 0 B                0 B
23:32:05.599 ├ λ /api/ops/my-inquiries/[inquiryId]                                     0 B                0 B
23:32:05.599 ├ λ /api/package-variants                                                 0 B                0 B
23:32:05.600 ├ λ /api/package-variants/[variantId]                                     0 B                0 B
23:32:05.600 ├ λ /api/package-variants/[variantId]/hotel-mappings                      0 B                0 B
23:32:05.600 ├ λ /api/payments                                                         0 B                0 B
23:32:05.600 ├ λ /api/payments/[paymentId]                                             0 B                0 B
23:32:05.600 ├ λ /api/pricing-attributes                                               0 B                0 B
23:32:05.600 ├ λ /api/pricing-attributes/[pricingAttributeId]                          0 B                0 B
23:32:05.600 ├ λ /api/pricing-components                                               0 B                0 B
23:32:05.600 ├ λ /api/pricing-components/[pricingComponentId]                          0 B                0 B
23:32:05.600 ├ λ /api/pricing/calculate                                                0 B                0 B
23:32:05.600 ├ ○ /api/public-debug                                                     0 B                0 B
23:32:05.600 ├ λ /api/purchase-returns                                                 0 B                0 B
23:32:05.600 ├ λ /api/purchase-returns/[purchaseReturnId]                              0 B                0 B
23:32:05.600 ├ λ /api/purchases                                                        0 B                0 B
23:32:05.600 ├ λ /api/purchases/[purchaseId]                                           0 B                0 B
23:32:05.600 ├ λ /api/receipts                                                         0 B                0 B
23:32:05.601 ├ λ /api/receipts/[receiptId]                                             0 B                0 B
23:32:05.601 ├ λ /api/report/tds/summary                                               0 B                0 B
23:32:05.601 ├ λ /api/room-types                                                       0 B                0 B
23:32:05.601 ├ λ /api/room-types/[roomTypeId]                                          0 B                0 B
23:32:05.601 ├ λ /api/sale-returns                                                     0 B                0 B
23:32:05.601 ├ λ /api/sale-returns/[saleReturnId]                                      0 B                0 B
23:32:05.601 ├ λ /api/sales                                                            0 B                0 B
23:32:05.601 ├ λ /api/sales/[saleId]                                                   0 B                0 B
23:32:05.601 ├ λ /api/sales/[saleId]/items                                             0 B                0 B
23:32:05.601 ├ λ /api/searchTermLocations/[searchTerm]                                 0 B                0 B
23:32:05.601 ├ λ /api/settings/organization                                            0 B                0 B
23:32:05.601 ├ λ /api/settings/organization/[organizationId]                           0 B                0 B
23:32:05.601 ├ λ /api/settings/tax-slabs                                               0 B                0 B
23:32:05.601 ├ λ /api/settings/tax-slabs/[taxSlabId]                                   0 B                0 B
23:32:05.601 ├ λ /api/settings/tds-sections                                            0 B                0 B
23:32:05.601 ├ λ /api/settings/tds-sections/[id]                                       0 B                0 B
23:32:05.601 ├ λ /api/settings/units                                                   0 B                0 B
23:32:05.601 ├ λ /api/settings/units/[unitId]                                          0 B                0 B
23:32:05.601 ├ λ /api/suppliers                                                        0 B                0 B
23:32:05.601 ├ λ /api/suppliers/[supplierId]                                           0 B                0 B
23:32:05.601 ├ λ /api/tds/challans                                                     0 B                0 B
23:32:05.601 ├ λ /api/tds/deposit                                                      0 B                0 B
23:32:05.601 ├ λ /api/tds/transactions                                                 0 B                0 B
23:32:05.601 ├ ○ /api/test-env                                                         0 B                0 B
23:32:05.601 ├ λ /api/tourPackageBySlug/[slug]                                         0 B                0 B
23:32:05.601 ├ λ /api/tourPackageQuery                                                 0 B                0 B
23:32:05.602 ├ λ /api/tourPackageQuery/[tourPackageQueryId]                            0 B                0 B
23:32:05.602 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/accounting                 0 B                0 B
23:32:05.602 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/confirm                    0 B                0 B
23:32:05.602 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/hotel-details              0 B                0 B
23:32:05.602 ├ λ /api/tourPackages                                                     0 B                0 B
23:32:05.602 ├ λ /api/tourPackages/[tourPackageId]                                     0 B                0 B
23:32:05.602 ├ λ /api/tourPackages/[tourPackageId]/field-update                        0 B                0 B
23:32:05.602 ├ λ /api/tourPackages/[tourPackageId]/pricing                             0 B                0 B
23:32:05.602 ├ λ /api/tourPackages/[tourPackageId]/pricing/[pricingId]                 0 B                0 B
23:32:05.602 ├ λ /api/tourPackages/[tourPackageId]/related                             0 B                0 B
23:32:05.602 ├ λ /api/tourPackages/reorder                                             0 B                0 B
23:32:05.602 ├ λ /api/tourPackagesForWebsite                                           0 B                0 B
23:32:05.602 ├ λ /api/transfers                                                        0 B                0 B
23:32:05.602 ├ λ /api/transfers/[transferId]                                           0 B                0 B
23:32:05.602 ├ λ /api/transport-pricing                                                0 B                0 B
23:32:05.603 ├ λ /api/transport-pricing/[transportPricingId]                           0 B                0 B
23:32:05.603 ├ λ /api/uploads/images                                                   0 B                0 B
23:32:05.603 ├ λ /api/vehicle-types                                                    0 B                0 B
23:32:05.603 ├ λ /api/vehicle-types/[vehicleTypeId]                                    0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/campaigns                                               0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/campaigns/[id]                                          0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/campaigns/[id]/recipients                               0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/campaigns/[id]/send                                     0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/campaigns/[id]/stats                                    0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/catalog                                                 0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/catalog/packages                                        0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/catalog/packages/[packageId]                            0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/catalog/packages/[packageId]/sync                       0 B                0 B
23:32:05.603 ├ ○ /api/whatsapp/config                                                  0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/customers                                               0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/customers/[id]                                          0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/customers/export                                        0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/customers/import                                        0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/database-health                                         0 B                0 B
23:32:05.603 ├ ○ /api/whatsapp/env-check                                               0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/flow-endpoint                                           0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/flows/manage                                            0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/flows/templates                                         0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/flows/versions                                          0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/media/[mediaId]                                         0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/messages                                                0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/send                                                    0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/send-message                                            0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/send-template                                           0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/templates                                               0 B                0 B
23:32:05.603 ├ λ /api/whatsapp/templates/create                                        0 B                0 B
23:32:05.611 ├ λ /api/whatsapp/templates/manage                                        0 B                0 B
23:32:05.612 ├ λ /api/whatsapp/templates/preview                                       0 B                0 B
23:32:05.612 ├ ○ /api/whatsapp/test-key                                                0 B                0 B
23:32:05.612 ├ λ /api/whatsapp/webhook                                                 0 B                0 B
23:32:05.612 ├ λ /associate-partners                                                   10.2 kB         187 kB
23:32:05.612 ├ λ /associate-partners/[associatePartnerId]                              7.35 kB         172 kB
23:32:05.612 ├ λ /audit-logs                                                           9.13 kB         150 kB
23:32:05.612 ├ λ /bank-book                                                            4.92 kB         123 kB
23:32:05.612 ├ λ /bank-book/[bankAccountId]                                            8.62 kB         412 kB
23:32:05.612 ├ λ /bankaccounts                                                         12.1 kB         407 kB
23:32:05.614 ├ λ /bankaccounts/[bankAccountId]                                         5.18 kB         170 kB
23:32:05.614 ├ λ /cash-book                                                            26.3 kB         145 kB
23:32:05.614 ├ λ /cash-book/[cashAccountId]                                            8.43 kB         412 kB
23:32:05.614 ├ λ /cashaccounts                                                         12.2 kB         407 kB
23:32:05.614 ├ λ /cashaccounts/[cashAccountId]                                         8.37 kB         173 kB
23:32:05.614 ├ λ /customers                                                            1.89 kB         280 kB
23:32:05.614 ├ λ /customers/[customerId]                                               38.5 kB         258 kB
23:32:05.614 ├ λ /customers/[customerId]/ledger                                        7.77 kB         380 kB
23:32:05.614 ├ λ /customers/ledger                                                     8.15 kB         400 kB
23:32:05.614 ├ λ /destinations                                                         11.4 kB         184 kB
23:32:05.614 ├ λ /destinations/[destinationId]                                         9.9 kB          224 kB
23:32:05.624 ├ λ /expense-categories                                                   8.3 kB          185 kB
23:32:05.624 ├ λ /expense-categories/[categoryId]                                      8.63 kB         173 kB
23:32:05.624 ├ λ /expenses                                                             13.9 kB         435 kB
23:32:05.624 ├ λ /expenses/[expenseId]                                                 3.85 kB         243 kB
23:32:05.624 ├ λ /expenses/[expenseId]/view                                            6.01 kB         102 kB
23:32:05.624 ├ λ /expenses/[expenseId]/voucher                                         152 B           114 kB
23:32:05.625 ├ λ /expenses/accrued                                                     10.3 kB         436 kB
23:32:05.625 ├ λ /expenses/ledger                                                      14.4 kB         436 kB
23:32:05.625 ├ λ /expenses/new                                                         4.91 kB         245 kB
23:32:05.625 ├ λ /export-contacts                                                      9.29 kB         106 kB
23:32:05.625 ├ λ /fetchaccounts/[tourPackageQueryId]                                   17.8 kB         433 kB
23:32:05.625 ├ λ /flight-tickets                                                       11.3 kB         196 kB
23:32:05.625 ├ λ /flight-tickets/[pnr]                                                 8.22 kB         123 kB
23:32:05.625 ├ λ /flight-tickets/[pnr]/edit                                            185 B           230 kB
23:32:05.625 ├ λ /flight-tickets/[pnr]/print                                           13.6 kB         134 kB
23:32:05.625 ├ λ /flight-tickets/new                                                   185 B           230 kB
23:32:05.625 ├ λ /hotels                                                               1.54 kB         184 kB
23:32:05.625 ├ λ /hotels/[hotelId]                                                     6.59 kB         228 kB
23:32:05.625 ├ λ /hotels/[hotelId]/pricing                                             8.86 kB         228 kB
23:32:05.625 ├ λ /income-categories                                                    8.3 kB          185 kB
23:32:05.625 ├ λ /income-categories/[categoryId]                                       8.63 kB         173 kB
23:32:05.625 ├ λ /incomes                                                              14.4 kB         455 kB
23:32:05.625 ├ λ /incomes/[incomeId]                                                   2.11 kB         242 kB
23:32:05.625 ├ λ /incomes/[incomeId]/edit                                              2.48 kB         261 kB
23:32:05.625 ├ λ /incomes/[incomeId]/view                                              5.94 kB         102 kB
23:32:05.625 ├ λ /incomes/[incomeId]/voucher                                           152 B           114 kB
23:32:05.628 ├ λ /incomes/ledger                                                       13.6 kB         435 kB
23:32:05.628 ├ λ /incomes/new                                                          3.53 kB         262 kB
23:32:05.628 ├ λ /inquiries                                                            42.6 kB         550 kB
23:32:05.628 ├ λ /inquiries/[inquiryId]                                                10.5 kB         249 kB
23:32:05.628 ├ λ /itineraries                                                          1.31 kB         184 kB
23:32:05.628 ├ λ /itineraries/[itineraryId]                                            10.4 kB         224 kB
23:32:05.628 ├ λ /itinerariesMaster                                                    1.32 kB         184 kB
23:32:05.628 ├ λ /itinerariesMaster/[itineraryMasterId]                                7.9 kB          225 kB
23:32:05.628 ├ λ /ledger                                                               4.36 kB         402 kB
23:32:05.628 ├ λ /ledger/category/[category]                                           3.46 kB         388 kB
23:32:05.628 ├ λ /locations                                                            11.6 kB         184 kB
23:32:05.628 ├ λ /locations-suppliers                                                  7.4 kB          108 kB
23:32:05.629 ├ λ /locations/[locationId]                                               9.31 kB         207 kB
23:32:05.629 ├ λ /locations/[locationId]/seasonal-periods                              5.26 kB         198 kB
23:32:05.629 ├ λ /operational-staff                                                    13.1 kB         149 kB
23:32:05.629 ├ λ /ops                                                                  9.91 kB         135 kB
23:32:05.629 ├ λ /ops/inquiry/[inquiryId]                                              13.1 kB         124 kB
23:32:05.629 ├ λ /payments                                                             3.34 kB         139 kB
23:32:05.629 ├ λ /payments/[paymentId]                                                 2.21 kB         243 kB
23:32:05.629 ├ λ /payments/[paymentId]/voucher                                         152 B           114 kB
23:32:05.629 ├ λ /payments/ledger                                                      13.5 kB         435 kB
23:32:05.629 ├ λ /purchase-returns                                                     11.3 kB         184 kB
23:32:05.629 ├ λ /purchase-returns/[purchaseReturnId]                                  186 B           211 kB
23:32:05.629 ├ λ /purchase-returns/new                                                 186 B           211 kB
23:32:05.629 ├ λ /purchases                                                            3.46 kB         139 kB
23:32:05.629 ├ λ /purchases/[purchaseId]                                               456 B           223 kB
23:32:05.634 ├ λ /purchases/[purchaseId]/items                                         8.73 kB         220 kB
23:32:05.635 ├ λ /purchases/[purchaseId]/voucher                                       151 B           114 kB
23:32:05.635 ├ λ /purchases/ledger                                                     3.81 kB         436 kB
23:32:05.635 ├ λ /purchases/new                                                        237 B           223 kB
23:32:05.635 ├ λ /receipts                                                             3.36 kB         139 kB
23:32:05.635 ├ λ /receipts/[receiptId]                                                 2.21 kB         243 kB
23:32:05.635 ├ λ /receipts/[receiptId]/voucher                                         151 B           114 kB
23:32:05.635 ├ λ /receipts/ledger                                                      13.4 kB         435 kB
23:32:05.635 ├ λ /reports/associatePerformance                                         3.19 kB         404 kB
23:32:05.635 ├ λ /reports/confirmedQueries                                             3.5 kB          207 kB
23:32:05.635 ├ λ /reports/gst                                                          5.23 kB         288 kB
23:32:05.635 ├ λ /reports/inquirySummary                                               3.08 kB         404 kB
23:32:05.635 ├ λ /reports/profit                                                       5.98 kB         282 kB
23:32:05.635 ├ λ /reports/unconfirmedQueries                                           1.6 kB          184 kB
23:32:05.635 ├ λ /reports/upcomingTrips                                                3.83 kB         217 kB
23:32:05.636 ├ λ /sale-returns                                                         12.1 kB         194 kB
23:32:05.636 ├ λ /sale-returns/[saleReturnId]                                          185 B           210 kB
23:32:05.636 ├ λ /sale-returns/[saleReturnId]/voucher                                  152 B           114 kB
23:32:05.636 ├ λ /sale-returns/new                                                     185 B           210 kB
23:32:05.640 ├ λ /sales                                                                3.45 kB         139 kB
23:32:05.640 ├ λ /sales/[saleId]                                                       2.9 kB          223 kB
23:32:05.641 ├ λ /sales/[saleId]/items                                                 8.73 kB         220 kB
23:32:05.641 ├ λ /sales/[saleId]/voucher                                               152 B           114 kB
23:32:05.641 ├ λ /sales/ledger                                                         3.52 kB         435 kB
23:32:05.641 ├ λ /sales/new                                                            12 kB           223 kB
23:32:05.641 ├ λ /settings/invoice                                                     4.46 kB         155 kB
23:32:05.641 ├ λ /settings/meal-plans                                                  5.5 kB          147 kB
23:32:05.641 ├ λ /settings/meal-plans/[mealPlanId]                                     171 B           173 kB
23:32:05.641 ├ λ /settings/meal-plans/new                                              170 B           173 kB
23:32:05.641 ├ λ /settings/occupancy-types                                             9.42 kB         178 kB
23:32:05.641 ├ λ /settings/occupancy-types/[occupancyTypeId]                           170 B           174 kB
23:32:05.641 ├ λ /settings/occupancy-types/new                                         169 B           174 kB
23:32:05.641 ├ λ /settings/organization                                                6.31 kB         191 kB
23:32:05.641 ├ λ /settings/pricing-attributes                                          8.58 kB         185 kB
23:32:05.641 ├ λ /settings/pricing-attributes/[pricingAttributeId]                     172 B           173 kB
23:32:05.642 ├ λ /settings/pricing-attributes/new                                      170 B           173 kB
23:32:05.642 ├ λ /settings/pricing-components                                          8.66 kB         185 kB
23:32:05.642 ├ λ /settings/pricing-components/[pricingComponentId]                     179 B           195 kB
23:32:05.642 ├ λ /settings/pricing-components/new                                      179 B           195 kB
23:32:05.642 ├ λ /settings/room-types                                                  5.5 kB          147 kB
23:32:05.642 ├ λ /settings/room-types/[roomTypeId]                                     170 B           173 kB
23:32:05.642 ├ λ /settings/room-types/new                                              169 B           173 kB
23:32:05.642 ├ λ /settings/tax-slabs                                                   11.4 kB         184 kB
23:32:05.642 ├ λ /settings/tax-slabs/[taxSlabId]                                       8.65 kB         173 kB
23:32:05.642 ├ λ /settings/tds                                                         7.1 kB          117 kB
23:32:05.642 ├ λ /settings/units                                                       11.4 kB         184 kB
23:32:05.642 ├ λ /settings/units/[unitId]                                              8.63 kB         173 kB
23:32:05.642 ├ λ /settings/vehicle-types                                               5.51 kB         147 kB
23:32:05.642 ├ λ /settings/vehicle-types/[vehicleTypeId]                               172 B           173 kB
23:32:05.642 ├ λ /settings/vehicle-types/new                                           171 B           173 kB
23:32:05.642 ├ λ /sign-in/[[...sign-in]]                                               2.76 kB         102 kB
23:32:05.643 ├ λ /sign-up/[[...sign-up]]                                               2.76 kB         102 kB
23:32:05.643 ├ λ /suppliers                                                            3.19 kB         215 kB
23:32:05.643 ├ λ /suppliers/[supplierId]                                               3.76 kB         184 kB
23:32:05.643 ├ λ /suppliers/[supplierId]/ledger                                        13.9 kB         427 kB
23:32:05.643 ├ λ /suppliers/ledger                                                     8.66 kB         410 kB
23:32:05.643 ├ λ /tds/challans                                                         6.66 kB         135 kB
23:32:05.643 ├ λ /tds/reports                                                          8.36 kB         105 kB
23:32:05.643 ├ λ /tourPackageCreateCopy                                                11.2 kB         183 kB
23:32:05.643 ├ λ /tourPackageCreateCopy/[tourPackageCreateCopyId]                      14.4 kB         502 kB
23:32:05.643 ├ λ /tourPackageDisplay/[tourPackageDisplayId]                            519 B          93.4 kB
23:32:05.643 ├ λ /tourPackageFromTourPackageQuery/[tourPackageFromTourPackageQueryId]  13.4 kB         501 kB
23:32:05.643 ├ λ /tourPackagePDFGenerator/[tourPackageId]                              9.97 kB        90.9 kB
23:32:05.643 ├ λ /tourPackagePDFGeneratorWithVariants/[tourPackageId]                  9.55 kB        90.4 kB
23:32:05.643 ├ λ /tourPackageQuery                                                     3.66 kB         200 kB
23:32:05.644 ├ λ /tourPackageQuery/[tourPackageQueryId]                                7.57 kB         566 kB
23:32:05.644 ├ λ /tourPackageQueryCreateCopy                                           11.2 kB         183 kB
23:32:05.644 ├ λ /tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]            6.33 kB         559 kB
23:32:05.644 ├ λ /tourPackageQueryDisplay                                              4.49 kB         212 kB
23:32:05.644 ├ λ /tourPackageQueryDisplay/[tourPackageQueryId]                         9.08 kB         127 kB
23:32:05.644 ├ λ /tourpackagequeryfrominquiry/[inquiryId]                              7.55 kB         561 kB
23:32:05.644 ├ λ /tourpackagequeryfrominquiry/associate/[inquiryId]                    34.2 kB         567 kB
23:32:05.644 ├ λ /tourPackageQueryFromTourPackage/[tourPackageQueryFromTourPackageId]  19 kB           530 kB
23:32:05.644 ├ λ /tourPackageQueryHotelUpdate/[tourPackageQueryId]                     12.9 kB         251 kB
23:32:05.644 ├ λ /tourPackageQueryPDFGenerator/[tourPackageQueryId]                    11.9 kB         100 kB
23:32:05.644 ├ λ /tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]        9.25 kB        97.4 kB
23:32:05.644 ├ λ /tourPackageQueryVoucherDisplay/[tourPackageQueryVoucherId]           10.9 kB         136 kB
23:32:05.644 ├ λ /tourPackages                                                         10.4 kB         218 kB
23:32:05.644 ├ λ /tourPackages/[tourPackageId]                                         31.6 kB         547 kB
23:32:05.644 ├ λ /tourPackages/[tourPackageId]/pricing                                 12.2 kB         236 kB
23:32:05.644 ├ λ /tourPackages/website-management                                      11.5 kB         222 kB
23:32:05.644 ├ λ /transfers                                                            9.12 kB         244 kB
23:32:05.644 ├ λ /transfers/[transferId]                                               4.4 kB          210 kB
23:32:05.644 ├ λ /transport-pricing                                                    12.4 kB         191 kB
23:32:05.644 ├ λ /transport-pricing/[transportPricingId]                               9.08 kB         220 kB
23:32:05.648 ├ λ /transport-pricing/new                                                9.33 kB         231 kB
23:32:05.648 ├ λ /viewpdfpage/[PDFPageID]                                              446 kB          544 kB
23:32:05.648 ├ λ /whatsapp                                                             6.72 kB         103 kB
23:32:05.648 ├ λ /whatsapp/campaigns                                                   11.4 kB         108 kB
23:32:05.648 ├ λ /whatsapp/campaigns/[id]                                              9.76 kB         129 kB
23:32:05.648 ├ λ /whatsapp/campaigns/[id]/stats                                        4.47 kB         108 kB
23:32:05.649 ├ λ /whatsapp/campaigns/new                                               15.8 kB         159 kB
23:32:05.649 ├ λ /whatsapp/catalog                                                     19.1 kB         169 kB
23:32:05.649 ├ λ /whatsapp/chat                                                        102 kB          260 kB
23:32:05.649 ├ λ /whatsapp/customers                                                   19.9 kB         152 kB
23:32:05.649 ├ λ /whatsapp/flows                                                       38.1 kB         180 kB
23:32:05.649 ├ λ /whatsapp/media                                                       9.7 kB          111 kB
23:32:05.649 └ λ /whatsapp/templates                                                   18.9 kB         155 kB
23:32:05.649 + First Load JS shared by all                                             80.9 kB
23:32:05.649   ├ chunks/2472-eb9bc76fb9bc33cb.js                                       27.6 kB
23:32:05.649   ├ chunks/fd9d1056-294e6a544314e9b9.js                                   51.1 kB
23:32:05.649   ├ chunks/main-app-8ed6d57d180fb331.js                                   237 B
23:32:05.649   └ chunks/webpack-394aeac5243dcd56.js                                    1.97 kB
23:32:05.649 
23:32:05.649 
23:32:05.649 ƒ Middleware                                                              205 kB
23:32:05.649 
23:32:05.655 λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
23:32:05.655 ○  (Static)  automatically rendered as static HTML (uses no initial props)
23:32:05.655 
23:32:06.500 Traced Next.js server files in: 370.178ms
23:32:08.175 WARNING: Unable to find source file for page /_not-found with extensions: tsx, ts, jsx, js, this can cause functions config from `vercel.json` to not be applied
23:32:08.342 Created all serverless functions in: 1.842s
23:32:08.521 Collected static files (public/, static/, .next/static): 46.911ms
23:32:08.964 Build Completed in /vercel/output [2m]
23:32:09.437 Deploying outputs...
23:32:38.142 Deployment completed
23:32:39.072 Creating build cache...