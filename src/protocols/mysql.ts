import { debug } from "node:util";

import type { PingParams } from ".";

import { StatusCode, status, type PingStatus } from "../ConnectionStatus";

/**
 * MySQL Initial Handshake Packet constants.
 * @see https://dev.mysql.com/doc/dev/mysql-server/latest/page_protocol_connection_phase_packets_protocol_handshake_v10.html
 *
 * When a client connects, the MySQL server sends a handshake packet:
 *   [3 bytes] payload length
 *   [1 byte]  sequence id (should be 0)
 *   [1 byte]  protocol version (10 for current MySQL / MariaDB)
 *   [n bytes] server version string (null-terminated)
 *   ...
 *
 * We only need to verify that the first few bytes look like a valid
 * MySQL handshake to confirm the server is alive and speaking MySQL.
 */

/** Minimum packet size: 4 (header) + 1 (protocol version) */
const MIN_PACKET_SIZE = 5;

/** Byte offset of the sequence id within the packet header. */
const SEQUENCE_ID_OFFSET = 3;

/** Byte offset of the protocol version (first byte of payload). */
const PROTOCOL_VERSION_OFFSET = 4;

/** Current MySQL handshake protocol version. */
const HANDSHAKE_V10 = 10;

/** MySQL error packet marker. */
const ERR_PACKET_MARKER = 0xff;

export function mysql({ pingTimeout: timeout, socket }: PingParams): Promise<PingStatus> {
  const log = debug("await-ready:ping:mysql");

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

    // MySQL server sends the handshake packet first — just wait for data.
    // The socket is already paused by createConnection(), so no data is lost.
    socket.on("data", (data: Buffer) => {
      log("Data received (%d bytes)", data.length);
      socket.destroy();
      clearTimeout(timer);

      if (data.length < MIN_PACKET_SIZE) {
        log("Packet too short: %d bytes", data.length);
        return resolve(status(StatusCode.INVALID_PROTOCOL, "Packet too short for MySQL handshake"));
      }

      const sequenceId = data[SEQUENCE_ID_OFFSET] as number;
      const protocolVersion = data[PROTOCOL_VERSION_OFFSET] as number;

      // An error packet (0xff) at the protocol version offset means the server
      // rejected the connection (e.g. too many connections), but it's still MySQL.
      if (protocolVersion === ERR_PACKET_MARKER && sequenceId === 0) {
        log("MySQL error packet received (server is alive but returned an error)");
        return resolve(status(StatusCode.CONNECTED, "MySQL is ready (error packet)"));
      }

      if (sequenceId !== 0) {
        log("Unexpected sequence id: %d", sequenceId);
        return resolve(
          status(StatusCode.INVALID_PROTOCOL, `Unexpected sequence id: ${sequenceId}`),
        );
      }

      if (protocolVersion !== HANDSHAKE_V10) {
        log("Unsupported protocol version: %d", protocolVersion);
        return resolve(
          status(
            StatusCode.INVALID_PROTOCOL,
            `Unsupported MySQL protocol version: ${protocolVersion}`,
          ),
        );
      }

      log("Valid MySQL handshake v%d", protocolVersion);
      return resolve(status(StatusCode.CONNECTED, "MySQL is ready"));
    });

    socket.on("error", (err: Error) => {
      socket.destroy();
      clearTimeout(timer);
      log("Socket error: %s", err.message);
      return resolve(
        status(StatusCode.__UNKNOWN_PING_ERROR, "Socket error while pinging MySQL server", {
          cause: err,
        }),
      );
    });

    // Resume the socket after all listeners are attached (it was paused by createConnection).
    socket.resume();
  });
}
