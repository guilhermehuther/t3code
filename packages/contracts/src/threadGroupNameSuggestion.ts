import * as Schema from "effect/Schema";

import { ThreadId } from "./baseSchemas.ts";
import { ThreadGroupName } from "./threadGroups.ts";

export const THREAD_GROUP_NAME_WS_METHOD = "orchestration.suggestThreadGroupName" as const;

export const SuggestThreadGroupNameInput = Schema.Struct({
  threadIds: Schema.Array(ThreadId).check(Schema.isMinLength(1), Schema.isMaxLength(100)),
});
export type SuggestThreadGroupNameInput = typeof SuggestThreadGroupNameInput.Type;

export const SuggestThreadGroupNameResult = Schema.Struct({ name: ThreadGroupName });
export type SuggestThreadGroupNameResult = typeof SuggestThreadGroupNameResult.Type;

export class SuggestThreadGroupNameError extends Schema.TaggedError<SuggestThreadGroupNameError>()(
  "SuggestThreadGroupNameError",
  { message: Schema.String },
) {}
