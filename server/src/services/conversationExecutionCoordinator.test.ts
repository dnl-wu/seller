import { describe, expect, it } from "vitest";
import { InMemoryConversationExecutionCoordinator } from "./conversationExecutionCoordinator.js";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function nextTick(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("InMemoryConversationExecutionCoordinator", () => {
  it("serializes operations for the same conversation", async () => {
    const coordinator = new InMemoryConversationExecutionCoordinator();
    const first = deferred();
    const order: string[] = [];

    const firstRun = coordinator.runExclusive("conv-1", async () => {
      order.push("first:start");
      await first.promise;
      order.push("first:end");
    });
    const secondRun = coordinator.runExclusive("conv-1", async () => {
      order.push("second:start");
    });

    await nextTick();
    expect(order).toEqual(["first:start"]);

    first.resolve();
    await Promise.all([firstRun, secondRun]);
    expect(order).toEqual(["first:start", "first:end", "second:start"]);
  });

  it("allows different conversations to run concurrently", async () => {
    const coordinator = new InMemoryConversationExecutionCoordinator();
    const first = deferred();
    const order: string[] = [];

    const firstRun = coordinator.runExclusive("conv-1", async () => {
      order.push("first:start");
      await first.promise;
    });
    const secondRun = coordinator.runExclusive("conv-2", async () => {
      order.push("second:start");
    });

    await nextTick();
    expect(order).toEqual(["first:start", "second:start"]);
    first.resolve();
    await Promise.all([firstRun, secondRun]);
  });

  it("releases the conversation after a failure", async () => {
    const coordinator = new InMemoryConversationExecutionCoordinator();

    await expect(
      coordinator.runExclusive("conv-1", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    await expect(coordinator.runExclusive("conv-1", async () => "ok")).resolves.toBe("ok");
  });
});
