import type { $ZodIssue } from "zod/v4/core";

import {
  defineCommand as defineCommandCitty,
  showUsage,
  type ArgsDef,
  type CommandContext,
  type CommandDef,
} from "citty";
import { z } from "zod";

import { ExitCode } from "../ExitCode";
import { cyan, red } from "../util/color";

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
        await showUsage(def as unknown as CommandDef<T>);
        for (const issue of parsed.error.issues) {
          console.error(formatIssue(issue, context));
        }
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

/**
 * Foramts a Zod issue into `citty`'s error message.
 * Example:
 *   Invalid value for argument: --protocol (foo). Expected one of: pg, http, https, postgresql, mysql, redis, none.
 */
export function formatIssue<const T extends ArgsDef = ArgsDef>(
  issue: $ZodIssue,
  context: CommandContext<T>,
): string {
  const name = issue.path[0];
  const args = context.args;
  if (name == null) return issue.message;
  const flag = typeof name === "string" ? `--${name}` : String(name);
  const value = args[name as keyof typeof args];
  const header = `Invalid value for argument:`;
  return `${red(header)} ${cyan(flag)} (${cyan(toString(value))}). ${issue.message}`;
}

function toString(value: string | boolean | string[]): string {
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value.toString();
  return value.join(", ");
}
