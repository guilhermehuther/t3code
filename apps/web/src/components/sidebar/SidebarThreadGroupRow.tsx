import { useEffect, useRef } from "react";

function FolderGlyph() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0 text-info" viewBox="0 0 20 16" fill="none">
      <path
        d="M1 3.25A1.75 1.75 0 0 1 2.75 1.5h4.1l1.7 1.8h8.7A1.75 1.75 0 0 1 19 5.05v8.2A1.75 1.75 0 0 1 17.25 15H2.75A1.75 1.75 0 0 1 1 13.25v-10Z"
        fill="currentColor"
        opacity=".82"
      />
      <path
        d="M1.3 5.1h17.4v8.15a1.4 1.4 0 0 1-1.4 1.4H2.7a1.4 1.4 0 0 1-1.4-1.4V5.1Z"
        fill="currentColor"
      />
      <path d="M2.1 5.2h15.8" stroke="currentColor" strokeOpacity=".45" strokeWidth=".7" />
    </svg>
  );
}

export function SidebarThreadGroupRow(props: {
  name: string;
  onOpen: () => void;
  editingName?: string | undefined;
  onEditingNameChange?: (name: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);
  const editing = props.editingName !== undefined;

  // Focus and select the newly created folder name in the DOM when inline edit mounts.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync
  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  return (
    <li className="group/thread-folder flex h-8 min-w-0 items-center rounded-md px-2 hover:bg-sidebar-row-hover focus-within:bg-sidebar-row-hover">
      {editing ? (
        <>
          <FolderGlyph />
          {/* Shared Input is sized for form fields; this editor must fit the compact 32px sidebar row. */}
          <input
            ref={inputRef}
            aria-label="New group name"
            className="h-6 min-w-0 flex-1 rounded-sm border border-info/70 bg-sidebar px-1 text-sm text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info"
            maxLength={64}
            value={props.editingName}
            onPointerDown={(event) => event.stopPropagation()}
            onFocus={() => {
              finishedRef.current = false;
            }}
            onBlur={() => {
              if (finishedRef.current || !props.editingName?.trim()) return;
              finishedRef.current = true;
              props.onCommitRename?.();
            }}
            onChange={(event) => {
              finishedRef.current = false;
              props.onEditingNameChange?.(event.target.value);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (event.key === "Enter") {
                event.preventDefault();
                if (finishedRef.current || !props.editingName?.trim()) return;
                finishedRef.current = true;
                props.onCommitRename?.();
              } else if (event.key === "Escape") {
                event.preventDefault();
                finishedRef.current = true;
                props.onCancelRename?.();
              }
            }}
          />
        </>
      ) : (
        <button
          type="button"
          aria-label={`Open group ${props.name}`}
          className="flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info"
          onClick={props.onOpen}
        >
          <FolderGlyph />
          <span className="block truncate">{props.name}</span>
        </button>
      )}
    </li>
  );
}
