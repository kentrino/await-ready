import * as z from "zod";

import { formatZodError, type AwaitReadyResult } from "../AwaitReadyResult";
import { OutputMode } from "../output";
import { Protocol } from "../types/Protocol";
import { parseTarget } from "./parseTarget";
import { safeParseArgs } from "./safeParseArgs";

const ProtocolInput = z.enum(["pg", ...Protocol.options] as const);

export function parseArgs(rawArgs: string[]): AwaitReadyResult<ArgsOutput> {
  const parsed = safeParseArgs(rawArgs, args);
  if (!parsed.success) {
    return parsed;
  }
  const res = Args.safeParse(parsed.value);
  if (!res.success) {
    return {
      success: false,
      error: formatZodError(res.error),
    };
  }
  return {
    success: true,
    value: res.data,
  };
}

export const args = {
  target: {
    type: "positional",
    description: "Target to connect to (e.g. 3000, localhost:3000, postgresql://localhost:5432)",
    required: false,
  },
  host: {
    type: "string",
    default: "localhost",
    description: "The host to connect to",
  },
  port: {
    type: "string",
    alias: "p",
    description: "The port to connect to",
    required: false,
  },
  timeout: {
    type: "string",
    default: "10000",
    description: "The timeout in milliseconds (0 for infinite)",
    required: false,
  },
  protocol: {
    type: "enum",
    default: "none",
    options: ProtocolInput.options,
    description: "The protocol to check",
    required: false,
  },
  interval: {
    type: "string",
    default: "1000",
    description: "The interval in milliseconds",
    required: false,
  },
  output: {
    type: "enum",
    default: "dots",
    options: OutputMode.options,
    description: "Output mode: dots (default), spinner, sl, or silent",
    required: false,
  },
  silent: {
    type: "boolean",
    default: false,
    alias: "s",
    description: "Suppress all output (shorthand for --output silent)",
    required: false,
  },
  ["wait-for-dns"]: {
    type: "boolean",
    default: false,
    description:
      "Do not fail on ENOTFOUND, meaning you can wait for DNS record creation. Default is false.",
    required: false,
  },
} as const;

const input = z.object({
  target: z.string().optional(),
  host: z.string(),
  port: z.string().regex(/^\d+$/, "Port must be a positive integer").optional(),
  timeout: z
    .string()
    .regex(/^\d+$/, "Timeout must be a positive integer")
    .transform(Number)
    .pipe(z.number().int().min(0)),
  protocol: ProtocolInput,
  interval: z
    .string()
    .regex(/^\d+$/, "Interval must be a positive integer greater than 10")
    .transform(Number)
    .pipe(z.number().min(10)),
  output: OutputMode,
  silent: z.boolean(),
  ["wait-for-dns"]: z.boolean(),
});

const validated = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  timeout: z.number().int().min(0),
  protocol: Protocol,
  interval: z.number().min(10),
  path: z.union([z.string(), z.undefined()]),
  output: OutputMode,
  ["wait-for-dns"]: z.boolean(),
});

export type ArgsOutput = {
  host: string;
  port: number;
  timeout: number;
  protocol: "http" | "https" | "postgresql" | "mysql" | "redis" | "none";
  interval: number;
  path: string | undefined;
  output: "dots" | "spinner" | "sl" | "silent";
  "wait-for-dns": boolean;
};

export const Args = input
  .transform((v, ctx): z.input<typeof validated> => {
    const output: z.infer<typeof OutputMode> = v.silent ? "silent" : v.output;
    if (v.target) {
      const parsed = parseTarget(v.target);
      if (!parsed) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid target: '${v.target}'`,
          path: ["target"],
        });
        return z.NEVER;
      }
      return {
        host: parsed.host,
        port: parsed.port,
        protocol: parsed.protocol,
        path: parsed.path,
        timeout: v.timeout,
        interval: v.interval,
        output,
        "wait-for-dns": v["wait-for-dns"],
      };
    }
    if (!v.port) {
      ctx.addIssue({
        code: "custom",
        message: "A valid port is required. Specify a target or use -p.",
        path: ["port"],
      });
      return z.NEVER;
    }
    return {
      host: v.host,
      port: Number(v.port),
      protocol: v.protocol === "pg" ? "postgresql" : v.protocol,
      path: undefined,
      timeout: v.timeout,
      interval: v.interval,
      output,
      "wait-for-dns": v["wait-for-dns"],
    };
  })
  .pipe(validated);
