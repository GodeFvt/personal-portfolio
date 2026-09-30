interface AdminSessionData {
  user: {
    id: string;
    email: string;
    roles: { key: string; name: string }[];
    permissions: string[];
  };
  session: { id: string; authenticatedAt: string; expiresAt: string };
  csrfToken: string;
}

interface AdminSessionEnvelope {
  data: AdminSessionData;
}

export function useAdminSession() {
  const adminSession = useState<AdminSessionData | null>("admin-session", () => null);
  const requestFetch = useRequestFetch();

  async function load(force = false) {
    if (adminSession.value && !force) return adminSession.value;
    const response = await requestFetch<AdminSessionEnvelope>("/api/admin/session");
    adminSession.value = response.data;
    return response.data;
  }

  function clear() {
    adminSession.value = null;
  }

  return { adminSession, load, clear };
}
