import { StatusCode, type PollStatus, type StatusCodeOf } from "./ConnectionStatus";

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

const codeToExitCode: Record<StatusCodeOf<PollStatus>, ExitCode> = {
  [StatusCode.CONNECTED]: ExitCode.SUCCESS,
  [StatusCode.TIMEOUT]: ExitCode.TIMEOUT,
  [StatusCode.HOST_NOT_FOUND]: ExitCode.CONNECTION_ERROR,
  [StatusCode.UNKNOWN]: ExitCode.UNKNOWN_ERROR,
  [StatusCode.INVALID_PROTOCOL]: ExitCode.UNKNOWN_ERROR,
  [StatusCode.PROTOCOL_NOT_SUPPORTED]: ExitCode.UNKNOWN_ERROR,
};

export function toExitCode(s: PollStatus): ExitCode {
  return codeToExitCode[s.code];
}
