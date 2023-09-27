export type Maybe<T> = T | null
export type Optional<T> = T | undefined

type log_fn = (...msg: any[]) => void;
export interface Logger {
  log: log_fn
  error: log_fn
  success: log_fn,
  shout: log_fn,
  warn: log_fn
  time: log_fn
  timeEnd: log_fn
}

export type LumberjackEmployer = (label: string) => Logger

export enum Singleton {
  INBOX,
  CALENDAR,
  GOAUTH,
  MSOAUTH,
  SETTINGS,
  TEMPLATES,
}
export enum Multiton {
  COMPOSER,
}
