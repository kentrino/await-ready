import { debug } from "node:util";

import type { PingParams } from ".";

import { StatusCode, status, type PingStatus } from "../ConnectionStatus";

const DEFAULT_PATH = "/";

export function http({ pingTimeout: timeout, socket, path }: PingParams): Promise<PingStatus> {
  const log = debug("await-ready:ping:http");
  const requestPath = path ?? DEFAULT_PATH;

  return new Promise<PingStatus>((resolve) => {
    let timer: NodeJS.Timeout | undefined = undefined;

    if (timeout > 0) {
      timer = setTimeout(() => {
        socket.destroy();
        clearTimeout(timer);
        log("No data received in %dms", timeout);
        return resolve(status(StatusCode.__NO_DATA_RECEIVED, `No data received in ${timeout}ms`));
      }, timeout);
    }

    // Send a minimal HTTP/1.1 GET request over the raw socket.
    const host = socket.remoteAddress ?? "localhost";
    const request = `GET ${requestPath} HTTP/1.1\r\nHost: ${host}\r\n\r\n`;
    socket.write(request);

    socket.on("data", (data: Buffer) => {
      log("Data received");
      socket.destroy();
      clearTimeout(timer);

      const response = data.toString();
      if (response.length === 0) {
        log("Response is empty");
        return resolve(status(StatusCode.INVALID_PROTOCOL, "Empty response from server"));
      }

      // Parse the HTTP status line: "HTTP/1.x STATUS_CODE REASON"
      const statusLine = response.split("\r\n")[0] ?? "";
      const parts = statusLine.split(" ");

      if (parts.length < 2) {
        log("Invalid HTTP status line: %s", statusLine);
        return resolve(
          status(StatusCode.INVALID_PROTOCOL, `Invalid HTTP status line: ${statusLine}`),
        );
      }

      const httpVersion = parts[0] as string;
      const statusCode = parts[1] as string;

      if (!httpVersion.startsWith("HTTP/")) {
        log("Not an HTTP response: %s", statusLine);
        return resolve(
          status(StatusCode.INVALID_PROTOCOL, `Not an HTTP response: ${statusLine}`),
        );
      }

      log("HTTP status line: %s (status %s)", statusLine, statusCode);

      // Any valid HTTP response (regardless of status code) indicates the server is ready.
      // The server is listening and speaking HTTP — that's what we're checking for.
      return resolve(status(StatusCode.CONNECTED, `HTTP ${statusCode}`));
    });

    socket.on("error", (err: Error) => {
      socket.destroy();
      clearTimeout(timer);
      log("Socket error: %s", err.message);
      return resolve(
        status(StatusCode.__UNKNOWN_PING_ERROR, "Socket error while pinging HTTP server", {
          cause: err,
        }),
      );
    });
  });
}
