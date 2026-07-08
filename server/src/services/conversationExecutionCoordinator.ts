export interface ConversationExecutionCoordinator {
  runExclusive<T>(conversationId: string, operation: () => Promise<T>): Promise<T>;
}

export class InMemoryConversationExecutionCoordinator implements ConversationExecutionCoordinator {
  private readonly chains = new Map<string, Promise<void>>();

  async runExclusive<T>(conversationId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(conversationId) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const tail = result.then(
      () => undefined,
      () => undefined,
    );
    this.chains.set(conversationId, tail);
    tail.finally(() => {
      if (this.chains.get(conversationId) === tail) {
        this.chains.delete(conversationId);
      }
    });
    return result;
  }
}

export const conversationExecutionCoordinator =
  new InMemoryConversationExecutionCoordinator();
