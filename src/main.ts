import { runMain } from "citty";
// oxlint-disable-next-line import/no-named-as-default
import consola from "consola";
import { debug } from "node:util";

import { args, Args } from "./arguments";
import { StatusCode } from "./ConnectionStatus";
import { defineCommand } from "./defineCommand";
import { ExitCode, toExitCode } from "./ExitCode";
import { poll } from "./poll";

export const main = defineCommand({
  meta: {
    name: "await-ready",
    version: "0.0.1",
    description: "Check if a service is ready",
  },
  args,
  validator: Args,
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
    if (res.code !== StatusCode.CONNECTED) {
      process.exit(toExitCode(res));
    }
    consola.success(`Service is ready at ${context.args.host}:${context.args.port}`);
    process.exit(ExitCode.SUCCESS);
  },
});

runMain(main);
