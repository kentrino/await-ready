import type { Socket } from "node:net";

export type IfEquals<X, Y, A = X, B = never> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? A : B;

const __statusCode = {
  CONNECTED: undefined,
  TIMEOUT: undefined,
  HOST_NOT_FOUND: undefined,
  UNKNOWN: undefined,
  PROTOCOL_NOT_SUPPORTED: undefined,
  INVALID_PROTOCOL: undefined,
  __SHOULD_USE_IP_V4: undefined,
  __SOCKET_CONNECTED: undefined,
  __ECONNREFUSED: undefined,
  __EACCES: undefined,
  __ECONNRESET: undefined,
  __ENOTFOUND: undefined,
  __NO_DATA_RECEIVED: undefined,
  __UNKNOWN_PING_ERROR: undefined,
} as const;

export const StatusCode = {
  CONNECTED: "CONNECTED",
  TIMEOUT: "TIMEOUT",
  HOST_NOT_FOUND: "HOST_NOT_FOUND",
  UNKNOWN: "UNKNOWN",
  PROTOCOL_NOT_SUPPORTED: "PROTOCOL_NOT_SUPPORTED",
  INVALID_PROTOCOL: "INVALID_PROTOCOL",
  __SHOULD_USE_IP_V4: "__SHOULD_USE_IP_V4",
  __SOCKET_CONNECTED: "__SOCKET_CONNECTED",
  __ECONNREFUSED: "__ECONNREFUSED",
  __EACCES: "__EACCES",
  __ECONNRESET: "__ECONNRESET",
  __ENOTFOUND: "__ENOTFOUND",
  __NO_DATA_RECEIVED: "__NO_DATA_RECEIVED",
  __UNKNOWN_PING_ERROR: "__UNKNOWN_PING_ERROR",
} as const satisfies {
  [K in keyof typeof __statusCode]: `${K}`;
};

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
  | typeof StatusCode.HOST_NOT_FOUND
  | typeof StatusCode.__SOCKET_CONNECTED
  | typeof StatusCode.__SHOULD_USE_IP_V4
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
    s.code === StatusCode.__SHOULD_USE_IP_V4 ||
    s.code === StatusCode.__ECONNREFUSED ||
    s.code === StatusCode.__EACCES ||
    s.code === StatusCode.__ECONNRESET ||
    s.code === StatusCode.__ENOTFOUND
  );
}
