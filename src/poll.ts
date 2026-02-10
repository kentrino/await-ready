// oxlint-disable no-await-in-loop
import { debug } from "node:util";

import { ConnectionStatus } from "./ConnectionStatus";
import { err, isOk, type Failure, type Result } from "./result/Result";
import { delay } from "./util/delay";

export type RetryStrategy<E, C> = (res: Failure<E>, retryContext: C) => C | undefined;

const log = debug("await-ready:poll");

export async function poll<T, C>(
  fn: (retryContext: C) => Promise<Result<T, ConnectionStatus>>,
  {
    timeout,
    interval,
    initialContext,
    retryStrategy,
  }: {
    initialContext: C;
    timeout: number;
    interval: number;
    retryStrategy: RetryStrategy<ConnectionStatus, C>;
  },
): Promise<Result<T, ConnectionStatus>> {
  let start = Date.now();
  let retryContext = initialContext;
  let attempt = 0;
  while (true) {
    attempt++;
    log("Attempt %d (elapsed: %dms)", attempt, Date.now() - start);
    const result = await fn(retryContext);
    if (isOk(result)) {
      log("Success on attempt %d", attempt);
      return result;
    }
    log("Attempt %d failed: %s", attempt, result.error);
    const newRetryContext = retryStrategy(result, retryContext);
    if (newRetryContext === undefined) {
      log("Retry strategy returned undefined, giving up");
      return result;
    }
    retryContext = newRetryContext;
    if (Date.now() - start > timeout) {
      log("Timeout after %d attempts (%dms)", attempt, Date.now() - start);
      return err(ConnectionStatus.TIMEOUT);
    }
    await delay(interval);
  }
}
