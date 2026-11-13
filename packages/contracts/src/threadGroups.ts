import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";

export const ThreadGroupName = TrimmedNonEmptyString.check(Schema.isMaxLength(64));
export const ThreadGroupPath = Schema.Array(ThreadGroupName).check(Schema.isMaxLength(32));
export const StoredThreadGroupPath = Schema.Array(Schema.String.check(Schema.isMaxLength(64)))
  .check(Schema.isMaxLength(32))
  .pipe(Schema.catchDecoding(() => Effect.succeedSome([])));
