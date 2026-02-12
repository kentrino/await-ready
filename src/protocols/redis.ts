import { debug } from "node:util";

import type { PingParams } from ".";

import { StatusCode, status, type PingStatus } from "../ConnectionStatus";

/**
 * Redis RESP protocol PING check.
 * @see https://redis.io/docs/reference/protocol-spec/
 *
 * Sends the inline PING command over the raw TCP socket.
 * Expected responses:
 *   "+PONG\r\n"           → server is ready
 *   "-LOADING ..."        → server is alive (loading dataset)
 *   "-NOAUTH ..."         → server is alive (auth required)
 *   any other "-..." line → server is alive (error response)
 *
 * Any RESP error response (starting with '-') still indicates a live Redis
 * server, so we treat it as CONNECTED.
 */

/** Inline PING command (no RESP array framing needed). */
const PING_COMMAND = "PING\r\n";

/** RESP simple string prefix. */
const SIMPLE_STRING_PREFIX = "+";

/** RESP error prefix. */
const ERROR_PREFIX = "-";

export function redis({ pingTimeout: timeout, socket }: PingParams): Promise<PingStatus> {
  const log = debug("await-ready:ping:redis");

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

    socket.write(PING_COMMAND);

    socket.on("data", (data: Buffer) => {
      log("Data received (%d bytes)", data.length);
      socket.destroy();
      clearTimeout(timer);

      const response = data.toString().trim();

      if (response.length === 0) {
        log("Response is empty");
        return resolve(status(StatusCode.INVALID_PROTOCOL, "Empty response from Redis"));
      }

      // "+PONG" — standard success response
      if (response.startsWith(SIMPLE_STRING_PREFIX)) {
        log("Simple string response: %s", response);
        return resolve(status(StatusCode.CONNECTED, "Redis is ready"));
      }

      // "-LOADING ...", "-NOAUTH ...", etc. — server is alive but returning an error
      if (response.startsWith(ERROR_PREFIX)) {
        log("Error response (server is alive): %s", response);
        return resolve(status(StatusCode.CONNECTED, `Redis is ready (${response})`));
      }

      // Anything else is not a valid RESP response
      log("Invalid RESP response: %s", response);
      return resolve(status(StatusCode.INVALID_PROTOCOL, `Invalid Redis response: ${response}`));
    });

    socket.on("error", (err: Error) => {
      socket.destroy();
      clearTimeout(timer);
      log("Socket error: %s", err.message);
      return resolve(
        status(StatusCode.__UNKNOWN_PING_ERROR, "Socket error while pinging Redis server", {
          cause: err,
        }),
      );
    });

    // Resume the socket after all listeners are attached (it was paused by createConnection).
    socket.resume();
  });
}
