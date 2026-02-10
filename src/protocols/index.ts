import type { Socket } from "node:net";

import type { ConnectionStatus } from "../ConnectionStatus";
import type { Protocol } from "../types/Protocol";

import { AwaitReadyError, ErrorCodes } from "../error/AwaitReadyError";
import { ok, type Result } from "../result/Result";
import { pg } from "./pg";

export type PingParams = {
  socket: Socket;
  pingTimeout: number;
};

export const DEFAULT_PING_TIMEOUT = 500;

export async function ping(
  protocol: Protocol,
  params: PingParams,
): Promise<Result<undefined, ConnectionStatus>> {
  switch (protocol) {
    case "none":
      return ok();
    case "pg":
      return pg(params);
    default:
      throw new AwaitReadyError(ErrorCodes.PROTOCOL_NOT_SUPPORTED);
  }
}
