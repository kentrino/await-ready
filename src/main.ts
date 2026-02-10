import { runMain } from "citty";
// oxlint-disable-next-line import/no-named-as-default
import consola from "consola";
import { debug } from "node:util";
import * as z from "zod";

import { ConnectionStatus } from "./ConnectionStatus";
import { createConnection } from "./createConnection";
import { defineCommand } from "./defineCommand";
import { poll, type RetryStrategy } from "./poll";
import { ping } from "./protocols";
import { isErr, ok, type Result } from "./result/Result";
import { Protocol } from "./types/Protocol";

export const main = defineCommand({
  meta: {
    name: "await-ready",
    version: "0.0.1",
    description: "Check if a service is ready",
  },
  args: {
    host: {
      type: "string",
      default: "localhost",
      description: "The host to connect to",
    },
    port: {
      type: "string",
      alias: "p",
      description: "The port to connect to",
      required: true,
    },
    timeout: {
      type: "string",
      default: "10000",
      description: "The timeout in milliseconds",
      required: false,
    },
    protocol: {
      type: "enum",
      options: Protocol.options,
      required: true,
    },
    interval: {
      type: "string",
      default: "1000",
      description: "The interval in milliseconds",
      required: false,
    },
  },
  validator: z.object({
    host: z.string(),
    port: z.string().transform(Number),
    timeout: z.string().transform(Number),
    protocol: Protocol,
    interval: z.string().transform(Number).pipe(z.number().min(10)),
  }),
  run: async (context) => {
    const log = debug("await-ready:main");
    log(
      "Starting with host=%s port=%d timeout=%dms protocol=%s interval=%dms",
      context.args.host,
      context.args.port,
      context.args.timeout,
      context.args.protocol,
      context.args.interval,
    );
    type RetryContext = {
      ipVersion: 4 | 6;
      waitForDns: boolean;
    };
    const retryStrategy: RetryStrategy<ConnectionStatus, RetryContext> = (res, retryContext) => {
      if (res.error === ConnectionStatus.SWITCH_IP_V4) {
        return {
          ...retryContext,
          ipVersion: 6,
        };
      }
      if (res.error === ConnectionStatus.WAITING_FOR_DNS) {
        return {
          ...retryContext,
          waitForDns: true,
        };
      }
      if (res.error === ConnectionStatus.SHOULD_RETRY) {
        return retryContext;
      }
      return undefined;
    };

    const res = await poll(
      async (): Promise<Result<undefined, ConnectionStatus>> => {
        const res = await createConnection({
          host: context.args.host,
          port: context.args.port,
          timeout: context.args.timeout,
          ipVersion: 4,
          waitForDns: false,
        });
        if (isErr(res)) {
          return res;
        }
        const _ = await ping(context.args.protocol, {
          socket: res.value,
          timeout: context.args.timeout,
        });
        return ok();
      },
      {
        timeout: context.args.timeout,
        initialContext: {
          ipVersion: 4 as const,
          waitForDns: false,
        },
        interval: context.args.interval,
        retryStrategy,
      },
    );
    if (isErr(res)) {
      consola.error(res);
      process.exit(1);
    }
    consola.success(`Service is ready at ${context.args.host}:${context.args.port}`);
    process.exit(0);
  },
});

runMain(main);
