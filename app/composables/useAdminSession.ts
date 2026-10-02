import { createSessionApi } from "~/lib/api/admin/session";
import type { AdminSessionData } from "~/types/admin/session";

export function useAdminSession() {
  const api = createSessionApi(useNuxtApp().$api);

  const adminSession = useState<AdminSessionData | null>(
    "admin-session",
    () => null,
  );

  async function load(force = false) {
    if (adminSession.value && !force) return adminSession.value;
    const response = await api.getSession();
    adminSession.value = response.data;
    return response.data;
  }

  function clear() {
    adminSession.value = null;
  }

  return { adminSession, load, clear };
}
