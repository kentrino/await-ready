import { createServer, type Server } from "node:net";
import { afterEach, describe, expect, test, vi } from "vitest";

import { StatusCode } from "./ConnectionStatus";
import { createConnection } from "./createConnection";
import { poll } from "./poll";

if (!process.env.VITEST) {
  throw new Error("This test must be run with vitest (`bun run test`), not `bun test`.");
}

vi.mock("./createConnection", { spy: true });

function listen(host: string): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, host, () => {
      const port = (server.address() as { port: number }).port;
      resolve({ server, port });
    });
  });
}

function getFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      server.close(() => resolve(port));
    });
  });
}

const defaults = {
  timeout: 5000,
  interval: 100,
  waitForDns: false,
  protocol: "none" as const,
};

describe("awaitReady", () => {
  afterEach(() => {
    vi.mocked(createConnection).mockClear();
  });

  test("should connect to IPv4 server with explicit IPv4 host", async () => {
    const { server, port } = await listen("127.0.0.1");

    const result = await poll({ ...defaults, host: "127.0.0.1", port });

    server.close();
    expect(result.code).toBe(StatusCode.CONNECTED);
  });

  test("should connect to IPv6 server with explicit IPv6 host", async () => {
    const { server, port } = await listen("::1");

    const result = await poll({ ...defaults, host: "::1", port });

    server.close();
    expect(result.code).toBe(StatusCode.CONNECTED);
  });

  test("should connect to IPv4 server with localhost", async () => {
    const { server, port } = await listen("127.0.0.1");

    const result = await poll({ ...defaults, host: "localhost", port });

    server.close();
    expect(result.code).toBe(StatusCode.CONNECTED);
  });

  test("should fall back to IPv6 when server only listens on ::1 with localhost", async () => {
    const { server, port } = await listen("::1");

    const result = await poll({ ...defaults, host: "localhost", port });

    server.close();
    expect(result.code).toBe(StatusCode.CONNECTED);

    // Verify IPv4 was tried first, then fell back to IPv6
    const calls = vi.mocked(createConnection).mock.calls;
    const ipVersions = calls.map((c) => c[0].ipVersion);
    expect(ipVersions[0]).toBe(4);
    expect(ipVersions[1]).toBe(6);
  });

  test("should timeout after the specified time", async () => {
    const port = await getFreePort();
    const timeout = 500;
    const delta = 300;

    const start = Date.now();
    const result = await poll({ ...defaults, host: "127.0.0.1", port, timeout });
    const elapsed = Date.now() - start;

    expect(result.code).toBe(StatusCode.TIMEOUT);
    expect(elapsed).toBeGreaterThan(timeout - delta);
    expect(elapsed).toBeLessThan(timeout + delta);
  });

  test("should timeout with a non-routable address", async () => {
    const result = await poll({
      ...defaults,
      host: "10.255.255.1",
      port: 9021,
      timeout: 200,
    });

    expect(result.code).toBe(StatusCode.TIMEOUT);
  });

  test("should return HOST_NOT_FOUND for invalid domain", async () => {
    const result = await poll({
      ...defaults,
      host: "ireallyhopethatthisdomainnamedoesnotexist.com",
      port: 9021,
      timeout: 500,
    });

    expect(result.code).toBe(StatusCode.HOST_NOT_FOUND);
  });

  test("should not timeout when timeout is 0 (infinite wait)", async () => {
    const { server, port } = await listen("127.0.0.1");

    const result = await poll({ ...defaults, host: "127.0.0.1", port, timeout: 0 });

    server.close();
    expect(result.code).toBe(StatusCode.CONNECTED);
  });

  test("should retry with timeout=0 until server becomes available", async () => {
    const port = await getFreePort();

    // Start a server after a short delay
    const serverReady = new Promise<Server>((resolve) => {
      setTimeout(() => {
        const s = createServer();
        s.listen(port, "127.0.0.1", () => resolve(s));
      }, 300);
    });

    const result = await poll({ ...defaults, host: "127.0.0.1", port, timeout: 0, interval: 50 });

    expect(result.code).toBe(StatusCode.CONNECTED);
    const server = await serverReady;
    server.close();
  });

  test("should retry when socket connects but server sends no data, then connect once it responds", async () => {
    // A TCP server that initially accepts connections but sends nothing (triggering
    // __NO_DATA_RECEIVED from the HTTP ping timeout). After a delay it starts
    // responding with a valid HTTP response.
    let shouldRespond = false;
    const server = createServer((socket) => {
      if (shouldRespond) {
        socket.on("data", () => {
          socket.write("HTTP/1.1 200 OK\r\n\r\n");
          socket.end();
        });
      }
      // Otherwise: accept the connection but never send data → ping times out
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    // After 800ms, start responding to HTTP requests
    setTimeout(() => {
      shouldRespond = true;
    }, 100);

    const result = await poll({
      ...defaults,
      host: "127.0.0.1",
      port,
      timeout: 5000,
      interval: 10,
      protocol: "http",
    });

    server.close();
    // shouldRetry must include __NO_DATA_RECEIVED so poll retries until the
    // server starts responding, instead of giving up with "Illegal state".
    expect(result.code).toBe(StatusCode.CONNECTED);
  });

  test("should retry when ping encounters a socket error (__UNKNOWN_PING_ERROR), then connect once server responds", async () => {
    // A TCP server that initially accepts connections but immediately destroys
    // them (triggering __UNKNOWN_PING_ERROR from the HTTP ping). After a delay
    // it starts responding with a valid HTTP response.
    let shouldRespond = false;
    const server = createServer((socket) => {
      if (shouldRespond) {
        socket.on("data", () => {
          socket.write("HTTP/1.1 200 OK\r\n\r\n");
          socket.end();
        });
      } else {
        // Accept TCP but immediately destroy → socket error during ping
        socket.destroy();
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;

    // After 100ms, start responding to HTTP requests
    setTimeout(() => {
      shouldRespond = true;
    }, 100);

    const result = await poll({
      ...defaults,
      host: "127.0.0.1",
      port,
      timeout: 5000,
      interval: 10,
      protocol: "http",
    });

    server.close();
    // shouldRetry must include __UNKNOWN_PING_ERROR so poll retries until the
    // server starts responding, instead of giving up with "Illegal state".
    expect(result.code).toBe(StatusCode.CONNECTED);
  });

  test("should not error on ENOTFOUND when wait-for-dns is true, and timeout instead", async () => {
    const timeout = 300;
    const delta = 200;

    const start = Date.now();
    const result = await poll({
      ...defaults,
      host: "ireallyhopethatthisdomainnamedoesnotexist.com",
      port: 9021,
      timeout,
      waitForDns: true,
    });
    const elapsed = Date.now() - start;

    expect(result.code).toBe(StatusCode.TIMEOUT);
    expect(elapsed).toBeGreaterThan(timeout - delta);
    expect(elapsed).toBeLessThan(timeout + delta);
  });
});
