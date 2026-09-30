import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const envPath = new URL("../.env", import.meta.url);
let content = await readFile(envPath, "utf8").catch(() => "");

function appendIfMissing(name: string, value: string) {
  const pattern = new RegExp(`^${name}=`, "m");
  if (!pattern.test(content)) {
    content = `${content.trimEnd()}\n${name}="${value}"\n`;
  }
}

appendIfMissing("NUXT_SESSION_PASSWORD", randomBytes(32).toString("base64url"));
appendIfMissing("OAUTH_SECRET_KEYS", `1:${randomBytes(32).toString("base64")}`);
appendIfMissing("OAUTH_ACTIVE_KEY_VERSION", "1");

await writeFile(envPath, content, { encoding: "utf8", mode: 0o600 });
console.log("Local authentication secrets are configured in the ignored .env file.");
