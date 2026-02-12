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
  let ctx: RetryContext = {
    attempt: 1,
    interval: params.interval,
    ipVersion: 4,
    ipv4NotFound: false,
    ipv6NotFound: false,
  };
  while (true) {
    log("Attempt %d (elapsed: %dms)", ctx.attempt, Date.now() - start);
    const result = await once({ ...params, ipVersion: ctx.ipVersion });
    if (result.code === StatusCode.CONNECTED) {
      log("Success on attempt %d", ctx.attempt);
      return result;
    }

    ctx = advance(ctx, result);
    log("Attempt %d failed: %s (%s)", ctx.attempt, result.code, result.message);

    // Both address families returned ENOTFOUND/EADDRNOTAVAIL → host is unreachable.
    // With --wait-for-dns we keep retrying (DNS may appear later).
    if (ctx.ipv4NotFound && ctx.ipv6NotFound && !params.waitForDns) {
      log("Both IPv4 and IPv6 failed with ENOTFOUND");
      return status(StatusCode.HOST_NOT_FOUND, `Host not found: ${params.host}:${params.port}`);
    }

    if (!shouldRetry(result)) {
      log("Giving up after %d attempts (%dms)", ctx.attempt, Date.now() - start);
      if (isPollStatus(result)) {
        return result;
      }
      return status(StatusCode.UNKNOWN, "Illegal state");
    }
    if (params.timeout > 0 && Date.now() - start > params.timeout) {
      log("Timeout after %d attempts (%dms)", ctx.attempt, Date.now() - start);
      return status(StatusCode.TIMEOUT, "Connection timed out");
    }
    params.onRetry?.(ctx.attempt, Date.now() - start);
    // Try IPv6 immediately after IPv4; after IPv6, wait the full interval.
    await delay(ctx.ipVersion === 4 ? params.interval : 0);
  }
}

/** Accumulated state across retry attempts. Only real state — no derived values. */
type RetryContext = {
  attempt: number;
  interval: number;
  ipVersion: 4 | 6;
  ipv4NotFound: boolean;
  ipv6NotFound: boolean;
};

function advance(ctx: RetryContext, lastStatus: ConnectionStatus): RetryContext {
  return {
    attempt: ctx.attempt + 1,
    interval: ctx.interval,
    ipVersion: ctx.ipVersion === 4 ? 6 : 4,
    ipv4NotFound:
      ctx.ipv4NotFound || (ctx.ipVersion === 4 && lastStatus.code === StatusCode.__ENOTFOUND),
    ipv6NotFound:
      ctx.ipv6NotFound || (ctx.ipVersion === 6 && lastStatus.code === StatusCode.__ENOTFOUND),
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
