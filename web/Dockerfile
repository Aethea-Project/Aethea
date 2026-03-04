# =============================================
# Aethea Web — Multi-Stage Dockerfile
# React + Vite + Nginx
# =============================================

# ---------- Base ----------
FROM node:24-alpine3.21 AS base
WORKDIR /app/web

# ---------- Dependencies ----------
FROM base AS deps
COPY web/package.json web/package-lock.json* ./
RUN npm install && npm cache clean --force
COPY core/package.json /app/core/package.json
RUN cd /app/core && npm install && npm cache clean --force

# ---------- Build ----------
FROM deps AS build
# Copy shared core package (path aliases resolve to ../core)
COPY core ../core
COPY web .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG VITE_TURNSTILE_SITE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY
RUN npm run build

# ---------- Development ----------
FROM deps AS development
COPY core ../core
COPY web .
EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0"]

# ---------- Production (Nginx) ----------
FROM nginx:1.27-alpine AS production
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
