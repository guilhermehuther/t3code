import { describe, expect, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import { StoredThreadGroupPath, ThreadGroupPath } from "./threadGroups.ts";

const decodeStoredPath = Schema.decodeUnknownSync(StoredThreadGroupPath);
const decodePath = Schema.decodeUnknownSync(ThreadGroupPath);

describe("thread group paths", () => {
  it("bounds mutation depth and falls back safely for malformed stored paths", () => {
    expect(decodePath(["Work", "Planning"])).toEqual(["Work", "Planning"]);
    expect(() => decodePath(Array.from({ length: 33 }, () => "nested"))).toThrow();
    expect(decodeStoredPath(Array.from({ length: 33 }, () => "nested"))).toEqual([]);
  });
});
