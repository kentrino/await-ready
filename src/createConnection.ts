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

// oxlint-disable-next-line import/no-named-as-default
import { createConnection as createConnectionNode } from "node:net";
import { debug } from "node:util";

import { StatusCode, status, type CreateConnectionStatus } from "./ConnectionStatus";

export function createConnection({
  host,
  port,
  ipVersion,
  timeout,
}: {
  host: string;
  port: number;
  ipVersion: 4 | 6;
  timeout: number;
}) {
  return new Promise<CreateConnectionStatus>((resolve, _) => {
    const log = debug("await-ready:createConnection");
    let timer: NodeJS.Timeout | undefined = undefined;

    log("Connecting to %s:%d (IPv%d)", host, port, ipVersion);

    //  Try and open the socket, with the params and callback.
    const socket = createConnectionNode(
      { host, port, family: ipVersion, autoSelectFamily: true },
      // connectionListener
      (): void => {
        clearTimeout(timer);
      },
    );

    socket.on("connect", () => {
      log("Connected to %s:%d", host, port);
      clearTimeout(timer);
      // Pause immediately so we don't start consuming incoming bytes until
      // all handlers have attached their listeners (e.g. MySQL sends a handshake
      // right after connect).
      //
      // In practice, data is typically buffered until the socket/stream is put into
      // flowing mode (e.g. when a "data" listener is attached). We call pause() here
      // to make the intended sequencing explicit and avoid relying on implicit
      // stream-mode transitions.
      socket.pause();
      return resolve(
        status(StatusCode.__SOCKET_CONNECTED, `Connected to ${host}:${port}`, { socket }),
      );
    });

    //  TODO: Check for the socket ECONNREFUSED event.
    socket.on("error", (error: Error) => {
      clearTimeout(timer);
      socket.destroy();
      if (!("code" in error)) {
        log("Unknown error: %O", error);
        return resolve(status(StatusCode.UNKNOWN, "Unknown error", { cause: error }));
      }
      if (error.code === "ECONNREFUSED") {
        log("Socket not open: ECONNREFUSED");
        return resolve(
          status(StatusCode.__ECONNREFUSED, "Socket not open: ECONNREFUSED", {
            cause: error,
          }),
        );
      } else if (error.code === "EACCES") {
        log("Socket not open: EACCES");
        return resolve(
          status(StatusCode.__EACCES, "Socket not open: EACCES", {
            cause: error,
          }),
        );
      } else if (error.code === "ECONNTIMEOUT") {
        //  We've successfully *tried* to connect, but we're timing out
        //  establishing the connection. This is not ideal (either
        //  the port is open or it ain't).
        log("Socket not open: ECONNTIMEOUT");
        return resolve(
          status(StatusCode.TIMEOUT, "Socket not open: ECONNTIMEOUT", { cause: error }),
        );
      } else if (error.code === "ECONNRESET") {
        //  This can happen if the target server kills its connection before
        //  we can read from it, we can normally just try again.
        log("Socket not open: ECONNRESET");
        return resolve(
          status(StatusCode.__ECONNRESET, "Socket not open: ECONNRESET", {
            cause: error,
          }),
        );
      } else if (error.code === "ENOTFOUND" || error.code === "EADDRNOTAVAIL") {
        //  ENOTFOUND: DNS lookup failed for this address family (e.g. no A or AAAA record).
        //  EADDRNOTAVAIL: The address is not available on this machine (e.g. IPv6 stack disabled).
        //
        //  In both cases, this address family cannot reach the host right now.
        //  We report it as __ENOTFOUND and let the poll loop try the other family
        //  before deciding whether the host is truly unreachable.
        log(`Socket cannot be opened: ${error.code}`);
        return resolve(
          status(StatusCode.__ENOTFOUND, `Socket cannot be opened: ${error.code}`, {
            cause: error,
          }),
        );
      }
    });

    //  Kill the socket if we don't open in time.
    if (timeout > 0) {
      timer = setTimeout(() => {
        socket.destroy();
        log("Connection timeout after %dms", timeout);
        return resolve(status(StatusCode.TIMEOUT, `Connection timeout after ${timeout}ms`));
      }, timeout);
    }
  });
}
