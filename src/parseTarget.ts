/**
 * This file contains code derived from wait-port (https://github.com/dwmkerr/wait-port),
 * originally created by Dave Kerr and licensed under the MIT License.
 *
 * Original license:
 *
 * MIT License
 *
 * Copyright (c) 2017 Dave Kerr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { debug } from "node:util";

import { Protocol } from "./types/Protocol";

const log = debug("await-ready:parseTarget");

export type ParsedTarget = {
  protocol: Protocol;
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
 * - `postgresql://localhost:5432`        → localhost:5432 (postgresql)
 * - `mysql://localhost:3306`            → localhost:3306 (mysql)
 */
export function parseTarget(target: string): ParsedTarget | undefined {
  if (!target) {
    log("'target' is required");
    return undefined;
  }

  let remaining = target;

  //  Check for a protocol prefix (e.g. "http://", "postgresql://").
  const protocolMatch = remaining.match(/^(\w+):\/\//);
  let protocol: Protocol = "none";
  if (protocolMatch && protocolMatch[1]) {
    const raw = protocolMatch[1].toLowerCase();
    const parsed = Protocol.safeParse(raw);
    if (!parsed.success) {
      log("'%s' is not a supported protocol (expected %s)", raw, Protocol.options.join(", "));
      return undefined;
    }
    protocol = parsed.data;
    remaining = remaining.substring(protocolMatch[0].length);
  }

  //  Extract the path (if present).
  const pathStart = remaining.indexOf("/");
  const path = pathStart !== -1 ? remaining.substring(pathStart) : undefined;
  remaining = pathStart !== -1 ? remaining.substring(0, pathStart) : remaining;

  //  Default ports for known protocols.
  const defaultPorts: Record<string, number> = { http: 80, https: 443, postgresql: 5432, mysql: 3306 };

  //  Split into host and port on ':'.
  const parts = remaining.split(":");
  if (parts.length > 2) {
    log("'%s' is an invalid target, too many ':' separators", target);
    return undefined;
  }

  //  When a protocol was specified and there is no port separator,
  //  treat the whole remaining string as the host and use the default port.
  if (protocolMatch && parts.length === 1 && parts[0] && !/^[0-9]+$/.test(parts[0])) {
    return { protocol, host: parts[0], port: defaultPorts[protocol]!, path };
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
    log("'%s' is an invalid target, port %d is out of range (1 - 65535)", target, port);
    return undefined;
  }

  return { protocol, host, port, path };
}
