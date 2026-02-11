import { test, expect, describe } from "bun:test";

import { StatusCode, status } from "./ConnectionStatus";
import { ExitCode, toExitCode } from "./ExitCode";

describe("ExitCode", () => {
  test("ExitCode constants match expected values", () => {
    expect(ExitCode.SUCCESS).toBe(0);
    expect(ExitCode.TIMEOUT).toBe(1);
    expect(ExitCode.VALIDATION_ERROR).toBe(2);
    expect(ExitCode.UNKNOWN_ERROR).toBe(3);
    expect(ExitCode.CONNECTION_ERROR).toBe(4);
  });
});

describe("toExitCode", () => {
  test("CONNECTED → exit code 0", () => {
    expect(toExitCode(status(StatusCode.CONNECTED, "ok"))).toBe(ExitCode.SUCCESS);
  });

  test("TIMEOUT → exit code 1", () => {
    expect(toExitCode(status(StatusCode.TIMEOUT, "test"))).toBe(ExitCode.TIMEOUT);
  });

  test("HOST_NOT_FOUND → exit code 4", () => {
    expect(toExitCode(status(StatusCode.HOST_NOT_FOUND, "test"))).toBe(ExitCode.CONNECTION_ERROR);
  });

  test("UNKNOWN → exit code 3", () => {
    expect(toExitCode(status(StatusCode.UNKNOWN, "test"))).toBe(ExitCode.UNKNOWN_ERROR);
  });

  test("INVALID_PROTOCOL → exit code 3", () => {
    expect(toExitCode(status(StatusCode.INVALID_PROTOCOL, "test"))).toBe(ExitCode.UNKNOWN_ERROR);
  });

  test("PROTOCOL_NOT_SUPPORTED → exit code 3", () => {
    expect(toExitCode(status(StatusCode.PROTOCOL_NOT_SUPPORTED, "test"))).toBe(
      ExitCode.UNKNOWN_ERROR,
    );
  });
});
