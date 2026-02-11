import { runMain } from "citty";
// oxlint-disable-next-line import/no-named-as-default
import consola from "consola";
import { debug } from "node:util";
import * as z from "zod";

import { defineCommand } from "./defineCommand";
import { ExitCode, toExitCode } from "./ExitCode";
import { poll } from "./poll";
import { isErr } from "./result/Result";
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
      default: "none",
      options: Protocol.options,
      required: false,
    },
    interval: {
      type: "string",
      default: "1000",
      description: "The interval in milliseconds",
      required: false,
    },
    ["wait-for-dns"]: {
      type: "boolean",
      default: false,
      description:
        "Do not fail on ENOTFOUND, meaning you can wait for DNS record creation. Default is false.",
      required: false,
    },
  },
  validator: z.object({
    host: z.string(),
    port: z.string().transform(Number),
    timeout: z.string().transform(Number),
    protocol: Protocol,
    interval: z.string().transform(Number).pipe(z.number().min(10)),
    ["wait-for-dns"]: z.boolean(),
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
    const res = await poll({
      host: context.args.host,
      port: context.args.port,
      timeout: context.args.timeout,
      protocol: context.args.protocol,
      interval: context.args.interval,
      waitForDns: context.args["wait-for-dns"],
    });
    if (isErr(res)) {
      process.exit(toExitCode(res.error));
    }
    consola.success(`Service is ready at ${context.args.host}:${context.args.port}`);
    process.exit(ExitCode.SUCCESS);
  },
});

runMain(main);
