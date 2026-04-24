import { describe, expect, vi, beforeEach, afterEach } from "vitest";
import { qaTest } from "../../test/qaTest.js";

describe("lib/toastStore", () => {
  let toastStore;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const mod = await import("../lib/toastStore.js");
    toastStore = mod.toastStore;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  qaTest("lib.toastStore.01", () => {
    const received = [];
    const unsub = toastStore.subscribe((list) => received.push(list));

    const id = toastStore.emit({ message: "Saved!", variant: "success" });

    expect(typeof id).toBe("number");
    expect(received).toHaveLength(1);
    const [list] = received;
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(id);
    expect(list[0].message).toBe("Saved!");
    expect(list[0].variant).toBe("success");
    expect(list[0].exiting).toBe(false);

    unsub();
  });

  qaTest("lib.toastStore.02", () => {
    const calls = [];
    const listener = (list) => calls.push(list);
    const unsub = toastStore.subscribe(listener);

    toastStore.emit({ message: "A" });
    expect(calls).toHaveLength(1);

    unsub();
    toastStore.emit({ message: "B" });
    // Listener was removed — still only 1 call
    expect(calls).toHaveLength(1);
  });

  qaTest("lib.toastStore.03", () => {
    const received = [];
    const unsub = toastStore.subscribe((list) => received.push([...list]));

    const id = toastStore.emit({ message: "Loading...", persistent: true });
    toastStore.update(id, { message: "Done!", variant: "success" });

    expect(received).toHaveLength(2);
    const updated = received[1];
    expect(updated[0].message).toBe("Done!");
    expect(updated[0].variant).toBe("success");
    expect(updated[0].id).toBe(id);

    unsub();
  });

  qaTest("lib.toastStore.04", () => {
    const snapshots = [];
    const unsub = toastStore.subscribe((list) => snapshots.push(list.map((t) => ({ ...t }))));

    const id = toastStore.emit({ message: "Hi", persistent: true });

    // Immediately dismiss — sets exiting:true
    toastStore.dismiss(id);
    const afterDismiss = snapshots.at(-1);
    expect(afterDismiss.find((t) => t.id === id)?.exiting).toBe(true);

    // After 280ms the toast is removed
    vi.advanceTimersByTime(280);
    const afterRemoval = snapshots.at(-1);
    expect(afterRemoval.find((t) => t.id === id)).toBeUndefined();

    unsub();
  });

  qaTest("lib.toastStore.05", () => {
    // Initially empty (fresh module due to resetModules)
    expect(toastStore.getAll()).toHaveLength(0);

    const id = toastStore.emit({ message: "X", persistent: true });
    const all = toastStore.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(id);
  });

  qaTest("lib.toastStore.06", () => {
    const snapshots = [];
    const unsub = toastStore.subscribe((list) => snapshots.push(list.map((t) => ({ ...t }))));

    // Emit as persistent so it does not auto-dismiss immediately
    const id = toastStore.emit({ message: "Loading...", persistent: true });
    expect(snapshots).toHaveLength(1);

    // update() with persistent: false — should schedule auto-dismiss via setTimeout
    toastStore.update(id, { message: "Done!", persistent: false });
    expect(snapshots).toHaveLength(2);
    expect(snapshots.at(-1)[0].message).toBe("Done!");
    expect(snapshots.at(-1)[0].exiting).toBe(false);

    // After 4200ms the auto-dismiss fires → sets exiting: true
    vi.advanceTimersByTime(4200);
    expect(snapshots.at(-1)[0].exiting).toBe(true);

    unsub();
  });
});
