import * as z from "zod";

export const OutputMode = z.enum(["dots", "spinner", "sl", "silent"]);
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
      process.stdout.write(
        `\x1b[2K\r\x1b[32m✔\x1b[0m Connected to ${host}:${port} (${formatElapsed(elapsedMs)})\n`,
      );
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
// SL (Steam Locomotive) — inspired by mtoyoda/sl
// ---------------------------------------------------------------------------

// LOGO-style locomotive body (top 4 lines are constant across wheel patterns)
const SL_BODY = [
  "      ++ +------",
  "      || |+-+ |",
  " /---------|| | |",
  " + ======== +-+ |",
] as const;

// 6 wheel animation patterns — the connecting rod oscillates between upper
// and lower positions to create the illusion of rotating wheels.
const SL_WHEELS: readonly [string, string][] = [
  [" _|--O========O~\\-+", "//// \\_/   \\_/"],
  [" _|--/O========O\\-+", "//// \\_/   \\_/"],
  [" _|--/~O========O-+", "//// \\_/   \\_/"],
  [" _|--/~\\------/~\\-+", "//// \\_O========O"],
  [" _|--/~\\------/~\\-+", "//// \\O========O/"],
  [" _|--/~\\------/~\\-+", "//// O========O_/"],
];

// Coal tender (follows behind the locomotive at COAL_OFFSET)
const SL_COAL = [
  "____",
  "|  \\@@@@@@@@@@@",
  "|   \\@@@@@@@@@@@@@_",
  "|                  |",
  "|__________________|",
  "   (O)       (O)",
] as const;

const SL_TRAIN_HEIGHT = 6;
const SL_COAL_OFFSET = 21;
const SL_TRAIN_WIDTH = 42; // loco (~20) + gap + coal (~20)
const SL_SMOKE_HEIGHT = 3;
const SL_TOTAL_HEIGHT = SL_SMOKE_HEIGHT + SL_TRAIN_HEIGHT + 1; // smoke + train + status
const SL_FUNNEL = 6; // column offset of the funnel (the ++ on line 0)

// Smoke shapes at successive ages — two alternating "kinds" (light / heavy).
const SL_SMOKE_SHAPES: readonly string[][] = [
  ["(   )", "(  )", "( )", "()", "()", "O", "O", "o", ".", " "],
  ["(@@@)", "(@@)", "(@)", "@@", "@@", "@", "@", "@", ".", " "],
];
const SL_SMOKE_DY = [1, 1, 1, 0, 0, 0, 0, 0, 0, 0] as const;
const SL_SMOKE_DX = [-1, 0, 1, 1, 1, 1, 2, 2, 2, 3] as const;

type SmokeParticle = { col: number; row: number; age: number; kind: number };

function createSlOutput(): OutputStrategy {
  let timer: ReturnType<typeof setInterval> | undefined;
  let position = 0;
  let statusText = "";
  let initialized = false;
  const smokes: SmokeParticle[] = [];
  let smokeEmitCounter = 0;

  function getTrainLines(wheelIdx: number): string[] {
    const w = SL_WHEELS[wheelIdx]!;
    return [...SL_BODY, w[0], w[1]];
  }

  function updateSmoke(funnelCol: number) {
    // Update existing particles (move, then age)
    for (let i = smokes.length - 1; i >= 0; i--) {
      const p = smokes[i]!;
      if (p.age < SL_SMOKE_DY.length) {
        p.row -= SL_SMOKE_DY[p.age]!;
        p.col += SL_SMOKE_DX[p.age]!;
      }
      p.age++;
      // Remove expired / off-screen particles
      if (p.age >= SL_SMOKE_SHAPES[0]!.length || p.row < 0) {
        smokes.splice(i, 1);
      }
    }

    // Emit a new particle every 4 steps
    smokeEmitCounter++;
    if (smokeEmitCounter % 4 === 0) {
      smokes.push({
        col: funnelCol,
        row: SL_SMOKE_HEIGHT - 1, // bottom smoke row, just above the train
        age: 0,
        kind: Math.floor(smokeEmitCounter / 4) % 2,
      });
    }
  }

  function render() {
    const cols = process.stdout.columns || 80;
    const wheelIdx = Math.floor(Math.abs(position) / 3) % 6;
    const locoLines = getTrainLines(wheelIdx);

    updateSmoke(position + SL_FUNNEL);

    let output = "";

    if (initialized) {
      // Move cursor up to the top of our drawing area to overwrite
      output += `\x1b[${SL_TOTAL_HEIGHT - 1}A\r`;
    }
    initialized = true;

    // --- Smoke lines ---
    for (let s = 0; s < SL_SMOKE_HEIGHT; s++) {
      const buf = new Array(cols).fill(" ");
      for (const p of smokes) {
        if (p.row === s && p.age < SL_SMOKE_SHAPES[0]!.length) {
          const shape = SL_SMOKE_SHAPES[p.kind]![p.age]!;
          for (let j = 0; j < shape.length; j++) {
            const col = p.col + j;
            if (col >= 0 && col < cols && shape[j] !== " ") {
              buf[col] = shape[j];
            }
          }
        }
      }
      output += "\x1b[2K" + buf.join("") + "\n";
    }

    // --- Train lines ---
    for (let row = 0; row < SL_TRAIN_HEIGHT; row++) {
      const buf = new Array(cols).fill(" ");

      // Locomotive
      const locoLine = locoLines[row]!;
      for (let j = 0; j < locoLine.length; j++) {
        const col = position + j;
        if (col >= 0 && col < cols) buf[col] = locoLine[j];
      }

      // Coal tender
      const coalLine = SL_COAL[row]!;
      for (let j = 0; j < coalLine.length; j++) {
        const col = position + SL_COAL_OFFSET + j;
        if (col >= 0 && col < cols) buf[col] = coalLine[j];
      }

      output += "\x1b[2K" + buf.join("") + "\n";
    }

    // --- Status line (no trailing newline) ---
    output += `\x1b[2K\x1b[33m🚂\x1b[0m ${statusText}`;

    process.stdout.write(output);

    position--;
    if (position < -SL_TRAIN_WIDTH) {
      position = cols;
    }
  }

  function clearArea(): string {
    let output = "";
    if (initialized) {
      output += `\x1b[${SL_TOTAL_HEIGHT - 1}A\r`;
    }
    for (let i = 0; i < SL_TOTAL_HEIGHT - 1; i++) {
      output += "\x1b[2K\n";
    }
    output += "\x1b[2K";
    // Move back to the first line
    output += `\x1b[${SL_TOTAL_HEIGHT - 1}A\r`;
    return output;
  }

  return {
    onStart(host, port) {
      position = process.stdout.columns || 80;
      statusText = `Connecting to ${host}:${port}...`;
      process.stdout.write("\x1b[?25l"); // hide cursor
      render();
      timer = setInterval(render, 20);
    },
    onRetry(attempt, elapsedMs) {
      statusText = `Waiting... (attempt ${attempt}, ${formatElapsed(elapsedMs)})`;
    },
    onSuccess(host, port, elapsedMs) {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      let output = clearArea();
      output += "\x1b[?25h"; // show cursor
      output += `\x1b[32m✔\x1b[0m Connected to ${host}:${port} (${formatElapsed(elapsedMs)})\n`;
      process.stdout.write(output);
    },
    onFailure(message, elapsedMs) {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      let output = clearArea();
      output += "\x1b[?25h"; // show cursor
      process.stdout.write(output);
      process.stderr.write(`\x1b[31m✖\x1b[0m ${message} (${formatElapsed(elapsedMs)})\n`);
    },
    dispose() {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      process.stdout.write("\x1b[?25h"); // show cursor
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
    case "sl":
      // Fall back to dots when stdout is not a TTY (no cursor control).
      if (!process.stdout.isTTY) return createDotsOutput();
      return createSlOutput();
    case "silent":
      return createSilentOutput();
  }
}
