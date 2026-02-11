import { describe, expect, test } from "vitest";

import { parseTarget } from "./parseTarget";

describe("parseTarget", () => {
  test("should return undefined if no target is provided", () => {
    expect(parseTarget("")).toBeUndefined();
  });

  test("should return undefined if more than one separator is used", () => {
    expect(parseTarget("host:port:wtf")).toBeUndefined();
  });

  test("should return undefined if a non-numeric port target is provided", () => {
    expect(parseTarget("808X")).toBeUndefined();
  });

  test("should return undefined if a non-numeric :port target is provided", () => {
    expect(parseTarget(":808X")).toBeUndefined();
  });

  test("should return undefined if a non-numeric host:port target is provided", () => {
    expect(parseTarget("host:808X")).toBeUndefined();
  });

  test("should return undefined if port is out of range", () => {
    expect(parseTarget("0")).toBeUndefined();
    expect(parseTarget("65536")).toBeUndefined();
    expect(parseTarget("99999")).toBeUndefined();
  });

  test("should return undefined for unsupported protocol", () => {
    expect(parseTarget("ftp://localhost:8080")).toBeUndefined();
  });

  test("should extract a valid port", () => {
    const result = parseTarget("8080");
    expect(result).toBeDefined();
    expect(result!.port).toBe(8080);
    expect(result!.host).toBe("localhost");
  });

  test("should extract a valid :port", () => {
    const result = parseTarget(":8080");
    expect(result).toBeDefined();
    expect(result!.port).toBe(8080);
    expect(result!.host).toBe("localhost");
  });

  test("should extract a valid host:port", () => {
    const result = parseTarget("127.0.0.1:8080");
    expect(result).toBeDefined();
    expect(result!.port).toBe(8080);
    expect(result!.host).toBe("127.0.0.1");
  });

  test("should extract a valid protocol", () => {
    const result = parseTarget("http://:9000");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("http");
    expect(result!.port).toBe(9000);
    expect(result!.host).toBe("localhost");
    expect(result!.path).toBeUndefined();
  });

  test("should extract a valid protocol and path", () => {
    const result = parseTarget("http://google:9000/healthcheck");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("http");
    expect(result!.port).toBe(9000);
    expect(result!.host).toBe("google");
    expect(result!.path).toBe("/healthcheck");
  });

  test("should handle https protocol", () => {
    const result = parseTarget("https://example.com:443/status");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("https");
    expect(result!.port).toBe(443);
    expect(result!.host).toBe("example.com");
    expect(result!.path).toBe("/status");
  });
});
