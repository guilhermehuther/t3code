import * as Schema from "effect/Schema";

import {
  CommandId,
  IsoDateTime,
  NonNegativeInt,
  ThreadId,
  TrimmedNonEmptyString,
} from "./baseSchemas.ts";
import { ThreadLinkedPullRequest } from "./threadPullRequest.ts";
import { ThreadTitleRegeneration } from "./threadTitle.ts";
import { ThreadGroupPath } from "./threadGroups.ts";

export function hasOnlyPairedSurrogates(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (index + 1 >= value.length || nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) {
        return false;
      }
      index += 1;
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

const ThreadMetadataTitle = TrimmedNonEmptyString.check(Schema.isMaxLength(512)).annotate({
  description: "New concise display title. Required only when action is rename.",
});

const ThreadMetadataClientRequestId = TrimmedNonEmptyString.check(Schema.isMaxLength(256))
  .check(
    Schema.makeFilter((value) =>
      hasOnlyPairedSurrogates(value)
        ? true
        : "clientRequestId must contain valid paired Unicode surrogates.",
    ),
  )
  .annotate({ description: "Stable idempotency key to reuse when retrying this mutation." });

export const ThreadMetadataMcpAction = Schema.Literals([
  "rename",
  "regenerate_title",
  "set_group_path",
]);
export type ThreadMetadataMcpAction = typeof ThreadMetadataMcpAction.Type;

export const ThreadMetadataMcpUpdateInput = Schema.Struct({
  threadId: Schema.optional(ThreadId),
  action: ThreadMetadataMcpAction,
  title: Schema.optional(ThreadMetadataTitle),
  groupPath: Schema.optional(ThreadGroupPath),
  clientRequestId: Schema.optional(ThreadMetadataClientRequestId),
}).check(
  Schema.makeFilter((input) =>
    (input.action === "rename") === (input.title !== undefined) &&
    (input.action === "set_group_path") === (input.groupPath !== undefined)
      ? true
      : "rename requires title; set_group_path requires groupPath.",
  ),
);
export type ThreadMetadataMcpUpdateInput = typeof ThreadMetadataMcpUpdateInput.Type;

export const ThreadMetadataMcpUpdateResult = Schema.Struct({
  threadId: ThreadId,
  action: ThreadMetadataMcpAction,
  commandId: CommandId,
  sequence: NonNegativeInt,
  title: Schema.String,
  titleRegeneration: Schema.NullOr(ThreadTitleRegeneration),
  linkedPullRequest: Schema.NullOr(ThreadLinkedPullRequest),
  updatedAt: IsoDateTime,
});
export type ThreadMetadataMcpUpdateResult = typeof ThreadMetadataMcpUpdateResult.Type;
