export type SystemLogResponse = {
  id: string;
  userId: string;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type PaginatedSystemLogsResponse = {
  data: SystemLogResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
