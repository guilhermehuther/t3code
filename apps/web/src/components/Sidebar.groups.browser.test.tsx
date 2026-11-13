import { createMemoryHistory } from "@tanstack/react-router";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page } from "vite-plus/test/browser";

import { AppRoot } from "~/AppRoot";
import "~/index.css";
import "~/components/ChatView";
import { __setClientSettingsForTests } from "~/hooks/useSettings";
import { getRouter } from "~/router";
import {
  ENVIRONMENT_ID,
  dispatchedCommands,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { act, fakeTimers, render } from "../../test/render";

vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});

vi.mock(import("~/rpc/requestLatencyState"), async (original) => ({
  ...(await original()),
  trackRpcRequestSent: () => {},
}));

it("groups active threads when dropped on a row center and highlights the target", async () => {
  using _timers = fakeTimers({ now: 0 });
  await page.viewport(1400, 900);
  const [source, target] = [
    threadWithHistory("group-source", 1),
    threadWithHistory("group-target", 1),
  ];
  const saved = { ...threadWithHistory("saved-group-member", 1), groupPath: ["Saved"] };
  using _environment = installFakeEnvironment([source, target, saved], { acceptCommands: true });
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    boringSidebarEnabled: true,
    sidebarWorkingShelfEnabled: false,
    threadGroupsEnabled: true,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const router = getRouter(
    createMemoryHistory({ initialEntries: [`/${ENVIRONMENT_ID}/${source.id}`] }),
  );
  await router.load();
  const container = document.createElement("div");
  container.id = "root";
  container.style.cssText = "height: 100vh; width: 100vw";
  await using _app = await render(<AppRoot router={router} />, { container, router: false });
  const projectFolder = page.getByRole("button", { name: /^render/ });
  await expect.element(projectFolder).toBeVisible();
  if (projectFolder.element().getAttribute("aria-expanded") !== "true") {
    await projectFolder.click();
  }
  await expect.element(projectFolder).toHaveAttribute("aria-expanded", "true");
  const savedGroup = page.getByRole("button", { name: "Open group Saved" });
  await expect.element(savedGroup).toBeVisible();
  const sourceRow = page.getByTestId("sidebar-row-folder").filter({ hasText: source.title });
  const targetRow = page.getByTestId("sidebar-row-folder").filter({ hasText: target.title });
  const savedRow = page.getByTestId("sidebar-row-folder").filter({ hasText: saved.title });
  await expect.element(sourceRow).toBeVisible();
  await expect.element(targetRow).toBeVisible();
  await vi.advanceTimersByTimeAsync(500);
  const bounds = (element: typeof sourceRow) => element.element().getBoundingClientRect();
  const sourceBounds = bounds(sourceRow);
  const targetBounds = bounds(targetRow);
  const start = {
    x: sourceBounds.left + sourceBounds.width / 2,
    y: sourceBounds.top + sourceBounds.height / 2,
  };
  expect(sourceBounds.height).toBeGreaterThan(0);
  expect(targetBounds.height).toBeGreaterThan(0);
  const end = {
    x: targetBounds.left + targetBounds.width / 2,
    y: targetBounds.top + targetBounds.height / 2,
  };
  const pointer = (type: string, x: number, y: number, pointerId = 2) =>
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId,
      isPrimary: true,
      button: 0,
      buttons: type === "pointerup" ? 0 : 1,
      clientX: x,
      clientY: y,
    });
  await act(() => {
    sourceRow.element().dispatchEvent(pointer("pointerdown", start.x, start.y));
    document.dispatchEvent(pointer("pointermove", end.x, end.y));
  });
  await act(() => document.dispatchEvent(pointer("pointermove", end.x, end.y)));
  await expect.element(targetRow).toHaveAttribute("data-drop-into-group", "true");
  await act(() => document.dispatchEvent(pointer("pointerup", end.x, end.y)));
  await expect
    .poll(
      () =>
        dispatchedCommands().filter(
          (command) => command.type === "thread.metadata.update" && command.groupPath?.length,
        ).length,
    )
    .toBe(2);
  await savedGroup.click();
  await expect.element(savedRow).toBeVisible();
  expect(savedRow.element().textContent).toContain("Saved");
  await router.navigate({ to: "/settings/labs" });
  const groupsToggle = page.getByRole("switch", { name: "Thread groups (experimental)" });
  await expect.element(groupsToggle).toBeChecked();
  await groupsToggle.click();
  await expect.element(groupsToggle).not.toBeChecked();
  router.history.push(`/${ENVIRONMENT_ID}/${source.id}`);
  await router.load();
  await expect.element(sourceRow).toBeVisible();
  await expect.element(savedRow).toBeVisible();
  await vi.advanceTimersByTimeAsync(500);
  expect(sourceRow.element().textContent).not.toContain("Saved");
  expect(savedRow.element().textContent).not.toContain("Saved");
  await expect
    .element(page.getByRole("button", { name: "Open group Saved" }))
    .not.toBeInTheDocument();
  await expect.element(savedRow).toBeVisible();
  expect(savedRow.element().textContent).not.toContain("Saved");
  const disabledTargetBounds = targetRow.element().getBoundingClientRect();
  const disabledSourceBounds = sourceRow.element().getBoundingClientRect();
  const disabledStart = {
    x: disabledSourceBounds.left + disabledSourceBounds.width / 2,
    y: disabledSourceBounds.top + disabledSourceBounds.height / 2,
  };
  const disabledEnd = {
    x: disabledTargetBounds.left + disabledTargetBounds.width / 2,
    y: disabledTargetBounds.top + disabledTargetBounds.height / 2,
  };
  await act(() => {
    sourceRow.element().dispatchEvent(pointer("pointerdown", disabledStart.x, disabledStart.y, 3));
    document.dispatchEvent(pointer("pointermove", disabledEnd.x, disabledEnd.y, 3));
  });
  await act(() => document.dispatchEvent(pointer("pointermove", disabledEnd.x, disabledEnd.y, 3)));
  await expect.element(targetRow).not.toHaveAttribute("data-drop-into-group", "true");
  await act(() => document.dispatchEvent(pointer("pointerup", disabledEnd.x, disabledEnd.y, 3)));
  expect(saved.groupPath).toEqual(["Saved"]);
  expect(
    dispatchedCommands().filter(
      (command) =>
        command.type === "thread.metadata.update" &&
        command.threadId === saved.id &&
        command.groupPath !== undefined,
    ),
  ).toHaveLength(0);
  router.history.push("/settings/general");
  await router.load();
  const workingToggle = page.getByRole("switch", { name: "Working section" });
  await expect.element(workingToggle).not.toBeChecked();
  await workingToggle.click();
  router.history.push("/settings/labs");
  await router.load();
  await expect.element(groupsToggle).toBeDisabled();
  await expect
    .element(page.getByText(/Turn off the Working section in General settings/))
    .toBeVisible();
});
