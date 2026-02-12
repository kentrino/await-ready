import { runMain } from "citty";
import { debug } from "node:util";

import { args, Args, defineCommand } from "./cli";
import { StatusCode } from "./ConnectionStatus";
import { ExitCode, toExitCode } from "./ExitCode";
import { createOutput } from "./output";
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
      "Starting with host=%s port=%d timeout=%dms protocol=%s interval=%dms output=%s",
      context.args.host,
      context.args.port,
      context.args.timeout,
      context.args.protocol,
      context.args.interval,
      context.args.output,
    );

    const output = createOutput(context.args.output);
    output.onStart(context.args.host, context.args.port);
    const start = Date.now();

    const res = await poll({
      host: context.args.host,
      port: context.args.port,
      timeout: context.args.timeout,
      protocol: context.args.protocol,
      interval: context.args.interval,
      waitForDns: context.args["wait-for-dns"],
      onRetry: (attempt, elapsedMs) => output.onRetry(attempt, elapsedMs),
    });

    const elapsed = Date.now() - start;

    if (res.code !== StatusCode.CONNECTED) {
      output.onFailure(res.message, elapsed);
      output.dispose();
      process.exit(toExitCode(res));
    }
    output.onSuccess(context.args.host, context.args.port, elapsed);
    output.dispose();
    process.exit(ExitCode.SUCCESS);
  },
});

runMain(main);
