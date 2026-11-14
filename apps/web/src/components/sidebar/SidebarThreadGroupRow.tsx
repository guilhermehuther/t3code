import { useEffect, useRef, type ReactNode } from "react";

const previewColors = [
  "bg-info/18 text-info-foreground",
  "bg-success/18 text-success-foreground",
  "bg-warning/18 text-warning-foreground",
  "bg-accent text-accent-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-muted text-muted-foreground",
];

function threadInitials(title: string) {
  const words = title.trim().split(/\s+/).filter(Boolean);
  return words.length > 1
    ? `${words[0]![0]}${words[1]![0]}`.toUpperCase()
    : (words[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function SidebarThreadGroupRow(props: {
  name: string;
  previewThreads: ReadonlyArray<{ id: string; title: string; icon?: ReactNode }>;
  onOpen: () => void;
  editingName?: string | undefined;
  onEditingNameChange?: (name: string) => void;
  onCommitRename?: () => void;
  onCancelRename?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finishedRef = useRef(false);
  const editing = props.editingName !== undefined;
  const previews = props.previewThreads.slice(0, 9);

  // Focus and select the newly created folder name in the DOM when inline edit mounts.
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync
  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  return (
    <li className="flex min-h-[108px] min-w-0 items-center justify-center py-1">
      {editing ? (
        <div className="flex w-[88px] flex-col items-center gap-1">
          <div className="grid size-20 grid-cols-3 grid-rows-3 content-start justify-items-start gap-1 rounded-3xl bg-sidebar-control-surface p-2 dark:bg-foreground/12">
            {previews.map((thread, index) => (
              <span
                key={thread.id}
                aria-hidden="true"
                data-group-preview={thread.id}
                className="flex size-3.5 items-center justify-center overflow-hidden rounded-sm"
              >
                {thread.icon ?? (
                  <span
                    className={`flex size-full items-center justify-center text-5xs font-semibold leading-none ${previewColors[index % previewColors.length]}`}
                  >
                    {threadInitials(thread.title)}
                  </span>
                )}
              </span>
            ))}
          </div>
          <input
            ref={inputRef}
            aria-label="New group name"
            className="h-5 w-full min-w-0 rounded-sm border border-info/70 bg-sidebar px-1 text-center text-xs text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info"
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
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Open group ${props.name}`}
          className="flex w-[88px] cursor-pointer flex-col items-center gap-1 rounded-md py-1 text-center text-xs text-sidebar-foreground hover:bg-sidebar-row-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info"
          onClick={props.onOpen}
        >
          <span className="grid size-20 grid-cols-3 grid-rows-3 content-start justify-items-start gap-1 rounded-3xl bg-sidebar-control-surface p-2 dark:bg-foreground/12">
            {previews.map((thread, index) => (
              <span
                key={thread.id}
                aria-hidden="true"
                data-group-preview={thread.id}
                className="flex size-3.5 items-center justify-center overflow-hidden rounded-sm"
              >
                {thread.icon ?? (
                  <span
                    className={`flex size-full items-center justify-center text-5xs font-semibold leading-none ${previewColors[index % previewColors.length]}`}
                  >
                    {threadInitials(thread.title)}
                  </span>
                )}
              </span>
            ))}
          </span>
          <span className="block max-w-full truncate">{props.name}</span>
        </button>
      )}
    </li>
  );
}
