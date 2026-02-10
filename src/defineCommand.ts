import {
  defineCommand as defineCommandCitty,
  type ArgsDef,
  type CommandDef,
  type CommandContext,
} from "citty";
// oxlint-disable-next-line import/no-named-as-default
import consola from "consola";
import { z } from "zod";

import { ExitCode } from "./ExitCode";

export function defineCommand<Z extends z.ZodType, const T extends ArgsDef = ArgsDef>(
  def: Omit<CommandDef<T>, "run"> & {
    validator: Z;
    run: (context: ZodCommandContext<Z, T>) => Promise<void>;
  },
) {
  return defineCommandCitty({
    ...def,
    run: async (context: CommandContext<T>) => {
      const parsed = def.validator.safeParse(context.args);
      if (!parsed.success) {
        consola.error(z.prettifyError(parsed.error));
        process.exit(ExitCode.VALIDATION_ERROR);
      }
      const zodContext: ZodCommandContext<Z, T> = {
        ...context,
        args: parsed.data,
      };
      return def.run?.(zodContext);
    },
  });
}

type ZodCommandContext<Z extends z.ZodType, T extends ArgsDef = ArgsDef> = {
  rawArgs: string[];
  args: z.output<Z>;
  cmd: CommandDef<T>;
  subCommand?: CommandDef<T>;
  data?: any;
};
