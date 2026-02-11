import { ConnectionStatus } from "./ConnectionStatus";

/**
 * Exit codes for the CLI tool.
 *
 * | Exit Code | Meaning                              |
 * |-----------|--------------------------------------|
 * | 0         | Connection success                   |
 * | 1         | Timeout                              |
 * | 2         | Validation error (invalid arguments) |
 * | 3         | Unknown error                        |
 * | 4         | Connection error (host not found)    |
 */
export const ExitCode = {
  SUCCESS: 0,
  TIMEOUT: 1,
  VALIDATION_ERROR: 2,
  UNKNOWN_ERROR: 3,
  CONNECTION_ERROR: 4,
} as const;
export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

const connectionStatusToExitCode: Record<ConnectionStatus, ExitCode> = {
  [ConnectionStatus.TIMEOUT]: ExitCode.TIMEOUT,
  [ConnectionStatus.HOST_NOT_FOUND]: ExitCode.CONNECTION_ERROR,
  [ConnectionStatus.UNKNOWN]: ExitCode.UNKNOWN_ERROR,
  [ConnectionStatus.INVALID_PROTOCOL]: ExitCode.UNKNOWN_ERROR,
  [ConnectionStatus.SHOULD_RETRY]: ExitCode.UNKNOWN_ERROR,
  [ConnectionStatus.SHOULD_USE_IP_V4]: ExitCode.UNKNOWN_ERROR,
};

export function toExitCode(status: ConnectionStatus): ExitCode {
  return connectionStatusToExitCode[status] ?? ExitCode.UNKNOWN_ERROR;
}
