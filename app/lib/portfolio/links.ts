export function linkIcon(url: string) {
  if (url.includes("github.com")) return "i-lucide-github";
  if (url.includes("linkedin.com")) return "i-lucide-linkedin";
  if (url.endsWith(".pdf")) return "i-lucide-file-down";
  return "i-lucide-link";
}
