export interface Role {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  isProtected: boolean;
  version: number;
  permissions: Array<{ permissionKey: string }>;
  _count: { users: number };
}

export interface RolesResponse {
  data: { roles: Role[]; permissionCatalog: Record<string, string> };
}
