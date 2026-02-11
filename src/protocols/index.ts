import type { Socket } from "node:net";

import type { Protocol } from "../types/Protocol";

import { StatusCode, status, type PingStatus } from "../ConnectionStatus";
import { http } from "./http";
import { mysql } from "./mysql";
import { pg } from "./pg";

export type PingParams = {
  socket: Socket;
  pingTimeout: number;
  path?: string;
};

export const DEFAULT_PING_TIMEOUT = 500;

export async function ping(protocol: Protocol, params: PingParams): Promise<PingStatus> {
  switch (protocol) {
    case "none":
      return status(StatusCode.CONNECTED, "Service is ready");
    case "http":
    case "https":
      return http(params);
    case "pg":
      return pg(params);
    case "mysql":
      return mysql(params);
    default:
      return status(StatusCode.PROTOCOL_NOT_SUPPORTED, `Protocol not supported: ${protocol}`);
  }
}
