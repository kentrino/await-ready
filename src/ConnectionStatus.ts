export const ConnectionStatus = {
  SHOULD_RETRY: "SHOULD_RETRY",
  SWITCH_IP_V4: "SWITCH_IP_V4",
  TIMEOUT: "TIMEOUT",
  UNKNOWN: "UNKNOWN",
  HOST_NOT_FOUND: "HOST_NOT_FOUND",
  WAITING_FOR_DNS: "WAITING_FOR_DNS",
  // TODO
  PROTOCOL_ERROR: "PROTOCOL_ERROR",
} as const;
export type ConnectionStatus = (typeof ConnectionStatus)[keyof typeof ConnectionStatus];
