-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "interests" JSONB NOT NULL DEFAULT '[]';

-- Preserve the interests from the original static portfolio for databases
-- that were seeded before this column was introduced.
UPDATE "Profile"
SET "interests" = '["System architecture", "API design", "Robotics", "Teaching & mentoring"]'::jsonb
WHERE "id" = '00000000-0000-4000-8000-000000000002'
  AND "interests" = '[]'::jsonb;

-- CreateIndex
CREATE INDEX "OAuthAttempt_initiatingSessionId_idx" ON "OAuthAttempt"("initiatingSessionId");

-- AddForeignKey
ALTER TABLE "OAuthAttempt" ADD CONSTRAINT "OAuthAttempt_initiatingSessionId_fkey" FOREIGN KEY ("initiatingSessionId") REFERENCES "AdminSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
