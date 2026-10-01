ALTER TYPE "OAuthAttemptIntent" ADD VALUE 'INVITE';

ALTER TABLE "OAuthAttempt" ADD COLUMN "invitationId" UUID;

CREATE INDEX "OAuthAttempt_invitationId_idx" ON "OAuthAttempt"("invitationId");

ALTER TABLE "OAuthAttempt"
ADD CONSTRAINT "OAuthAttempt_invitationId_fkey"
FOREIGN KEY ("invitationId") REFERENCES "UserInvitation"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
