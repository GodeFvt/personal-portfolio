export type EndpointId = "/me" | "/project" | "/about" | "/skills" | "/contact";

export interface LinkItem {
  label: string;
  url: string;
  kind: "github" | "linkedin" | "website" | "instagram";
}

export interface SnapshotFact {
  label: string;
  value: string;
}

export interface RoleItem {
  title: string;
  company: string;
  period: string;
  note: string;
}

export interface EducationItem {
  school: string;
  degree: string;
  period: string;
  location: string;
}

export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  location: string;
  bullets: string[];
  stack: string[];
}

export interface JourneyItem {
  year: string;
  title: string;
  detail: string;
  tag: string;
}

export interface SkillGroup {
  name: string;
  items: string[];
}

export interface ProjectItem {
  name: string;
  period: string;
  type: string;
  visibility: string;
  status: string;
  description: string;
  highlights: string[];
  stack: string[];
  repoUrl?: string;
  liveUrl?: string;
}

export interface ContactChannel {
  label: string;
  value: string;
  href: string;
  type: "email" | "phone" | "github" | "linkedin" | "website" | "instagram";
  note: string;
}

export interface EndpointSchemaItem {
  field: string;
  type: string;
  description: string;
}

export interface EndpointTheme {
  accent: string;
  soft: string;
  glow: string;
}

export interface EndpointDefinition {
  id: EndpointId;
  label: string;
  method: "GET";
  summary: string;
  badge: string;
  sources: string[];
  highlights: string[];
  schema: EndpointSchemaItem[];
  theme: EndpointTheme;
  baseLatency: number;
  data: unknown;
}

export const identity = {
  name: "Phuttinan Phaksaweang",
  alias: "Got",
  role: "Backend-focused Full-Stack Developer",
  status: "Open to graduate software roles",
  location: "Bangkok, Thailand",
  education:
    "Upcoming B.Sc.IT graduate, School of Information Technology, KMUTT",
  headline:
    "Building production APIs, internal tools, and data workflows with a backend-first mindset.",
  summary:
    "Upcoming B.Sc.IT graduate with hands-on experience in backend development through an internship, freelance delivery for a live school platform, and a senior project centered on scalable school systems. Comfortable moving between architecture, API design, database work, and the product surface above it.",
};

export const profileLinks: LinkItem[] = [
  { label: "GitHub", url: "https://github.com/GodeFvt", kind: "github" },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/in/phuttinan-phaksaweang-2a39a7325/",
    kind: "linkedin",
  },
  { label: "Website", url: "https://phuttinan.me", kind: "website" },
  {
    label: "Instagram",
    url: "https://www.instagram.com/gxdexxt/",
    kind: "instagram",
  },
];

export const meFacts: SnapshotFact[] = [
  {
    label: "Focus",
    value: "Backend architecture, full-stack delivery, and operational tooling",
  },
  {
    label: "Internship",
    value: "Backend Developer Intern at Innovasive Co., Ltd. in 2025",
  },
  {
    label: "Freelance delivery",
    value: "Built a live pre-test registration system for a school workflow",
  },
  {
    label: "Current track",
    value: "Senior project around centralized school data services",
  },
];

export const currentRoles: RoleItem[] = [
  {
    title: "Backend Developer Intern",
    company: "Innovasive Co., Ltd.",
    period: "Jan 2025 - Jul 2025",
    note: "Worked on production-scale backend services with Golang, gRPC, database design, and maintainable service boundaries.",
  },
  {
    title: "Software Developer (Freelance)",
    company: "Kanaratbamrungpathumthani School",
    period: "Aug 2025 - Jan 2026",
    note: "Delivered a dual-portal pre-test registration system with role-based admin workflows, certificate generation, and infrastructure ownership.",
  },
  {
    title: "Senior Project",
    company: "School Management System",
    period: "Nov 2025 - Present",
    note: "Designing a centralized school platform using service boundaries, Hexagonal Architecture, and Microservices concepts.",
  },
];

export const education: EducationItem[] = [
  {
    school: "King Mongkut's University of Technology Thonburi",
    degree: "Bachelor of Science in Information Technology (B.Sc.IT)",
    period: "Aug 2022 - 2026 (Expected)",
    location: "Bangkok, Thailand",
  },
  {
    school: "Kanaratbamrung Pathumthani School",
    degree: "Mathematics-Science",
    period: "2019 - 2022",
    location: "Pathum Thani, Thailand",
  },
];

export const experience: ExperienceItem[] = [
  {
    role: "Backend Developer Intern",
    company: "Innovasive Co., Ltd.",
    period: "Jan 2025 - Jul 2025",
    location: "Thailand",
    bullets: [
      "Contributed to two major backend projects by designing RESTful APIs, database schemas, and Protobuf definitions for gRPC communication.",
      "Refactored service boundaries with DTOs to separate API contracts from internal persistence models.",
      "Worked inside an Agile/Scrum team and resolved critical bugs to keep production behavior stable.",
    ],
    stack: [
      "Golang",
      "gRPC",
      "REST API",
      "PostgreSQL",
      "Docker",
      "Microservices",
    ],
  },
  {
    role: "Software Developer (Freelance)",
    company: "Kanaratbamrungpathumthani School",
    period: "Aug 2025 - Jan 2026",
    location: "pretest.kanarat.ac.th",
    bullets: [
      "Built an end-to-end pre-test registration platform with separate user and admin portals plus RBAC for finance and logistics.",
      "Engineered certificate generation, MinIO-backed file handling, room allocation, and XLSX-driven workflows.",
      "Configured deployment on Ubuntu VM with Nginx reverse proxy and monitoring through Grafana and Prometheus.",
    ],
    stack: [
      "Golang (Echo)",
      "Vue.js",
      "TypeScript",
      "PostgreSQL",
      "MinIO",
      "Nginx",
      "Grafana",
    ],
  },
  {
    role: "Speaker",
    company: "Robot Camp / Starter Pack 29",
    period: "Jul 2023 - Sep 2023",
    location: "KMUTT and Kanaratbamrung Pathumthani School",
    bullets: [
      "Prepared teaching materials for introductory programming and robotics activities.",
      "Led hands-on sessions for younger students and helped make technical topics feel approachable.",
    ],
    stack: ["Mentoring", "Communication", "Workshop Design"],
  },
];

export const journey: JourneyItem[] = [
  {
    year: "2017",
    title: "Joined the robot room",
    tag: "Origin",
    detail:
      "Started with LEGO robotics, logic exercises, and a first real sense that solving technical problems could be fun, creative, and collaborative.",
  },
  {
    year: "2018",
    title: "First robotics competition",
    tag: "First win",
    detail:
      "Entered the first formal robotics competition, learned how to split work between hardware and code, and moved from classroom practice into real pressure.",
  },
  {
    year: "2019",
    title: "Bangkok Robotics Challenge 2019",
    tag: "Breakthrough",
    detail:
      "Competed in Bangkok Robotics Challenge 2019 and earned the chance to represent Thailand at Robot Challenge 2019 in Beijing.",
  },
  {
    year: "2019",
    title: "International Robot Challenge in Beijing",
    tag: "International",
    detail:
      "Reached an international stage for the first time, finished with a prize, and saw a much wider range of engineering approaches and competition strategy.",
  },
  {
    year: "2020",
    title: "Thailand Robot & Robotic Olympiad 2020",
    tag: "Achievement",
    detail:
      "Finished in the top group and secured a continuation slot toward Robot Challenge 2020 before the COVID period disrupted the trip.",
  },
  {
    year: "2021",
    title: "Samila Thailand International Robotic Game",
    tag: "Mentorship",
    detail:
      "Competed with a junior teammate, finished runner-up, and used the event as both a competition and a teaching moment.",
  },
  {
    year: "2023",
    title: "Shifted into teaching roles",
    tag: "Communication",
    detail:
      "Served as a speaker in Robot Camp and Starter Pack 29, translating hands-on technical knowledge into workshops for newer students.",
  },
  {
    year: "2024",
    title: "Moved into full-stack software projects",
    tag: "Software",
    detail:
      "Built Kradan Kanban Board and continued growing a stronger product and backend mindset through real application delivery.",
  },
  {
    year: "2025",
    title: "Internship plus freelance delivery",
    tag: "Professional",
    detail:
      "Worked on production services during an internship and then shipped a real school registration platform as a freelance developer.",
  },
];

export const skillGroups: SkillGroup[] = [
  {
    name: "Languages",
    items: ["Golang", "Java", "SQL", "JavaScript", "TypeScript", "C++"],
  },
  {
    name: "Frameworks",
    items: [
      "Echo",
      "Express",
      "Elysia",
      "Spring Boot",
      "Vue.js",
      "Tailwind CSS",
    ],
  },
  {
    name: "Databases",
    items: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "SQLite"],
  },
  {
    name: "Backend",
    items: [
      "RESTful API",
      "gRPC",
      "JWT / OAuth2",
      "Microservices",
      "Hexagonal Architecture",
      "DTO Design",
    ],
  },
  {
    name: "DevOps & Tooling",
    items: [
      "Git",
      "Docker",
      "CI/CD",
      "Nginx",
      "Prometheus",
      "Grafana",
      "GitHub Actions",
      "Unit Testing",
    ],
  },
];

export const workingTraits = [
  "Agile / Scrum collaboration",
  "Backend-first problem solving",
  "Cross-functional communication",
  "Teaching and mentoring",
  "Product-minded delivery",
];

export const projects: ProjectItem[] = [
  {
    name: "School Management System",
    period: "Nov 2025 - Present",
    type: "Senior Project",
    visibility: "Private academic project",
    status: "In progress",
    description:
      "A centralized service-based platform designed to reduce data fragmentation inside schools and improve administrative workflows.",
    highlights: [
      "Designed the project structure, service boundaries, database schema, and REST APIs.",
      "Applied Hexagonal Architecture and Microservices principles for maintainability and flexibility.",
      "Documented the system with Swagger and built around long-term team development.",
    ],
    stack: [
      "Golang (Echo)",
      "PostgreSQL",
      "Docker",
      "MinIO",
      "Nginx",
      "Microservices",
    ],
  },
  {
    name: "Pre-test Registration Platform",
    period: "Aug 2025 - Jan 2026",
    type: "Freelance delivery",
    visibility: "Private production project",
    status: "Delivered",
    description:
      "A real-world registration and administration system for a school pre-test flow with separate user and admin experiences.",
    highlights: [
      "Delivered registration, finance, logistics, room assignment, and certificate workflows.",
      "Built high-concurrency certificate generation with MinIO-backed file handling.",
      "Owned deployment and monitoring on Ubuntu VM with Nginx, Grafana, and Prometheus.",
    ],
    stack: [
      "Golang (Echo)",
      "Vue.js",
      "TypeScript",
      "PostgreSQL",
      "Nginx",
      "Grafana",
      "MinIO",
    ],
    liveUrl: "https://pretest.kanarat.ac.th",
  },
  {
    name: "Kradan Kanban Board",
    period: "Aug 2024 - Dec 2024",
    type: "Integrated Project",
    visibility: "Public repository",
    status: "Shipped",
    description:
      "A multi-board Kanban system with customizable workflows and public access support for collaborative task management.",
    highlights: [
      "Owned backend architecture, API design, database schema, and CI/CD workflow setup.",
      "Collaborated with the frontend side while keeping service behavior and delivery stable.",
      "Used Docker and GitHub Actions to streamline deployment and project reliability.",
    ],
    stack: [
      "Spring Boot",
      "MySQL",
      "Docker",
      "GitHub Actions",
      "REST API",
      "Vue.js",
    ],
    repoUrl: "https://github.com/GodeFvt/US-1-IT-Bangmod-Kradan-Kanban2",
    liveUrl: "https://phuttinan.me/integrated/",
  },
  {
    name: "Math Raining",
    period: "2024",
    type: "Course project",
    visibility: "Public repository",
    status: "Shipped",
    description:
      "An arithmetic practice web game that started from front-end interaction work and gradually pushed deeper into API thinking and full-stack learning.",
    highlights: [
      "Built the game interface with Vue.js and Tailwind CSS.",
      "Started with Json-server for basic API behavior and later expanded backend understanding beyond that first version.",
      "Focused on playful interaction, random equations, and customizable play modes.",
    ],
    stack: ["Vue.js", "Tailwind CSS", "Json-server", "Spring Boot", "MySQL"],
    repoUrl: "https://github.com/GodeFvt/PROJECT2-SEC-1-SUPERIDOL",
    liveUrl: "https://phuttinan.me/mathraining/",
  },
  {
    name: "MyPortfolio",
    period: "2022",
    type: "Web Technology course",
    visibility: "Public repository",
    status: "Legacy",
    description:
      "The first portfolio website that documented early robotics work and became the starting point for later portfolio iterations.",
    highlights: [
      "Built with plain HTML and CSS before moving into component-based frontend work.",
      "Captured the robotics chapter that shaped persistence, teamwork, and technical curiosity.",
      "Serves as a useful archive for the story behind later software projects.",
    ],
    stack: ["HTML", "CSS"],
    repoUrl: "https://github.com/GodeFvt/MyPortfolio",
    liveUrl: "https://phuttinan.me/myportfolio/",
  },
];

export const contactChannels: ContactChannel[] = [
  {
    label: "Email",
    value: "phuttinanphak@gmail.com",
    href: "mailto:phuttinanphak@gmail.com",
    type: "email",
    note: "Best channel for interviews, role discussions, and project conversations.",
  },
  {
    label: "Phone",
    value: "+66 95 901 4855",
    href: "tel:+66959014855",
    type: "phone",
    note: "Available for direct follow-up when a faster response is helpful.",
  },
  {
    label: "GitHub",
    value: "github.com/GodeFvt",
    href: "https://github.com/GodeFvt",
    type: "github",
    note: "Public repositories and code experiments.",
  },
  {
    label: "LinkedIn",
    value: "linkedin.com/in/phuttinan-phaksaweang-2a39a7325",
    href: "https://www.linkedin.com/in/phuttinan-phaksaweang-2a39a7325/",
    type: "linkedin",
    note: "Professional profile and role visibility.",
  },
  {
    label: "Website",
    value: "phuttinan.me",
    href: "https://phuttinan.me",
    type: "website",
    note: "Published portfolio projects and live demos.",
  },
  {
    label: "Instagram",
    value: "@gxdexxt",
    href: "https://www.instagram.com/gxdexxt/",
    type: "instagram",
    note: "Casual social channel.",
  },
];

const mePayload = {
  profile: identity,
  facts: meFacts,
  focusAreas: [
    "Backend systems",
    "Full-stack delivery",
    "Architecture and data flows",
    "Operational reliability",
  ],
  currentRoles,
  links: profileLinks,
};

const projectPayload = {
  featured: projects,
  note: "Private projects are represented as case-study summaries when source code cannot be shared publicly.",
};

const aboutPayload = {
  summary: [
    "The story starts in robotics competitions, where pressure, troubleshooting, and teamwork became second nature.",
    "That chapter evolved into backend-focused software work, teaching roles, and later real product delivery in academic, internship, and freelance settings.",
    "The current direction is clear: build maintainable systems, useful APIs, and workflows that people can rely on.",
  ],
  education,
  experience,
  journey,
};

const skillsPayload = {
  categories: skillGroups,
  workflow: workingTraits,
  emphasis: [
    "API design",
    "database design",
    "service architecture",
    "developer tooling",
    "admin workflow UX",
  ],
};

const contactPayload = {
  availability: identity.status,
  preferred: ["Email", "LinkedIn"],
  channels: contactChannels,
  location: identity.location,
};

export const endpointOrder: EndpointId[] = [
  "/me",
  "/project",
  "/about",
  "/skills",
  "/contact",
];

export const endpointRegistry: Record<EndpointId, EndpointDefinition> = {
  "/me": {
    id: "/me",
    label: "Identity",
    method: "GET",
    summary: "Current profile snapshot, active focus, and direct links.",
    badge: "Snapshot",
    sources: ["resume.en.json", "phuttinan_resume.pdf"],
    highlights: [
      "Upcoming B.Sc.IT graduate from SIT, KMUTT",
      "Backend-first full-stack profile",
      "Contains direct career status and active roles",
    ],
    schema: [
      {
        field: "profile",
        type: "object",
        description: "Name, role, location, headline, and summary",
      },
      {
        field: "facts",
        type: "array",
        description: "Short operational facts about the current profile",
      },
      {
        field: "focusAreas",
        type: "array",
        description: "Core technical directions and delivery themes",
      },
      {
        field: "currentRoles",
        type: "array",
        description: "Recent or ongoing roles with period and context",
      },
      {
        field: "links",
        type: "array",
        description:
          "Direct public links for GitHub, LinkedIn, website, and Instagram",
      },
    ],
    theme: {
      accent: "#ff7a33",
      soft: "rgba(255, 122, 51, 0.14)",
      glow: "rgba(255, 122, 51, 0.36)",
    },
    baseLatency: 96,
    data: mePayload,
  },
  "/project": {
    id: "/project",
    label: "Projects",
    method: "GET",
    summary:
      "Featured software work across senior, freelance, and public projects.",
    badge: "Shipped",
    sources: [
      "resume.en.json",
      "phuttinan_resume.pdf",
      "MyPortfolio",
      "personal-portfolio-website/src/App.vue",
    ],
    highlights: [
      "Mix of private production work and public repositories",
      "Shows progression from course project to real deployment ownership",
      "Keeps older MyPortfolio as part of the story instead of hiding it",
    ],
    schema: [
      {
        field: "featured[].name",
        type: "string",
        description: "Project title",
      },
      {
        field: "featured[].type",
        type: "string",
        description:
          "Context such as senior project, freelance, or course work",
      },
      {
        field: "featured[].status",
        type: "string",
        description: "Delivery state or maturity",
      },
      {
        field: "featured[].highlights",
        type: "array",
        description: "Key implementation or delivery outcomes",
      },
      {
        field: "featured[].stack",
        type: "array",
        description: "Core tools, frameworks, and platforms used",
      },
    ],
    theme: {
      accent: "#ffb347",
      soft: "rgba(255, 179, 71, 0.15)",
      glow: "rgba(255, 179, 71, 0.32)",
    },
    baseLatency: 118,
    data: projectPayload,
  },
  "/about": {
    id: "/about",
    label: "Journey",
    method: "GET",
    summary:
      "Background, education, work experience, and the path from robotics to software.",
    badge: "Story",
    sources: [
      "MyPortfolio",
      "resume.en.json",
      "phuttinan_resume.pdf",
      "personal-portfolio-website/src/App.vue",
    ],
    highlights: [
      "Connects robotics history to present software direction",
      "Includes education, work experience, and teaching moments",
      "Uses the older portfolio as source material, not design material",
    ],
    schema: [
      {
        field: "summary",
        type: "array",
        description: "Narrative overview paragraphs",
      },
      {
        field: "education",
        type: "array",
        description: "Academic background with period and location",
      },
      {
        field: "experience",
        type: "array",
        description: "Work and teaching experience entries",
      },
      {
        field: "journey",
        type: "array",
        description: "Timeline markers from 2017 onward",
      },
    ],
    theme: {
      accent: "#3ed7c2",
      soft: "rgba(62, 215, 194, 0.13)",
      glow: "rgba(62, 215, 194, 0.28)",
    },
    baseLatency: 132,
    data: aboutPayload,
  },
  "/skills": {
    id: "/skills",
    label: "Skill Map",
    method: "GET",
    summary: "Technical categories, workflow habits, and engineering emphasis.",
    badge: "Toolkit",
    sources: ["resume.en.json", "phuttinan_resume.pdf"],
    highlights: [
      "Backend skill depth is the center of gravity",
      "Frontend skills support delivery instead of standing alone",
      "Tooling section reflects real deployment and ops exposure",
    ],
    schema: [
      {
        field: "categories",
        type: "array",
        description: "Named groups of skills and tools",
      },
      {
        field: "workflow",
        type: "array",
        description: "Ways of working beyond pure technical stack",
      },
      {
        field: "emphasis",
        type: "array",
        description: "Areas that appear repeatedly in shipped work",
      },
    ],
    theme: {
      accent: "#58a6ff",
      soft: "rgba(88, 166, 255, 0.14)",
      glow: "rgba(88, 166, 255, 0.3)",
    },
    baseLatency: 104,
    data: skillsPayload,
  },
  "/contact": {
    id: "/contact",
    label: "Contact",
    method: "GET",
    summary: "Direct communication channels and hiring availability.",
    badge: "Reachable",
    sources: [
      "resume.en.json",
      "phuttinan_resume.pdf",
      "MyPortfolio/profile.html",
    ],
    highlights: [
      "Best channel is email for hiring conversations",
      "LinkedIn and GitHub stay one click away",
      "Availability is framed around graduate software roles",
    ],
    schema: [
      {
        field: "availability",
        type: "string",
        description: "Current role-seeking or response status",
      },
      {
        field: "preferred",
        type: "array",
        description: "Recommended first-contact channels",
      },
      {
        field: "channels",
        type: "array",
        description: "Each channel with display value, href, and note",
      },
      {
        field: "location",
        type: "string",
        description: "Primary location context",
      },
    ],
    theme: {
      accent: "#6de08d",
      soft: "rgba(109, 224, 141, 0.14)",
      glow: "rgba(109, 224, 141, 0.26)",
    },
    baseLatency: 86,
    data: contactPayload,
  },
};
