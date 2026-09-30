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

async function resetPassword() {
  const account = await adminDatabase.adminUser.findUnique({ where: { email: input.email } });
  if (!account) throw new Error("Administrator account not found.");
  const passwordHash = await hashAdminPassword(input.password);
  await adminDatabase.$transaction([
    adminDatabase.adminUser.update({
      where: { id: account.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    adminDatabase.adminSession.updateMany({
      where: { userId: account.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    adminDatabase.auditLog.create({
      data: {
        actorId: account.id,
        action: "password.operator-reset",
        entityType: "AdminUser",
        entityId: account.id,
        metadata: { method: "operator-script" },
      },
    }),
  ]);
  console.log(`Password reset and sessions revoked: ${account.email}`);
}

resetPassword()
  .finally(() => adminDatabase.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Password reset failed.");
    process.exitCode = 1;
  });
