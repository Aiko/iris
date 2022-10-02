import type { MessageID } from "@Mouseion/post-office/types";

export default interface MessageQueue {
  readonly pending: MessageID[]
  consume(): Promise<boolean>
  queue(...mids: MessageID[]): void
}