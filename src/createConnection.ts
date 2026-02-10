// oxlint-disable-next-line import/no-named-as-default
import consola from "consola";
import { createConnection as createConnectionNode, Socket } from "node:net";
import { debug } from "node:util";

import { ConnectionStatus } from "./ConnectionStatus";
import { err, ok, type Result } from "./result/Result";

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
  return new Promise<Result<Socket, ConnectionStatus>>((resolve, _) => {
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
      return resolve(ok(socket));
    });

    //  TODO: Check for the socket ECONNREFUSED event.
    socket.on("error", (error: Error) => {
      clearTimeout(timer);
      socket.destroy();
      if (!("code" in error)) {
        log("Unknown error: %O", error);
        return resolve(err(ConnectionStatus.UNKNOWN));
      }
      if (error.code === "ECONNREFUSED" || error.code === "EACCES") {
        //  We successfully *tried* to connect, so resolve with false so that we try again.
        log("Socket not open: %s", error.code);
        return resolve(err(ConnectionStatus.SHOULD_RETRY));
      } else if (error.code === "ECONNTIMEOUT") {
        //  We've successfully *tried* to connect, but we're timing out
        //  establishing the connection. This is not ideal (either
        //  the port is open or it ain't).
        log("Socket not open: ECONNTIMEOUT");
        return resolve(err(ConnectionStatus.TIMEOUT));
      } else if (error.code === "ECONNRESET") {
        //  This can happen if the target server kills its connection before
        //  we can read from it, we can normally just try again.
        log("Socket not open: ECONNRESET");
        return resolve(err(ConnectionStatus.SHOULD_RETRY));
      } else if (
        ipVersion === 6 &&
        (error.code === "EADDRNOTAVAIL" || error.code === "ENOTFOUND")
      ) {
        //  This will occur if the IP address we are trying to connect to does not exist
        //  This can happen for ::1 or other IPv6 addresses if the IPv6 stack is not enabled.
        //  In this case we disable the IPv6 lookup
        log(`Socket cannot be opened for IPv6: ${error.code}`);
        log("Disabling IPv6 lookup");
        return resolve(err(ConnectionStatus.SHOULD_SWITCH_IP_V4));
      } else if (error.code === "ENOTFOUND") {
        //  This will occur if the address is not found, i.e. due to a dns
        //  lookup fail (normally a problem if the domain is wrong).
        log("Socket cannot be opened: ENOTFOUND");

        //  If we are going to wait for DNS records, we can actually just try
        //  again...
        if (waitForDns === true) return resolve(err(ConnectionStatus.SHOULD_RETRY));

        // ...otherwise, we will explicitly fail with a meaningful error for
        //  the user.
        consola.error("Host not found: %s:%d", host, port);
        return resolve(err(ConnectionStatus.HOST_NOT_FOUND));
      }
    });

    //  Kill the socket if we don't open in time.
    timer = setTimeout(() => {
      socket.destroy();
      log("Connection timeout after %dms", timeout);
      return resolve(err(ConnectionStatus.TIMEOUT));
    }, timeout);
  });
}
