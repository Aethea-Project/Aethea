# Aethea Medical Platform — Copilot Instructions

## Big picture
- Monorepo: `web/` (React + Vite), `backend/` (Express + Prisma), `core/` (shared auth/types/theme). **No mobile app** — web-only.
- `core` is the shared contract layer; prefer adding reusable auth/domain logic there, not inside `web` pages.
- `web/src/App.tsx` is the routing composition root (lazy-loaded pages, `ProtectedRoute`, `PageLayout`).
- `backend/src/app.ts` is a factory (`createApp`) with middleware+route wiring; `backend/src/index.ts` only boots server.

## Frontend 4-layer architecture
Every data feature must follow this strict layering — never skip layers:
```
Pages (UI state, JSX only)
  -> Domain Hooks  web/src/hooks/use{LabTests,Scans,Reservations}.ts  (loading/error/data lifecycle, mutations)
    -> Repository  web/src/services/medicalApi.ts  (raw->domain normalization: toLabTest, toMedicalScan, toReservation)
      -> Infrastructure  web/src/lib/apiClient.ts  (the ONLY file that calls fetch; injects Supabase Bearer token)
```
- **Pages own**: UI selection state, filters, sort order, form state, JSX.
- **Hooks own**: `loading`, `error`, `data`, mutation functions that auto-refetch after write.
- **`medicalApi` owns**: raw type definitions (`RawLabTest` etc.), normalization, endpoint paths. Handles both `{ data }` (paginated) and legacy `{ tests }`/`{ scans }`/`{ reservations }` response shapes.
- **`apiClient` owns**: `authFetch<T>(path, init?)`, `API_BASE` resolution, 15s `AbortController` timeout on every request.
- Never put `useEffect`/`useState` for data fetching directly in a page component.

## Backend patterns
- Route modules use DI: `createScanRoutes(authMiddleware)` pattern, mounted in `app.ts` under both `/api/v1/` (canonical) and `/api/` (backward-compat alias).
- All list endpoints are paginated: use `parsePagination(req)` + `paginatedResult(data, total, page, limit)` from `backend/src/lib/pagination.ts`. Default page size 20, max 100. Response envelope: `{ data: T[], pagination: { page, limit, total, totalPages } }`.
- Controllers use `asyncHandler` wrapper (`backend/src/middleware/asyncHandler.ts`) — no try/catch in controllers.
- Errors use `AppError` factory (`backend/src/lib/AppError.ts`); centralized handler in `backend/src/middleware/errorHandler.ts` never leaks stack traces.
- Backend validation: Zod middleware `validateBody`/`validateQuery` from `backend/src/middleware/validate.ts`; schemas live in `backend/src/schemas/index.ts`. All schemas use `.strict()` to block mass-assignment.
- `backend/src/auth/jwt/verify.ts` wraps `supabase.auth.getUser()` in an 8s `Promise.race()` timeout — returns 503 instead of hanging.

## Cross-component flow
- Auth lifecycle: `web/src/contexts/AuthProvider.tsx` -> `core/auth/auth-service.ts` -> `core/auth/auth-repository.ts` -> Supabase.
- `core/auth/constants.ts` reads only `VITE_*` env vars — no `EXPO_PUBLIC_*` allowed (web-only project).
- Backend auth: `backend/src/auth/strategies/supabase.ts` verifies JWT; `requireLocalUser` middleware in route files enforces auth.

## Project conventions
- Aliases: `@/*` for web-local imports, `@core/*` for shared `core` package.
- Feature page top sections use `FeatureHeader` (`web/src/components/FeatureHeader.tsx`).
- Image paths: centralized in `web/src/constants/imageAssets.ts` — never hardcode `/images/...` strings.
- `ImageWithFallback` pattern in `web/src/App.tsx` — preserve it for all `<img>` with remote sources.
- Modal component: `web/src/components/Modal.tsx` — reuse for all overlay dialogs.

## Developer workflows
- First-time setup: `npm run setup:first-time` (runs `scripts/setup.ps1` — checks Node/npm/Docker, copies `.env` files, installs deps).
- Full stack (Docker): `npm run start:server` (dev containers) or `npm run start:server:prod` (prod containers with nginx).
- Local dev (non-Docker): `npm run start:server:dev` — opens two detached PowerShell windows, one each for `backend` and `web` watchers. They survive after npm exits.
- Pause stack safely: `npm run pause:server`. Restart: `npm run restart:server`.
- Fresh install: `npm run install:all` (single workspace-aware `npm install` from root — no `--legacy-peer-deps` needed).
- Web loop: `cd web && npm run dev` -> `npm run type-check` -> `npm run lint` -> `npm run build`.
- Backend loop: `cd backend && npm run dev` -> `npm run type-check` -> `npm run build`.
- Backend tests: `cd backend && npx jest` (config: `backend/jest.config.ts`). 5 suites, 65 tests. `app.ts` factory pattern enables Supertest without a live server.
- DB ops: `npm run docker:prisma:migrate`, `npm run docker:prisma:studio`.
- Generate audit report: `npm run docs:generate` (outputs HTML + PDF to `documentation/`).
- After any `core/` or `backend/` change, run both `web` and `backend` type-checks — `web/tsconfig.json` includes `../core` so `core` type errors surface from web.

## Integrations and environment
- Web envs: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_TURNSTILE_SITE_KEY`.
- Backend envs: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `REDIS_URL` (includes password: `redis://:${REDIS_PASSWORD}@redis:6379`), `CORS_ORIGIN`.
- Health/discovery: `GET /health`, `GET /api`.
- Docker Compose profiles: `(default)` dev containers, `prod` (nginx + optimised builds), `tools` (pgadmin, redisinsight, mailhog), `tunnel` (cloudflared — dev-only).
- Production profile uses services `backend-prod` and `web-prod`. These have network aliases `backend`/`web` so nginx `proxy_pass http://backend:3001` resolves correctly. Never mix dev and prod profiles simultaneously.

## Security posture (applied)
- Postgres and Redis are bound to `127.0.0.1` host ports only. Redis requires `REDIS_PASSWORD` via `--requirepass`.
- All container image tags are pinned (e.g. `node:24-alpine3.21`, `nginx:1.27-alpine`) — no floating `:latest` tags.
- Nginx serves a strict CSP with no `unsafe-eval`; backend Helmet uses `default-src 'none'` API policy.
- Auth has a 15s client-side AbortController timeout (`apiClient.ts`) and 8s server-side Promise.race timeout (`verify.ts`) to prevent hung requests on Supabase degradation.

## Testing patterns
- `backend/tests/__mocks__/prismaClient.ts` mocks all Prisma model methods as `jest.fn()`. Mapped via `moduleNameMapper` in `jest.config.ts` — **required because Prisma 7 generated client uses `import.meta.url` which breaks Jest CJS mode**.
- New tests go in `backend/tests/`. Use `supertest(createApp())` for HTTP tests, import schemas directly for unit-level validation tests.

## Gotchas
- `web/tsconfig.json` includes `../core`; strict checks from `web` can surface `core` issues — fix them in `core/`.
- `scripts/` has **five** files: `setup.ps1`, `start-project.ps1`, `stop-project.ps1`, `refresh-project.ps1`, `install-dependencies.ps1`.
- `package-lock.json` root workspaces are `web`, `core`, `backend` — no `mobile` entry. If a stale `mobile` block reappears, delete it manually.
- `medicalApi.ts` response unwrapping must handle both `{ data }` (paginated) and legacy `{ tests }`/`{ scans }`/`{ reservations }` shapes.
- All dependency upgrade phases (Node 24, Supabase 2.98, TS 5.9, ESLint 9, Express 5, React 19, Prisma 7) are **complete**. Do not suggest patterns that conflict with these versions: no `defaultProps` on function components, no `next(err)` in Express route handlers.