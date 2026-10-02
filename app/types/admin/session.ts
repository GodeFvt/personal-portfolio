export interface AdminSessionData {
  user: {
    id: string;
    email: string;
    roles: { key: string; name: string }[];
    permissions: string[];
  };
  session: { id: string; authenticatedAt: string; expiresAt: string };
  csrfToken: string;
}

export interface AdminSessionEnvelope {
  data: AdminSessionData;
}
