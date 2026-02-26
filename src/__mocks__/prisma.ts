import { vi } from "vitest";

export const prisma = {
  project: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  adminUser: {
    findUnique: vi.fn(),
  },
};
