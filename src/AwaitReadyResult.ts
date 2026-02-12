import type { ZodError } from "zod";
import type { $ZodIssue } from "zod/v4/core";

export type AwaitReadyResult<T> = AwaitReadySuccess<T> | AwaitReadyFailure;

export interface AwaitReadySuccess<T> {
  success: true;
  value: T;
}

export interface AwaitReadyFailure {
  success: false;
  error: AwaitReadyError;
}

export interface AwaitReadyError {
  type:
    | "ArgumentError"
    | "UnknownError"
    | "TimeoutError"
    | "HostNotFoundError"
    | "InvalidProtocolError";
  message: string;
  cause?: Error;
}
type __assertion_AwaitReadyError = Satisfies<
  AwaitReadyError,
  AwaitReadyArgumentError | AwaitReadyUnknownError
>;
type Satisfies<Constraint, Target extends Constraint> = Target;

export interface AwaitReadyUnknownError {
  type: "UnknownError";
  message: string;
}

export interface AwaitReadyArgumentError {
  type: "ArgumentError";
  issues: AwaitReadyArgumentErrorIssue[];
  message: string;
  name: string;
  cause?: Error;
}

// ported from $ZodInvalidTypeExpected
export type AwaitReadyArgumentErrorExpected =
  | "string"
  | "number"
  | "int"
  | "boolean"
  | "bigint"
  | "symbol"
  | "undefined"
  | "null"
  | "never"
  | "void"
  | "date"
  | "array"
  | "object"
  | "tuple"
  | "record"
  | "map"
  | "set"
  | "file"
  | "nonoptional"
  | "nan"
  | "function"
  | (string & {});

export interface AwaitReadyArgumentErrorIssue {
  message: string;
  path: (string | number | symbol)[];
  code: string;
  expected?: AwaitReadyArgumentErrorExpected;
}

export function formatZodError(error: ZodError): AwaitReadyArgumentError {
  return {
    type: "ArgumentError",
    issues: error.issues.map(formatZodIssue),
    message: error.message,
    name: error.name,
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
