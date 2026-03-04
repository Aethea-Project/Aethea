-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "userAgent" TEXT,
    "ipAddress" VARCHAR(64),
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" VARCHAR(16) NOT NULL DEFAULT 'low',
    "stepUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "stepUpCodeHash" VARCHAR(128),
    "stepUpCodeExpiresAt" TIMESTAMPTZ(6),
    "stepUpVerifiedAt" TIMESTAMPTZ(6),
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_sessionId_key" ON "user_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "user_sessions_userId_lastSeenAt_idx" ON "user_sessions"("userId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "user_sessions_userId_revokedAt_idx" ON "user_sessions"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
