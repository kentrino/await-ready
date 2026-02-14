import { parseArgs as cittyParseArgs, type ArgsDef, type ParsedArgs } from "citty";

import type { AwaitReadyArgumentError, AwaitReadyResult } from "../AwaitReadyResult";

export function safeParseArgs<A extends ArgsDef>(
  rawArgs: string[],
  args: A,
): AwaitReadyResult<ParsedArgs<ArgsDef>, AwaitReadyArgumentError> {
  try {
    const parsed = cittyParseArgs(rawArgs, args);
    return {
      success: true,
      value: parsed,
    };
  } catch (e: unknown) {
    if (!(e instanceof Error)) {
      return {
        success: false,
        error: {
          type: "UnknownError",
          message: String(e),
        },
      };
    }
    return {
      success: false,
      error: {
        type: "ArgumentError",
        message: e.message,
        cause: e,
      },
    };
  }
}
