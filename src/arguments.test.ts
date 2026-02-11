import { parseArgs } from "citty";
import { describe, expect, test } from "vitest";

import { args, Args } from "./arguments";

function parse(raw: string) {
  const rawArgs = raw.split(/\s+/).filter(Boolean);
  const parsed = parseArgs(rawArgs, args);
  return Args.parse(parsed);
}

describe("Args", () => {
  describe("canonical path (flags)", () => {
    test("should parse --host and -p flags", () => {
      const result = parse("--host 127.0.0.1 -p 3000");
      expect(result.host).toBe("127.0.0.1");
      expect(result.port).toBe(3000);
      expect(result.protocol).toBe("none");
    });

    test("should use default host when only -p is given", () => {
      const result = parse("-p 8080");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(8080);
    });

    test("should parse all flags together", () => {
      const result = parse("-p 5432 --protocol postgresql --timeout 5000 --interval 200 --wait-for-dns");
      expect(result.port).toBe(5432);
      expect(result.protocol).toBe("postgresql");
      expect(result.timeout).toBe(5000);
      expect(result.interval).toBe(200);
      expect(result["wait-for-dns"]).toBe(true);
    });

    test("should accept mysql protocol", () => {
      const result = parse("-p 3306 --protocol mysql");
      expect(result.protocol).toBe("mysql");
    });

    test("should accept http protocol", () => {
      const result = parse("-p 8080 --protocol http");
      expect(result.protocol).toBe("http");
    });

    test("should accept pg as an alias for postgresql", () => {
      const result = parse("-p 5432 --protocol pg");
      expect(result.protocol).toBe("postgresql");
    });

    test("should reject invalid protocol", () => {
      expect(() => parse("-p 8080 --protocol ftp")).toThrow();
    });

    test("should reject port out of range", () => {
      expect(() => parse("-p 0")).toThrow();
      expect(() => parse("-p 65536")).toThrow();
    });

    test("should reject missing port when no target", () => {
      expect(() => parse("--host localhost")).toThrow();
    });

    test("should use default timeout and interval", () => {
      const result = parse("-p 8080");
      expect(result.timeout).toBe(10000);
      expect(result.interval).toBe(1000);
      expect(result["wait-for-dns"]).toBe(false);
    });

    test("should default output to dots", () => {
      const result = parse("-p 8080");
      expect(result.output).toBe("dots");
    });

    test("should accept --output spinner", () => {
      const result = parse("-p 8080 --output spinner");
      expect(result.output).toBe("spinner");
    });

    test("should accept --output sl", () => {
      const result = parse("-p 8080 --output sl");
      expect(result.output).toBe("sl");
    });

    test("should accept --output silent", () => {
      const result = parse("-p 8080 --output silent");
      expect(result.output).toBe("silent");
    });

    test("should override output to silent when --silent is set", () => {
      const result = parse("-p 8080 --output dots --silent");
      expect(result.output).toBe("silent");
    });

    test("should set output to silent with -s shorthand", () => {
      const result = parse("-p 8080 -s");
      expect(result.output).toBe("silent");
    });
  });

  describe("with-target path (positional)", () => {
    test("should parse port-only target", () => {
      const result = parse("3000");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(3000);
    });

    test("should parse host:port target", () => {
      const result = parse("myhost:4000");
      expect(result.host).toBe("myhost");
      expect(result.port).toBe(4000);
    });

    test("should parse target with protocol and path", () => {
      const result = parse("http://api.example.com:9000/health");
      expect(result.protocol).toBe("http");
      expect(result.host).toBe("api.example.com");
      expect(result.port).toBe(9000);
      expect(result.path).toBe("/health");
    });

    test("should parse :port target", () => {
      const result = parse(":8080");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(8080);
    });

    test("should carry flags alongside target", () => {
      const result = parse("localhost:5432 --timeout 5000 --interval 200 --wait-for-dns");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(5432);
      expect(result.timeout).toBe(5000);
      expect(result.interval).toBe(200);
      expect(result["wait-for-dns"]).toBe(true);
    });

    test("should fail on invalid target", () => {
      expect(() => parse("not:a:target")).toThrow();
    });

    test("should parse postgresql:// target with default port", () => {
      const result = parse("postgresql://localhost");
      expect(result.protocol).toBe("postgresql");
      expect(result.host).toBe("localhost");
      expect(result.port).toBe(5432);
    });

    test("should parse mysql:// target with explicit port", () => {
      const result = parse("mysql://db.local:3307");
      expect(result.protocol).toBe("mysql");
      expect(result.host).toBe("db.local");
      expect(result.port).toBe(3307);
    });
  });

  describe("shared field validation", () => {
    test("should reject negative timeout", () => {
      expect(() => parse("-p 8080 --timeout -1")).toThrow();
    });

    test("should accept zero timeout", () => {
      const result = parse("-p 8080 --timeout 0");
      expect(result.timeout).toBe(0);
    });

    test("should reject interval below 10", () => {
      expect(() => parse("-p 8080 --interval 9")).toThrow();
    });

    test("should accept interval of exactly 10", () => {
      const result = parse("-p 8080 --interval 10");
      expect(result.interval).toBe(10);
    });
  });
});
