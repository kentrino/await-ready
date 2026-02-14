# await-ready

**Protocol-aware readiness check for npm scripts and Docker Compose**

A small, **zero-dependency** CLI to wait for a service to be _actually_ ready, not just listening. Supports HTTP, PostgreSQL, MySQL, and Redis handshakes out of the box.

Typical use: pair `docker compose up -d` with `await-ready` in your `package.json` scripts (e.g. `db:ready`) so it blocks until the service is actually accepting connections.

## Install

```bash
# Global install
npm install -g await-ready

# Or run without installing
npx await-ready localhost:3000
bunx await-ready localhost:3000
```

## Quick Start

```bash
# Wait for a local dev server on port 3000
await-ready 3000

# Wait for PostgreSQL to accept connections
await-ready postgresql://localhost:5432

# Wait for Redis, with a 30-second timeout
await-ready redis://localhost:6379 --timeout 30000

# Wait for an HTTP health endpoint to respond
await-ready http://localhost:8080/healthz
```

## Usage

```
await-ready [target] [options]
```

### Target formats

The positional `target` argument is flexible:

| Format                      | Example                         | Result                            |
| --------------------------- | ------------------------------- | --------------------------------- |
| Port only                   | `3000`                          | `localhost:3000` (TCP)            |
| `:port`                     | `:8080`                         | `localhost:8080` (TCP)            |
| `host:port`                 | `myapp:3000`                    | `myapp:3000` (TCP)                |
| URL with protocol           | `http://localhost:5000/healthz` | `localhost:5000` (HTTP) with path |
| Protocol URL                | `postgresql://db:5432`          | `db:5432` (PostgreSQL handshake)  |
| Protocol URL (default port) | `redis://cache`                 | `cache:6379` (Redis handshake)    |

If no target is given, use `--host` and `--port` (`-p`) instead.

### Options

| Option           | Alias | Default     | Description                                                                      |
| ---------------- | ----- | ----------- | -------------------------------------------------------------------------------- |
| `--host`         |       | `localhost` | Host to connect to                                                               |
| `--port`         | `-p`  |             | Port to connect to                                                               |
| `--timeout`      |       | `10000`     | Timeout in ms (`0` = wait forever)                                               |
| `--protocol`     |       | `none`      | Protocol to check: `http`, `https`, `postgresql`, `pg`, `mysql`, `redis`, `none` |
| `--interval`     |       | `1000`      | Retry interval in ms                                                             |
| `--output`       |       | `dots`      | Output mode: `dots`, `spinner`, `sl`, `silent`                                   |
| `--silent`       | `-s`  | `false`     | Suppress all output (shorthand for `--output silent`)                            |
| `--wait-for-dns` |       | `false`     | Don't fail on DNS lookup errors -- keep retrying until the name resolves         |

## Protocols

When `--protocol` is `none` (the default), `await-ready` performs a plain TCP
connect. For application-level protocols it goes one step further:

| Protocol         | What it checks                                                                |
| ---------------- | ----------------------------------------------------------------------------- |
| `none`           | TCP socket opens successfully                                                 |
| `http` / `https` | Sends `GET <path> HTTP/1.1` and verifies a valid HTTP status line is returned |
| `postgresql`     | Sends an SSLRequest and waits for the server's `S` / `N` handshake byte       |
| `mysql`          | Waits for the MySQL handshake packet (protocol version 10)                    |
| `redis`          | Sends `PING` and accepts `+PONG` or an auth/loading error as "alive"          |

> **Tip:** You can alias `pg` to `postgresql` on the command line:
> `--protocol pg`

## Exit Codes

Compatible with [wait-port](https://github.com/dwmkerr/wait-port) -- drop-in
replacement in existing scripts.

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| `0`  | Service is reachable                       |
| `1`  | Timeout -- service did not respond in time |
| `2`  | Invalid arguments (validation error)       |
| `3`  | Unknown / unexpected error                 |
| `4`  | Host not found (DNS resolution failed)     |

## Output Modes

| Mode      | Description                                                         |
| --------- | ------------------------------------------------------------------- |
| `dots`    | Prints a `.` on every retry (default)                               |
| `spinner` | Animated spinner (falls back to dots outside a TTY)                 |
| `sl`      | ASCII steam locomotive animation (falls back to dots outside a TTY) |
| `silent`  | No output at all                                                    |

## Examples

### package.json scripts -- start and wait for a database

```jsonc
{
  "scripts": {
    "db:start": "docker compose up -d mysql",
    "db:ready": "await-ready mysql://localhost:3306 --timeout 30000",
    "db:setup": "npm run db:start && npm run db:ready && npm run db:migrate",
    "db:migrate": "prisma migrate deploy",
  },
}
```

### Docker Compose -- wait for Postgres before running migrations

```yaml
services:
  db:
    image: postgres:17
    ports:
      - "5432:5432"

  migrate:
    image: node:22
    depends_on:
      - db
    command: >
      sh -c "
        npx await-ready postgresql://db:5432 --timeout 30000 &&
        npx prisma migrate deploy
      "
```

### CI pipeline -- wait for the app to boot

```yaml
# GitHub Actions
steps:
  - run: npm start &
  - run: npx await-ready 3000 --timeout 15000
  - run: npm test
```

### Shell script

```bash
#!/usr/bin/env bash
set -e

echo "Starting services..."
docker compose up -d

# Wait for both services
npx await-ready postgresql://localhost:5432 --timeout 30000
npx await-ready redis://localhost:6379      --timeout 10000

echo "All services ready -- running tests"
npm test
```

### Wait for DNS to propagate

```bash
# Useful when a container or cloud service hasn't registered its hostname yet
await-ready myservice:3000 --wait-for-dns --timeout 60000
```

## Programmatic API

`await-ready` also exports a Node.js / Bun-compatible API:

```ts
import { awaitReady } from "await-ready";

const result = await awaitReady({
  host: "localhost",
  port: 5432,
  timeout: 10_000,
  protocol: "postgresql",
  interval: 1_000,
  path: undefined,
  waitForDns: false,
});

if (result.success) {
  console.log("Database is ready!");
} else {
  console.error(result.error.type, result.error.message);
}
```

You can also parse CLI-style argument arrays with `parseArgs` (available as a
separate entry point at `await-ready/parseArgs`) and feed the result directly
into `awaitReady`:

```ts
import { awaitReady } from "await-ready";
import { parseArgs } from "await-ready/parseArgs";

const parsed = parseArgs(process.argv.slice(2));
if (!parsed.success) {
  console.error(parsed.error);
  process.exit(1);
}

const result = await awaitReady(parsed.value);
if (result.success) {
  console.log("Ready!");
}
```

## Acknowledgements

This project is heavily inspired by
[wait-port](https://github.com/dwmkerr/wait-port) by Dave Kerr. The target
parsing logic and connection retry strategy are derived from wait-port's
implementation (MIT licensed). Thank you for the excellent groundwork!

## License

[MIT](./LICENSE) &copy; Kento Haneda
