// oxlint-disable no-await-in-loop
import { debug } from "node:util";

import type { Protocol } from "./types/Protocol";

import { ConnectionStatus } from "./ConnectionStatus";
import { createConnection } from "./createConnection";
import { DEFAULT_PING_TIMEOUT, ping } from "./protocols";
import { err, isErr, isOk, type Result } from "./result/Result";
import { delay } from "./util/delay";

const log = debug("await-ready:poll");

export async function poll(params: PollParams): Promise<Result<undefined, ConnectionStatus>> {
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
    if (isOk(result)) {
      log("Success on attempt %d", retryContext.attempt);
      return result;
    }
    retryContext = next({
      ...retryContext,
      lastStatus: result.error,
    });
    log("Attempt %d failed: %s", retryContext.attempt, result.error);
    if (!retryContext.shouldRetry) {
      log("Giving up after %d attempts (%dms)", retryContext.attempt, Date.now() - start);
      return result;
    }
    if (Date.now() - start > params.timeout) {
      log("Timeout after %d attempts (%dms)", retryContext.attempt, Date.now() - start);
      return err(ConnectionStatus.TIMEOUT);
    }
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
    retryContext.shouldUseIPV4 || retryContext.lastStatus === ConnectionStatus.SHOULD_USE_IP_V4;
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
  const shouldRetry =
    retryContext.lastStatus === ConnectionStatus.SHOULD_RETRY ||
    retryContext.lastStatus === ConnectionStatus.SHOULD_USE_IP_V4;
  return {
    shouldUseIPV4,
    attempt,
    defaultInterval: retryContext.defaultInterval,
    ipVersion,
    nextInterval,
    shouldRetry,
  };
}

async function once(
  params: PollParams & { ipVersion: 4 | 6 },
): Promise<Result<undefined, ConnectionStatus>> {
  const socketResult = await createConnection({
    host: params.host,
    port: params.port,
    timeout: params.timeout,
    waitForDns: params.waitForDns,
    ipVersion: params.ipVersion,
  });
  if (isErr(socketResult)) {
    return socketResult;
  }
  const pingRes = await ping(params.protocol, {
    socket: socketResult.value,
    pingTimeout: DEFAULT_PING_TIMEOUT,
  });
  return pingRes;
}

type PollParams = {
  timeout: number;
  host: string;
  port: number;
  interval: number;
  waitForDns: boolean;
  protocol: Protocol;
};
