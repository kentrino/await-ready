import type { Socket } from "node:net";

import { EventEmitter } from "node:events";
import { describe, expect, test, vi } from "vitest";

if (!process.env.VITEST) {
  throw new Error("This test must be run with vitest (`bun run test`), not `bun test`.");
}

/**
 * This test documents a *possible* real-world configuration where:
 * - `--host` omitted → default host is `localhost`
 * - IPv4 lookup for `localhost` fails (e.g. missing A record / broken /etc/hosts)
 * - but using a numeric host like `0.0.0.0` bypasses name resolution and succeeds.
 *
 * We simulate it deterministically by mocking `node:net.createConnection`.
 */

vi.mock("node:net", localhostMissingIPv4Record);

describe("default host edge case", () => {
  test("succeeds when --host is omitted (default localhost) and localhost has no IPv4 record", async () => {
    const { parseArgs } = await import("./cli/arguments");
    const { awaitReady } = await import("./awaitReady");

    const parsed = parseArgs(["-p", "55432", "--protocol", "pg"]);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.value.host).toBe("localhost");
    expect(parsed.value.protocol).toBe("postgresql");

    const res = await awaitReady(parsed.value);
    expect(res.success).toBe(true);
  });

  test("succeeds when --host 0.0.0.0 is provided (bypasses name resolution)", async () => {
    const { parseArgs } = await import("./cli/arguments");
    const { awaitReady } = await import("./awaitReady");

    const parsed = parseArgs(["-p", "55432", "--protocol", "pg", "--host", "0.0.0.0"]);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.value.host).toBe("0.0.0.0");
    expect(parsed.value.protocol).toBe("postgresql");

    const res = await awaitReady(parsed.value);
    expect(res.success).toBe(true);
  });
});

class FakeSocket extends EventEmitter {
  destroyed = false;
  pause() {}
  resume() {}
  destroy() {
    this.destroyed = true;
  }
  write(_buf: Buffer) {
    // For PostgreSQL, respond like a live server: 'N' = SSL not supported.
    queueMicrotask(() => {
      if (this.destroyed) return;
      this.emit("data", Buffer.from([0x4e]));
    });
    return true;
  }
}

async function localhostMissingIPv4Record<T>(importOriginal: () => Promise<T>) {
  const original = (await importOriginal()) as typeof import("node:net");
  return {
    ...original,
    createConnection: (
      options: { host?: string; port?: number; family?: 4 | 6 },
      connectionListener?: () => void,
    ): Socket => {
      const host = options.host ?? "";
      const family = options.family;
      const socket = new FakeSocket() as unknown as Socket;

      queueMicrotask(() => {
        // Simulate "localhost" being broken for IPv4 lookups.
        // This can happen if `localhost` has only an AAAA record (::1) and no A record.
        if (host === "localhost" && family === 4) {
          const err = Object.assign(new Error("ENOTFOUND localhost"), { code: "ENOTFOUND" });
          (socket as unknown as FakeSocket).emit("error", err);
          return;
        }

        // Otherwise, connect succeeds.
        connectionListener?.();
        (socket as unknown as FakeSocket).emit("connect");
      });

      return socket;
    },
  };
}
