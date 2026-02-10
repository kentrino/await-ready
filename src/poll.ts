// oxlint-disable no-await-in-loop
import { ConnectionStatus } from "./ConnectionStatus";
import { err, isOk, type Failure, type Result } from "./result/Result";
import { delay } from "./util/delay";

export type RetryStrategy<E, C> = (res: Failure<E>, retryContext: C) => C | undefined;

export async function poll<T, C>(
  fn: (retryContext: C) => Promise<Result<T, ConnectionStatus>>,
  {
    timeout,
    interval = 100,
    initialContext,
    retryStrategy,
  }: {
    initialContext: C;
    timeout: number;
    interval?: number;
    retryStrategy: RetryStrategy<ConnectionStatus, C>;
  },
): Promise<Result<T, ConnectionStatus>> {
  let start = Date.now();
  let retryContext = initialContext;
  while (true) {
    const result = await fn(retryContext);
    if (isOk(result)) {
      return result;
    }
    const newRetryContext = retryStrategy(result, retryContext);
    if (newRetryContext === undefined) {
      return result;
    }
    retryContext = newRetryContext;
    if (Date.now() - start > timeout) {
      return err(ConnectionStatus.TIMEOUT);
    }
    await delay(interval);
  }
}
