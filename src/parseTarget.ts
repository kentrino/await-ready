import { debug } from "node:util";
import * as z from "zod";

const log = debug("await-ready:parseTarget");

export type ParsedTarget = {
  protocol: "http" | "https";
  host: string;
  port: number;
  path: string | undefined;
};

/**
 * Parse a target string into its components.
 * Returns `undefined` (with a debug log) when the input is invalid.
 *
 * Supported formats:
 * - `3000`                              → localhost:3000 (none)
 * - `:8080`                             → localhost:8080 (none)
 * - `localhost:3000`                    → localhost:3000 (none)
 * - `http://localhost:5000/healthcheck` → localhost:5000 (http) with path
 */
export function parseTarget(target: string): ParsedTarget | undefined {
  if (!target) {
    log("'target' is required");
    return undefined;
  }

  let remaining = target;

  //  Check for a protocol prefix (e.g. "http://", "pg://").
  const protocolMatch = remaining.match(/^(\w+):\/\//);
  let protocol: "http" | "https" = "http";
  if (protocolMatch && protocolMatch[1]) {
    const raw = protocolMatch[1].toLowerCase();
    const parsed = z.enum(["http", "https"]).safeParse(raw);
    if (!parsed.success) {
      log("'%s' is not a supported protocol (expected http or https)", raw);
      return undefined;
    }
    protocol = parsed.data;
    remaining = remaining.substring(protocolMatch[0].length);
  }

  //  Extract the path (if present).
  const pathStart = remaining.indexOf("/");
  const path = pathStart !== -1 ? remaining.substring(pathStart) : undefined;
  remaining = pathStart !== -1 ? remaining.substring(0, pathStart) : remaining;

  //  Split into host and port on ':'.
  const parts = remaining.split(":");
  if (parts.length > 2) {
    log("'%s' is an invalid target, too many ':' separators", target);
    return undefined;
  }

  //  Determine host and port string.
  //    "3000"           → host=localhost, portStr="3000"
  //    ":8080"          → host=localhost, portStr="8080"
  //    "myhost:8080"    → host="myhost", portStr="8080"
  const host = parts.length === 2 ? parts[0] || "localhost" : "localhost";
  const portStr = parts.length === 1 ? parts[0] : parts[1];

  //  Validate port.
  if (!portStr || !/^[0-9]+$/.test(portStr)) {
    log("'%s' is an invalid target, '%s' is not a valid port number", target, portStr ?? "");
    return undefined;
  }
  const port = Number.parseInt(portStr, 10);
  if (port < 1 || port > 65535) {
    log("'%s' is an invalid target, port %d is out of range (1–65535)", target, port);
    return undefined;
  }

  return { protocol, host, port, path };
}
