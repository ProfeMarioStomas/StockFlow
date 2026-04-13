import type { PaginatedSystemLogsResponse } from "../models/system-log.model";
import { api } from "./api";

export const systemLogService = {
  listLogs: (page: number, pageSize: number, userId?: string) =>
    api
      .get<PaginatedSystemLogsResponse>("/system-logs", {
        params: {
          page,
          pageSize,
          ...(userId ? { userId } : {}),
        },
      })
      .then((r) => r.data),
};
