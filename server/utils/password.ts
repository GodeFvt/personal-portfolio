import { Hash } from "@adonisjs/hash";
import { Scrypt } from "@adonisjs/hash/drivers/scrypt";

const passwordHash = new Hash(new Scrypt({}));

export function hashAdminPassword(password: string) {
  return passwordHash.make(password);
}

export function verifyAdminPassword(hash: string, password: string) {
  return passwordHash.verify(hash, password);
}

export function adminPasswordNeedsRehash(hash: string) {
  return passwordHash.needsReHash(hash);
}
