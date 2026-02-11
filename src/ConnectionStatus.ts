export const ConnectionStatus = {
  SHOULD_RETRY: "SHOULD_RETRY",
  SHOULD_USE_IP_V4: "SHOULD_USE_IP_V4",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
  HOST_NOT_FOUND: "HOST_NOT_FOUND",
  // TODO
  INVALID_PROTOCOL: "INVALID_PROTOCOL",
} as const;
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];
