import { describe, expect, it } from "vite-plus/test";
import { folderPathForDrop, isCenterDrop, moveOutOfFolder, threadsInGroup } from "./threadGroups";

describe("thread groups", () => {
  it("avoids sibling folder name collisions", () => {
    expect(
      folderPathForDrop(["Work"], "Planning", [
        ["Work", "Planning"],
        ["Other", "Planning"],
      ]),
    ).toEqual(["Work", "Planning (2)"]);
    expect(
      folderPathForDrop(["Work"], "Planning", [
        ["Work", "Planning"],
        ["Work", "Planning (2)"],
      ]),
    ).toEqual(["Work", "Planning (3)"]);
  });

  it("bounds generated names and nesting", () => {
    expect(folderPathForDrop([], "x".repeat(100), [])?.[0]).toHaveLength(64);
    expect(
      folderPathForDrop(
        Array.from({ length: 32 }, (_, i) => `${i}`),
        "child",
        [],
      ),
    ).toBeNull();
  });

  it("moves a thread out one nested level", () => {
    expect(moveOutOfFolder(["Work", "Planning"])).toEqual(["Work"]);
  });

  it("recognizes only the middle half of a row as a grouping drop", () => {
    expect(isCenterDrop(50, 0, 100)).toBe(true);
    expect(isCenterDrop(10, 0, 100)).toBe(false);
  });

  it("lists only immediate threads and child folders", () => {
    expect(
      threadsInGroup(
        [
          { id: "root" },
          { id: "folder", groupPath: ["Work"] },
          { id: "nested", groupPath: ["Work", "Planning"] },
        ],
        [],
      ),
    ).toEqual({ folders: ["Work"], threads: [{ id: "root" }] });
  });
});
