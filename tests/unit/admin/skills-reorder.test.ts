import { beforeEach, describe, expect, it, vi } from "vitest";

// Group-scoped reorder (SPEC §9.7): a submission may only reorder the skills of ONE group; ids from
// another group, missing ids and repeated ids are rejected before anything is written.
const batch = vi.fn(async () => []);
const update = vi.fn(() => ({ set: () => ({ where: () => ({}) }) }));
let groupRows: { id: string }[] = [];

vi.mock("@/server/db/client", () => ({
  db: {
    select: () => ({ from: () => ({ where: async () => groupRows }) }),
    update,
    batch,
  },
}));
vi.mock("@/server/cache", () => ({ invalidateContent: vi.fn() }));

const GROUP = "11111111-1111-4111-8111-111111111111";
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTHER_GROUP_SKILL = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const { reorderGroupSkills } = await import("@/server/admin/skills");

describe("reorderGroupSkills", () => {
  beforeEach(() => {
    batch.mockClear();
    update.mockClear();
    groupRows = [{ id: A }, { id: B }];
  });

  it("writes the new order when the ids are exactly the group's skills", async () => {
    const result = await reorderGroupSkills("t", GROUP, [B, A]);
    expect(result.ok).toBe(true);
    expect(batch).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["an id from another group", [A, OTHER_GROUP_SKILL]],
    ["a missing id", [A]],
    ["a repeated id", [A, A]],
    ["an extra id", [A, B, OTHER_GROUP_SKILL]],
  ])("rejects %s and writes nothing", async (_name, ids) => {
    const result = await reorderGroupSkills("t", GROUP, ids);
    expect(result.ok).toBe(false);
    expect(batch).not.toHaveBeenCalled();
  });

  it("rejects malformed input without touching the DB", async () => {
    expect((await reorderGroupSkills("t", "nope", [A])).ok).toBe(false);
    expect((await reorderGroupSkills("t", GROUP, "x")).ok).toBe(false);
    expect(batch).not.toHaveBeenCalled();
  });
});
