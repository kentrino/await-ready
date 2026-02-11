import { expect, test, vi } from "vitest";
import { createServer } from "node:net";

import { StatusCode } from "./ConnectionStatus";
import { createConnection } from "./createConnection";
import { poll } from "./poll";

vi.mock("./createConnection", { spy: true });

test("falls back to IPv6 when server only listens on ::1", async () => {
  // Server listening on IPv6 loopback only — not reachable via 127.0.0.1
  const server = createServer();
  const port = await new Promise<number>((resolve) => {
    server.listen(0, "::1", () => {
      resolve((server.address() as { port: number }).port);
    });
  });

  // poll starts with IPv4 (127.0.0.1 → ECONNREFUSED),
  // then immediately retries with IPv6 (::1 → success)
  const result = await poll({
    host: "localhost",
    port,
    timeout: 5000,
    interval: 100,
    waitForDns: false,
    protocol: "none",
  });

  server.close();

  expect(result.code).toBe(StatusCode.CONNECTED);

  // Verify IPv4 was tried first, then IPv6
  expect(createConnection).toHaveBeenCalledWith(
    expect.objectContaining({ ipVersion: 4 }),
  );
  expect(createConnection).toHaveBeenCalledWith(
    expect.objectContaining({ ipVersion: 6 }),
  );

  const calls = vi.mocked(createConnection).mock.calls;
  const ipVersions = calls.map((c) => c[0].ipVersion);
  expect(ipVersions[0]).toBe(4);
  expect(ipVersions[1]).toBe(6);
});
