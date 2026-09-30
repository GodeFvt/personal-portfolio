import { profile, projects, experience, skillGroups } from "./portfolio";

export const endpoints = [
  {
    id: "me",
    label: "Introduction",
    icon: "i-lucide-fingerprint",
    group: "The developer",
    description:
      "The person behind the endpoints. Profile, about, education, robotics.",
  },
  {
    id: "projects",
    label: "Selected work",
    icon: "i-lucide-box",
    group: "The work",
    description:
      "Pre-test registration, school management, Kradan Kanban, Go, Vue, Spring Boot.",
  },
  {
    id: "experience",
    label: "Experience",
    icon: "i-lucide-git-branch",
    group: "The work",
    description: "Gridwhiz, EV charging, OCPI, Innovasive, RAG, freelance.",
  },
  {
    id: "stack",
    label: "Tech stack",
    icon: "i-lucide-layers",
    group: "The work",
    description:
      "Backend, databases, Go, Java, PostgreSQL, Docker, infrastructure, skills.",
  },
  {
    id: "contact",
    label: "Get in touch",
    icon: "i-lucide-at-sign",
    group: "Say hello",
    description: "Email, LinkedIn, GitHub, resume, contact.",
  },
] as const;

export type WorkspaceEndpoint = (typeof endpoints)[number]["id"];
export function isWorkspaceEndpoint(
  value: unknown,
): value is WorkspaceEndpoint {
  return (
    typeof value === "string" &&
    endpoints.some((endpoint) => endpoint.id === value)
  );
}
export const workspaceData = {
  me: {
    ...profile,
    focus: "Backend-first, fullstack when it counts.",
    education: {
      degree: "B.Sc. Information Technology",
      university: "King Mongkut's University of Technology Thonburi",
      period: "2022 - 2026",
    },
    interests: [
      "System architecture",
      "API design",
      "Robotics",
      "Teaching & mentoring",
    ],
  },
  projects,
  experience,
  stack: skillGroups.map(({ label, items }) => ({
    category: label,
    technologies: items,
  })),
  contact: {
    email: profile.email,
    github: profile.github,
    linkedin: profile.linkedin,
    location: profile.location,
    resume: "/resume/phuttinan-resume.pdf",
  },
};
