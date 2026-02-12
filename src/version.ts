/**
 * Package version.
 *
 * In production builds, `__VERSION__` is replaced at build time by tsdown `define`.
 * In dev mode (`bun run src/main.ts`), the identifier is undeclared and throws
 * a ReferenceError, so we fall back to reading `package.json` at runtime.
 */
let version: string;

declare const __VERSION__: string;

try {
  version = __VERSION__;
} catch {
  version = require("../package.json").version;
}

export const VERSION: string = version;
