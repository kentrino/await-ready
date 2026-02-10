import { debug } from "node:util";

import type { PingParams } from ".";

import { ConnectionStatus } from "../ConnectionStatus";
import { err, ok, type Result } from "../result/Result";

/**
 * PostgreSQL SSLRequest message constants.
 * @see https://www.postgresql.org/docs/current/protocol-message-formats.html
 */

/** Total byte length of the SSLRequest message (4-byte length + 4-byte request code). */
const SSL_REQUEST_LENGTH = 8;

/** SSLRequest code: (1234 << 16) | 5679 = 80877103 */
const SSL_REQUEST_CODE = 80877103;

/** Byte offset where the message length field is written. */
const LENGTH_OFFSET = 0;

/** Byte offset where the SSLRequest code is written. */
const CODE_OFFSET = 4;

/** Server response: SSL is supported ('S' = 0x53). */
const SSL_RESPONSE_SUPPORTED = 0x53; // 'S'

/** Server response: SSL is not supported ('N' = 0x4e). */
const SSL_RESPONSE_NOT_SUPPORTED = 0x4e; // 'N'

/** Valid SSLRequest responses indicating a live PostgreSQL server. */
const VALID_SSL_RESPONSES = new Set([SSL_RESPONSE_SUPPORTED, SSL_RESPONSE_NOT_SUPPORTED]);

export function pg({
  pingTimeout: timeout,
  socket,
}: PingParams): Promise<Result<undefined, ConnectionStatus>> {
  const log = debug("await-ready:ping:pg");
  return new Promise<Result<undefined, ConnectionStatus>>((resolve, _) => {
    let timer: NodeJS.Timeout | undefined = undefined;
    if (timeout > 0) {
      timer = setTimeout(() => {
        socket.destroy();
        clearTimeout(timer);
        log("No data received in %dms", timeout);
        return resolve(err(ConnectionStatus.SHOULD_RETRY));
      }, timeout);
    }
    const buf = Buffer.alloc(SSL_REQUEST_LENGTH);
    buf.writeInt32BE(SSL_REQUEST_LENGTH, LENGTH_OFFSET);
    buf.writeInt32BE(SSL_REQUEST_CODE, CODE_OFFSET);
    socket.write(buf);

    socket.on("data", (data: Buffer) => {
      log("Data received");
      socket.destroy();
      clearTimeout(timer);
      if (data.length === 0) {
        log("Data is empty");
        return resolve(err(ConnectionStatus.INVALID_PROTOCOL));
      }
      const response = data[0] as number | undefined;
      if (response === undefined || !VALID_SSL_RESPONSES.has(response)) {
        log("Invalid protocol response");
        return resolve(err(ConnectionStatus.INVALID_PROTOCOL));
      }

      return resolve(ok());
    });
    socket.on("error", (_: Error) => {
      socket.destroy();
      log("Socket error");
      clearTimeout(timer);
      return resolve(err(ConnectionStatus.SHOULD_RETRY));
    });
  });
}
