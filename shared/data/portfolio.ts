export const profile = {
  name: "Phuttinan Phaksaweng",
  alias: "Got",
  role: "Backend & Fullstack Developer",
  email: "phuttinanphak@gmail.com",
  github: "https://github.com/GodeFvt",
  linkedin: "https://www.linkedin.com/in/phuttinan-p",
  location: "Bangkok, Thailand",
};

export interface Project {
  slug: string;
  name: string;
  category: string;
  period: string;
  summary: string;
  stack: string[];
  image: string | null;
  imageAlt: string;
  kind: "registration" | "services" | "kanban";
  highlights: string[];
  liveUrl?: string;
  repoUrl?: string;
}

export const projects: Project[] = [
  {
    slug: "pretest",
    name: "Pre-test registration",
    category: "Freelance / End-to-end delivery",
    period: "Jul 2025 - Jan 2026",
    summary:
      "From the first registration to the final certificate. One connected workflow for students and school administrators.",
    stack: ["Go / Echo", "Vue", "PostgreSQL", "MinIO", "Docker"],
    image: null,
    imageAlt: "Pre-test registration application",
    kind: "registration",
    highlights: [
      "Designed student and admin portals with role-based access for finance and logistics.",
      "Built registration, automated room allocation, XLSX processing, and certificate generation with MinIO.",
      "Owned Ubuntu VM deployment, Docker, Nginx, and monitoring with Prometheus and Grafana.",
    ],
    liveUrl: "https://pretest.kanarat.ac.th",
  },
  {
    slug: "school",
    name: "School management system",
    category: "Senior project / System architecture",
    period: "Jul 2025 - May 2026",
    summary:
      "Connecting fragmented school data through clear service boundaries and standardized APIs.",
    stack: ["Go / Echo", "Microservices", "Keycloak", "PostgreSQL"],
    image: null,
    imageAlt: "School management system interface",
    kind: "services",
    highlights: [
      "Designed a centralized platform that integrates school data sources and exposes standardized APIs.",
      "Applied Hexagonal Architecture to separate business logic from external dependencies.",
      "Designed database schemas and documented REST APIs with Swagger.",
    ],
  },
  {
    slug: "kradan",
    name: "Kradan Kanban",
    category: "Integrated project / Collaboration",
    period: "Aug - Dec 2024",
    summary:
      "A collaborative, multi-board workspace with customizable workflows and public board access.",
    stack: ["Spring Boot", "Vue", "MySQL", "GitHub Actions"],
    image: null,
    imageAlt: "Kradan Kanban board application",
    kind: "kanban",
    highlights: [
      "Owned backend architecture, REST API design, and database schema.",
      "Built support for multiple boards, customizable workflows, and public access.",
      "Set up Docker and GitHub Actions for repeatable delivery.",
    ],
    repoUrl: "https://github.com/GodeFvt/US-1-IT-Bangmod-Kradan-Kanban2",
    liveUrl: "https://phuttinan.me/integrated/",
  },
];

export const experience = [
  {
    company: "Gridwhiz",
    fullCompany: "Gridwhiz (Thailand) Co., Ltd.",
    role: "Backend Developer",
    period: "Jun - Jul 2026",
    description: "Backend services for connected EV charging platforms.",
    details: [
      "Designed APIs, service responsibilities, and data flows for web and mobile applications.",
      "Implemented microservices with gRPC communication and clear service boundaries.",
      "Built OCPI-based services for standardized data exchange between EV charging platforms.",
    ],
    tags: ["Microservices", "gRPC", "OCPI"],
  },
  {
    company: "Kanarat School",
    fullCompany: "Kanaratbamrungpathumthani School",
    role: "Fullstack Developer · Freelance",
    period: "Jul 2025 - Jan 2026",
    description:
      "A school registration platform, from requirements to production.",
    details: [
      "Worked directly with stakeholders to turn requirements into application architecture.",
      "Delivered user and administrative workflows, RBAC, room allocation, and certificates.",
      "Managed deployment and observability on Ubuntu with Docker, Nginx, Prometheus, and Grafana.",
    ],
    tags: ["Go", "Vue", "Production operations"],
  },
  {
    company: "Innovasive",
    fullCompany: "Innovasive Co., Ltd.",
    role: "Backend Developer Intern",
    period: "Jan - Jul 2025",
    description: "Microservices, API design, and AI-powered retrieval.",
    details: [
      "Developed REST APIs, database schemas, and Protobuf definitions for gRPC.",
      "Built RAG features using PostgreSQL vector storage for semantic search.",
      "Applied Hexagonal Architecture and resolved production issues with the development team.",
    ],
    tags: ["Go", "Hexagonal Architecture", "RAG"],
  },
];

export const skillGroups = [
  {
    label: "Backend",
    icon: "i-lucide-braces",
    items: [
      "Go / Echo",
      "Java / Spring Boot",
      "REST & gRPC",
      "Microservices",
      "Hexagonal Architecture",
    ],
  },
  {
    label: "Data & infrastructure",
    icon: "i-lucide-database",
    items: [
      "PostgreSQL",
      "MySQL / Redis",
      "Docker / Nginx",
      "Prometheus / Grafana",
      "CI/CD / GitHub Actions",
    ],
  },
  {
    label: "Beyond the backend",
    icon: "i-lucide-panels-top-left",
    items: [
      "Vue / TypeScript",
      "Next.js",
      "JWT / OAuth2 / Keycloak",
      "RAG / Semantic search",
      "Stakeholder collaboration",
    ],
  },
];

export const archive = [
  {
    name: "Math Raining",
    description: "An arithmetic practice game built with Vue and Tailwind.",
    year: "2024",
    url: "https://github.com/GodeFvt/PROJECT2-SEC-1-SUPERIDOL",
  },
  {
    name: "Portfolio Runtime",
    description: "The previous portfolio, built as an API-style workspace.",
    year: "2026",
    url: "https://github.com/GodeFvt/personal-portfolio",
  },
  {
    name: "My first portfolio",
    description: "HTML, CSS, and the robotics chapter that started it all.",
    year: "2022",
    url: "https://github.com/GodeFvt/MyPortfolio",
  },
];
