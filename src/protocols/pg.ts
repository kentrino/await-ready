import { Socket } from "node:net";

import { ConnectionStatus } from "../ConnectionStatus";
import { err, ok, type Result } from "../result/Result";

export function ping(socket: Socket): Promise<Result<undefined, ConnectionStatus>> {
  return new Promise<Result<undefined, ConnectionStatus>>((resolve, _) => {
    const buf = Buffer.alloc(8);
    buf.writeInt32BE(8, 0);
    buf.writeInt32BE(80877103, 4);
    socket.write(buf);

    socket.on("data", () => {
      socket.destroy();
      return resolve(ok());
    });
    socket.on("error", (_: Error) => {
      socket.destroy();
      return resolve(err(ConnectionStatus.PROTOCOL_ERROR));
    });
  });
}
