import { expect, it, vi } from "@effect/vitest";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { ProjectId, ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as ServerSettings from "../serverSettings.ts";
import * as TextGeneration from "../textGeneration/TextGeneration.ts";
import * as ProjectStore from "./ProjectStore.ts";
import * as ThreadManagement from "./ThreadManagementService.ts";
import * as ThreadGroupNameSuggestion from "./ThreadGroupNameSuggestionService.ts";

const projectId = ProjectId.make("project:group-name");
const firstThreadId = ThreadId.make("thread:group-name:first");
const secondThreadId = ThreadId.make("thread:group-name:second");

it.effect("suggests a trimmed, 64-character name from member thread titles", () => {
  let otherProject = false;
  const generateThreadTitle = vi.fn(() =>
    Effect.succeed({ title: `  ${"A suggested group name ".repeat(5)}  ` }),
  );
  const layer = ThreadGroupNameSuggestion.layer.pipe(
    Layer.provide(
      Layer.mergeAll(
        Layer.mock(ThreadManagement.ThreadManagementService)({
          getThreadShell: (threadId) =>
            Effect.succeed({
              projectId:
                otherProject && threadId === secondThreadId
                  ? ProjectId.make("project:other")
                  : projectId,
              worktreePath: null,
              title: threadId === firstThreadId ? "Fix sign in" : "Add password reset",
            } as never),
        }),
        Layer.mock(ProjectStore.ProjectStoreV2)({
          get: () => Effect.succeedSome({ title: "Account app", workspaceRoot: "/repo" } as never),
        }),
        ServerSettings.layerTest({}),
        Layer.mock(TextGeneration.TextGeneration)({ generateThreadTitle }),
        NodeServices.layer,
      ),
    ),
  );

  return Effect.gen(function* () {
    const service = yield* ThreadGroupNameSuggestion.ThreadGroupNameSuggestionService;
    const result = yield* service.suggest({ threadIds: [firstThreadId, secondThreadId] });
    expect(result.name.length).toBeLessThanOrEqual(64);
    expect(result.name.length).toBeGreaterThan(0);
    expect(result.name).toBe(result.name.trim());
    expect(result.name).not.toMatch(/[\r\n]/u);
    expect(generateThreadTitle).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: "/repo",
        projectId,
        projectTitle: "Account app",
        message: "Member thread titles:\n- Fix sign in\n- Add password reset",
        instructions: expect.stringContaining("shared folder name"),
      }),
    );
    otherProject = true;
    const error = yield* service
      .suggest({ threadIds: [firstThreadId, secondThreadId] })
      .pipe(Effect.flip);
    expect(error.message).toContain("one project");
    expect(generateThreadTitle).toHaveBeenCalledTimes(1);
  }).pipe(Effect.provide(layer));
});
