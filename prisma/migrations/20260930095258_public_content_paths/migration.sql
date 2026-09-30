-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "legacyPortraitUrl" TEXT,
ADD COLUMN "legacyResumeUrl" TEXT;

UPDATE "Profile"
SET "legacyPortraitUrl" = '/images/profile.jpg',
    "legacyResumeUrl" = '/resume/phuttinan-resume.pdf'
WHERE "id" = '00000000-0000-4000-8000-000000000002';
