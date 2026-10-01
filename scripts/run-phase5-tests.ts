import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync, type SpawnSyncOptions } from "node:child_process";

const container = `portfolio-phase5-${process.pid}`;
const image = `portfolio-phase5:${process.pid}`;
const appContainer = `${container}-app`;
const network = `${container}-network`;
const mediaDirectory = await mkdtemp(join(tmpdir(), "portfolio-phase5-media-"));
const sessionSecret = "phase-five-session-secret-at-least-32-characters";
const uploadSecret = "phase-five-upload-secret-at-least-32-characters";
const ownerEmail = "owner@phase5.test";
const ownerPassword = "phase-five-owner-password";
let appProcess: ReturnType<typeof spawn> | undefined;

function run(command: string, args: string[], options: SpawnSyncOptions = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}.`);
}

function output(command: string, args: string[]) {
  const result = spawnSync(command, args, { encoding: "utf8", shell: false });
  if (result.status !== 0) throw new Error(String(result.stderr || result.stdout));
  return String(result.stdout).trim();
}

async function waitFor(url: string, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

try {
  run("docker", ["network", "create", network]);
  run("docker", ["run", "--detach", "--name", container, "--network", network,
    "-e", "POSTGRES_DB=portfolio", "-e", "POSTGRES_USER=portfolio", "-e", "POSTGRES_PASSWORD=portfolio",
    "-p", "127.0.0.1::5432", "postgres:17-alpine"]);
  for (let attempt = 0; attempt < 60; attempt++) {
    const ready = spawnSync("docker", ["exec", container, "pg_isready", "-U", "portfolio", "-d", "portfolio"], { stdio: "ignore", shell: process.platform === "win32" });
    if (ready.status === 0) break;
    if (attempt === 59) throw new Error("PostgreSQL did not become ready.");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const port = output("docker", ["port", container, "5432/tcp"]).match(/:(\d+)$/)?.[1];
  if (!port) throw new Error("Could not resolve the PostgreSQL test port.");
  const databaseUrl = `postgresql://portfolio:portfolio@127.0.0.1:${port}/portfolio`;
  const key = Buffer.alloc(32, 7).toString("base64");
  const environment = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl,
    STORAGE_PROVIDER: "local",
    LOCAL_STORAGE_DIR: mediaDirectory,
    NUXT_SESSION_PASSWORD: sessionSecret,
    MEDIA_UPLOAD_SECRET: uploadSecret,
    SCHEDULED_JOB_SECRET: "phase-five-scheduled-job-secret-32-characters",
    NUXT_PUBLIC_SITE_URL: "http://127.0.0.1:3217",
    OAUTH_SECRET_KEYS: `1:${key}`,
    OAUTH_ACTIVE_KEY_VERSION: "1",
    ADMIN_BOOTSTRAP_EMAIL: ownerEmail,
    ADMIN_BOOTSTRAP_PASSWORD: ownerPassword,
    PHASE5_BASE_URL: "http://127.0.0.1:3217",
  };

  run("npm", ["run", "db:deploy"], { env: environment });
  run("npm", ["run", "db:seed"], { env: environment });
  run("npm", ["run", "db:seed"], { env: environment });
  run("npm", ["run", "media:dry-run"], { env: environment });
  run("npx", ["tsx", "scripts/import-media.ts", "--apply", "--prefix", "phase5"], { env: environment });
  run("npm", ["run", "admin:bootstrap"], { env: environment });
  run("npx", ["tsx", "--test", "tests/postgres-integration.test.ts"], { env: environment });

  appProcess = spawn(process.execPath, ["node_modules/@nuxt/cli/bin/nuxi.mjs", "dev", "--host", "127.0.0.1", "--port", "3217"], {
    env: { ...environment, HOST: "127.0.0.1", PORT: "3217", NODE_ENV: "test" },
    stdio: ["ignore", "inherit", "inherit"], shell: false,
  });
  await waitFor("http://127.0.0.1:3217/api/site");
  run("npx", ["tsx", "--test", "tests/http-security.integration.test.ts"], { env: environment });
  appProcess.kill(); appProcess = undefined;

  run("docker", ["exec", container, "pg_dump", "-U", "portfolio", "-d", "portfolio", "-Fc", "-f", "/tmp/phase5.dump"]);
  run("docker", ["exec", container, "createdb", "-U", "portfolio", "portfolio_restore"]);
  run("docker", ["exec", container, "pg_restore", "-U", "portfolio", "-d", "portfolio_restore", "--no-owner", "--no-acl", "/tmp/phase5.dump"]);
  const restored = Number(output("docker", ["exec", container, "psql", "-U", "portfolio", "-d", "portfolio_restore", "-tAc", "SELECT COUNT(*) FROM \"PortfolioTab\""]));
  if (restored < 5) throw new Error("Backup restore verification did not recover the seeded portfolio.");

  run("docker", ["build", "--target", "production", "--tag", image, "."]);
  run("docker", ["run", "--detach", "--name", appContainer, "--network", network, "-p", "127.0.0.1::3000",
    "-e", "DATABASE_URL=postgresql://portfolio:portfolio@" + container + ":5432/portfolio",
    "-e", "NUXT_SESSION_PASSWORD=" + sessionSecret,
    "-e", "NUXT_PUBLIC_SITE_URL=http://127.0.0.1:3000",
    "-e", "STORAGE_PROVIDER=local", "-e", "LOCAL_STORAGE_DIR=/app/data/media", image]);
  const appPort = output("docker", ["port", appContainer, "3000/tcp"]).match(/:(\d+)$/)?.[1];
  if (!appPort) throw new Error("Could not resolve the production image port.");
  await waitFor(`http://127.0.0.1:${appPort}/api/site`, 90_000);
  console.log("Phase 5 integration, backup/restore, and production image smoke tests passed.");
} finally {
  appProcess?.kill();
  spawnSync("docker", ["rm", "-f", appContainer, container], { stdio: "ignore", shell: process.platform === "win32" });
  spawnSync("docker", ["network", "rm", network], { stdio: "ignore", shell: process.platform === "win32" });
  spawnSync("docker", ["image", "rm", "-f", image], { stdio: "ignore", shell: process.platform === "win32" });
  await rm(mediaDirectory, { recursive: true, force: true });
}
