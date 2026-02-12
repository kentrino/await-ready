export type AwaitReadyResult<T> = AwaitReadySuccess<T> | AwaitReadyFailure;

export interface AwaitReadySuccess<T> {
  success: true;
  value: T;
}

export interface AwaitReadyFailure {
  success: false;
  error: AwaitReadyArgumentError | AwaitReadyProbeError;
}

type __assertion_AwaitReadyFailure = Satisfies<
  {
    type:
      | "ArgumentError"
      | "UnknownError"
      | "TimeoutError"
      | "HostNotFoundError"
      | "InvalidProtocolError";
    message: string;
    cause?: Error;
  },
  AwaitReadyFailure["error"]
>;
type Satisfies<Constraint, Target extends Constraint> = Target;

export type AwaitReadyProbeError = {
  type: "TimeoutError" | "HostNotFoundError" | "InvalidProtocolError" | "UnknownError";
  message: string;
  cause?: Error;
};

export interface AwaitReadyArgumentError {
  type: "ArgumentError";
  issues: AwaitReadyArgumentErrorIssue[];
  message: string;
  name: string;
  cause?: Error;
}

// ported from $ZodInvalidTypeExpected
type AwaitReadyArgumentErrorIssueExpected =
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
  expected?: AwaitReadyArgumentErrorIssueExpected;
}

