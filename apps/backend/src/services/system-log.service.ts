import type { Database } from "../db/client";
import type { PaginatedResponse } from "../models/common.model";
import type { SystemLogResponse } from "../models/system-log.model";
import { createSystemLogRepository } from "../repositories/system-log.repository";

// ── Service type ──────────────────────────────────────────────────────────────

export type SystemLogService = ReturnType<typeof createSystemLogService>;

// ── Factory ───────────────────────────────────────────────────────────────────

export function createSystemLogService(db: Database) {
  const repo = createSystemLogRepository(db);

  return {
    async listLogs(
      filters?: { userId?: string },
      page = 1,
      pageSize = 20,
    ): Promise<PaginatedResponse<SystemLogResponse>> {
      const [records, total] = await Promise.all([
        repo.findPage(filters, { limit: pageSize, offset: (page - 1) * pageSize }),
        repo.count(filters),
      ]);
      return {
        data: records,
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    },

    async createLog(userId: string, note: string): Promise<void> {
      await repo.create({ userId, note });
    },
  };
}
