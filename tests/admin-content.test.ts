import assert from "node:assert/strict";
import test from "node:test";
import {
  profileSnapshotSchema,
  projectSnapshotSchema,
  skillGroupSnapshotSchema,
} from "../shared/schemas/admin-content";

test("profile drafts accept internal portfolio asset paths", () => {
  const parsed = profileSnapshotSchema.safeParse({
    name: "Portfolio owner",
    alias: "Owner",
    role: "Developer",
    email: "owner@example.com",
    bio: "Builds reliable systems.",
    focus: "Backend systems",
    interests: ["Architecture"],
    location: "Bangkok, Thailand",
    legacyPortraitUrl: "/images/profile.jpg",
    legacyResumeUrl: "/resume/portfolio.pdf",
    portraitMediaId: null,
    resumeMediaId: null,
    education: [{ degree: "B.Sc.", institution: "University", period: "2022–2026" }],
    socialLinks: [{ type: "resume", label: "Résumé", url: "/resume/portfolio.pdf" }],
  });
  assert.equal(parsed.success, true);
});

test("project drafts reject unsafe slugs and malformed links", () => {
  const parsed = projectSnapshotSchema.safeParse({
    slug: "Not Safe",
    name: "Project",
    category: "Platform",
    period: "2026",
    summary: "A project summary.",
    imageAlt: "Project preview",
    illustration: null,
    liveUrl: "javascript:alert(1)",
    repoUrl: null,
    coverMediaId: null,
    featured: false,
    archived: false,
    sortOrder: 0,
    publicationState: "PUBLISHED",
    highlights: [],
    technologyIds: [],
  });
  assert.equal(parsed.success, false);
});

test("skill drafts preserve ids for existing technologies", () => {
  const id = "00000000-0000-4000-8000-000000000100";
  const parsed = skillGroupSnapshotSchema.parse({
    label: "Backend",
    icon: "i-lucide-server",
    sortOrder: 0,
    technologies: [{ id, name: "PostgreSQL" }, { name: "Redis" }],
  });
  assert.equal(parsed.technologies[0]?.id, id);
  assert.equal(parsed.technologies[1]?.id, undefined);
});
