import * as z from "zod";

export const OutputMode = z.enum(["dots", "spinner", "silent"]);
export type OutputMode = z.infer<typeof OutputMode>;

export type OutputStrategy = {
  /** Called once before the first poll attempt. */
  onStart(host: string, port: number): void;
  /** Called after a failed attempt, right before the retry delay. */
  onRetry(attempt: number, elapsedMs: number): void;
  /** Called when the connection succeeds. */
  onSuccess(host: string, port: number, elapsedMs: number): void;
  /** Called when the connection fails (timeout, host not found, etc.). */
  onFailure(message: string, elapsedMs: number): void;
  /** Clean up resources (e.g. timers). */
  dispose(): void;
};

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ---------------------------------------------------------------------------
// Silent
// ---------------------------------------------------------------------------

function createSilentOutput(): OutputStrategy {
  return {
    onStart() {},
    onRetry() {},
    onSuccess() {},
    onFailure() {},
    dispose() {},
  };
}

// ---------------------------------------------------------------------------
// Dots
// ---------------------------------------------------------------------------

function createDotsOutput(): OutputStrategy {
  let dotsPrinted = false;
  return {
    onStart() {},
    onRetry() {
      dotsPrinted = true;
      process.stdout.write(".");
    },
    onSuccess(host, port, elapsedMs) {
      if (dotsPrinted) process.stdout.write("\n");
      process.stdout.write(`✔ Connected to ${host}:${port} (${formatElapsed(elapsedMs)})\n`);
    },
    onFailure(message, elapsedMs) {
      if (dotsPrinted) process.stdout.write("\n");
      process.stderr.write(`✖ ${message} (${formatElapsed(elapsedMs)})\n`);
    },
    dispose() {},
  };
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

function createSpinnerOutput(): OutputStrategy {
  let frameIndex = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let currentText = "";

  function render() {
    const frame = SPINNER_FRAMES[frameIndex % SPINNER_FRAMES.length];
    process.stdout.write(`\x1b[2K\r\x1b[33m${frame}\x1b[0m ${currentText}`);
    frameIndex++;
  }

  function startTimer() {
    if (!timer) {
      timer = setInterval(render, 80);
    }
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  }

  return {
    onStart(host, port) {
      currentText = `Connecting to ${host}:${port}...`;
      startTimer();
      render();
    },
    onRetry(attempt, elapsedMs) {
      currentText = `Waiting... (attempt ${attempt}, ${formatElapsed(elapsedMs)})`;
      render();
    },
    onSuccess(host, port, elapsedMs) {
      stopTimer();
      process.stdout.write(`\x1b[2K\r\x1b[32m✔\x1b[0m Connected to ${host}:${port} (${formatElapsed(elapsedMs)})\n`);
    },
    onFailure(message, elapsedMs) {
      stopTimer();
      process.stdout.write(`\x1b[2K\r`);
      process.stderr.write(`\x1b[31m✖\x1b[0m ${message} (${formatElapsed(elapsedMs)})\n`);
    },
    dispose() {
      stopTimer();
    },
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createOutput(mode: OutputMode): OutputStrategy {
  switch (mode) {
    case "dots":
      return createDotsOutput();
    case "spinner":
      // Fall back to dots when stdout is not a TTY (no cursor control).
      if (!process.stdout.isTTY) return createDotsOutput();
      return createSpinnerOutput();
    case "silent":
      return createSilentOutput();
  }
}
