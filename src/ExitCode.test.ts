import { test, expect, describe } from "bun:test";

import { ConnectionStatus } from "./ConnectionStatus";
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
  test("TIMEOUT → exit code 1", () => {
    expect(toExitCode(ConnectionStatus.TIMEOUT)).toBe(ExitCode.TIMEOUT);
  });

  test("HOST_NOT_FOUND → exit code 4", () => {
    expect(toExitCode(ConnectionStatus.HOST_NOT_FOUND)).toBe(ExitCode.CONNECTION_ERROR);
  });

  test("UNKNOWN → exit code 3", () => {
    expect(toExitCode(ConnectionStatus.UNKNOWN)).toBe(ExitCode.UNKNOWN_ERROR);
  });

  test("INVALID_PROTOCOL → exit code 3", () => {
    expect(toExitCode(ConnectionStatus.INVALID_PROTOCOL)).toBe(ExitCode.UNKNOWN_ERROR);
  });

  test("SHOULD_RETRY → exit code 3 (fallback)", () => {
    expect(toExitCode(ConnectionStatus.SHOULD_RETRY)).toBe(ExitCode.UNKNOWN_ERROR);
  });

  test("SHOULD_SWITCH_IP_V4 → exit code 3 (fallback)", () => {
    expect(toExitCode(ConnectionStatus.SHOULD_SWITCH_IP_V4)).toBe(ExitCode.UNKNOWN_ERROR);
  });
});
