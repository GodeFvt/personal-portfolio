export interface Role {
  id: string;
  key: string;
  name: string;
  permissions: Array<{ permissionKey: string }>;
}

export interface AdminUser {
  id: string;
  email: string;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  version: number;
  createdAt: string;
  roles: Array<{ role: Pick<Role, "id" | "key" | "name"> }>;
  _count: { sessions: number };
}

export interface Invitation {
  id: string;
  normalizedEmail: string;
  intendedRoles: unknown;
  expiresAt: string;
  createdAt: string;
  invitedBy: { email: string };
}

export interface UsersResponse {
  data: { items: AdminUser[]; invitations: Invitation[] };
}

export interface RolesResponse {
  data: { roles: Array<Role & { isProtected: boolean; version: number }> };
}
