import { describe, expectTypeOf, test } from "bun:test";

import type { PollStatus, StatusCode, StatusCodeOf } from "./ConnectionStatus";

describe("StatusCodeOf", () => {
  test("StatusCode is a union of all status codes", () => {
    expectTypeOf<StatusCodeOf<PollStatus>>().toEqualTypeOf<
      | typeof StatusCode.TIMEOUT
      | typeof StatusCode.CONNECTED
      | typeof StatusCode.HOST_NOT_FOUND
      | typeof StatusCode.INVALID_PROTOCOL
      | typeof StatusCode.UNKNOWN
      | typeof StatusCode.PROTOCOL_NOT_SUPPORTED
    >();
  });
});
