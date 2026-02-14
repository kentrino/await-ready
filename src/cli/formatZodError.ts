import type { ZodError } from "zod";
import type { $ZodIssue } from "zod/v4/core";

import type { AwaitReadyArgumentError, AwaitReadyArgumentErrorIssue } from "../AwaitReadyResult";

export function formatZodError(error: ZodError): AwaitReadyArgumentError {
  return {
    type: "ArgumentError",
    issues: error.issues.map(formatZodIssue),
    message: error.message,
    cause: error,
  };
}

function formatZodIssue(issue: $ZodIssue): AwaitReadyArgumentErrorIssue {
  return {
    message: issue.message,
    path: issue.path,
    code: issue.code,
    expected: "expected" in issue ? issue.expected : undefined,
  };
}
