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
  type: "ArgumentValidationError" | "UnknownError" | "ArgumentError";
  message: string;
  cause?: Error;
}
type __assertion_AwaitReadyError = Satisfies<
  AwaitReadyError,
  AwaitReadyValidationError | AwaitReadyUnknownError
>;
type Satisfies<Constraint, Target extends Constraint> = Target;

export interface AwaitReadyUnknownError {
  type: "UnknownError";
  message: string;
}

export interface AwaitReadyArgumentError {
  type: "ArgumentError";
  message: string;
  cause?: Error;
}

export interface AwaitReadyValidationError {
  type: "ArgumentValidationError";
  issues: AwaitReadyValidationErrorIssue[];
  message: string;
  name: string;
  cause?: Error;
}

// ported from $ZodInvalidTypeExpected
export type AwaitReadyValidationErrorExpected =
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

export interface AwaitReadyValidationErrorIssue {
  message: string;
  path: (string | number | symbol)[];
  code: string;
  expected?: AwaitReadyValidationErrorExpected;
}

export function formatZodError(error: ZodError): AwaitReadyValidationError {
  return {
    type: "ArgumentValidationError",
    issues: error.issues.map(formatZodIssue),
    message: error.message,
    name: error.name,
    cause: error,
  };
}

function formatZodIssue(issue: $ZodIssue): AwaitReadyValidationErrorIssue {
  return {
    message: issue.message,
    path: issue.path,
    code: issue.code,
    expected: "expected" in issue ? issue.expected : undefined,
  };
}
