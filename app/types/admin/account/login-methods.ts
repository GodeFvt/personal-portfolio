export interface Provider {
  id: string;
  key: string;
  type: string;
  label: string;
}

export interface Identity {
  id: string;
  displayEmail: string | null;
  createdAt: string;
  provider: { id: string; key: string; label: string; enabled: boolean };
}

export interface AccountLoginMethodsResponse {
  data: {
    passwordConfigured: boolean;
    providers: Provider[];
    identities: Identity[];
  };
}
