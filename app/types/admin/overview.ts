export interface SummaryGroup {
  publicationState: string;
  _count: number;
}

export interface SummaryResponse {
  data: {
    tabs: SummaryGroup[];
    projects: SummaryGroup[];
    experiences: SummaryGroup[];
    users: number;
    recentAudit: {
      id: string;
      action: string;
      entityType: string;
      createdAt: string;
    }[];
  };
}
