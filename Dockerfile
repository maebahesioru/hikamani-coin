FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
ENV PORT=3000
COPY <<'EOF' /app/start.sh
#!/bin/sh
npx prisma db push --accept-data-loss 2>&1 || echo "Migration skipped"
npx tsx prisma/seed.ts 2>&1 || echo "Shop seed skipped"
npx tsx prisma/seed-stocks.ts 2>&1 || echo "Stocks seed skipped"
# Disable TwiGacha items (moved to TwiGacha site)
npx prisma db execute --stdin <<'SQL' 2>/dev/null || true
UPDATE "ShopItem" SET active = false WHERE slug IN ('twigacha-5pack', 'twigacha-ssr');
SQL
node server.js
EOF
RUN chmod +x /app/start.sh
CMD ["/bin/sh", "/app/start.sh"]
