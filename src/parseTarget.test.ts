/**
 * This file contains code derived from wait-port (https://github.com/dwmkerr/wait-port),
 * originally created by Dave Kerr and licensed under the MIT License.
 *
 * Original license:
 *
 * MIT License
 *
 * Copyright (c) 2017 Dave Kerr
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

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

  test("should use default port 80 for http when port is omitted", () => {
    const result = parseTarget("http://example.com");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("http");
    expect(result!.port).toBe(80);
    expect(result!.host).toBe("example.com");
    expect(result!.path).toBeUndefined();
  });

  test("should use default port 443 for https when port is omitted", () => {
    const result = parseTarget("https://example.com");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("https");
    expect(result!.port).toBe(443);
    expect(result!.host).toBe("example.com");
    expect(result!.path).toBeUndefined();
  });

  test("should use default port with path when port is omitted", () => {
    const result = parseTarget("http://example.com/healthcheck");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("http");
    expect(result!.port).toBe(80);
    expect(result!.host).toBe("example.com");
    expect(result!.path).toBe("/healthcheck");
  });

  test("should use default port for https with path when port is omitted", () => {
    const result = parseTarget("https://example.com/status");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("https");
    expect(result!.port).toBe(443);
    expect(result!.host).toBe("example.com");
    expect(result!.path).toBe("/status");
  });

  test("should parse postgresql protocol with explicit port", () => {
    const result = parseTarget("postgresql://db.example.com:5432");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("postgresql");
    expect(result!.port).toBe(5432);
    expect(result!.host).toBe("db.example.com");
    expect(result!.path).toBeUndefined();
  });

  test("should use default port 5432 for postgresql when port is omitted", () => {
    const result = parseTarget("postgresql://db.example.com");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("postgresql");
    expect(result!.port).toBe(5432);
    expect(result!.host).toBe("db.example.com");
  });

  test("should parse mysql protocol with explicit port", () => {
    const result = parseTarget("mysql://db.example.com:3306");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("mysql");
    expect(result!.port).toBe(3306);
    expect(result!.host).toBe("db.example.com");
    expect(result!.path).toBeUndefined();
  });

  test("should use default port 3306 for mysql when port is omitted", () => {
    const result = parseTarget("mysql://db.example.com");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("mysql");
    expect(result!.port).toBe(3306);
    expect(result!.host).toBe("db.example.com");
  });

  test("should default to none protocol when no scheme is given", () => {
    const result = parseTarget("localhost:9090");
    expect(result).toBeDefined();
    expect(result!.protocol).toBe("none");
    expect(result!.host).toBe("localhost");
    expect(result!.port).toBe(9090);
  });
});
