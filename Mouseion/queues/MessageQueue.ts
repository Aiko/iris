import { MessageID } from "../post-office/types";

export default interface MessageQueue {
  readonly pending: MessageID[]
  consume(): Promise<true>
  queue(mids: MessageID[]): void
}