FROM node:22-bookworm-slim
WORKDIR /opt/creqor
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --include=dev --no-audit --no-fund && npm cache clean --force
COPY . .
USER node
EXPOSE 8188
CMD ["./node_modules/.bin/tsx","services/dgx/server.ts"]
