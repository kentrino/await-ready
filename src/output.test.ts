import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createOutput } from "./output";
import { trimIndent } from "./util/trimIndent";

/** Strip ANSI escape codes and bare carriage returns for easier assertions. */
function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r/g, "");
}

describe("createOutput - sl mode", () => {
  let stdoutChunks: string[];
  let stderrChunks: string[];
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;
  const savedDescriptors = {
    isTTY: Object.getOwnPropertyDescriptor(process.stdout, "isTTY"),
    columns: Object.getOwnPropertyDescriptor(process.stdout, "columns"),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    stdoutChunks = [];
    stderrChunks = [];

    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdoutChunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stdout.write;

    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderrChunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stderr.write;

    Object.defineProperty(process.stdout, "isTTY", { value: true, configurable: true });
    Object.defineProperty(process.stdout, "columns", { value: 80, configurable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
    if (savedDescriptors.isTTY) {
      Object.defineProperty(process.stdout, "isTTY", savedDescriptors.isTTY);
    }
    if (savedDescriptors.columns) {
      Object.defineProperty(process.stdout, "columns", savedDescriptors.columns);
    }
  });

  function stdout(): string {
    return stdoutChunks.join("");
  }

  function stderr(): string {
    return stderrChunks.join("");
  }

  // -------------------------------------------------------------------------
  // TTY fallback
  // -------------------------------------------------------------------------

  test("should fall back to dots output when stdout is not a TTY", () => {
    Object.defineProperty(process.stdout, "isTTY", { value: false, configurable: true });
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    output.onRetry(1, 100);
    // Dots mode writes "." on retry — SL mode does not
    expect(stdout()).toContain(".");
    // Should NOT emit cursor-hide (an SL-specific behavior)
    expect(stdout()).not.toContain("\x1b[?25l");
    output.dispose();
  });

  // -------------------------------------------------------------------------
  // Cursor visibility
  // -------------------------------------------------------------------------

  test("should hide cursor on start", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    expect(stdout()).toContain("\x1b[?25l");
    output.dispose();
  });

  test("should show cursor on success", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    stdoutChunks.length = 0;
    output.onSuccess("localhost", 3000, 100);
    expect(stdout()).toContain("\x1b[?25h");
  });

  test("should show cursor on failure", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    stdoutChunks.length = 0;
    output.onFailure("Timed out", 5000);
    expect(stdout()).toContain("\x1b[?25h");
  });

  test("should show cursor on dispose", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    stdoutChunks.length = 0;
    output.dispose();
    expect(stdout()).toContain("\x1b[?25h");
  });

  // -------------------------------------------------------------------------
  // Status text
  // -------------------------------------------------------------------------

  test("should show connection status on start", () => {
    const output = createOutput("sl");
    output.onStart("myhost", 5432);
    expect(stripAnsi(stdout())).toContain("Connecting to myhost:5432...");
    output.dispose();
  });

  test("should update status text on retry", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    output.onRetry(3, 2500);
    stdoutChunks.length = 0;
    vi.advanceTimersByTime(20); // trigger one re-render
    expect(stripAnsi(stdout())).toContain("Waiting... (attempt 3, 2.5s)");
    output.dispose();
  });

  // -------------------------------------------------------------------------
  // Locomotive rendering
  // -------------------------------------------------------------------------

  test("should render locomotive body after train scrolls into view", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    // Train starts at position = columns (80) and moves left 1 col/frame.
    // After ~60 frames the body (starting at col ~20) is fully visible.
    vi.advanceTimersByTime(1200);
    const text = stripAnsi(stdout());
    expect(text).toContain("++ +------");
    expect(text).toContain("/---------");
    expect(text).toContain("======== +-+");
    output.dispose();
  });

  test("should render coal tender after train scrolls into view", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    vi.advanceTimersByTime(1200);
    const text = stripAnsi(stdout());
    expect(text).toContain("@@@@@@@@@@@");
    expect(text).toContain("__________________|");
    expect(text).toContain("(O)       (O)");
    output.dispose();
  });

  // -------------------------------------------------------------------------
  // Animation
  // -------------------------------------------------------------------------

  test("should produce different output on successive frames", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);

    stdoutChunks.length = 0;
    vi.advanceTimersByTime(20);
    const frame1 = stdout();

    stdoutChunks.length = 0;
    vi.advanceTimersByTime(20);
    const frame2 = stdout();

    expect(frame1).not.toBe(frame2);
    output.dispose();
  });

  test("should use cursor-up escape sequence for redrawing", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    vi.advanceTimersByTime(20);
    // SL_TOTAL_HEIGHT - 1 = 9 → \x1b[9A
    expect(stdout()).toContain("\x1b[9A");
    output.dispose();
  });

  test("should cycle through multiple wheel patterns", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    // wheelIdx = floor(abs(position) / 3) % 6 — after 18 position changes
    // all 6 patterns appear at least once.
    vi.advanceTimersByTime(1200);
    const text = stripAnsi(stdout());

    const patterns: string[] = [];
    // Patterns 0-2 have distinctive upper wheel lines
    if (text.includes("O========O~\\")) patterns.push("0");
    if (text.includes("/O========O\\")) patterns.push("1");
    if (text.includes("~O========O")) patterns.push("2");
    // Patterns 3-5 have distinctive lower wheel lines
    if (text.includes("\\_O========O")) patterns.push("3");
    if (text.includes("\\O========O/")) patterns.push("4");
    if (text.includes("O========O_/")) patterns.push("5");

    expect(patterns.length).toBeGreaterThanOrEqual(3);
    output.dispose();
  });

  test("should emit smoke particles above the train", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    // Smoke emits every 4 frames; funnel enters the screen after ~7 frames
    // (position 80 → 73, funnel at col 79).
    // After 2000ms (~100 frames) there should be visible smoke.
    vi.advanceTimersByTime(2000);
    const text = stripAnsi(stdout());
    // Kind-1 smoke shapes contain @ inside parentheses: (@@@), (@@), (@)
    // This is distinct from the coal tender which has \@@@ (no leading paren).
    expect(text).toMatch(/\(@+\)/);
    output.dispose();
  });

  // -------------------------------------------------------------------------
  // Train wrapping
  // -------------------------------------------------------------------------

  test("should not crash when train wraps around the screen", () => {
    Object.defineProperty(process.stdout, "columns", { value: 40, configurable: true });
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    // position starts at 40, wraps at < -42 → after 83 frames (1660ms)
    vi.advanceTimersByTime(2000);
    expect(stripAnsi(stdout()).length).toBeGreaterThan(0);
    output.dispose();
  });

  // -------------------------------------------------------------------------
  // Success / Failure messages
  // -------------------------------------------------------------------------

  test("should clear area and show success message", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    stdoutChunks.length = 0;
    output.onSuccess("localhost", 3000, 1234);
    const text = stripAnsi(stdout());
    expect(text).toContain("✔ Connected to localhost:3000 (1.2s)");
  });

  test("should clear area and show failure message on stderr", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    stdoutChunks.length = 0;
    stderrChunks.length = 0;
    output.onFailure("Timed out waiting for localhost:3000", 10000);
    const text = stripAnsi(stderr());
    expect(text).toContain("✖ Timed out waiting for localhost:3000 (10.0s)");
  });

  // -------------------------------------------------------------------------
  // Timer cleanup
  // -------------------------------------------------------------------------

  test("should stop producing output after dispose", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    output.dispose();
    stdoutChunks.length = 0;
    vi.advanceTimersByTime(1000);
    expect(stdout()).toBe("");
  });

  test("should stop producing output after success", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    output.onSuccess("localhost", 3000, 100);
    stdoutChunks.length = 0;
    vi.advanceTimersByTime(1000);
    expect(stdout()).toBe("");
  });

  test("should stop producing output after failure", () => {
    const output = createOutput("sl");
    output.onStart("localhost", 3000);
    output.onFailure("error", 100);
    stdoutChunks.length = 0;
    stderrChunks.length = 0;
    vi.advanceTimersByTime(1000);
    expect(stdout()).toBe("");
    expect(stderr()).toBe("");
  });

  // -------------------------------------------------------------------------
  // Train shape — visual verification of the ASCII art
  // -------------------------------------------------------------------------

  describe("train shape", () => {
    /**
     * Extract the 6 train lines from a single rendered frame, strip the
     * buffer-position indent, and right-trim each line.
     *
     * Frame layout (10 lines total):
     *   Lines 0-2:  Smoke area  (SL_SMOKE_HEIGHT = 3)
     *   Lines 3-8:  Train body  (SL_TRAIN_HEIGHT = 6)
     *   Line  9:    Status bar
     */
    function extractTrainShape(frame: string): string {
      const stripped = stripAnsi(frame).replace(/\r/g, "");
      const lines = stripped.split("\n");
      const trainLines = lines.slice(3, 9).map((l) => l.trimEnd());
      const minIndent = Math.min(
        ...trainLines
          .filter((l) => l.length > 0)
          .map((l) => l.match(/^\s*/)![0].length),
      );
      return trainLines.map((l) => l.slice(minIndent)).join("\n");
    }

    /**
     * Advance fake timers so the next render() draws at `targetPosition`,
     * then capture that single frame.
     *
     * Timeline after onStart (columns = cols):
     *   onStart: render at pos=cols → pos becomes cols-1, timer starts (20ms)
     *   Tick n  : render at pos=cols-n → pos becomes cols-n-1
     *
     * To render at targetPosition: cols - n = targetPosition → n = cols - targetPosition
     */
    function captureFrameAt(targetPosition: number, cols: number): string {
      const ticksToTarget = cols - targetPosition;
      if (ticksToTarget > 1) {
        vi.advanceTimersByTime((ticksToTarget - 1) * 20);
      }
      stdoutChunks.length = 0;
      vi.advanceTimersByTime(20);
      return stdoutChunks[0] ?? "";
    }

    /**
     * Extract smoke (rows 0-2) + train (rows 3-8) from a single frame.
     * Uses the same indent normalization as extractTrainShape.
     */
    function extractFullShape(frame: string): string {
      const stripped = stripAnsi(frame).replace(/\r/g, "");
      const lines = stripped.split("\n");
      const displayLines = lines.slice(0, 9).map((l) => l.trimEnd());
      const minIndent = Math.min(
        ...displayLines
          .filter((l) => l.length > 0)
          .map((l) => l.match(/^\s*/)![0].length),
      );
      return displayLines.map((l) => l.slice(minIndent)).join("\n");
    }

    // wheelIdx = Math.floor(Math.abs(position) / 3) % 6
    //   position  0 → wheelIdx 0
    //   position  9 → wheelIdx 3

    test("wheel pattern 0: connecting rod on top, wheels below", () => {
      Object.defineProperty(process.stdout, "columns", { value: 60, configurable: true });
      const output = createOutput("sl");
      output.onStart("localhost", 3000);

      const frame = captureFrameAt(0, 60);
      const shape = extractTrainShape(frame);

      // prettier-ignore
      expect(shape).toBe(trimIndent`
            ++ +------     ____
            || |+-+ |      |  \@@@@@@@@@@@
       /---------|| | |    |   \@@@@@@@@@@@@@_
       + ======== +-+ |    |                  |
       _|--O========O~\-+  |__________________|
      //// \_/   \_/          (O)       (O)
      `);

      output.dispose();
    });

    test("wheel pattern 3: connecting rod at wheel level", () => {
      Object.defineProperty(process.stdout, "columns", { value: 60, configurable: true });
      const output = createOutput("sl");
      output.onStart("localhost", 3000);

      const frame = captureFrameAt(9, 60);
      const shape = extractTrainShape(frame);

      // prettier-ignore
      expect(shape).toBe(trimIndent`
            ++ +------     ____
            || |+-+ |      |  \@@@@@@@@@@@
       /---------|| | |    |   \@@@@@@@@@@@@@_
       + ======== +-+ |    |                  |
       _|--/~\------/~\-+  |__________________|
      //// \_O========O       (O)       (O)
      `);

      output.dispose();
    });

    // -----------------------------------------------------------------
    // Smoke — particles rise from the funnel and shrink as they age
    //
    // smokeEmitCounter increments each render; emits when counter % 4 === 0.
    // Kind alternates: floor(counter/4) % 2 → 0 (light) or 1 (heavy).
    // Each particle lives 3 frames, rising one row per frame:
    //   age 0: row 2 (just above the train)
    //   age 1: row 1
    //   age 2: row 0 (highest)
    //   age 3: removed (row goes to -1)
    // -----------------------------------------------------------------

    test("heavy smoke (@@@) just emitted above the funnel", () => {
      Object.defineProperty(process.stdout, "columns", { value: 80, configurable: true });
      const output = createOutput("sl");
      output.onStart("localhost", 3000);

      // Tick 43: position=37, counter→44 (44%4=0 → emission)
      // Particle: col=37+6=43, row=2, kind=1 (heavy), age=0, shape="(@@@)"
      // After normalize (indent 37): smoke at col 6, right above the funnel "++"
      const frame = captureFrameAt(37, 80);
      const shape = extractFullShape(frame);

      // prettier-ignore
      expect(shape).toBe(trimIndent`


            (@@@)
            ++ +------     ____
            || |+-+ |      |  \@@@@@@@@@@@
       /---------|| | |    |   \@@@@@@@@@@@@@_
       + ======== +-+ |    |                  |
       _|--O========O~\-+  |__________________|
      //// \_/   \_/          (O)       (O)
      `);

      output.dispose();
    });

    test("heavy smoke rises to row 1 and shrinks to (@@)", () => {
      Object.defineProperty(process.stdout, "columns", { value: 80, configurable: true });
      const output = createOutput("sl");
      output.onStart("localhost", 3000);

      // Tick 44: position=36, particle updated to row=1, col=42, age=1
      // After normalize (indent 36): col 42-36=6
      const frame = captureFrameAt(36, 80);
      const shape = extractFullShape(frame);

      // prettier-ignore
      expect(shape).toBe(trimIndent`

            (@@)

            ++ +------     ____
            || |+-+ |      |  \@@@@@@@@@@@
       /---------|| | |    |   \@@@@@@@@@@@@@_
       + ======== +-+ |    |                  |
       _|--O========O~\-+  |__________________|
      //// \_/   \_/          (O)       (O)
      `);

      output.dispose();
    });

    test("heavy smoke reaches row 0 and shrinks to (@)", () => {
      Object.defineProperty(process.stdout, "columns", { value: 80, configurable: true });
      const output = createOutput("sl");
      output.onStart("localhost", 3000);

      // Tick 45: position=35, particle updated to row=0, col=42, age=2
      // After normalize (indent 35): col 42-35=7 (drifted 1 col right)
      const frame = captureFrameAt(35, 80);
      const shape = extractFullShape(frame);

      // prettier-ignore
      expect(shape).toBe(trimIndent`
             (@)


            ++ +------     ____
            || |+-+ |      |  \@@@@@@@@@@@
       /---------|| | |    |   \@@@@@@@@@@@@@_
       + ======== +-+ |    |                  |
       _|--/~\------/~\-+  |__________________|
      //// O========O_/       (O)       (O)
      `);

      output.dispose();
    });

    test("light smoke (   ) just emitted above the funnel", () => {
      Object.defineProperty(process.stdout, "columns", { value: 80, configurable: true });
      const output = createOutput("sl");
      output.onStart("localhost", 3000);

      // Tick 47: position=33, counter→48 (48%4=0 → emission)
      // kind=floor(48/4)%2=0 (light), shape="(   )"
      // Only '(' and ')' are written (spaces skipped)
      // col=33+6=39, after normalize (indent 33): col 6
      const frame = captureFrameAt(33, 80);
      const shape = extractFullShape(frame);

      // prettier-ignore
      expect(shape).toBe(trimIndent`


            (   )
            ++ +------     ____
            || |+-+ |      |  \@@@@@@@@@@@
       /---------|| | |    |   \@@@@@@@@@@@@@_
       + ======== +-+ |    |                  |
       _|--/~\------/~\-+  |__________________|
      //// O========O_/       (O)       (O)
      `);

      output.dispose();
    });
  });
});
