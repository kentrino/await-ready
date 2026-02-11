import * as z from "zod";

import { parseTarget } from "./parseTarget";
import { Protocol } from "./types/Protocol";

const ProtocolInput = z.enum(["pg", ...Protocol.options] as const);

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
  port: z.string().optional(),
  timeout: z.string().transform(Number).pipe(z.number().int().min(0)),
  protocol: ProtocolInput,
  interval: z.string().transform(Number).pipe(z.number().min(10)),
  ["wait-for-dns"]: z.boolean(),
});

const output = z.object({
  host: z.string(),
  port: z.number().int().min(1).max(65535),
  timeout: z.number().int().min(0),
  protocol: Protocol,
  interval: z.number().min(10),
  path: z.union([z.string(), z.undefined()]),
  ["wait-for-dns"]: z.boolean(),
});

export const Args = input
  .transform((v, ctx): z.input<typeof output> => {
    if (v.target) {
      const parsed = parseTarget(v.target);
      if (!parsed) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid target: '${v.target}'`,
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
        "wait-for-dns": v["wait-for-dns"],
      };
    }
    if (!v.port) {
      ctx.addIssue({
        code: "custom",
        message: "A valid port is required. Specify a target or use -p.",
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
      "wait-for-dns": v["wait-for-dns"],
    };
  })
  .pipe(output);
