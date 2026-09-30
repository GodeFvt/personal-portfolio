import { profile } from "../../shared/data/portfolio";

export default defineEventHandler(() => ({
  ...profile,
  focus: ["APIs", "Microservices", "Data & infrastructure"],
  stack: ["Go", "PostgreSQL", "Docker", "Vue"],
}));
