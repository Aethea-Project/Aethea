-- CreateTable SystemAnnouncements
CREATE TABLE "public"."system_announcements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "targetRoles" TEXT[],
    "expiresAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable UserAnnouncementReads
CREATE TABLE "public"."user_announcement_reads" (
    "userId" UUID NOT NULL,
    "announcementId" UUID NOT NULL,
    "readAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_announcement_reads_pkey" PRIMARY KEY ("userId","announcementId")
);

-- AddForeignKey
ALTER TABLE "public"."user_announcement_reads" ADD CONSTRAINT "user_announcement_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_announcement_reads" ADD CONSTRAINT "user_announcement_reads_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."system_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
