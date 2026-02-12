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

const log = debug("await-ready:awaitReady");

export async function poll(params: PollParams): Promise<PollStatus> {
  let start = Date.now();
  let retryContext: RetryContext = {
    attempt: 1,
    defaultInterval: params.interval,
    ipVersion: 4,
    nextInterval: params.interval,
    shouldRetry: true,
    ipv4NotFound: false,
    ipv6NotFound: false,
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

    // Both address families returned ENOTFOUND/EADDRNOTAVAIL → host is unreachable.
    // With --wait-for-dns we keep retrying (DNS may appear later).
    if (retryContext.ipv4NotFound && retryContext.ipv6NotFound && !params.waitForDns) {
      log("Both IPv4 and IPv6 failed with ENOTFOUND");
      return status(StatusCode.HOST_NOT_FOUND, `Host not found: ${params.host}:${params.port}`);
    }

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
  attempt: number;
  defaultInterval: number;
  ipVersion: 4 | 6;
  nextInterval: number;
  shouldRetry: boolean;
  ipv4NotFound: boolean;
  ipv6NotFound: boolean;
};

function next(
  retryContext: RetryContext & {
    lastStatus?: ConnectionStatus;
  },
): RetryContext {
  const ipv4NotFound =
    retryContext.ipv4NotFound ||
    (retryContext.ipVersion === 4 && retryContext.lastStatus?.code === StatusCode.__ENOTFOUND);
  const ipv6NotFound =
    retryContext.ipv6NotFound ||
    (retryContext.ipVersion === 6 && retryContext.lastStatus?.code === StatusCode.__ENOTFOUND);
  const ipVersion: 4 | 6 = retryContext.ipVersion === 4 ? 6 : 4;
  const attempt = retryContext.attempt + 1;
  // Try IPv6 immediately after IPv4; after IPv6, wait the full interval.
  const nextInterval = retryContext.ipVersion === 4 ? 0 : retryContext.defaultInterval;
  return {
    attempt,
    defaultInterval: retryContext.defaultInterval,
    ipVersion,
    nextInterval,
    shouldRetry: retryContext.lastStatus ? shouldRetry(retryContext.lastStatus) : false,
    ipv4NotFound,
    ipv6NotFound,
  };
}

async function once(params: PollParams & { ipVersion: 4 | 6 }) {
  const result = await createConnection({
    host: params.host,
    port: params.port,
    timeout: params.timeout,
    ipVersion: params.ipVersion,
  });
  if (isSocketConnected(result)) {
    return await ping(params.protocol, {
      socket: result.socket,
      pingTimeout: DEFAULT_PING_TIMEOUT,
      path: params.path,
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
  path?: string;
  /** Called after a failed attempt, right before the retry delay. */
  onRetry?: (attempt: number, elapsedMs: number) => void;
};
