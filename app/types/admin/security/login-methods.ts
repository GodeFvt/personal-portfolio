export interface Provider {
  id: string;
  key: string;
  type: "google" | "microsoft" | "github";
  label: string;
  enabled: boolean;
  sortOrder: number;
  activeConfigVersion: number | null;
  draftConfigVersion: number | null;
  version: number;
  latestConfig: null | {
    configVersion: number;
    clientId: string;
    secretConfigured: boolean;
    options: {
      type: string;
      tenant?: string;
      accountPolicy?: "single-tenant" | "organizations" | "common";
      emailRequired?: boolean;
    };
    testedAt: string | null;
    updatedAt: string;
  };
}

export interface Identity {
  id: string;
  displayEmail: string | null;
  createdAt: string;
  provider: { id: string; key: string; label: string; enabled: boolean };
}

export interface SecurityProvidersResponse {
  data: {
    providers: Provider[];
    currentIdentities: Identity[];
    callbackBaseUrl: string;
  };
}
