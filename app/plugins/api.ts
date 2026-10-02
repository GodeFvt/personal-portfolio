import { createApiClient } from "~/lib/api/client";
import { createNitroAdapter } from "~/lib/api/nitro-adapter";
import type { AdminSessionData } from "~/types/admin/session";

export default defineNuxtPlugin(() => {
  const session = useState<AdminSessionData | null>(
    "admin-session",
    () => null,
  );
  // Capture the event for this SSR request. Nitro dispatches local requests
  // in-process with its cookies, including on serverless hosts.
  const adapter = import.meta.server
    ? createNitroAdapter(useRequestEvent()!.fetch)
    : undefined;
  return {
    provide: { api: createApiClient(adapter, () => session.value?.csrfToken) },
  };
});
