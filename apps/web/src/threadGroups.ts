export function folderPathForDrop(
  targetPath: readonly string[],
  suggestedName: string,
  existingPaths: ReadonlyArray<readonly string[]>,
): string[] | null {
  if (targetPath.length >= 32) return null;
  const normalizedName = suggestedName.replace(/\s+/g, " ").trim() || "New group";
  const name = normalizedName.slice(0, 64).trimEnd();
  const siblingNames = new Set(
    existingPaths
      .filter(
        (path) =>
          path.length > targetPath.length &&
          targetPath.every((part, index) => path[index] === part),
      )
      .map((path) => path[targetPath.length]),
  );
  let uniqueName = name;
  for (let suffix = 2; siblingNames.has(uniqueName); suffix++) {
    const marker = ` (${suffix})`;
    uniqueName = `${name.slice(0, 64 - marker.length).trimEnd()}${marker}`;
  }
  return [...targetPath, uniqueName];
}

export function moveOutOfFolder(groupPath: readonly string[]): string[] {
  return groupPath.slice(0, -1);
}

export function isCenterDrop(
  activeCenterY: number,
  targetTop: number,
  targetHeight: number,
): boolean {
  return (
    activeCenterY >= targetTop + targetHeight * 0.25 &&
    activeCenterY <= targetTop + targetHeight * 0.75
  );
}

export function renameGroupPath(
  path: readonly string[],
  groupPath: readonly string[],
  name: string,
): string[] {
  const trimmed = name.trim();
  return trimmed !== "" &&
    groupPath.length > 0 &&
    path.length >= groupPath.length &&
    groupPath.every((part, index) => path[index] === part)
    ? [...path.slice(0, groupPath.length - 1), trimmed, ...path.slice(groupPath.length)]
    : [...path];
}

export function threadsInGroup<T extends { readonly groupPath?: readonly string[] }>(
  threads: readonly T[],
  currentPath: readonly string[],
): { readonly folders: readonly string[]; readonly threads: readonly T[] } {
  const folders = new Set<string>();
  const members: T[] = [];
  for (const thread of threads) {
    const path = thread.groupPath ?? [];
    if (!currentPath.every((part, index) => path[index] === part)) continue;
    if (path.length === currentPath.length) members.push(thread);
    else folders.add(path[currentPath.length]!);
  }
  return { folders: [...folders].toSorted((a, b) => a.localeCompare(b)), threads: members };
}
