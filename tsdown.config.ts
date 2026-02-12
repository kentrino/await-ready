import { defineConfig } from "tsdown";

import pkg from "./package.json" with { type: "json" };

export default defineConfig([
  {
    entry: ["src/main.ts"],
    format: "esm",
    clean: true,
    banner: { js: "#!/usr/bin/env node" },
    define: {
      __VERSION__: JSON.stringify(pkg.version),
    },
  },
  {
    entry: ["src/index.ts"],
    format: "esm",
    dts: true,
  },
]);
