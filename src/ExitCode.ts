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

import { StatusCode, type PollStatus, type StatusCodeOf } from "./ConnectionStatus";

/**
 * Exit codes for the CLI tool.
 *
 * | Exit Code | Meaning                              |
 * |-----------|--------------------------------------|
 * | 0         | Connection success                   |
 * | 1         | Timeout                              |
 * | 2         | Validation error (invalid arguments) |
 * | 3         | Unknown error                        |
 * | 4         | Connection error (host not found)    |
 */
export const ExitCode = {
  SUCCESS: 0,
  TIMEOUT: 1,
  VALIDATION_ERROR: 2,
  UNKNOWN_ERROR: 3,
  CONNECTION_ERROR: 4,
} as const;
export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

const codeToExitCode: Record<StatusCodeOf<PollStatus>, ExitCode> = {
  [StatusCode.CONNECTED]: ExitCode.SUCCESS,
  [StatusCode.TIMEOUT]: ExitCode.TIMEOUT,
  [StatusCode.HOST_NOT_FOUND]: ExitCode.CONNECTION_ERROR,
  [StatusCode.UNKNOWN]: ExitCode.UNKNOWN_ERROR,
  [StatusCode.INVALID_PROTOCOL]: ExitCode.UNKNOWN_ERROR,
  [StatusCode.PROTOCOL_NOT_SUPPORTED]: ExitCode.UNKNOWN_ERROR,
};

export function toExitCode(s: PollStatus): ExitCode {
  return codeToExitCode[s.code];
}
