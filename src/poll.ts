// oxlint-disable no-await-in-loop
import { debug } from "node:util";

import type { Protocol } from "./types/Protocol";

import {
  StatusCode,
  isPollStatus,
  isSocketConnected,
  shouldRetry,
  status,
  type ConnectionStatus,
  type PollStatus,
} from "./ConnectionStatus";
import { createConnection } from "./createConnection";
import { DEFAULT_PING_TIMEOUT, ping } from "./protocols";
import { delay } from "./util/delay";

const log = debug("await-ready:poll");

export async function poll(params: PollParams): Promise<PollStatus> {
  let start = Date.now();
  let retryContext: RetryContext = {
    attempt: 1,
    defaultInterval: params.interval,
    ipVersion: 4,
    nextInterval: params.interval,
    shouldRetry: true,
  };
  while (true) {
    log("Attempt %d (elapsed: %dms)", retryContext.attempt, Date.now() - start);
    const result = await once({ ...params, ipVersion: retryContext.ipVersion });
    if (result.code === StatusCode.CONNECTED) {
      log("Success on attempt %d", retryContext.attempt);
      return result;
    }
    retryContext = next({
      ...retryContext,
      lastStatus: result,
    });
    log("Attempt %d failed: %s (%s)", retryContext.attempt, result.code, result.message);
    if (!retryContext.shouldRetry) {
      log("Giving up after %d attempts (%dms)", retryContext.attempt, Date.now() - start);
      if (isPollStatus(result)) {
        return result;
      }
      return status(StatusCode.UNKNOWN, "Illegal state");
    }
    if (params.timeout > 0 && Date.now() - start > params.timeout) {
      log("Timeout after %d attempts (%dms)", retryContext.attempt, Date.now() - start);
      return status(StatusCode.TIMEOUT, "Connection timed out");
    }
    params.onRetry?.(retryContext.attempt, Date.now() - start);
    await delay(retryContext.nextInterval);
  }
}

type RetryContext = {
  shouldUseIPV4?: boolean;
  attempt: number;
  defaultInterval: number;
  ipVersion: 4 | 6;
  nextInterval: number;
  shouldRetry: boolean;
};

function next(
  retryContext: RetryContext & {
    lastStatus?: ConnectionStatus;
  },
): RetryContext & {
  nextInterval: number;
} {
  const shouldUseIPV4 =
    retryContext.shouldUseIPV4 || retryContext.lastStatus?.code === StatusCode.__SHOULD_USE_IP_V4;
  const ipVersion = ((): 4 | 6 => {
    if (shouldUseIPV4) {
      return 4;
    }
    if (retryContext.ipVersion === 4) {
      return 6;
    }
    return 4;
  })();
  const attempt = retryContext.attempt + 1;
  const nextInterval = (() => {
    if (shouldUseIPV4) {
      return retryContext.defaultInterval;
    }
    // Try IPv6 immediately after executing IPv4
    if (retryContext.ipVersion === 4) {
      return 0;
    }
    // After executing IPv6, use the default interval
    return retryContext.defaultInterval;
  })();
  return {
    shouldUseIPV4,
    attempt,
    defaultInterval: retryContext.defaultInterval,
    ipVersion,
    nextInterval,
    shouldRetry: retryContext.lastStatus ? shouldRetry(retryContext.lastStatus) : false,
  };
}

async function once(params: PollParams & { ipVersion: 4 | 6 }) {
  const result = await createConnection({
    host: params.host,
    port: params.port,
    timeout: params.timeout,
    waitForDns: params.waitForDns,
    ipVersion: params.ipVersion,
  });
  if (isSocketConnected(result)) {
    return await ping(params.protocol, {
      socket: result.socket,
      pingTimeout: DEFAULT_PING_TIMEOUT,
    });
  }
  return result;
}

type PollParams = {
  timeout: number;
  host: string;
  port: number;
  interval: number;
  waitForDns: boolean;
  protocol: Protocol;
  /** Called after a failed attempt, right before the retry delay. */
  onRetry?: (attempt: number, elapsedMs: number) => void;
};
