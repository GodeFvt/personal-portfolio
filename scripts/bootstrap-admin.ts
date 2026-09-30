import { z } from "zod";
import { adminDatabase } from "./admin-database";
import { hashAdminPassword } from "../server/utils/password";

const input = z
  .object({
    email: z.string().email().transform((value) => value.trim().toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .parse({
    email: process.env.ADMIN_BOOTSTRAP_EMAIL,
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD,
  });

async function bootstrap() {
  const passwordHash = await hashAdminPassword(input.password);
  const user = await adminDatabase.$transaction(async (transaction) => {
    const ownerRole = await transaction.role.findUnique({ where: { key: "owner" } });
    if (!ownerRole) throw new Error("Run npm run db:seed before bootstrapping the Owner.");

    const activeOwner = await transaction.adminUser.findFirst({
      where: {
        status: "ACTIVE",
        roles: { some: { roleId: ownerRole.id } },
      },
      select: { id: true },
    });
    if (activeOwner) {
      throw new Error("An active Owner already exists. Use admin:reset-password for recovery.");
    }

    const account = await transaction.adminUser.upsert({
      where: { email: input.email },
      update: {
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        sessionVersion: { increment: 1 },
      },
      create: {
        email: input.email,
        passwordHash,
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    await transaction.userRole.upsert({
      where: { userId_roleId: { userId: account.id, roleId: ownerRole.id } },
      update: {},
      create: { userId: account.id, roleId: ownerRole.id, assignedBy: account.id },
    });
    await transaction.auditLog.create({
      data: {
        actorId: account.id,
        action: "owner.bootstrap",
        entityType: "AdminUser",
        entityId: account.id,
        metadata: { method: "operator-script" },
      },
    });
    return account;
  });

  console.log(`Owner ready: ${user.email}`);
}

bootstrap()
  .finally(() => adminDatabase.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Owner bootstrap failed.");
    process.exitCode = 1;
  });
