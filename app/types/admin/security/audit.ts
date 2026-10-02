export interface AuditResponse {
  data: {
    items: Array<{
      id: string;
      action: string;
      entityType: string;
      entityId: string | null;
      createdAt: string;
      actor: { email: string } | null;
    }>;
  };
}
