# Aethea Medical Platform — Copilot Instructions

## Big picture
- Monorepo currently contains `web/`, `backend/`, and `core/` (no active `shared/` directory).
- `web/` is a React + Vite app with protected routes in `web/src/App.tsx` and page modules in `web/src/pages/*`.
- `core/` is the shared domain/auth layer (types, auth service/repository, constants, theme, mock data), imported via `@core/*` alias.
- `backend/` is an Express API (`backend/src/app.ts`) with modular route factories and auth middleware injection.
- Frontend data flow is real API-first: pages call `web/src/services/medicalApi.ts`, which adds Supabase Bearer token and calls `${VITE_API_URL}/api/*`.
- UI uses progressive image enhancement: images load from `web/public/images/**` with graceful fallbacks to SVG/gradient visuals when missing.

## Architecture conventions
- Keep auth logic in `core/auth/*`; avoid duplicating auth state/business rules in web components.
- `AuthProvider` in `web/src/contexts/AuthProvider.tsx` owns session/profile lifecycle via `authService`.
- Route protection pattern: `<ProtectedRoute><PageLayout><Page /></PageLayout></ProtectedRoute>` (see `web/src/App.tsx`).
- Backend route wiring follows `createXRoutes(authMiddleware)` pattern; preserve this DI style when adding new API modules.
- API response shapes are normalized in `web/src/services/medicalApi.ts` (`toLabTest`, `toMedicalScan`, `toReservation`) before reaching UI.

## UI component patterns
- **Image infrastructure**: `ImageWithFallback` component in `web/src/App.tsx` handles progressive enhancement with `onError` callback to fallback rendering.
- **Feature headers**: Use `FeatureHeader` component (`web/src/components/FeatureHeader.tsx`) for all feature pages with background image support and gradient overlays.
- **Asset paths**: Centralized in `web/src/constants/imageAssets.ts` - always reference this config, never hardcode image paths in components.
- **Fallback pattern**: Images try to load from `/images/**`, trigger fallback on error (SVG illustrations or themed gradients).
- **CSS naming**: Landing photos use `.landing-photo`, bento cards use `.bento-img-wrap`, feature headers use `.feature-header-bg` with `::before` overlay for text contrast.

## Developer workflows
- **Quick start**: `npm run start:server:dev` (auto-starts Docker Desktop if needed, hot-reload for backend + web).
- **Full stack**: `npm run start:server` (Docker Compose: postgres, redis, backend, web).
- **Stop all**: `npm run pause:server` (project-scoped, won't affect other Docker containers).
- Web dev: `cd web && npm run dev` (Vite, default 5173).
- Web checks: `cd web && npm run type-check`, `cd web && npm run build`, `cd web && npm run lint`.
- Backend dev: `cd backend && npm run dev` (tsx watch on 3001).
- Backend checks: `cd backend && npm run type-check`, `cd backend && npm run build`.
- Backend tests use Jest config in `backend/jest.config.ts`; run with `cd backend && npx jest`.
- Health endpoint: `GET /health`; API index: `GET /api`.
- Database: `npm run docker:prisma:migrate` for migrations, `npm run docker:prisma:studio` for GUI.

## Docker workflows (implemented)
- **Automated start**: `npm run start:server` or `npm run start:server:dev` (uses `scripts/start-server.ps1`).
- **Automated stop**: `npm run pause:server` (uses `scripts/pause-server.ps1`).
- Start stack: `npm run docker:up` (root).
- Stop stack: `npm run docker:down`; logs: `npm run docker:logs`.
- Prod profile: `npm run docker:prod` or `npm run start:server:prod`; optional tools: `npm run start:server:all`.
- Compose defines postgres, redis, backend, web, cloudflared, and optional pgAdmin/RedisInsight/MailHog.
- Scripts ensure Docker Desktop is running and handle 15s health checks for database readiness.

## Environment and integration points
- Web env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY`.
- Backend env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`.
- Turnstile: site key is frontend-only; secret key must be configured in Supabase Auth > Bot and Abuse Protection.
- CSP for Turnstile is defined in `web/index.html`; update it carefully when adding third-party scripts.

## Project-specific gotchas
- Root `package.json` still references `shared` in workspace/scripts; actual shared code lives in `core/`.
- Frontend pages use per-feature CSS (`web/src/pages/*/styles.css`) plus global styles in `web/src/App.css`.
- Backend rate limiting is Redis-backed when `REDIS_URL` exists, with in-memory fallback (`backend/src/middleware/rateLimiter.ts`).
- Keep imports aligned with aliases: `@/*` for web local code, `@core/*` for shared module code.
