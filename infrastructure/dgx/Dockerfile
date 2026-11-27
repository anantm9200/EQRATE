# CREQOR private engine + ingestion jobs (linux/arm64 on DGX Spark).
# Only the runtime dependencies the engine and import scripts use are installed;
# the Next.js website is not part of this image.
FROM node:22-bookworm-slim
# poppler-utils: pdftotext for annual-report text extraction (run without network, with timeouts).
RUN apt-get update && apt-get install -y --no-install-recommends poppler-utils && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/creqor
ENV NODE_ENV=production
COPY package.json ./
RUN node -e "const fs=require('fs');const p=require('./package.json');const all={...p.dependencies,...p.devDependencies};\
const keep=['pg','csv-parse','unzipper','tsx'];const deps={};for(const k of keep){if(!all[k])throw new Error('missing '+k);deps[k]=all[k];}\
fs.writeFileSync('package.json',JSON.stringify({name:'creqor-engine',private:true,version:p.version,dependencies:deps},null,1));" \
 && npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY tsconfig.json ./
COPY lib ./lib
COPY services ./services
COPY scripts ./scripts
COPY db ./db
USER node
EXPOSE 8196
CMD ["./node_modules/.bin/tsx","services/dgx/server.ts"]
