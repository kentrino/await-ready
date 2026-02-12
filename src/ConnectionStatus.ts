import type { Socket } from "node:net";

type IfEquals<X, Y, A = X, B = never> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

function createEnum<const T extends readonly string[]>(keys: T): { [K in T[number]]: K } {
  return Object.fromEntries(keys.map((k) => [k, k])) as never;
}

export const StatusCode = createEnum([
  "CONNECTED",
  "TIMEOUT",
  "HOST_NOT_FOUND",
  "UNKNOWN",
  "PROTOCOL_NOT_SUPPORTED",
  "INVALID_PROTOCOL",
  "__SOCKET_CONNECTED",
  "__ECONNREFUSED",
  "__EACCES",
  "__ECONNRESET",
  "__ENOTFOUND",
  "__NO_DATA_RECEIVED",
  "__UNKNOWN_PING_ERROR",
] as const);

export type StatusCode = (typeof StatusCode)[keyof typeof StatusCode];

type StatusWithMessage = {
  message: string;
  cause?: Error;
};

type StatusParams = {
  __SOCKET_CONNECTED: { socket: Socket };
} & {
  [K in StatusCode]: { code: K };
};

export type StatusCodeOf<T extends ConnectionStatus> = T["code"];

export type ConnectionStatus<T extends StatusCode = StatusCode> = StatusWithMessage &
  StatusParams[T];

export function isSocketConnected(
  s: ConnectionStatus,
): s is ConnectionStatus<typeof StatusCode.__SOCKET_CONNECTED> {
  return s.code === StatusCode.__SOCKET_CONNECTED;
}

export function isPollStatus(s: ConnectionStatus): s is PollStatus {
  return (
    s.code === StatusCode.TIMEOUT ||
    s.code === StatusCode.CONNECTED ||
    s.code === StatusCode.HOST_NOT_FOUND ||
    s.code === StatusCode.INVALID_PROTOCOL ||
    s.code === StatusCode.UNKNOWN ||
    s.code === StatusCode.PROTOCOL_NOT_SUPPORTED
  );
}

export type CreateConnectionStatus = ConnectionStatus<
  | typeof StatusCode.TIMEOUT
  | typeof StatusCode.UNKNOWN
  | typeof StatusCode.__SOCKET_CONNECTED
  | typeof StatusCode.__ECONNREFUSED
  | typeof StatusCode.__EACCES
  | typeof StatusCode.__ECONNRESET
  | typeof StatusCode.__ENOTFOUND
>;
export type PingStatus = ConnectionStatus<
  | typeof StatusCode.PROTOCOL_NOT_SUPPORTED
  | typeof StatusCode.CONNECTED
  | typeof StatusCode.INVALID_PROTOCOL
  | typeof StatusCode.__NO_DATA_RECEIVED
  | typeof StatusCode.__UNKNOWN_PING_ERROR
>;
export type PollStatus = ConnectionStatus<
  | typeof StatusCode.TIMEOUT
  | typeof StatusCode.CONNECTED
  | typeof StatusCode.HOST_NOT_FOUND
  | typeof StatusCode.INVALID_PROTOCOL
  | typeof StatusCode.UNKNOWN
  | typeof StatusCode.PROTOCOL_NOT_SUPPORTED
>;

type StatusFnParams<T extends StatusCode> = IfEquals<
  StatusParams[T],
  { code: T },
  [T, string, { cause?: Error }] | [T, string],
  [T, string, { socket: Socket; cause?: Error }]
>;

export function status<T extends StatusCode>(...args: StatusFnParams<T>): ConnectionStatus<T> {
  return { code: args[0], message: args[1], ...args[2] } as unknown as ConnectionStatus<T>;
}

export function shouldRetry(s: ConnectionStatus): boolean {
  return (
    s.code === StatusCode.__NO_DATA_RECEIVED ||
    s.code === StatusCode.__ECONNREFUSED ||
    s.code === StatusCode.__EACCES ||
    s.code === StatusCode.__ECONNRESET ||
    s.code === StatusCode.__ENOTFOUND ||
    s.code === StatusCode.__UNKNOWN_PING_ERROR
  );
}
