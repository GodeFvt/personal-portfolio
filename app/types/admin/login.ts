export interface ProvidersResponse {
  data: {
    password: { enabled: boolean };
    providers: Array<{ key: string; type: string; label: string }>;
  };
}
