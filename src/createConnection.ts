// oxlint-disable-next-line import/no-named-as-default
import { createConnection as createConnectionNode } from "node:net";
import { debug } from "node:util";

import { StatusCode, status, type CreateConnectionStatus } from "./ConnectionStatus";

export function createConnection({
  host,
  port,
  ipVersion,
  timeout,
  waitForDns,
}: {
  host: string;
  port: number;
  ipVersion: 4 | 6;
  timeout: number;
  waitForDns: boolean;
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
      } else if (
        ipVersion === 6 &&
        (error.code === "EADDRNOTAVAIL" || error.code === "ENOTFOUND")
      ) {
        //  This will occur if the IP address we are trying to connect to does not exist
        //  This can happen for ::1 or other IPv6 addresses if the IPv6 stack is not enabled.
        //  In this case we disable the IPv6 lookup
        log(`Socket cannot be opened for IPv6: ${error.code}`);
        log("Disabling IPv6 lookup");
        return resolve(
          status(StatusCode.__SHOULD_USE_IP_V4, `Socket cannot be opened for IPv6: ${error.code}`, {
            cause: error,
          }),
        );
      } else if (error.code === "ENOTFOUND") {
        //  This will occur if the address is not found, i.e. due to a dns
        //  lookup fail (normally a problem if the domain is wrong).
        log("Socket cannot be opened: ENOTFOUND");

        //  If we are going to wait for DNS records, we can actually just try
        //  again...
        if (waitForDns === true)
          return resolve(
            status(StatusCode.__ENOTFOUND, "Socket cannot be opened: ENOTFOUND", {
              cause: error,
            }),
          );

        // ...otherwise, we will explicitly fail with a meaningful error for
        //  the user.
        return resolve(
          status(StatusCode.HOST_NOT_FOUND, `Host not found: ${host}:${port}`, {
            cause: error,
          }),
        );
      }
    });

    //  Kill the socket if we don't open in time.
    timer = setTimeout(() => {
      socket.destroy();
      log("Connection timeout after %dms", timeout);
      return resolve(status(StatusCode.TIMEOUT, `Connection timeout after ${timeout}ms`));
    }, timeout);
  });
}
