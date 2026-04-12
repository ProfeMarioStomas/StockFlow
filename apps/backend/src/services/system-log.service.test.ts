import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRepo } = vi.hoisted(() => ({
  mockRepo: {
    findPage: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock("../repositories/system-log.repository", () => ({
  createSystemLogRepository: () => mockRepo,
}));

// ── Module under test ─────────────────────────────────────────────────────────

import { createSystemLogService } from "./system-log.service";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = "00000000-0000-0000-0000-000000000099";

const logRecord = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: USER_ID,
  note: "POST /api/v1/sales → 201",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockDb = {} as Parameters<typeof createSystemLogService>[0];

beforeEach(() => {
  vi.clearAllMocks();
});

// ── listLogs ──────────────────────────────────────────────────────────────────

describe("listLogs", () => {
  it("returns paginated response with data and meta", async () => {
    mockRepo.findPage.mockResolvedValue([logRecord]);
    mockRepo.count.mockResolvedValue(1);

    const service = createSystemLogService(mockDb);
    const result = await service.listLogs();

    expect(mockRepo.findPage).toHaveBeenCalledOnce();
    expect(mockRepo.count).toHaveBeenCalledOnce();
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.note).toBe("POST /api/v1/sales → 201");
    expect(result.meta.total).toBe(1);
    expect(result.meta.page).toBe(1);
    expect(result.meta.pageSize).toBe(20);
  });

  it("returns empty data array when no logs exist", async () => {
    mockRepo.findPage.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    const service = createSystemLogService(mockDb);
    const result = await service.listLogs();

    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it("passes userId filter to findPage and count", async () => {
    mockRepo.findPage.mockResolvedValue([logRecord]);
    mockRepo.count.mockResolvedValue(1);

    const service = createSystemLogService(mockDb);
    await service.listLogs({ userId: USER_ID });

    expect(mockRepo.findPage).toHaveBeenCalledWith({ userId: USER_ID }, expect.any(Object));
    expect(mockRepo.count).toHaveBeenCalledWith({ userId: USER_ID });
  });
});

// ── createLog ─────────────────────────────────────────────────────────────────

describe("createLog", () => {
  it("calls repo.create with userId and note", async () => {
    mockRepo.create.mockResolvedValue(logRecord);

    const service = createSystemLogService(mockDb);
    await service.createLog(USER_ID, "POST /api/v1/sales → 201");

    expect(mockRepo.create).toHaveBeenCalledWith({
      userId: USER_ID,
      note: "POST /api/v1/sales → 201",
    });
  });
});
