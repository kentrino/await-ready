import type { AwaitReadyResult } from "./AwaitReadyResult";

import { StatusCode } from "./ConnectionStatus";
import { poll } from "./poll";

export type AwaitReadyParams = {
  host: string;
  port: number;
  timeout: number;
  protocol: "http" | "https" | "postgresql" | "mysql" | "redis" | "none";
  interval: number;
  path: string | undefined;
  waitForDns?: boolean;
  /** Called after a failed attempt, right before the retry delay. */
  onRetry?: (attempt: number, elapsedMs: number) => void;
};

export async function awaitReady({
  waitForDns = false,
  interval = 500,
  timeout = 10_000,
  ...params
}: AwaitReadyParams): Promise<AwaitReadyResult<{}>> {
  const res = await poll({ ...params, waitForDns, interval, timeout });
  if (res.code === StatusCode.CONNECTED) {
    return { success: true, value: {} };
  }
  if (res.code === StatusCode.TIMEOUT) {
    return { success: false, error: { type: "TimeoutError", message: res.message } };
  }
  if (res.code === StatusCode.HOST_NOT_FOUND) {
    return { success: false, error: { type: "HostNotFoundError", message: res.message } };
  }
  if (res.code === StatusCode.INVALID_PROTOCOL) {
    return { success: false, error: { type: "InvalidProtocolError", message: res.message } };
  }
  return { success: false, error: { type: "UnknownError", message: res.message } };
}
