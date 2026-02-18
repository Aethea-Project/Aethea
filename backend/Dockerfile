# =============================================
# Aethea Backend — Multi-Stage Dockerfile
# Express + Prisma + TypeScript
# =============================================

# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodejs -u 1001 -G nodejs

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --omit=dev && \
    npx prisma generate && \
    npm cache clean --force

# ---------- Build Dependencies ----------
FROM base AS build-deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci && \
    npx prisma generate && \
    npm cache clean --force

# ---------- Build ----------
FROM build-deps AS build
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# ---------- Development ----------
FROM build-deps AS development
ENV NODE_ENV=development
COPY . .
RUN npx prisma generate
USER nodejs
EXPOSE 3001
CMD ["npx", "tsx", "watch", "src/index.ts"]

# ---------- Production ----------
FROM base AS production
ENV NODE_ENV=production
COPY --from=deps   --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps   --chown=nodejs:nodejs /app/package.json ./
COPY --from=build  --chown=nodejs:nodejs /app/dist         ./dist
COPY --from=deps   --chown=nodejs:nodejs /app/prisma       ./prisma
USER nodejs
EXPOSE 3001
# At startup: apply migrations then launch
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
