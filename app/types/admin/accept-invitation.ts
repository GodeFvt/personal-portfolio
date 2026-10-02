export interface Provider {
  key: string;
  type: string;
  label: string;
}

export interface PreviewResponse {
  data: { email: string; providers: Provider[] };
}
