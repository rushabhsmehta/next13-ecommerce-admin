23:08:29.952 Running build in Washington, D.C., USA (East) – iad1
23:08:29.953 Build machine configuration: 2 cores, 8 GB
23:08:30.337 Cloning github.com/rushabhsmehta/next13-ecommerce-admin (Branch: master, Commit: c8deabb)
23:08:32.531 Cloning completed: 2.193s
23:08:33.467 Restored build cache from previous deployment (9oKWyumBDVtDtTvEAXJCv829Fuws)
23:08:34.370 Running "vercel build"
23:08:34.989 Vercel CLI 48.6.0
23:08:35.458 Installing dependencies...
23:08:37.985 
23:08:37.986 > next13-ecommerce-admin@0.1.0 postinstall
23:08:37.986 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma
23:08:37.987 
23:08:39.371 Prisma schema loaded from schema.prisma
23:08:40.821 
23:08:40.822 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 639ms
23:08:40.823 
23:08:40.823 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:08:40.823 
23:08:40.823 Tip: Interested in query caching in just a few lines of code? Try Accelerate today! https://pris.ly/tip-3-accelerate
23:08:40.824 
23:08:41.916 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:08:42.555 ┌─────────────────────────────────────────────────────────┐
23:08:42.556 │  Update available 6.15.0 -> 6.18.0                      │
23:08:42.556 │  Run the following to update                            │
23:08:42.556 │    npm i --save-dev prisma@latest                       │
23:08:42.557 │    npm i @prisma/client@latest                          │
23:08:42.557 └─────────────────────────────────────────────────────────┘
23:08:42.557 
23:08:42.557 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 375ms
23:08:42.557 
23:08:42.557 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:08:42.558 
23:08:42.558 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:08:42.558 
23:08:42.580 
23:08:42.580 removed 1 package in 7s
23:08:42.581 
23:08:42.581 200 packages are looking for funding
23:08:42.581   run `npm fund` for details
23:08:42.611 Detected Next.js version: 13.5.7
23:08:42.611 Running "npm run vercel-build"
23:08:42.722 
23:08:42.722 > next13-ecommerce-admin@0.1.0 vercel-build
23:08:42.722 > prisma generate && prisma generate --schema=prisma/whatsapp-schema.prisma && next build
23:08:42.722 
23:08:43.900 Prisma schema loaded from schema.prisma
23:08:45.232 
23:08:45.232 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./../node_modules/@prisma/client in 571ms
23:08:45.233 
23:08:45.233 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:08:45.233 
23:08:45.233 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:08:45.233 
23:08:46.441 Prisma schema loaded from prisma/whatsapp-schema.prisma
23:08:47.115 
23:08:47.116 ✔ Generated Prisma Client (v6.15.0, engine=none) to ./node_modules/@prisma/whatsapp-client in 417ms
23:08:47.116 
23:08:47.116 Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)
23:08:47.116 
23:08:47.116 Tip: Want to turn off tips and other hints? https://pris.ly/tip-4-nohints
23:08:47.117 
23:08:48.163    Creating an optimized production build ...
23:09:20.975  ✓ Compiled successfully
23:09:20.976    Linting and checking validity of types ...
23:10:03.142    Collecting page data ...
23:10:04.666 /vercel/path0/.next/server/chunks/25595.js:54
23:10:04.668 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:04.672               ^
23:10:04.675 
23:10:04.675 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:04.675 
23:10:04.676 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:04.676 
23:10:04.676 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:04.676 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:04.676 
23:10:04.676 We would appreciate if you could take the time to share some information with us.
23:10:04.677 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:04.677 
23:10:04.677 The following locations have been searched:
23:10:04.677   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:04.677   /vercel/path0/.next/server
23:10:04.677   /vercel/path0/.prisma/client
23:10:04.678   /tmp/prisma-engines
23:10:04.678   /vercel/path0/prisma
23:10:04.678     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:04.678     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:04.678     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:04.679     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:04.679   clientVersion: '6.15.0',
23:10:04.679   errorCode: undefined
23:10:04.679 }
23:10:04.679 
23:10:04.679 Node.js v22.20.0
23:10:04.690 Static worker unexpectedly exited with code: 1 and signal: null
23:10:05.181 /vercel/path0/.next/server/chunks/25595.js:54
23:10:05.182 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:05.183               ^
23:10:05.183 
23:10:05.183 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:05.183 
23:10:05.183 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:05.183 
23:10:05.184 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:05.184 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:05.184 
23:10:05.184 We would appreciate if you could take the time to share some information with us.
23:10:05.184 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:05.184 
23:10:05.184 The following locations have been searched:
23:10:05.184   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:05.185   /vercel/path0/.next/server
23:10:05.185   /vercel/path0/.prisma/client
23:10:05.185   /tmp/prisma-engines
23:10:05.185   /vercel/path0/prisma
23:10:05.185     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:05.185     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:05.185     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:05.186     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:05.186   clientVersion: '6.15.0',
23:10:05.186   errorCode: undefined
23:10:05.186 }
23:10:05.186 
23:10:05.186 Node.js v22.20.0
23:10:05.708 /vercel/path0/.next/server/chunks/25595.js:54
23:10:05.708 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:05.708               ^
23:10:05.709 
23:10:05.709 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:05.709 
23:10:05.709 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:05.709 
23:10:05.709 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:05.709 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:05.709 
23:10:05.709 We would appreciate if you could take the time to share some information with us.
23:10:05.709 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:05.709 
23:10:05.710 The following locations have been searched:
23:10:05.710   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:05.710   /vercel/path0/.next/server
23:10:05.710   /vercel/path0/.prisma/client
23:10:05.710   /tmp/prisma-engines
23:10:05.710   /vercel/path0/prisma
23:10:05.710     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:05.710     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:05.714     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:05.714     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:05.714   clientVersion: '6.15.0',
23:10:05.714   errorCode: undefined
23:10:05.714 }
23:10:05.715 
23:10:05.715 Node.js v22.20.0
23:10:05.958 /vercel/path0/.next/server/chunks/25595.js:54
23:10:05.959 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:05.959               ^
23:10:05.959 
23:10:05.959 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:05.959 
23:10:05.959 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:05.959 
23:10:05.959 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:05.959 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:05.959 
23:10:05.959 We would appreciate if you could take the time to share some information with us.
23:10:05.959 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:05.959 
23:10:05.960 The following locations have been searched:
23:10:05.960   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:05.960   /vercel/path0/.next/server
23:10:05.960   /vercel/path0/.prisma/client
23:10:05.960   /tmp/prisma-engines
23:10:05.960   /vercel/path0/prisma
23:10:05.960     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:05.960     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:05.960     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:05.960     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:05.960   clientVersion: '6.15.0',
23:10:05.960   errorCode: undefined
23:10:05.960 }
23:10:05.960 
23:10:05.967 Node.js v22.20.0
23:10:06.225 /vercel/path0/.next/server/chunks/25595.js:54
23:10:06.227 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:06.227               ^
23:10:06.227 
23:10:06.227 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:06.227 
23:10:06.227 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:06.227 
23:10:06.227 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:06.227 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:06.227 
23:10:06.227 We would appreciate if you could take the time to share some information with us.
23:10:06.227 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:06.228 
23:10:06.228 The following locations have been searched:
23:10:06.228   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:06.228   /vercel/path0/.next/server
23:10:06.228   /vercel/path0/.prisma/client
23:10:06.228   /tmp/prisma-engines
23:10:06.228   /vercel/path0/prisma
23:10:06.228     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:06.228     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:06.228     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:06.228     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:06.228   clientVersion: '6.15.0',
23:10:06.228   errorCode: undefined
23:10:06.228 }
23:10:06.228 
23:10:06.229 Node.js v22.20.0
23:10:06.494 /vercel/path0/.next/server/chunks/25595.js:54
23:10:06.495 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:06.496               ^
23:10:06.496 
23:10:06.496 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:06.496 
23:10:06.496 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:06.497 
23:10:06.497 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:06.497 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:06.497 
23:10:06.497 We would appreciate if you could take the time to share some information with us.
23:10:06.497 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:06.497 
23:10:06.497 The following locations have been searched:
23:10:06.497   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:06.497   /vercel/path0/.next/server
23:10:06.497   /vercel/path0/.prisma/client
23:10:06.498   /tmp/prisma-engines
23:10:06.498   /vercel/path0/prisma
23:10:06.498     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:06.498     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:06.498     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:06.498     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:06.499   clientVersion: '6.15.0',
23:10:06.499   errorCode: undefined
23:10:06.499 }
23:10:06.499 
23:10:06.499 Node.js v22.20.0
23:10:06.772 /vercel/path0/.next/server/chunks/25595.js:54
23:10:06.772 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:06.772               ^
23:10:06.773 
23:10:06.773 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:06.773 
23:10:06.773 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:06.773 
23:10:06.773 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:06.773 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:06.773 
23:10:06.773 We would appreciate if you could take the time to share some information with us.
23:10:06.773 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:06.773 
23:10:06.773 The following locations have been searched:
23:10:06.773   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:06.773   /vercel/path0/.next/server
23:10:06.773   /vercel/path0/.prisma/client
23:10:06.773   /tmp/prisma-engines
23:10:06.773   /vercel/path0/prisma
23:10:06.773     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:06.773     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:06.773     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:06.773     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:06.774   clientVersion: '6.15.0',
23:10:06.774   errorCode: undefined
23:10:06.774 }
23:10:06.774 
23:10:06.774 Node.js v22.20.0
23:10:07.046 /vercel/path0/.next/server/chunks/25595.js:54
23:10:07.046 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:07.046               ^
23:10:07.047 
23:10:07.047 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:07.047 
23:10:07.047 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:07.047 
23:10:07.047 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:07.047 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:07.047 
23:10:07.047 We would appreciate if you could take the time to share some information with us.
23:10:07.047 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:07.047 
23:10:07.047 The following locations have been searched:
23:10:07.048   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:07.048   /vercel/path0/.next/server
23:10:07.048   /vercel/path0/.prisma/client
23:10:07.048   /tmp/prisma-engines
23:10:07.048   /vercel/path0/prisma
23:10:07.048     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:07.048     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:07.048     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:07.048     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:07.048   clientVersion: '6.15.0',
23:10:07.048   errorCode: undefined
23:10:07.049 }
23:10:07.049 
23:10:07.049 Node.js v22.20.0
23:10:07.295 /vercel/path0/.next/server/chunks/25595.js:54
23:10:07.296 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:07.296               ^
23:10:07.296 
23:10:07.296 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:07.296 
23:10:07.296 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:07.296 
23:10:07.296 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:07.296 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:07.296 
23:10:07.296 We would appreciate if you could take the time to share some information with us.
23:10:07.296 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:07.296 
23:10:07.296 The following locations have been searched:
23:10:07.296   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:07.296   /vercel/path0/.next/server
23:10:07.296   /vercel/path0/.prisma/client
23:10:07.304   /tmp/prisma-engines
23:10:07.304   /vercel/path0/prisma
23:10:07.304     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:07.304     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:07.304     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:07.304     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:07.304   clientVersion: '6.15.0',
23:10:07.304   errorCode: undefined
23:10:07.304 }
23:10:07.304 
23:10:07.304 Node.js v22.20.0
23:10:07.524 /vercel/path0/.next/server/chunks/25595.js:54
23:10:07.524 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:07.525               ^
23:10:07.525 
23:10:07.525 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:07.525 
23:10:07.525 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:07.525 
23:10:07.525 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:07.525 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:07.525 
23:10:07.525 We would appreciate if you could take the time to share some information with us.
23:10:07.525 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:07.525 
23:10:07.525 The following locations have been searched:
23:10:07.525   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:07.526   /vercel/path0/.next/server
23:10:07.526   /vercel/path0/.prisma/client
23:10:07.526   /tmp/prisma-engines
23:10:07.526   /vercel/path0/prisma
23:10:07.526     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:07.526     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:07.526     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:07.526     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:07.526   clientVersion: '6.15.0',
23:10:07.526   errorCode: undefined
23:10:07.526 }
23:10:07.526 
23:10:07.526 Node.js v22.20.0
23:10:07.834 /vercel/path0/.next/server/chunks/25595.js:54
23:10:07.835 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:07.835               ^
23:10:07.836 
23:10:07.836 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:07.836 
23:10:07.836 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:07.836 
23:10:07.836 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:07.836 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:07.836 
23:10:07.837 We would appreciate if you could take the time to share some information with us.
23:10:07.837 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:07.837 
23:10:07.837 The following locations have been searched:
23:10:07.837   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:07.837   /vercel/path0/.next/server
23:10:07.837   /vercel/path0/.prisma/client
23:10:07.838   /tmp/prisma-engines
23:10:07.838   /vercel/path0/prisma
23:10:07.838     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:07.838     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:07.838     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:07.838     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:07.838   clientVersion: '6.15.0',
23:10:07.839   errorCode: undefined
23:10:07.839 }
23:10:07.839 
23:10:07.839 Node.js v22.20.0
23:10:14.988    Generating static pages (0/177) ...
23:10:20.190 /vercel/path0/.next/server/chunks/25595.js:54
23:10:20.191 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:20.192               ^
23:10:20.192 
23:10:20.192 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:20.193 
23:10:20.193 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:20.193 
23:10:20.193 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:20.193 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:20.193 
23:10:20.193 We would appreciate if you could take the time to share some information with us.
23:10:20.194 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:20.194 
23:10:20.194 The following locations have been searched:
23:10:20.194   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:20.194   /vercel/path0/.next/server
23:10:20.194   /vercel/path0/.prisma/client
23:10:20.195   /tmp/prisma-engines
23:10:20.195   /vercel/path0/prisma
23:10:20.195     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:20.195     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:20.195     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:20.195     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:20.195   clientVersion: '6.15.0',
23:10:20.196   errorCode: undefined
23:10:20.196 }
23:10:20.197 
23:10:20.197 Node.js v22.20.0
23:10:21.711 [INQUIRIES_EXPORT] Starting export...
23:10:21.711 prisma:error 
23:10:21.712 Invalid `prisma.inquiry.findMany()` invocation:
23:10:21.712 
23:10:21.712 
23:10:21.713 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:21.713 [INQUIRIES_CONTACTS_EXPORT] PrismaClientKnownRequestError: 
23:10:21.713 Invalid `prisma.inquiry.findMany()` invocation:
23:10:21.713 
23:10:21.713 
23:10:21.713 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:21.713     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:21.713     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:21.714     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:21.715     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:21.715     at async GET (/vercel/path0/.next/server/app/api/export/inquiries-contacts/route.js:1:578)
23:10:21.715     at async /vercel/path0/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:14:39709 {
23:10:21.715   code: 'P6001',
23:10:21.715   meta: { modelName: 'Inquiry' },
23:10:21.716   clientVersion: '6.15.0'
23:10:21.716 }
23:10:21.889 [QUERIES_EXPORT] Starting export...
23:10:21.889 prisma:error 
23:10:21.889 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:21.889 
23:10:21.889 
23:10:21.889 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:21.890 [QUERIES_CONTACTS_EXPORT] PrismaClientKnownRequestError: 
23:10:21.890 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:21.890 
23:10:21.890 
23:10:21.890 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:21.890     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:21.890     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:21.890     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:21.890     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:21.890     at async GET (/vercel/path0/.next/server/app/api/export/queries-contacts/route.js:1:576)
23:10:21.890     at async /vercel/path0/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:14:39709 {
23:10:21.890   code: 'P6001',
23:10:21.890   meta: { modelName: 'TourPackageQuery' },
23:10:21.890   clientVersion: '6.15.0'
23:10:21.890 }
23:10:23.321 /vercel/path0/.next/server/chunks/25595.js:54
23:10:23.321 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:23.321               ^
23:10:23.321 
23:10:23.321 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:23.321 
23:10:23.322 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:23.322 
23:10:23.322 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:23.322 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:23.322 
23:10:23.322 We would appreciate if you could take the time to share some information with us.
23:10:23.322 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:23.322 
23:10:23.322 The following locations have been searched:
23:10:23.322   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:23.322   /vercel/path0/.next/server
23:10:23.322   /vercel/path0/.prisma/client
23:10:23.322   /tmp/prisma-engines
23:10:23.322   /vercel/path0/prisma
23:10:23.322     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:23.322     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:23.322     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:23.323     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:23.323   clientVersion: '6.15.0',
23:10:23.323   errorCode: undefined
23:10:23.323 }
23:10:23.323 
23:10:23.323 Node.js v22.20.0
23:10:24.333 
   Generating static pages (44/177) 
23:10:25.515 /vercel/path0/.next/server/chunks/25595.js:54
23:10:25.516 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:25.517               ^
23:10:25.517 
23:10:25.517 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:25.517 
23:10:25.517 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:25.517 
23:10:25.518 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:25.518 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:25.518 
23:10:25.518 We would appreciate if you could take the time to share some information with us.
23:10:25.518 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:25.519 
23:10:25.519 The following locations have been searched:
23:10:25.519   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:25.519   /vercel/path0/.next/server
23:10:25.519   /vercel/path0/.prisma/client
23:10:25.519   /tmp/prisma-engines
23:10:25.519   /vercel/path0/prisma
23:10:25.519     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:25.520     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:25.520     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:25.520     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:25.520   clientVersion: '6.15.0',
23:10:25.520   errorCode: undefined
23:10:25.520 }
23:10:25.520 
23:10:25.521 Node.js v22.20.0
23:10:26.517 /vercel/path0/.next/server/chunks/25595.js:54
23:10:26.518 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:26.519               ^
23:10:26.519 
23:10:26.519 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:26.519 
23:10:26.520 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:26.520 
23:10:26.520 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:26.520 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:26.520 
23:10:26.521 We would appreciate if you could take the time to share some information with us.
23:10:26.521 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:26.521 
23:10:26.521 The following locations have been searched:
23:10:26.521   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:26.521   /vercel/path0/.next/server
23:10:26.522   /vercel/path0/.prisma/client
23:10:26.522   /tmp/prisma-engines
23:10:26.522   /vercel/path0/prisma
23:10:26.522     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:26.522     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:26.522     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:26.522     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:26.523   clientVersion: '6.15.0',
23:10:26.523   errorCode: undefined
23:10:26.523 }
23:10:26.523 
23:10:26.523 Node.js v22.20.0
23:10:27.187 /vercel/path0/.next/server/chunks/25595.js:54
23:10:27.188 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:27.189               ^
23:10:27.189 
23:10:27.190 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:27.190 
23:10:27.190 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:27.190 
23:10:27.190 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:27.190 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:27.190 
23:10:27.191 We would appreciate if you could take the time to share some information with us.
23:10:27.191 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:27.191 
23:10:27.191 The following locations have been searched:
23:10:27.191   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:27.191   /vercel/path0/.next/server
23:10:27.191   /vercel/path0/.prisma/client
23:10:27.192   /tmp/prisma-engines
23:10:27.192   /vercel/path0/prisma
23:10:27.192     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:27.192     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:27.192     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:27.192     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:27.192   clientVersion: '6.15.0',
23:10:27.193   errorCode: undefined
23:10:27.193 }
23:10:27.193 
23:10:27.193 Node.js v22.20.0
23:10:27.673 /vercel/path0/.next/server/chunks/25595.js:54
23:10:27.674 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:27.674               ^
23:10:27.674 
23:10:27.674 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:27.674 
23:10:27.674 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:27.674 
23:10:27.675 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:27.675 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:27.675 
23:10:27.675 We would appreciate if you could take the time to share some information with us.
23:10:27.675 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:27.675 
23:10:27.675 The following locations have been searched:
23:10:27.675   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:27.676   /vercel/path0/.next/server
23:10:27.676   /vercel/path0/.prisma/client
23:10:27.676   /tmp/prisma-engines
23:10:27.676   /vercel/path0/prisma
23:10:27.676     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:27.676     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:27.677     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:27.677     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:27.677   clientVersion: '6.15.0',
23:10:27.677   errorCode: undefined
23:10:27.677 }
23:10:27.677 
23:10:27.678 Node.js v22.20.0
23:10:28.525 /vercel/path0/.next/server/chunks/25595.js:54
23:10:28.526 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:28.527               ^
23:10:28.527 
23:10:28.527 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:28.527 
23:10:28.528 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:28.528 
23:10:28.528 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:28.528 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:28.528 
23:10:28.528 We would appreciate if you could take the time to share some information with us.
23:10:28.528 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:28.529 
23:10:28.529 The following locations have been searched:
23:10:28.529   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:28.529   /vercel/path0/.next/server
23:10:28.529   /vercel/path0/.prisma/client
23:10:28.529   /tmp/prisma-engines
23:10:28.529   /vercel/path0/prisma
23:10:28.529     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:28.530     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:28.530     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:28.530     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:28.531   clientVersion: '6.15.0',
23:10:28.531   errorCode: undefined
23:10:28.531 }
23:10:28.531 
23:10:28.532 Node.js v22.20.0
23:10:28.955 /vercel/path0/.next/server/chunks/25595.js:54
23:10:28.956 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:28.956               ^
23:10:28.957 
23:10:28.957 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:28.957 
23:10:28.957 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:28.957 
23:10:28.957 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:28.957 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:28.957 
23:10:28.957 We would appreciate if you could take the time to share some information with us.
23:10:28.957 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:28.957 
23:10:28.957 The following locations have been searched:
23:10:28.957   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:28.957   /vercel/path0/.next/server
23:10:28.957   /vercel/path0/.prisma/client
23:10:28.957   /tmp/prisma-engines
23:10:28.958   /vercel/path0/prisma
23:10:28.958     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:28.958     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:28.958     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:28.958     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:28.958   clientVersion: '6.15.0',
23:10:28.958   errorCode: undefined
23:10:28.958 }
23:10:28.958 
23:10:28.958 Node.js v22.20.0
23:10:29.330 /vercel/path0/.next/server/chunks/25595.js:54
23:10:29.330 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:29.331               ^
23:10:29.331 
23:10:29.331 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:29.332 
23:10:29.332 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:29.332 
23:10:29.332 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:29.332 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:29.332 
23:10:29.333 We would appreciate if you could take the time to share some information with us.
23:10:29.333 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:29.333 
23:10:29.333 The following locations have been searched:
23:10:29.333   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:29.333   /vercel/path0/.next/server
23:10:29.333   /vercel/path0/.prisma/client
23:10:29.334   /tmp/prisma-engines
23:10:29.334   /vercel/path0/prisma
23:10:29.334     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:29.334     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:29.334     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:29.334     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:29.334   clientVersion: '6.15.0',
23:10:29.335   errorCode: undefined
23:10:29.335 }
23:10:29.335 
23:10:29.335 Node.js v22.20.0
23:10:29.812 /vercel/path0/.next/server/chunks/25595.js:54
23:10:29.813 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:29.814               ^
23:10:29.814 
23:10:29.814 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:29.814 
23:10:29.814 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:29.815 
23:10:29.815 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:29.815 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:29.815 
23:10:29.815 We would appreciate if you could take the time to share some information with us.
23:10:29.815 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:29.815 
23:10:29.816 The following locations have been searched:
23:10:29.816   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:29.816   /vercel/path0/.next/server
23:10:29.816   /vercel/path0/.prisma/client
23:10:29.816   /tmp/prisma-engines
23:10:29.817   /vercel/path0/prisma
23:10:29.817     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:29.817     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:29.817     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:29.817     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:29.817   clientVersion: '6.15.0',
23:10:29.817   errorCode: undefined
23:10:29.818 }
23:10:29.818 
23:10:29.818 Node.js v22.20.0
23:10:30.327 /vercel/path0/.next/server/chunks/25595.js:54
23:10:30.327 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:30.328               ^
23:10:30.328 
23:10:30.328 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:30.328 
23:10:30.328 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:30.328 
23:10:30.328 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:30.328 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:30.328 
23:10:30.328 We would appreciate if you could take the time to share some information with us.
23:10:30.328 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:30.328 
23:10:30.328 The following locations have been searched:
23:10:30.328   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:30.328   /vercel/path0/.next/server
23:10:30.328   /vercel/path0/.prisma/client
23:10:30.328   /tmp/prisma-engines
23:10:30.328   /vercel/path0/prisma
23:10:30.328     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:30.328     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:30.328     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:30.329     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:30.329   clientVersion: '6.15.0',
23:10:30.329   errorCode: undefined
23:10:30.330 }
23:10:30.330 
23:10:30.330 Node.js v22.20.0
23:10:30.924 /vercel/path0/.next/server/chunks/25595.js:54
23:10:30.924 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:30.924               ^
23:10:30.924 
23:10:30.924 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:30.924 
23:10:30.924 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:30.924 
23:10:30.924 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:30.924 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:30.924 
23:10:30.924 We would appreciate if you could take the time to share some information with us.
23:10:30.926 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:30.926 
23:10:30.926 The following locations have been searched:
23:10:30.926   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:30.926   /vercel/path0/.next/server
23:10:30.926   /vercel/path0/.prisma/client
23:10:30.926   /tmp/prisma-engines
23:10:30.926   /vercel/path0/prisma
23:10:30.926     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:30.926     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:30.926     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:30.927     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:30.927   clientVersion: '6.15.0',
23:10:30.927   errorCode: undefined
23:10:30.927 }
23:10:30.927 
23:10:30.927 Node.js v22.20.0
23:10:32.252 /vercel/path0/.next/server/chunks/25595.js:54
23:10:32.253 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:32.254               ^
23:10:32.254 
23:10:32.254 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:32.255 
23:10:32.255 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:32.255 
23:10:32.255 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:32.255 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:32.255 
23:10:32.255 We would appreciate if you could take the time to share some information with us.
23:10:32.256 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:32.256 
23:10:32.256 The following locations have been searched:
23:10:32.256   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:32.256   /vercel/path0/.next/server
23:10:32.256   /vercel/path0/.prisma/client
23:10:32.256   /tmp/prisma-engines
23:10:32.256   /vercel/path0/prisma
23:10:32.257     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:32.257     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:32.257     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:32.257     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:32.257   clientVersion: '6.15.0',
23:10:32.257   errorCode: undefined
23:10:32.257 }
23:10:32.258 
23:10:32.258 Node.js v22.20.0
23:10:33.871 /vercel/path0/.next/server/chunks/25595.js:54
23:10:33.872 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:33.873               ^
23:10:33.877 
23:10:33.878 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:33.878 
23:10:33.878 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:33.878 
23:10:33.879 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:33.879 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:33.879 
23:10:33.879 We would appreciate if you could take the time to share some information with us.
23:10:33.879 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:33.879 
23:10:33.880 The following locations have been searched:
23:10:33.880   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:33.880   /vercel/path0/.next/server
23:10:33.880   /vercel/path0/.prisma/client
23:10:33.880   /tmp/prisma-engines
23:10:33.880   /vercel/path0/prisma
23:10:33.880     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:33.880     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:33.881     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:33.881     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:33.881   clientVersion: '6.15.0',
23:10:33.881   errorCode: undefined
23:10:33.881 }
23:10:33.881 
23:10:33.881 Node.js v22.20.0
23:10:34.849 /vercel/path0/.next/server/chunks/25595.js:54
23:10:34.849 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:34.850               ^
23:10:34.850 
23:10:34.850 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:34.851 
23:10:34.851 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:34.851 
23:10:34.851 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:34.851 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:34.851 
23:10:34.851 We would appreciate if you could take the time to share some information with us.
23:10:34.852 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:34.852 
23:10:34.852 The following locations have been searched:
23:10:34.852   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:34.852   /vercel/path0/.next/server
23:10:34.852   /vercel/path0/.prisma/client
23:10:34.853   /tmp/prisma-engines
23:10:34.853   /vercel/path0/prisma
23:10:34.853     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:34.853     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:34.853     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:34.853     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:34.853   clientVersion: '6.15.0',
23:10:34.854   errorCode: undefined
23:10:34.854 }
23:10:34.854 
23:10:34.854 Node.js v22.20.0
23:10:35.283 /vercel/path0/.next/server/chunks/25595.js:54
23:10:35.284 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:35.284               ^
23:10:35.284 
23:10:35.284 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:35.284 
23:10:35.284 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:35.284 
23:10:35.284 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:35.284 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:35.284 
23:10:35.284 We would appreciate if you could take the time to share some information with us.
23:10:35.284 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:35.284 
23:10:35.285 The following locations have been searched:
23:10:35.285   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:35.285   /vercel/path0/.next/server
23:10:35.285   /vercel/path0/.prisma/client
23:10:35.285   /tmp/prisma-engines
23:10:35.285   /vercel/path0/prisma
23:10:35.285     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:35.285     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:35.285     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:35.285     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:35.285   clientVersion: '6.15.0',
23:10:35.285   errorCode: undefined
23:10:35.285 }
23:10:35.285 
23:10:35.285 Node.js v22.20.0
23:10:35.700 /vercel/path0/.next/server/chunks/25595.js:54
23:10:35.700 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:35.700               ^
23:10:35.700 
23:10:35.700 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:35.700 
23:10:35.700 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:35.700 
23:10:35.700 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:35.701 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:35.701 
23:10:35.701 We would appreciate if you could take the time to share some information with us.
23:10:35.701 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:35.701 
23:10:35.701 The following locations have been searched:
23:10:35.701   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:35.701   /vercel/path0/.next/server
23:10:35.701   /vercel/path0/.prisma/client
23:10:35.701   /tmp/prisma-engines
23:10:35.701   /vercel/path0/prisma
23:10:35.702     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:35.702     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:35.702     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:35.702     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:35.702   clientVersion: '6.15.0',
23:10:35.702   errorCode: undefined
23:10:35.702 }
23:10:35.702 
23:10:35.702 Node.js v22.20.0
23:10:36.386 /vercel/path0/.next/server/chunks/25595.js:54
23:10:36.386 ${er(d)}`}(w),new tB(T,u.clientVersion)}async function Wm(d,u){let f=await ir(),c=[],p=[u.dirname,iE.default.resolve(__dirname,".."),u.generator?.output?.value??__dirname,iE.default.resolve(__dirname,"../../../.prisma/client"),"/tmp/prisma-engines",u.cwd];for(let u of(__filename.includes("resolveEnginePath")&&p.push(tk.default.join(__dirname,"../")),p)){let p=fl(d,f),m=iE.default.join(u,p);if(c.push(u),ik.default.existsSync(m))return{enginePath:m,searchedLocations:c}}return{enginePath:void 0,searchedLocations:c}}function fl(d,u){return"library"===d?u.includes("windows")?`query_engine-${u}.dll.node`:u.includes("darwin")?`${e_}-${u}.dylib.node`:`${e_}-${u}.so.node`:`query-engine-${u}${"windows"===u?".exe":""}`}var ix=O(V());function Vr(d){return null===d?d:Array.isArray(d)?d.map(Vr):"object"==typeof d?null!==d&&"object"==typeof d&&"string"==typeof d.$type?function({$type:d,value:u}){switch(d){case"BigInt":return BigInt(u);case"Bytes":{let{buffer:d,byteOffset:f,byteLength:c}=Buffer.from(u,"base64");return new Uint8Array(d,f,c)}case"DateTime":return new Date(u);case"Decimal":return new ah(u);case"Json":return JSON.parse(u);default:!function(d,u){throw Error(u)}(0,"Unknown tagged value")}}(d):null!==d.constructor&&"Object"!==d.constructor.name?d:function(d,u){let f={};for(let c of Object.keys(d))f[c]=u(d[c],c);return f}(d,Vr):d}var zm=()=>globalThis.process?.release?.name==="node",Zm=()=>!!globalThis.Bun||!!globalThis.process?.versions?.bun,Xm=()=>!!globalThis.Deno,ef=()=>"object"==typeof globalThis.Netlify,rf=()=>"object"==typeof globalThis.EdgeRuntime,tf=()=>globalThis.navigator?.userAgent==="Cloudflare-Workers",iV={node:"Node.js",workerd:"Cloudflare Workers",deno:"Deno and Deno Deploy",netlify:"Netlify Edge Functions","edge-light":"Edge Runtime (Vercel Edge Functions, Vercel Edge Middleware, Next.js (Pages Router) Edge API Routes, Next.js (App Router) Edge Route Handlers or Next.js Middleware)"};function Kn(){let d=[[ef,"netlify"],[rf,"edge-light"],[tf,"workerd"],[Xm,"deno"],[Zm,"bun"],[zm,"node"]].flatMap(d=>d[0]()?[d[1]]:[]).at(0)??"";return{id:d,prettyName:iV[d]||d,isEdge:["workerd","deno","netlify","edge-light"].includes(d)}}function jr({inlineDatasources:d,overrideDatasources:u,env:f,clientVersion:c}){let p,m=Object.keys(d)[0],h=d[m]?.url,g=u[m]?.url;if(void 0===m?p=void 0:g?p=g:h?.value?p=h.value:h?.fromEnvVar&&(p=f[h.fromEnvVar]),h?.fromEnvVar!==void 0&&void 0===p)throw new tB(`error: Environment variable not found: ${h.fromEnvVar}.`,c);if(void 0===p)throw new tB("error: Missing URL environment variable, value, or override.",c);return p}var iN=class extends Error{constructor(d,u){super(d),this.clientVersion=u.clientVersion,this.cause=u.cause}get[Symbol.toStringTag](){return this.name}},i_=class extends iN{constructor(d,u){super(d,u),this.isRetryable=u.isRetryable??!0}};function R(d,u){return{...d,isRetryable:u}}var iL=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="InvalidDatasourceError",this.code="P6001"}};x(iL,"InvalidDatasourceError");var iF=O(D()),iC=class{constructor({apiKey:d,tracingHelper:u,logLevel:f,logQueries:c,engineHash:p}){this.apiKey=d,this.tracingHelper=u,this.logLevel=f,this.logQueries=c,this.engineHash=p}build({traceparent:d,transactionId:u}={}){let f={Accept:"application/json",Authorization:`Bearer ${this.apiKey}`,"Content-Type":"application/json","Prisma-Engine-Hash":this.engineHash,"Prisma-Engine-Version":iF.enginesVersion};this.tracingHelper.isEnabled()&&(f.traceparent=d??this.tracingHelper.getTraceParent()),u&&(f["X-Transaction-Id"]=u);let c=this.#e();return c.length>0&&(f["X-Capture-Telemetry"]=c.join(", ")),f}#e(){let d=[];return this.tracingHelper.isEnabled()&&d.push("tracing"),this.logLevel&&d.push(this.logLevel),this.logQueries&&d.push("query"),d}};function po(d){return new Date(1e3*d[0]+d[1]/1e6)}var i$=class extends i_{constructor(d){super("This request must be retried",R(d,!0)),this.name="ForcedRetryError",this.code="P5001"}};x(i$,"ForcedRetryError");var iG=class extends i_{constructor(d,u){super(d,R(u,!1)),this.name="NotImplementedYetError",this.code="P5004"}};x(iG,"NotI
23:10:36.387               ^
23:10:36.388 
23:10:36.388 PrismaClientInitializationError: Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x".
23:10:36.388 
23:10:36.389 We detected that you are using Next.js, learn how to fix this: https://pris.ly/d/engine-not-found-nextjs.
23:10:36.389 
23:10:36.389 This is likely caused by a bundler that has not copied "libquery_engine-rhel-openssl-3.0.x.so.node" next to the resulting bundle.
23:10:36.389 Ensure that "libquery_engine-rhel-openssl-3.0.x.so.node" has been copied next to the bundle or in "node_modules/@prisma/whatsapp-client".
23:10:36.389 
23:10:36.389 We would appreciate if you could take the time to share some information with us.
23:10:36.389 Please help us by answering a few questions: https://pris.ly/engine-not-found-bundler-investigation
23:10:36.389 
23:10:36.390 The following locations have been searched:
23:10:36.390   /vercel/path0/node_modules/@prisma/whatsapp-client
23:10:36.390   /vercel/path0/.next/server
23:10:36.390   /vercel/path0/.prisma/client
23:10:36.390   /tmp/prisma-engines
23:10:36.390   /vercel/path0/prisma
23:10:36.390     at ml (/vercel/path0/.next/server/chunks/25595.js:54:15)
23:10:36.391     at async Object.loadLibrary (/vercel/path0/.next/server/chunks/25595.js:55:9218)
23:10:36.391     at async sv.loadEngine (/vercel/path0/.next/server/chunks/25595.js:59:450)
23:10:36.391     at async sv.instantiateLibrary (/vercel/path0/.next/server/chunks/25595.js:58:4273) {
23:10:36.391   clientVersion: '6.15.0',
23:10:36.391   errorCode: undefined
23:10:36.391 }
23:10:36.391 
23:10:36.392 Node.js v22.20.0
23:10:37.358 prisma:error 
23:10:37.358 Invalid `prisma.associatePartner.findMany()` invocation:
23:10:37.358 
23:10:37.358 
23:10:37.358 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:37.359 prisma:error 
23:10:37.359 Invalid `prisma.associatePartner.findMany()` invocation:
23:10:37.359 
23:10:37.359 
23:10:37.359 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:37.635 
   Generating static pages (88/177) 
23:10:37.921 prisma:error 
23:10:37.923 Invalid `prisma.mealPlan.findMany()` invocation:
23:10:37.923 
23:10:37.923 
23:10:37.923 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:37.972 prisma:error 
23:10:37.973 Invalid `prisma.mealPlan.findMany()` invocation:
23:10:37.973 
23:10:37.973 
23:10:37.974 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.030 prisma:error 
23:10:38.030 Invalid `prisma.occupancyType.findMany()` invocation:
23:10:38.030 
23:10:38.030 
23:10:38.030 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.074 prisma:error 
23:10:38.074 Invalid `prisma.occupancyType.findMany()` invocation:
23:10:38.074 
23:10:38.074 
23:10:38.074 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.146 prisma:error 
23:10:38.146 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:10:38.146 
23:10:38.146 
23:10:38.147 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.166 prisma:error 
23:10:38.166 Invalid `prisma.pricingAttribute.findMany()` invocation:
23:10:38.167 
23:10:38.167 
23:10:38.167 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.230 prisma:error 
23:10:38.230 Invalid `prisma.pricingComponent.findMany()` invocation:
23:10:38.230 
23:10:38.231 
23:10:38.231 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.263 prisma:error 
23:10:38.264 Invalid `prisma.pricingComponent.findMany()` invocation:
23:10:38.264 
23:10:38.264 
23:10:38.264 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.329 prisma:error 
23:10:38.329 Invalid `prisma.roomType.findMany()` invocation:
23:10:38.329 
23:10:38.329 
23:10:38.329 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.351 prisma:error 
23:10:38.351 Invalid `prisma.roomType.findMany()` invocation:
23:10:38.351 
23:10:38.351 
23:10:38.351 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.420 prisma:error 
23:10:38.420 Invalid `prisma.vehicleType.findMany()` invocation:
23:10:38.421 
23:10:38.421 
23:10:38.421 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.421 prisma:error 
23:10:38.421 Invalid `prisma.vehicleType.findMany()` invocation:
23:10:38.421 
23:10:38.421 
23:10:38.421 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.449 prisma:error 
23:10:38.449 Invalid `prisma.location.findMany()` invocation:
23:10:38.449 
23:10:38.449 
23:10:38.450 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.468 prisma:error 
23:10:38.469 Invalid `prisma.location.findMany()` invocation:
23:10:38.469 
23:10:38.469 
23:10:38.469 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.484 prisma:error 
23:10:38.484 Invalid `prisma.transportPricing.findMany()` invocation:
23:10:38.484 
23:10:38.484 
23:10:38.484 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.509 prisma:error 
23:10:38.510 Invalid `prisma.transportPricing.findMany()` invocation:
23:10:38.510 
23:10:38.510 
23:10:38.510 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.533 prisma:error 
23:10:38.534 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:38.534 
23:10:38.534 
23:10:38.534 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.552 prisma:error 
23:10:38.553 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:38.553 
23:10:38.553 
23:10:38.553 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.593 prisma:error 
23:10:38.594 Invalid `prisma.activity.findMany()` invocation:
23:10:38.594 
23:10:38.594 
23:10:38.595 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.614 prisma:error 
23:10:38.614 Invalid `prisma.activity.findMany()` invocation:
23:10:38.614 
23:10:38.614 
23:10:38.614 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.663 prisma:error 
23:10:38.664 Invalid `prisma.activityMaster.findMany()` invocation:
23:10:38.664 
23:10:38.664 
23:10:38.664 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.675 prisma:error 
23:10:38.675 Invalid `prisma.activityMaster.findMany()` invocation:
23:10:38.675 
23:10:38.675 
23:10:38.676 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.690 prisma:error 
23:10:38.690 Invalid `prisma.bankAccount.findMany()` invocation:
23:10:38.690 
23:10:38.690 
23:10:38.690 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.718 prisma:error 
23:10:38.718 Invalid `prisma.bankAccount.findMany()` invocation:
23:10:38.719 
23:10:38.719 
23:10:38.719 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.738 prisma:error 
23:10:38.739 Invalid `prisma.cashAccount.findMany()` invocation:
23:10:38.739 
23:10:38.739 
23:10:38.739 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.770 prisma:error 
23:10:38.770 Invalid `prisma.cashAccount.findMany()` invocation:
23:10:38.771 
23:10:38.771 
23:10:38.771 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.791 prisma:error 
23:10:38.791 Invalid `prisma.customer.findMany()` invocation:
23:10:38.791 
23:10:38.792 
23:10:38.792 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.814 prisma:error 
23:10:38.814 Invalid `prisma.customer.findMany()` invocation:
23:10:38.814 
23:10:38.814 
23:10:38.814 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.833 prisma:error 
23:10:38.833 Invalid `prisma.customer.findMany()` invocation:
23:10:38.833 
23:10:38.833 
23:10:38.833 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.856 prisma:error 
23:10:38.856 Invalid `prisma.customer.findMany()` invocation:
23:10:38.856 
23:10:38.857 
23:10:38.857 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.946 prisma:error 
23:10:38.947 Invalid `prisma.expenseCategory.findMany()` invocation:
23:10:38.951 
23:10:38.952 
23:10:38.952 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.967 prisma:error 
23:10:38.968 Invalid `prisma.expenseCategory.findMany()` invocation:
23:10:38.970 
23:10:38.970 
23:10:38.970 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:38.992 prisma:error 
23:10:38.992 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:38.993 
23:10:38.993 
23:10:38.993 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.032 prisma:error 
23:10:39.033 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:39.033 
23:10:39.033 
23:10:39.033 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.124 prisma:error 
23:10:39.125 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:39.125 
23:10:39.125 
23:10:39.126 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.126 prisma:error 
23:10:39.126 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:39.126 
23:10:39.126 
23:10:39.126 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.165 prisma:error 
23:10:39.166 Invalid `prisma.expenseCategory.findMany()` invocation:
23:10:39.166 
23:10:39.167 
23:10:39.167 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.167 prisma:error 
23:10:39.168 Invalid `prisma.bankAccount.findMany()` invocation:
23:10:39.168 
23:10:39.168 
23:10:39.168 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.168 prisma:error 
23:10:39.168 Invalid `prisma.cashAccount.findMany()` invocation:
23:10:39.169 
23:10:39.169 
23:10:39.169 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.206 prisma:error 
23:10:39.206 Invalid `prisma.expenseCategory.findMany()` invocation:
23:10:39.206 
23:10:39.206 
23:10:39.207 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.207 prisma:error 
23:10:39.207 Invalid `prisma.bankAccount.findMany()` invocation:
23:10:39.207 
23:10:39.207 
23:10:39.208 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.208 prisma:error 
23:10:39.211 Invalid `prisma.cashAccount.findMany()` invocation:
23:10:39.211 
23:10:39.211 
23:10:39.211 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.247 prisma:error 
23:10:39.248 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:39.248 
23:10:39.248 
23:10:39.248 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.248 prisma:error 
23:10:39.248 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:39.248 
23:10:39.248 
23:10:39.248 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.368 prisma:error 
23:10:39.369 Invalid `prisma.hotel.findMany()` invocation:
23:10:39.369 
23:10:39.369 
23:10:39.369 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.396 prisma:error 
23:10:39.396 Invalid `prisma.hotel.findMany()` invocation:
23:10:39.396 
23:10:39.396 
23:10:39.396 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.410 prisma:error 
23:10:39.411 Invalid `prisma.incomeCategory.findMany()` invocation:
23:10:39.411 
23:10:39.411 
23:10:39.411 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:39.436 prisma:error 
23:10:39.436 Invalid `prisma.incomeCategory.findMany()` invocation:
23:10:39.437 
23:10:39.437 
23:10:39.437 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:40.112 prisma:error 
23:10:40.113 Invalid `prisma.incomeDetail.findMany()` invocation:
23:10:40.116 
23:10:40.116 
23:10:40.116 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:40.117 prisma:error 
23:10:40.117 Invalid `prisma.incomeDetail.findMany()` invocation:
23:10:40.117 
23:10:40.117 
23:10:40.117 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.131 prisma:error 
23:10:41.132 Invalid `prisma.itinerary.findMany()` invocation:
23:10:41.132 
23:10:41.132 
23:10:41.132 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.143 prisma:error 
23:10:41.144 Invalid `prisma.itinerary.findMany()` invocation:
23:10:41.144 
23:10:41.144 
23:10:41.144 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.152 prisma:error 
23:10:41.152 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:10:41.152 
23:10:41.152 
23:10:41.152 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.169 prisma:error 
23:10:41.169 Invalid `prisma.itineraryMaster.findMany()` invocation:
23:10:41.169 
23:10:41.169 
23:10:41.169 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.178 prisma:error 
23:10:41.178 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:41.178 
23:10:41.178 
23:10:41.178 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.193 prisma:error 
23:10:41.193 Invalid `prisma.expenseDetail.findMany()` invocation:
23:10:41.193 
23:10:41.193 
23:10:41.193 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.203 prisma:error 
23:10:41.203 Invalid `prisma.location.findMany()` invocation:
23:10:41.203 
23:10:41.203 
23:10:41.203 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.218 prisma:error 
23:10:41.218 Invalid `prisma.location.findMany()` invocation:
23:10:41.218 
23:10:41.218 
23:10:41.218 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.227 prisma:error 
23:10:41.227 Invalid `prisma.location.findMany()` invocation:
23:10:41.227 
23:10:41.227 
23:10:41.227 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.243 prisma:error 
23:10:41.244 Invalid `prisma.location.findMany()` invocation:
23:10:41.244 
23:10:41.244 
23:10:41.244 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.251 prisma:error 
23:10:41.251 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.251 
23:10:41.251 
23:10:41.251 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.266 prisma:error 
23:10:41.267 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.267 
23:10:41.269 
23:10:41.269 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.279 prisma:error 
23:10:41.280 Invalid `prisma.paymentDetail.findMany()` invocation:
23:10:41.280 
23:10:41.280 
23:10:41.280 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.295 prisma:error 
23:10:41.295 Invalid `prisma.paymentDetail.findMany()` invocation:
23:10:41.295 
23:10:41.295 
23:10:41.295 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.304 prisma:error 
23:10:41.304 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.304 
23:10:41.304 
23:10:41.304 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.305 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:10:41.305 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.305 
23:10:41.305 
23:10:41.305 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.305     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.306     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.306     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.306     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.306     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:10:41.306     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:10:41.306   code: 'P6001',
23:10:41.306   meta: { modelName: 'PurchaseDetail' },
23:10:41.306   clientVersion: '6.15.0'
23:10:41.306 }
23:10:41.307 prisma:error 
23:10:41.307 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.307 
23:10:41.307 
23:10:41.307 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.308 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:10:41.308 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.308 
23:10:41.308 
23:10:41.308 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.308     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.308     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.309     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.309     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.309     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:10:41.309     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:10:41.309   code: 'P6001',
23:10:41.309   meta: { modelName: 'TaxSlab' },
23:10:41.309   clientVersion: '6.15.0'
23:10:41.309 }
23:10:41.310 prisma:error 
23:10:41.310 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.310 
23:10:41.310 
23:10:41.310 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.311 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:10:41.311 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.311 
23:10:41.311 
23:10:41.311 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.311     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.312     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.312     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.312     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.312     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:10:41.312     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:10:41.312   code: 'P6001',
23:10:41.312   meta: { modelName: 'UnitOfMeasure' },
23:10:41.312   clientVersion: '6.15.0'
23:10:41.312 }
23:10:41.313 prisma:error 
23:10:41.313 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.313 
23:10:41.313 
23:10:41.313 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.315 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:10:41.315 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.315 
23:10:41.315 
23:10:41.315 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.315     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.315     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.315     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.315     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.316     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:10:41.316     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:10:41.316   code: 'P6001',
23:10:41.316   meta: { modelName: 'Supplier' },
23:10:41.316   clientVersion: '6.15.0'
23:10:41.316 }
23:10:41.335 prisma:error 
23:10:41.336 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.336 
23:10:41.336 
23:10:41.336 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.337 prisma:error 
23:10:41.337 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.337 
23:10:41.337 
23:10:41.337 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.338 prisma:error 
23:10:41.338 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.338 
23:10:41.338 
23:10:41.338 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.338 [GET_PURCHASES] PrismaClientKnownRequestError: 
23:10:41.338 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.338 
23:10:41.338 
23:10:41.338 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.338     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.338     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.338     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.338     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.338     at async getPurchases (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3626)
23:10:41.338     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3974) {
23:10:41.338   code: 'P6001',
23:10:41.339   meta: { modelName: 'PurchaseDetail' },
23:10:41.339   clientVersion: '6.15.0'
23:10:41.339 }
23:10:41.339 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:10:41.339 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.339 
23:10:41.339 
23:10:41.339 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.339     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.339     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.339     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.339     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.339     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:10:41.339     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:3997) {
23:10:41.339   code: 'P6001',
23:10:41.339   meta: { modelName: 'TaxSlab' },
23:10:41.339   clientVersion: '6.15.0'
23:10:41.339 }
23:10:41.339 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:10:41.339 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.339 
23:10:41.339 
23:10:41.339 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.339     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.339     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.339     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.339     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.339     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:10:41.339     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4015) {
23:10:41.339   code: 'P6001',
23:10:41.339   meta: { modelName: 'UnitOfMeasure' },
23:10:41.339   clientVersion: '6.15.0'
23:10:41.339 }
23:10:41.339 [GET_SUPPLIERS] PrismaClientKnownRequestError: 
23:10:41.340 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.340 
23:10:41.340 
23:10:41.340 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.340     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.340     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.340     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.340     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.340     at async getSuppliers (/vercel/path0/.next/server/chunks/90688.js:1:278)
23:10:41.340     at async PurchaseReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/new/page.js:1:4033) {
23:10:41.340   code: 'P6001',
23:10:41.340   meta: { modelName: 'Supplier' },
23:10:41.340   clientVersion: '6.15.0'
23:10:41.340 }
23:10:41.340 prisma:error 
23:10:41.340 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.340 
23:10:41.340 
23:10:41.340 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.341 
   Generating static pages (132/177) 
23:10:41.348 prisma:error 
23:10:41.349 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:10:41.349 
23:10:41.349 
23:10:41.349 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.350 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:10:41.350 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:10:41.350 
23:10:41.350 
23:10:41.350 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.350     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.350     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.350     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.351     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.351     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:10:41.351     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:10:41.351   code: 'P6001',
23:10:41.351   meta: { modelName: 'PurchaseReturn' },
23:10:41.351   clientVersion: '6.15.0'
23:10:41.351 }
23:10:41.368 prisma:error 
23:10:41.368 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:10:41.368 
23:10:41.368 
23:10:41.368 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.368 [GET_PURCHASE_RETURNS] PrismaClientKnownRequestError: 
23:10:41.368 Invalid `prisma.purchaseReturn.findMany()` invocation:
23:10:41.368 
23:10:41.368 
23:10:41.368 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.368     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.369     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.369     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.369     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.369     at async getPurchaseReturns (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:6824)
23:10:41.369     at async PurchaseReturnsPage (/vercel/path0/.next/server/app/(dashboard)/purchase-returns/page.js:1:7392) {
23:10:41.369   code: 'P6001',
23:10:41.369   meta: { modelName: 'PurchaseReturn' },
23:10:41.369   clientVersion: '6.15.0'
23:10:41.369 }
23:10:41.379 prisma:error 
23:10:41.379 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.379 
23:10:41.379 
23:10:41.379 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.387 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:10:41.387 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.387 
23:10:41.387 
23:10:41.387 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.387     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.387     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.387     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.387     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.387     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:10:41.387   code: 'P6001',
23:10:41.387   meta: { modelName: 'PurchaseDetail' },
23:10:41.387   clientVersion: '6.15.0'
23:10:41.387 }
23:10:41.420 prisma:error 
23:10:41.420 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.420 
23:10:41.420 
23:10:41.420 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.420 Error in PurchasesPage: PrismaClientKnownRequestError: 
23:10:41.420 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.420 
23:10:41.420 
23:10:41.420 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.420     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.420     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.420     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.420     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.420     at async PurchasesPage (/vercel/path0/.next/server/app/(dashboard)/purchases/ledger/page.js:1:17997) {
23:10:41.420   code: 'P6001',
23:10:41.420   meta: { modelName: 'PurchaseDetail' },
23:10:41.420   clientVersion: '6.15.0'
23:10:41.420 }
23:10:41.431 prisma:error 
23:10:41.431 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.431 
23:10:41.431 
23:10:41.431 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.449 prisma:error 
23:10:41.449 Invalid `prisma.supplier.findMany()` invocation:
23:10:41.449 
23:10:41.449 
23:10:41.449 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.458 prisma:error 
23:10:41.458 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.458 
23:10:41.458 
23:10:41.458 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.473 prisma:error 
23:10:41.473 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.473 
23:10:41.473 
23:10:41.473 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.483 prisma:error 
23:10:41.483 Invalid `prisma.customer.findMany()` invocation:
23:10:41.483 
23:10:41.483 
23:10:41.483 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.498 prisma:error 
23:10:41.498 Invalid `prisma.customer.findMany()` invocation:
23:10:41.498 
23:10:41.498 
23:10:41.498 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.506 prisma:error 
23:10:41.506 Invalid `prisma.receiptDetail.findMany()` invocation:
23:10:41.506 
23:10:41.506 
23:10:41.506 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.521 prisma:error 
23:10:41.521 Invalid `prisma.receiptDetail.findMany()` invocation:
23:10:41.521 
23:10:41.521 
23:10:41.521 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.590 prisma:error 
23:10:41.590 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.590 
23:10:41.590 
23:10:41.590 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.606 prisma:error 
23:10:41.606 Invalid `prisma.purchaseDetail.findMany()` invocation:
23:10:41.606 
23:10:41.606 
23:10:41.606 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.644 prisma:error 
23:10:41.644 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:41.644 
23:10:41.645 
23:10:41.645 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.666 prisma:error 
23:10:41.666 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:41.666 
23:10:41.666 
23:10:41.666 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.676 prisma:error 
23:10:41.676 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:41.676 
23:10:41.676 
23:10:41.676 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.692 prisma:error 
23:10:41.693 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:41.693 
23:10:41.693 
23:10:41.693 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.730 prisma:error 
23:10:41.730 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.730 
23:10:41.730 
23:10:41.730 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.730 prisma:error 
23:10:41.731 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.731 
23:10:41.731 
23:10:41.731 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.731 prisma:error 
23:10:41.731 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.731 
23:10:41.731 
23:10:41.731 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.731 prisma:error 
23:10:41.731 Invalid `prisma.customer.findMany()` invocation:
23:10:41.731 
23:10:41.731 
23:10:41.731 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.733 [GET_SALES] PrismaClientKnownRequestError: 
23:10:41.733 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.733 
23:10:41.733 
23:10:41.734 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.734     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.734     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.734     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.734     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.734     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:10:41.734     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:10:41.735   code: 'P6001',
23:10:41.735   meta: { modelName: 'SaleDetail' },
23:10:41.735   clientVersion: '6.15.0'
23:10:41.735 }
23:10:41.735 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:10:41.735 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.735 
23:10:41.735 
23:10:41.736 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.736     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.736     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.736     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.736     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.736     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:10:41.736     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:10:41.736   code: 'P6001',
23:10:41.736   meta: { modelName: 'TaxSlab' },
23:10:41.737   clientVersion: '6.15.0'
23:10:41.737 }
23:10:41.737 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:10:41.738 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.738 
23:10:41.738 
23:10:41.738 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.738     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.738     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.738     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.739     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.739     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:10:41.739     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:10:41.739   code: 'P6001',
23:10:41.739   meta: { modelName: 'UnitOfMeasure' },
23:10:41.739   clientVersion: '6.15.0'
23:10:41.739 }
23:10:41.740 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:10:41.740 Invalid `prisma.customer.findMany()` invocation:
23:10:41.740 
23:10:41.740 
23:10:41.740 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.740     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.740     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.741     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.741     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.741     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:10:41.741     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:10:41.741   code: 'P6001',
23:10:41.741   meta: { modelName: 'Customer' },
23:10:41.741   clientVersion: '6.15.0'
23:10:41.742 }
23:10:41.755 prisma:error 
23:10:41.756 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.756 
23:10:41.756 
23:10:41.756 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.756 [GET_SALES] PrismaClientKnownRequestError: 
23:10:41.756 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.756 
23:10:41.756 
23:10:41.757 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.757     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.757     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.757     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.757     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.757     at async getSales (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3594)
23:10:41.757     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3926) {
23:10:41.757   code: 'P6001',
23:10:41.757   meta: { modelName: 'SaleDetail' },
23:10:41.757   clientVersion: '6.15.0'
23:10:41.757 }
23:10:41.757 [GET_TAX_SLABS] PrismaClientKnownRequestError: 
23:10:41.757 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.757 
23:10:41.757 
23:10:41.757 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.757     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.757     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.757     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.757     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.757     at async getTaxSlabs (/vercel/path0/.next/server/chunks/25857.js:1:706)
23:10:41.757     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3945) {
23:10:41.757   code: 'P6001',
23:10:41.757   meta: { modelName: 'TaxSlab' },
23:10:41.757   clientVersion: '6.15.0'
23:10:41.757 }
23:10:41.757 [GET_UNITS_OF_MEASURE] PrismaClientKnownRequestError: 
23:10:41.757 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.757 
23:10:41.757 
23:10:41.757 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.757     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.757     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.757     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.757     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.757     at async getUnitsOfMeasure (/vercel/path0/.next/server/chunks/25857.js:1:994)
23:10:41.758     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3963) {
23:10:41.759   code: 'P6001',
23:10:41.759   meta: { modelName: 'UnitOfMeasure' },
23:10:41.759   clientVersion: '6.15.0'
23:10:41.759 }
23:10:41.759 [GET_CUSTOMERS] PrismaClientKnownRequestError: 
23:10:41.759 Invalid `prisma.customer.findMany()` invocation:
23:10:41.759 
23:10:41.759 
23:10:41.762 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.762     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.762     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.762     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.762     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.762     at async getCustomers (/vercel/path0/.next/server/chunks/85787.js:1:278)
23:10:41.763     at async SaleReturnCreatePage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/new/page.js:1:3981) {
23:10:41.763   code: 'P6001',
23:10:41.763   meta: { modelName: 'Customer' },
23:10:41.763   clientVersion: '6.15.0'
23:10:41.763 }
23:10:41.763 prisma:error 
23:10:41.763 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.763 
23:10:41.763 
23:10:41.763 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.763 prisma:error 
23:10:41.763 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.763 
23:10:41.763 
23:10:41.763 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.763 prisma:error 
23:10:41.763 Invalid `prisma.customer.findMany()` invocation:
23:10:41.763 
23:10:41.763 
23:10:41.763 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.769 prisma:error 
23:10:41.769 Invalid `prisma.saleReturn.findMany()` invocation:
23:10:41.769 
23:10:41.769 
23:10:41.769 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.769 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:10:41.769 Invalid `prisma.saleReturn.findMany()` invocation:
23:10:41.769 
23:10:41.769 
23:10:41.769 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.769     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.770     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.770     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.770     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.770     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:10:41.770     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:10:41.770   code: 'P6001',
23:10:41.770   meta: { modelName: 'SaleReturn' },
23:10:41.770   clientVersion: '6.15.0'
23:10:41.771 }
23:10:41.788 prisma:error 
23:10:41.788 Invalid `prisma.saleReturn.findMany()` invocation:
23:10:41.789 
23:10:41.789 
23:10:41.789 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.789 [GET_SALE_RETURNS] PrismaClientKnownRequestError: 
23:10:41.789 Invalid `prisma.saleReturn.findMany()` invocation:
23:10:41.789 
23:10:41.789 
23:10:41.789 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.789     at ei.handleRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:7268)
23:10:41.789     at ei.handleAndLogRequestError (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6593)
23:10:41.789     at ei.request (/vercel/path0/node_modules/@prisma/client/runtime/library.js:121:6300)
23:10:41.789     at async a (/vercel/path0/node_modules/@prisma/client/runtime/library.js:130:9551)
23:10:41.789     at async getSaleReturns (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:6886)
23:10:41.789     at async SaleReturnsPage (/vercel/path0/.next/server/app/(dashboard)/sale-returns/page.js:1:7418) {
23:10:41.789   code: 'P6001',
23:10:41.789   meta: { modelName: 'SaleReturn' },
23:10:41.789   clientVersion: '6.15.0'
23:10:41.789 }
23:10:41.798 prisma:error 
23:10:41.798 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.798 
23:10:41.798 
23:10:41.798 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.815 prisma:error 
23:10:41.815 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.815 
23:10:41.815 
23:10:41.815 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.824 prisma:error 
23:10:41.824 Invalid `prisma.customer.findMany()` invocation:
23:10:41.824 
23:10:41.824 
23:10:41.824 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.842 prisma:error 
23:10:41.842 Invalid `prisma.customer.findMany()` invocation:
23:10:41.842 
23:10:41.842 
23:10:41.842 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.852 prisma:error 
23:10:41.852 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.852 
23:10:41.852 
23:10:41.852 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.865 prisma:error 
23:10:41.866 Invalid `prisma.saleDetail.findMany()` invocation:
23:10:41.866 
23:10:41.866 
23:10:41.866 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.874 prisma:error 
23:10:41.874 Invalid `prisma.organization.findFirst()` invocation:
23:10:41.874 
23:10:41.874 
23:10:41.874 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.890 prisma:error 
23:10:41.890 Invalid `prisma.organization.findFirst()` invocation:
23:10:41.890 
23:10:41.890 
23:10:41.890 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.899 prisma:error 
23:10:41.900 Invalid `prisma.organization.findFirst()` invocation:
23:10:41.900 
23:10:41.900 
23:10:41.900 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.928 prisma:error 
23:10:41.928 Invalid `prisma.organization.findFirst()` invocation:
23:10:41.928 
23:10:41.928 
23:10:41.928 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.937 prisma:error 
23:10:41.938 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.938 
23:10:41.938 
23:10:41.938 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.953 prisma:error 
23:10:41.953 Invalid `prisma.taxSlab.findMany()` invocation:
23:10:41.953 
23:10:41.953 
23:10:41.953 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.962 prisma:error 
23:10:41.962 Invalid `prisma.tDSMaster.findMany()` invocation:
23:10:41.962 
23:10:41.962 
23:10:41.962 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.977 prisma:error 
23:10:41.978 Invalid `prisma.tDSMaster.findMany()` invocation:
23:10:41.978 
23:10:41.978 
23:10:41.978 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:41.985 prisma:error 
23:10:41.985 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:41.985 
23:10:41.985 
23:10:41.985 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.000 prisma:error 
23:10:42.000 Invalid `prisma.unitOfMeasure.findMany()` invocation:
23:10:42.000 
23:10:42.000 
23:10:42.000 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.009 prisma:error 
23:10:42.010 Invalid `prisma.supplier.findMany()` invocation:
23:10:42.010 
23:10:42.010 
23:10:42.010 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.024 prisma:error 
23:10:42.025 Invalid `prisma.supplier.findMany()` invocation:
23:10:42.025 
23:10:42.025 
23:10:42.025 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.033 prisma:error 
23:10:42.034 Invalid `prisma.supplier.findMany()` invocation:
23:10:42.034 
23:10:42.034 
23:10:42.034 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.054 prisma:error 
23:10:42.054 Invalid `prisma.supplier.findMany()` invocation:
23:10:42.054 
23:10:42.055 
23:10:42.055 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.109 prisma:error 
23:10:42.110 Invalid `prisma.tourPackage.findMany()` invocation:
23:10:42.110 
23:10:42.110 
23:10:42.110 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.126 prisma:error 
23:10:42.126 Invalid `prisma.tourPackage.findMany()` invocation:
23:10:42.126 
23:10:42.126 
23:10:42.126 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.139 prisma:error 
23:10:42.139 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:42.139 
23:10:42.139 
23:10:42.139 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.155 prisma:error 
23:10:42.155 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:42.155 
23:10:42.155 
23:10:42.155 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.167 prisma:error 
23:10:42.167 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:42.167 
23:10:42.167 
23:10:42.167 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.183 prisma:error 
23:10:42.183 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:42.183 
23:10:42.183 
23:10:42.183 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.193 prisma:error 
23:10:42.193 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:42.193 
23:10:42.193 
23:10:42.193 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.207 prisma:error 
23:10:42.207 Invalid `prisma.tourPackageQuery.findMany()` invocation:
23:10:42.207 
23:10:42.207 
23:10:42.208 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.218 prisma:error 
23:10:42.218 Invalid `prisma.tourPackage.findMany()` invocation:
23:10:42.218 
23:10:42.218 
23:10:42.218 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.231 prisma:error 
23:10:42.232 Invalid `prisma.tourPackage.findMany()` invocation:
23:10:42.232 
23:10:42.232 
23:10:42.232 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.242 prisma:error 
23:10:42.242 Invalid `prisma.location.findMany()` invocation:
23:10:42.242 
23:10:42.242 
23:10:42.242 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.242 prisma:error 
23:10:42.243 Invalid `prisma.tourPackage.findMany()` invocation:
23:10:42.243 
23:10:42.243 
23:10:42.243 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.261 prisma:error 
23:10:42.262 Invalid `prisma.location.findMany()` invocation:
23:10:42.262 
23:10:42.262 
23:10:42.262 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.262 prisma:error 
23:10:42.263 Invalid `prisma.tourPackage.findMany()` invocation:
23:10:42.263 
23:10:42.263 
23:10:42.263 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.274 prisma:error 
23:10:42.274 Invalid `prisma.transfer.findMany()` invocation:
23:10:42.274 
23:10:42.274 
23:10:42.274 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.290 prisma:error 
23:10:42.291 Invalid `prisma.transfer.findMany()` invocation:
23:10:42.291 
23:10:42.291 
23:10:42.291 Error validating datasource `db`: the URL must start with the protocol `prisma://` or `prisma+postgres://`
23:10:42.567 
 ✓ Generating static pages (177/177) 
23:10:42.572 SIGINT received - disconnecting Prisma Client
23:10:42.584    Finalizing page optimization ...
23:10:42.584    Collecting build traces ...
23:10:42.600 
23:10:42.692 Route (app)                                                               Size     First Load JS
23:10:42.693 ┌ λ /                                                                     1.6 kB         82.5 kB
23:10:42.693 ├ λ /_not-found                                                           0 B                0 B
23:10:42.693 ├ λ /accounts                                                             6.96 kB         153 kB
23:10:42.693 ├ λ /accounts/[tourPackageQueryId]                                        13.1 kB         245 kB
23:10:42.693 ├ λ /activities                                                           11.2 kB         183 kB
23:10:42.693 ├ λ /activities/[activityId]                                              6.28 kB         220 kB
23:10:42.693 ├ λ /activitiesMaster                                                     11.2 kB         183 kB
23:10:42.693 ├ λ /activitiesMaster/[activityMasterId]                                  6.29 kB         220 kB
23:10:42.693 ├ λ /api/activities                                                       0 B                0 B
23:10:42.693 ├ λ /api/activities/[activityId]                                          0 B                0 B
23:10:42.693 ├ λ /api/activitiesMaster                                                 0 B                0 B
23:10:42.693 ├ λ /api/activitiesMaster/[activityMasterId]                              0 B                0 B
23:10:42.693 ├ λ /api/associate-partners                                               0 B                0 B
23:10:42.693 ├ λ /api/associate-partners/[associatePartnerId]                          0 B                0 B
23:10:42.693 ├ λ /api/associate-partners/me                                            0 B                0 B
23:10:42.693 ├ λ /api/associate-performance                                            0 B                0 B
23:10:42.693 ├ λ /api/audit-logs                                                       0 B                0 B
23:10:42.693 ├ λ /api/bank-accounts                                                    0 B                0 B
23:10:42.693 ├ λ /api/bank-accounts/[bankAccountId]                                    0 B                0 B
23:10:42.693 ├ λ /api/bank-accounts/[bankAccountId]/recalculate                        0 B                0 B
23:10:42.693 ├ λ /api/bank-accounts/[bankAccountId]/transactions                       0 B                0 B
23:10:42.693 ├ λ /api/bank-accounts/recalculate-all                                    0 B                0 B
23:10:42.693 ├ λ /api/cash-accounts                                                    0 B                0 B
23:10:42.693 ├ λ /api/cash-accounts/[cashAccountId]                                    0 B                0 B
23:10:42.693 ├ λ /api/cash-accounts/[cashAccountId]/recalculate                        0 B                0 B
23:10:42.693 ├ λ /api/cash-accounts/[cashAccountId]/transactions                       0 B                0 B
23:10:42.693 ├ λ /api/cash-accounts/recalculate-all                                    0 B                0 B
23:10:42.693 ├ λ /api/config/meal-plans                                                0 B                0 B
23:10:42.693 ├ λ /api/config/occupancy-types                                           0 B                0 B
23:10:42.693 ├ λ /api/config/room-types                                                0 B                0 B
23:10:42.693 ├ λ /api/config/vehicle-types                                             0 B                0 B
23:10:42.693 ├ λ /api/customers                                                        0 B                0 B
23:10:42.693 ├ λ /api/customers/[customerId]                                           0 B                0 B
23:10:42.696 ├ λ /api/debug-whatsapp                                                   0 B                0 B
23:10:42.696 ├ ○ /api/debug/env-check                                                  0 B                0 B
23:10:42.696 ├ λ /api/destinations                                                     0 B                0 B
23:10:42.696 ├ λ /api/destinations/[destinationId]                                     0 B                0 B
23:10:42.696 ├ λ /api/expense-categories                                               0 B                0 B
23:10:42.696 ├ λ /api/expense-categories/[categoryId]                                  0 B                0 B
23:10:42.696 ├ λ /api/expenses                                                         0 B                0 B
23:10:42.696 ├ λ /api/expenses/[expenseId]                                             0 B                0 B
23:10:42.696 ├ λ /api/expenses/[expenseId]/pay                                         0 B                0 B
23:10:42.696 ├ λ /api/expenses/accrued                                                 0 B                0 B
23:10:42.696 ├ λ /api/export/inquiries-contacts                                        0 B                0 B
23:10:42.696 ├ λ /api/export/queries-contacts                                          0 B                0 B
23:10:42.696 ├ λ /api/financial-records                                                0 B                0 B
23:10:42.696 ├ λ /api/flight-tickets                                                   0 B                0 B
23:10:42.696 ├ λ /api/flight-tickets/[pnr]                                             0 B                0 B
23:10:42.696 ├ λ /api/generate-pdf                                                     0 B                0 B
23:10:42.696 ├ λ /api/hotels                                                           0 B                0 B
23:10:42.696 ├ λ /api/hotels/[hotelId]                                                 0 B                0 B
23:10:42.696 ├ λ /api/hotels/[hotelId]/pricing                                         0 B                0 B
23:10:42.696 ├ λ /api/hotels/[hotelId]/pricing/[pricingId]                             0 B                0 B
23:10:42.696 ├ λ /api/income-categories                                                0 B                0 B
23:10:42.696 ├ λ /api/income-categories/[categoryId]                                   0 B                0 B
23:10:42.696 ├ λ /api/incomes                                                          0 B                0 B
23:10:42.696 ├ λ /api/incomes/[incomeId]                                               0 B                0 B
23:10:42.696 ├ λ /api/inquiries                                                        0 B                0 B
23:10:42.696 ├ λ /api/inquiries/[inquiryId]                                            0 B                0 B
23:10:42.697 ├ λ /api/inquiries/[inquiryId]/actions                                    0 B                0 B
23:10:42.697 ├ λ /api/inquiries/[inquiryId]/actions/[actionId]                         0 B                0 B
23:10:42.697 ├ λ /api/inquiries/[inquiryId]/assign-staff                               0 B                0 B
23:10:42.697 ├ λ /api/inquiries/[inquiryId]/status                                     0 B                0 B
23:10:42.697 ├ λ /api/inquiries/[inquiryId]/unassign-staff                             0 B                0 B
23:10:42.697 ├ λ /api/inquiry-summary                                                  0 B                0 B
23:10:42.697 ├ λ /api/itineraries                                                      0 B                0 B
23:10:42.697 ├ λ /api/itineraries/[itineraryId]                                        0 B                0 B
23:10:42.697 ├ λ /api/itinerariesMaster                                                0 B                0 B
23:10:42.697 ├ λ /api/itinerariesMaster/[itineraryMasterId]                            0 B                0 B
23:10:42.697 ├ λ /api/itineraryMaster                                                  0 B                0 B
23:10:42.697 ├ λ /api/locationBySlug/[slug]                                            0 B                0 B
23:10:42.697 ├ λ /api/locations                                                        0 B                0 B
23:10:42.697 ├ λ /api/locations-suppliers                                              0 B                0 B
23:10:42.697 ├ λ /api/locations/[locationId]                                           0 B                0 B
23:10:42.697 ├ λ /api/locations/[locationId]/seasonal-periods                          0 B                0 B
23:10:42.697 ├ λ /api/locations/[locationId]/seasonal-periods/[periodId]               0 B                0 B
23:10:42.697 ├ λ /api/me/role                                                          0 B                0 B
23:10:42.697 ├ λ /api/meal-plans                                                       0 B                0 B
23:10:42.697 ├ λ /api/meal-plans/[mealPlanId]                                          0 B                0 B
23:10:42.697 ├ λ /api/notifications                                                    0 B                0 B
23:10:42.697 ├ λ /api/notifications/[notificationId]                                   0 B                0 B
23:10:42.697 ├ λ /api/notifications/mark-all-read                                      0 B                0 B
23:10:42.697 ├ λ /api/occupancy-types                                                  0 B                0 B
23:10:42.698 ├ λ /api/occupancy-types/[occupancyTypeId]                                0 B                0 B
23:10:42.698 ├ λ /api/operational-staff                                                0 B                0 B
23:10:42.698 ├ λ /api/operational-staff/[staffId]                                      0 B                0 B
23:10:42.698 ├ λ /api/ops/my-inquiries                                                 0 B                0 B
23:10:42.698 ├ λ /api/ops/my-inquiries/[inquiryId]                                     0 B                0 B
23:10:42.698 ├ λ /api/package-variants                                                 0 B                0 B
23:10:42.698 ├ λ /api/package-variants/[variantId]                                     0 B                0 B
23:10:42.698 ├ λ /api/package-variants/[variantId]/hotel-mappings                      0 B                0 B
23:10:42.698 ├ λ /api/payments                                                         0 B                0 B
23:10:42.698 ├ λ /api/payments/[paymentId]                                             0 B                0 B
23:10:42.698 ├ λ /api/pricing-attributes                                               0 B                0 B
23:10:42.698 ├ λ /api/pricing-attributes/[pricingAttributeId]                          0 B                0 B
23:10:42.698 ├ λ /api/pricing-components                                               0 B                0 B
23:10:42.698 ├ λ /api/pricing-components/[pricingComponentId]                          0 B                0 B
23:10:42.698 ├ λ /api/pricing/calculate                                                0 B                0 B
23:10:42.698 ├ ○ /api/public-debug                                                     0 B                0 B
23:10:42.698 ├ λ /api/purchase-returns                                                 0 B                0 B
23:10:42.698 ├ λ /api/purchase-returns/[purchaseReturnId]                              0 B                0 B
23:10:42.698 ├ λ /api/purchases                                                        0 B                0 B
23:10:42.698 ├ λ /api/purchases/[purchaseId]                                           0 B                0 B
23:10:42.698 ├ λ /api/receipts                                                         0 B                0 B
23:10:42.698 ├ λ /api/receipts/[receiptId]                                             0 B                0 B
23:10:42.698 ├ λ /api/report/tds/summary                                               0 B                0 B
23:10:42.698 ├ λ /api/room-types                                                       0 B                0 B
23:10:42.698 ├ λ /api/room-types/[roomTypeId]                                          0 B                0 B
23:10:42.698 ├ λ /api/sale-returns                                                     0 B                0 B
23:10:42.698 ├ λ /api/sale-returns/[saleReturnId]                                      0 B                0 B
23:10:42.698 ├ λ /api/sales                                                            0 B                0 B
23:10:42.698 ├ λ /api/sales/[saleId]                                                   0 B                0 B
23:10:42.698 ├ λ /api/sales/[saleId]/items                                             0 B                0 B
23:10:42.698 ├ λ /api/searchTermLocations/[searchTerm]                                 0 B                0 B
23:10:42.698 ├ λ /api/settings/organization                                            0 B                0 B
23:10:42.698 ├ λ /api/settings/organization/[organizationId]                           0 B                0 B
23:10:42.698 ├ λ /api/settings/tax-slabs                                               0 B                0 B
23:10:42.698 ├ λ /api/settings/tax-slabs/[taxSlabId]                                   0 B                0 B
23:10:42.698 ├ λ /api/settings/tds-sections                                            0 B                0 B
23:10:42.698 ├ λ /api/settings/tds-sections/[id]                                       0 B                0 B
23:10:42.698 ├ λ /api/settings/units                                                   0 B                0 B
23:10:42.698 ├ λ /api/settings/units/[unitId]                                          0 B                0 B
23:10:42.698 ├ λ /api/suppliers                                                        0 B                0 B
23:10:42.698 ├ λ /api/suppliers/[supplierId]                                           0 B                0 B
23:10:42.698 ├ λ /api/tds/challans                                                     0 B                0 B
23:10:42.698 ├ λ /api/tds/deposit                                                      0 B                0 B
23:10:42.698 ├ λ /api/tds/transactions                                                 0 B                0 B
23:10:42.699 ├ ○ /api/test-env                                                         0 B                0 B
23:10:42.699 ├ λ /api/tourPackageBySlug/[slug]                                         0 B                0 B
23:10:42.699 ├ λ /api/tourPackageQuery                                                 0 B                0 B
23:10:42.699 ├ λ /api/tourPackageQuery/[tourPackageQueryId]                            0 B                0 B
23:10:42.699 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/accounting                 0 B                0 B
23:10:42.699 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/confirm                    0 B                0 B
23:10:42.699 ├ λ /api/tourPackageQuery/[tourPackageQueryId]/hotel-details              0 B                0 B
23:10:42.699 ├ λ /api/tourPackages                                                     0 B                0 B
23:10:42.699 ├ λ /api/tourPackages/[tourPackageId]                                     0 B                0 B
23:10:42.699 ├ λ /api/tourPackages/[tourPackageId]/field-update                        0 B                0 B
23:10:42.699 ├ λ /api/tourPackages/[tourPackageId]/pricing                             0 B                0 B
23:10:42.699 ├ λ /api/tourPackages/[tourPackageId]/pricing/[pricingId]                 0 B                0 B
23:10:42.699 ├ λ /api/tourPackages/[tourPackageId]/related                             0 B                0 B
23:10:42.699 ├ λ /api/tourPackages/reorder                                             0 B                0 B
23:10:42.699 ├ λ /api/tourPackagesForWebsite                                           0 B                0 B
23:10:42.699 ├ λ /api/transfers                                                        0 B                0 B
23:10:42.699 ├ λ /api/transfers/[transferId]                                           0 B                0 B
23:10:42.699 ├ λ /api/transport-pricing                                                0 B                0 B
23:10:42.699 ├ λ /api/transport-pricing/[transportPricingId]                           0 B                0 B
23:10:42.699 ├ λ /api/uploads/images                                                   0 B                0 B
23:10:42.699 ├ λ /api/vehicle-types                                                    0 B                0 B
23:10:42.699 ├ λ /api/vehicle-types/[vehicleTypeId]                                    0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/campaigns                                               0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/campaigns/[id]                                          0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/campaigns/[id]/recipients                               0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/campaigns/[id]/send                                     0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/campaigns/[id]/stats                                    0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/catalog                                                 0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/catalog/packages                                        0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/catalog/packages/[packageId]                            0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/catalog/packages/[packageId]/sync                       0 B                0 B
23:10:42.699 ├ ○ /api/whatsapp/config                                                  0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/customers                                               0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/customers/[id]                                          0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/customers/export                                        0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/customers/import                                        0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/database-health                                         0 B                0 B
23:10:42.699 ├ ○ /api/whatsapp/env-check                                               0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/flow-endpoint                                           0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/flows/manage                                            0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/flows/templates                                         0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/flows/versions                                          0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/media/[mediaId]                                         0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/messages                                                0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/send                                                    0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/send-message                                            0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/send-template                                           0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/templates                                               0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/templates/create                                        0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/templates/manage                                        0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/templates/preview                                       0 B                0 B
23:10:42.699 ├ ○ /api/whatsapp/test-key                                                0 B                0 B
23:10:42.699 ├ λ /api/whatsapp/webhook                                                 0 B                0 B
23:10:42.699 ├ λ /associate-partners                                                   10.2 kB         187 kB
23:10:42.699 ├ λ /associate-partners/[associatePartnerId]                              7.35 kB         172 kB
23:10:42.699 ├ λ /audit-logs                                                           9.13 kB         150 kB
23:10:42.700 ├ λ /bank-book                                                            4.92 kB         123 kB
23:10:42.700 ├ λ /bank-book/[bankAccountId]                                            8.62 kB         412 kB
23:10:42.700 ├ λ /bankaccounts                                                         12.1 kB         407 kB
23:10:42.700 ├ λ /bankaccounts/[bankAccountId]                                         5.18 kB         170 kB
23:10:42.700 ├ λ /cash-book                                                            26.3 kB         145 kB
23:10:42.700 ├ λ /cash-book/[cashAccountId]                                            8.43 kB         412 kB
23:10:42.700 ├ λ /cashaccounts                                                         12.2 kB         407 kB
23:10:42.700 ├ λ /cashaccounts/[cashAccountId]                                         8.37 kB         173 kB
23:10:42.700 ├ λ /customers                                                            1.89 kB         280 kB
23:10:42.700 ├ λ /customers/[customerId]                                               38.5 kB         258 kB
23:10:42.700 ├ λ /customers/[customerId]/ledger                                        7.77 kB         380 kB
23:10:42.700 ├ λ /customers/ledger                                                     8.15 kB         400 kB
23:10:42.700 ├ λ /destinations                                                         11.4 kB         184 kB
23:10:42.700 ├ λ /destinations/[destinationId]                                         9.9 kB          224 kB
23:10:42.700 ├ λ /expense-categories                                                   8.3 kB          185 kB
23:10:42.700 ├ λ /expense-categories/[categoryId]                                      8.63 kB         173 kB
23:10:42.700 ├ λ /expenses                                                             13.9 kB         435 kB
23:10:42.700 ├ λ /expenses/[expenseId]                                                 3.85 kB         243 kB
23:10:42.700 ├ λ /expenses/[expenseId]/view                                            6.01 kB         102 kB
23:10:42.700 ├ λ /expenses/[expenseId]/voucher                                         152 B           114 kB
23:10:42.700 ├ λ /expenses/accrued                                                     10.3 kB         436 kB
23:10:42.700 ├ λ /expenses/ledger                                                      14.4 kB         436 kB
23:10:42.700 ├ λ /expenses/new                                                         4.91 kB         245 kB
23:10:42.700 ├ λ /export-contacts                                                      9.29 kB         106 kB
23:10:42.700 ├ λ /fetchaccounts/[tourPackageQueryId]                                   17.8 kB         433 kB
23:10:42.700 ├ λ /flight-tickets                                                       11.3 kB         196 kB
23:10:42.700 ├ λ /flight-tickets/[pnr]                                                 8.22 kB         123 kB
23:10:42.700 ├ λ /flight-tickets/[pnr]/edit                                            185 B           230 kB
23:10:42.700 ├ λ /flight-tickets/[pnr]/print                                           13.6 kB         134 kB
23:10:42.700 ├ λ /flight-tickets/new                                                   185 B           230 kB
23:10:42.700 ├ λ /hotels                                                               1.54 kB         184 kB
23:10:42.700 ├ λ /hotels/[hotelId]                                                     6.59 kB         228 kB
23:10:42.700 ├ λ /hotels/[hotelId]/pricing                                             8.86 kB         228 kB
23:10:42.700 ├ λ /income-categories                                                    8.3 kB          185 kB
23:10:42.700 ├ λ /income-categories/[categoryId]                                       8.63 kB         173 kB
23:10:42.700 ├ λ /incomes                                                              14.4 kB         455 kB
23:10:42.700 ├ λ /incomes/[incomeId]                                                   2.11 kB         242 kB
23:10:42.700 ├ λ /incomes/[incomeId]/edit                                              2.48 kB         261 kB
23:10:42.700 ├ λ /incomes/[incomeId]/view                                              5.94 kB         102 kB
23:10:42.700 ├ λ /incomes/[incomeId]/voucher                                           152 B           114 kB
23:10:42.700 ├ λ /incomes/ledger                                                       13.6 kB         435 kB
23:10:42.700 ├ λ /incomes/new                                                          3.53 kB         262 kB
23:10:42.700 ├ λ /inquiries                                                            42.6 kB         550 kB
23:10:42.700 ├ λ /inquiries/[inquiryId]                                                10.5 kB         249 kB
23:10:42.700 ├ λ /itineraries                                                          1.31 kB         184 kB
23:10:42.700 ├ λ /itineraries/[itineraryId]                                            10.4 kB         224 kB
23:10:42.700 ├ λ /itinerariesMaster                                                    1.32 kB         184 kB
23:10:42.700 ├ λ /itinerariesMaster/[itineraryMasterId]                                7.9 kB          225 kB
23:10:42.700 ├ λ /ledger                                                               4.36 kB         402 kB
23:10:42.700 ├ λ /ledger/category/[category]                                           3.46 kB         388 kB
23:10:42.700 ├ λ /locations                                                            11.6 kB         184 kB
23:10:42.700 ├ λ /locations-suppliers                                                  7.4 kB          108 kB
23:10:42.701 ├ λ /locations/[locationId]                                               9.31 kB         207 kB
23:10:42.701 ├ λ /locations/[locationId]/seasonal-periods                              5.26 kB         198 kB
23:10:42.701 ├ λ /operational-staff                                                    13.1 kB         149 kB
23:10:42.701 ├ λ /ops                                                                  9.91 kB         135 kB
23:10:42.701 ├ λ /ops/inquiry/[inquiryId]                                              13.1 kB         124 kB
23:10:42.701 ├ λ /payments                                                             3.34 kB         139 kB
23:10:42.701 ├ λ /payments/[paymentId]                                                 2.21 kB         243 kB
23:10:42.701 ├ λ /payments/[paymentId]/voucher                                         152 B           114 kB
23:10:42.701 ├ λ /payments/ledger                                                      13.5 kB         435 kB
23:10:42.701 ├ λ /purchase-returns                                                     11.3 kB         184 kB
23:10:42.701 ├ λ /purchase-returns/[purchaseReturnId]                                  186 B           211 kB
23:10:42.701 ├ λ /purchase-returns/new                                                 186 B           211 kB
23:10:42.701 ├ λ /purchases                                                            3.46 kB         139 kB
23:10:42.701 ├ λ /purchases/[purchaseId]                                               456 B           223 kB
23:10:42.701 ├ λ /purchases/[purchaseId]/items                                         8.73 kB         220 kB
23:10:42.701 ├ λ /purchases/[purchaseId]/voucher                                       151 B           114 kB
23:10:42.701 ├ λ /purchases/ledger                                                     3.81 kB         436 kB
23:10:42.701 ├ λ /purchases/new                                                        237 B           223 kB
23:10:42.701 ├ λ /receipts                                                             3.36 kB         139 kB
23:10:42.701 ├ λ /receipts/[receiptId]                                                 2.21 kB         243 kB
23:10:42.701 ├ λ /receipts/[receiptId]/voucher                                         151 B           114 kB
23:10:42.702 ├ λ /receipts/ledger                                                      13.4 kB         435 kB
23:10:42.702 ├ λ /reports/associatePerformance                                         3.19 kB         404 kB
23:10:42.702 ├ λ /reports/confirmedQueries                                             3.5 kB          207 kB
23:10:42.702 ├ λ /reports/gst                                                          5.23 kB         288 kB
23:10:42.702 ├ λ /reports/inquirySummary                                               3.08 kB         404 kB
23:10:42.702 ├ λ /reports/profit                                                       5.98 kB         282 kB
23:10:42.702 ├ λ /reports/unconfirmedQueries                                           1.6 kB          184 kB
23:10:42.702 ├ λ /reports/upcomingTrips                                                3.83 kB         217 kB
23:10:42.702 ├ λ /sale-returns                                                         12.1 kB         194 kB
23:10:42.702 ├ λ /sale-returns/[saleReturnId]                                          185 B           210 kB
23:10:42.702 ├ λ /sale-returns/[saleReturnId]/voucher                                  152 B           114 kB
23:10:42.702 ├ λ /sale-returns/new                                                     185 B           210 kB
23:10:42.702 ├ λ /sales                                                                3.45 kB         139 kB
23:10:42.702 ├ λ /sales/[saleId]                                                       2.9 kB          223 kB
23:10:42.702 ├ λ /sales/[saleId]/items                                                 8.73 kB         220 kB
23:10:42.702 ├ λ /sales/[saleId]/voucher                                               152 B           114 kB
23:10:42.702 ├ λ /sales/ledger                                                         3.52 kB         435 kB
23:10:42.702 ├ λ /sales/new                                                            12 kB           223 kB
23:10:42.702 ├ λ /settings/invoice                                                     4.46 kB         155 kB
23:10:42.702 ├ λ /settings/meal-plans                                                  5.5 kB          147 kB
23:10:42.702 ├ λ /settings/meal-plans/[mealPlanId]                                     171 B           173 kB
23:10:42.702 ├ λ /settings/meal-plans/new                                              170 B           173 kB
23:10:42.702 ├ λ /settings/occupancy-types                                             9.42 kB         178 kB
23:10:42.702 ├ λ /settings/occupancy-types/[occupancyTypeId]                           170 B           174 kB
23:10:42.702 ├ λ /settings/occupancy-types/new                                         169 B           174 kB
23:10:42.702 ├ λ /settings/organization                                                6.31 kB         191 kB
23:10:42.702 ├ λ /settings/pricing-attributes                                          8.58 kB         185 kB
23:10:42.702 ├ λ /settings/pricing-attributes/[pricingAttributeId]                     172 B           173 kB
23:10:42.702 ├ λ /settings/pricing-attributes/new                                      170 B           173 kB
23:10:42.702 ├ λ /settings/pricing-components                                          8.66 kB         185 kB
23:10:42.702 ├ λ /settings/pricing-components/[pricingComponentId]                     179 B           195 kB
23:10:42.702 ├ λ /settings/pricing-components/new                                      179 B           195 kB
23:10:42.702 ├ λ /settings/room-types                                                  5.5 kB          147 kB
23:10:42.702 ├ λ /settings/room-types/[roomTypeId]                                     170 B           173 kB
23:10:42.702 ├ λ /settings/room-types/new                                              169 B           173 kB
23:10:42.702 ├ λ /settings/tax-slabs                                                   11.4 kB         184 kB
23:10:42.702 ├ λ /settings/tax-slabs/[taxSlabId]                                       8.65 kB         173 kB
23:10:42.702 ├ λ /settings/tds                                                         7.1 kB          117 kB
23:10:42.702 ├ λ /settings/units                                                       11.4 kB         184 kB
23:10:42.702 ├ λ /settings/units/[unitId]                                              8.63 kB         173 kB
23:10:42.702 ├ λ /settings/vehicle-types                                               5.51 kB         147 kB
23:10:42.702 ├ λ /settings/vehicle-types/[vehicleTypeId]                               172 B           173 kB
23:10:42.702 ├ λ /settings/vehicle-types/new                                           171 B           173 kB
23:10:42.702 ├ λ /sign-in/[[...sign-in]]                                               2.76 kB         102 kB
23:10:42.702 ├ λ /sign-up/[[...sign-up]]                                               2.76 kB         102 kB
23:10:42.702 ├ λ /suppliers                                                            3.19 kB         215 kB
23:10:42.702 ├ λ /suppliers/[supplierId]                                               3.76 kB         184 kB
23:10:42.702 ├ λ /suppliers/[supplierId]/ledger                                        13.9 kB         427 kB
23:10:42.703 ├ λ /suppliers/ledger                                                     8.66 kB         410 kB
23:10:42.703 ├ λ /tds/challans                                                         6.66 kB         135 kB
23:10:42.703 ├ λ /tds/reports                                                          8.36 kB         105 kB
23:10:42.703 ├ λ /tourPackageCreateCopy                                                11.2 kB         183 kB
23:10:42.703 ├ λ /tourPackageCreateCopy/[tourPackageCreateCopyId]                      14.4 kB         502 kB
23:10:42.703 ├ λ /tourPackageDisplay/[tourPackageDisplayId]                            519 B          93.4 kB
23:10:42.703 ├ λ /tourPackageFromTourPackageQuery/[tourPackageFromTourPackageQueryId]  13.4 kB         501 kB
23:10:42.703 ├ λ /tourPackagePDFGenerator/[tourPackageId]                              9.97 kB        90.9 kB
23:10:42.703 ├ λ /tourPackagePDFGeneratorWithVariants/[tourPackageId]                  9.55 kB        90.4 kB
23:10:42.703 ├ λ /tourPackageQuery                                                     3.66 kB         200 kB
23:10:42.703 ├ λ /tourPackageQuery/[tourPackageQueryId]                                7.57 kB         566 kB
23:10:42.703 ├ λ /tourPackageQueryCreateCopy                                           11.2 kB         183 kB
23:10:42.703 ├ λ /tourPackageQueryCreateCopy/[tourPackageQueryCreateCopyId]            6.33 kB         559 kB
23:10:42.703 ├ λ /tourPackageQueryDisplay                                              4.49 kB         212 kB
23:10:42.703 ├ λ /tourPackageQueryDisplay/[tourPackageQueryId]                         9.08 kB         127 kB
23:10:42.703 ├ λ /tourpackagequeryfrominquiry/[inquiryId]                              7.55 kB         561 kB
23:10:42.703 ├ λ /tourpackagequeryfrominquiry/associate/[inquiryId]                    34.2 kB         567 kB
23:10:42.703 ├ λ /tourPackageQueryFromTourPackage/[tourPackageQueryFromTourPackageId]  19 kB           530 kB
23:10:42.703 ├ λ /tourPackageQueryHotelUpdate/[tourPackageQueryId]                     12.9 kB         251 kB
23:10:42.703 ├ λ /tourPackageQueryPDFGenerator/[tourPackageQueryId]                    11.9 kB         100 kB
23:10:42.703 ├ λ /tourPackageQueryPDFGeneratorWithVariants/[tourPackageQueryId]        9.25 kB        97.4 kB
23:10:42.703 ├ λ /tourPackageQueryVoucherDisplay/[tourPackageQueryVoucherId]           10.9 kB         136 kB
23:10:42.703 ├ λ /tourPackages                                                         10.4 kB         218 kB
23:10:42.703 ├ λ /tourPackages/[tourPackageId]                                         31.6 kB         547 kB
23:10:42.703 ├ λ /tourPackages/[tourPackageId]/pricing                                 12.2 kB         236 kB
23:10:42.703 ├ λ /tourPackages/website-management                                      11.5 kB         222 kB
23:10:42.703 ├ λ /transfers                                                            9.12 kB         244 kB
23:10:42.703 ├ λ /transfers/[transferId]                                               4.4 kB          210 kB
23:10:42.703 ├ λ /transport-pricing                                                    12.4 kB         191 kB
23:10:42.703 ├ λ /transport-pricing/[transportPricingId]                               9.08 kB         220 kB
23:10:42.703 ├ λ /transport-pricing/new                                                9.33 kB         231 kB
23:10:42.703 ├ λ /viewpdfpage/[PDFPageID]                                              446 kB          544 kB
23:10:42.703 ├ λ /whatsapp                                                             6.72 kB         103 kB
23:10:42.703 ├ λ /whatsapp/campaigns                                                   11.4 kB         108 kB
23:10:42.703 ├ λ /whatsapp/campaigns/[id]                                              9.76 kB         129 kB
23:10:42.703 ├ λ /whatsapp/campaigns/[id]/stats                                        4.47 kB         108 kB
23:10:42.703 ├ λ /whatsapp/campaigns/new                                               15.8 kB         159 kB
23:10:42.703 ├ λ /whatsapp/catalog                                                     19.1 kB         169 kB
23:10:42.703 ├ λ /whatsapp/chat                                                        102 kB          260 kB
23:10:42.703 ├ λ /whatsapp/customers                                                   19.9 kB         152 kB
23:10:42.703 ├ λ /whatsapp/flows                                                       38.1 kB         180 kB
23:10:42.703 ├ λ /whatsapp/media                                                       9.7 kB          111 kB
23:10:42.703 └ λ /whatsapp/templates                                                   18.9 kB         155 kB
23:10:42.703 + First Load JS shared by all                                             80.9 kB
23:10:42.703   ├ chunks/2472-eb9bc76fb9bc33cb.js                                       27.6 kB
23:10:42.703   ├ chunks/fd9d1056-294e6a544314e9b9.js                                   51.1 kB
23:10:42.703   ├ chunks/main-app-8ed6d57d180fb331.js                                   237 B
23:10:42.703   └ chunks/webpack-40d34b3eadf9958d.js                                    1.97 kB
23:10:42.703 
23:10:42.703 
23:10:42.703 ƒ Middleware                                                              205 kB
23:10:42.703 
23:10:42.707 λ  (Server)  server-side renders at runtime (uses getInitialProps or getServerSideProps)
23:10:42.707 ○  (Static)  automatically rendered as static HTML (uses no initial props)
23:10:42.707 
23:10:43.596 Traced Next.js server files in: 364.243ms
23:10:45.262 WARNING: Unable to find source file for page /_not-found with extensions: tsx, ts, jsx, js, this can cause functions config from `vercel.json` to not be applied
23:10:45.426 Created all serverless functions in: 1.829s
23:10:45.596 Collected static files (public/, static/, .next/static): 41.992ms
23:10:45.982 Build Completed in /vercel/output [2m]
23:10:46.439 Deploying outputs...
23:11:11.385 Deployment completed
23:11:12.287 Creating build cache...
23:11:47.634 Created build cache: 35.347s
23:11:47.637 Uploading build cache [388.54 MB]
23:11:55.827 Build cache uploaded: 8.191s