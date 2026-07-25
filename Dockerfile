# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/cli/package.json packages/cli/package.json
COPY packages/web/package.json packages/web/package.json
COPY packages/docs/package.json packages/docs/package.json

RUN npm ci

COPY packages/cli packages/cli
COPY packages/web packages/web
COPY tsconfig*.json ./

RUN npm run build -w @inbrx/web && npm run build -w @inbrx/cli

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    INBRX_DATA_DIR=/data \
    SMTP_TEST_SMTP_HOST=0.0.0.0 \
    SMTP_TEST_HTTP_HOST=0.0.0.0

WORKDIR /app

COPY packages/cli/package.json /tmp/inbrx-cli-package.json

RUN node -e "const fs = require('node:fs'); const pkg = JSON.parse(fs.readFileSync('/tmp/inbrx-cli-package.json', 'utf8')); delete pkg.dependencies['@inbrx/web']; delete pkg.devDependencies; delete pkg.scripts; pkg.private = true; fs.writeFileSync('/app/package.json', JSON.stringify(pkg, null, 2));" \
    && npm install --omit=dev --ignore-scripts --no-audit --no-fund \
    && npm cache clean --force

COPY --from=builder /app/packages/cli/bin packages/cli/bin
COPY --from=builder /app/packages/cli/dist packages/cli/dist
COPY --from=builder /app/packages/web/dist packages/web/dist

RUN mkdir -p /data && chown node:node /data

USER node

EXPOSE 2525 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["node", "/app/packages/cli/bin/inbrx.js"]
