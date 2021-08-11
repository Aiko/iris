import { MessageID } from "../post-office/types";

export default interface MessageQueue {
  readonly pending: MessageID[]
  consume(): Promise<boolean>
  queue(...mids: MessageID[]): void
}