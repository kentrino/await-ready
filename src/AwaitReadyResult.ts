export type AwaitReadyResult<
  T,
  E extends AwaitReadyArgumentError | AwaitReadyProbeError =
    | AwaitReadyProbeError
    | AwaitReadyArgumentError,
> = AwaitReadySuccess<T> | AwaitReadyFailure<E>;

export interface AwaitReadySuccess<T> {
  success: true;
  value: T;
}

export interface AwaitReadyFailure<
  E extends AwaitReadyArgumentError | AwaitReadyProbeError =
    | AwaitReadyProbeError
    | AwaitReadyArgumentError,
> {
  success: false;
  error: E;
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
  type: "ArgumentError" | "UnknownError";
  issues?: AwaitReadyArgumentErrorIssue[];
  message: string;
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
