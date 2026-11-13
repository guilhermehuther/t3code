import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import {
  SuggestThreadGroupNameError,
  type SuggestThreadGroupNameInput,
  type SuggestThreadGroupNameResult,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";

import * as ServerSettings from "../serverSettings.ts";
import * as TextGeneration from "../textGeneration/TextGeneration.ts";
import * as ProjectStore from "./ProjectStore.ts";
import * as ThreadManagementService from "./ThreadManagementService.ts";

export class ThreadGroupNameSuggestionService extends Context.Service<
  ThreadGroupNameSuggestionService,
  {
    readonly suggest: (
      input: SuggestThreadGroupNameInput,
    ) => Effect.Effect<SuggestThreadGroupNameResult, SuggestThreadGroupNameError>;
  }
>()("t3/orchestration-v2/ThreadGroupNameSuggestionService") {}

const make = Effect.gen(function* () {
  const threads = yield* ThreadManagementService.ThreadManagementService;
  const projects = yield* ProjectStore.ProjectStoreV2;
  const serverSettings = yield* ServerSettings.ServerSettingsService;
  const textGeneration = yield* TextGeneration.TextGeneration;
  const fileSystem = yield* FileSystem.FileSystem;

  const suggest: ThreadGroupNameSuggestionService["Service"]["suggest"] = Effect.fn(
    "ThreadGroupNameSuggestionService.suggest",
  )(function* (input) {
    const threadIds = [...new Set(input.threadIds)];
    const members = yield* Effect.forEach(threadIds, (threadId) =>
      threads
        .getThreadShell(threadId)
        .pipe(
          Effect.mapError(
            () => new SuggestThreadGroupNameError({ message: "Could not load the member thread." }),
          ),
        ),
    );
    const existingMembers = members.filter((member) => member !== null);
    if (existingMembers.length !== members.length) {
      return yield* new SuggestThreadGroupNameError({
        message: "A member thread no longer exists.",
      });
    }
    const thread = existingMembers[0];
    if (thread === undefined) {
      return yield* new SuggestThreadGroupNameError({ message: "A member thread is required." });
    }
    if (existingMembers.some((member) => member.projectId !== thread.projectId)) {
      return yield* new SuggestThreadGroupNameError({
        message: "Group members must belong to one project.",
      });
    }
    const project = yield* projects
      .get(thread.projectId)
      .pipe(
        Effect.mapError(
          () => new SuggestThreadGroupNameError({ message: "Could not load the member project." }),
        ),
      );
    if (Option.isNone(project)) {
      return yield* new SuggestThreadGroupNameError({
        message: "The member project no longer exists.",
      });
    }

    const settings = resolveProjectSettings(
      yield* serverSettings.getSettings.pipe(
        Effect.mapError(
          () =>
            new SuggestThreadGroupNameError({
              message: "Could not load text generation settings.",
            }),
        ),
      ),
      thread.projectId,
    ).settings;
    const worktreeExists =
      thread.worktreePath !== null &&
      (yield* fileSystem.exists(thread.worktreePath).pipe(Effect.orElseSucceed(() => false)));
    // shortcut: only the first 12 KB of member titles are sent; raise it if larger groups need richer context.
    const result = yield* textGeneration
      .generateThreadTitle({
        cwd: worktreeExists ? thread.worktreePath! : project.value.workspaceRoot,
        message: `Member thread titles:\n${existingMembers
          .map((member) => `- ${member.title.trim().slice(0, 200)}`)
          .join("\n")
          .slice(0, 12_000)}`,
        projectTitle: project.value.title,
        instructions: [
          settings.threadTitleInstructions,
          "Suggest a short, descriptive shared folder name based on the member thread titles. Return only the name.",
        ]
          .filter(Boolean)
          .join("\n\n"),
        modelSelection: settings.textGenerationModelSelection,
        projectId: thread.projectId,
      })
      .pipe(
        Effect.mapError(
          () => new SuggestThreadGroupNameError({ message: "Group name generation failed." }),
        ),
      );
    const name = result.title.replace(/\s+/gu, " ").trim().slice(0, 64).trimEnd() || "New group";
    return { name };
  });

  return ThreadGroupNameSuggestionService.of({ suggest });
});

export const layer = Layer.effect(ThreadGroupNameSuggestionService, make);
