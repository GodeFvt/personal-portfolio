export const permissionCatalog = {
  "admin.access": "Access the administration workspace.",
  "content.read": "Read draft and published content.",
  "content.write": "Create and edit content drafts.",
  "content.publish": "Publish validated content revisions.",
  "navigation.write": "Create, edit, move, hide, and archive navigation.",
  "media.write": "Upload and manage media assets.",
  "settings.write": "Change site-wide branding and settings.",
  "users.read": "View administrator accounts.",
  "users.invite": "Create administrator invitations.",
  "users.manage": "Suspend and manage administrator accounts.",
  "roles.read": "View roles and their permissions.",
  "roles.create": "Create custom roles.",
  "roles.update": "Update custom roles.",
  "roles.assign": "Assign roles within the actor's delegation boundary.",
  "auth.providers.read": "View login provider configuration metadata.",
  "auth.providers.manage": "Create, test, activate, and disable login providers.",
  "auth.policy.manage": "Change password and admission policy.",
  "sessions.revoke": "Revoke sessions belonging to other users.",
  "audit.read": "Read security and content audit events.",
  "ownership.manage": "Assign or transfer the protected Owner role.",
} as const;

export type PermissionKey = keyof typeof permissionCatalog;

export const systemRoleTemplates: Record<
  "owner" | "access-manager" | "editor" | "viewer",
  { name: string; description: string; protected: boolean; permissions: PermissionKey[] }
> = {
  owner: {
    name: "Owner",
    description: "Protected full-access owner role.",
    protected: true,
    permissions: Object.keys(permissionCatalog) as PermissionKey[],
  },
  "access-manager": {
    name: "Access Manager",
    description: "Manages users, roles, login providers, sessions, and security audit.",
    protected: true,
    permissions: [
      "admin.access",
      "content.read",
      "users.read",
      "users.invite",
      "users.manage",
      "roles.read",
      "roles.create",
      "roles.update",
      "roles.assign",
      "auth.providers.read",
      "auth.providers.manage",
      "sessions.revoke",
      "audit.read",
    ],
  },
  editor: {
    name: "Editor",
    description: "Reads content and prepares drafts without publishing them.",
    protected: true,
    permissions: [
      "admin.access",
      "content.read",
      "content.write",
      "navigation.write",
      "media.write",
    ],
  },
  viewer: {
    name: "Viewer",
    description: "Read-only access to the administration workspace.",
    protected: true,
    permissions: ["admin.access", "content.read"],
  },
};
