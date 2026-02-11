export type Success<T> = {
  ok: true;
  value: T;
};

export type Failure<E> = {
  ok: false;
  error: E;
};

export type Result<T = undefined, E = Error> = Success<T> | Failure<E>;

type OkParametersFor<T> = T extends undefined ? [] : [T];

export const ok = <T>(...value: OkParametersFor<T>): Success<T> => ({
  ok: true,
  value: (value[0] ?? undefined) as T,
});

export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const isOk = <T, E = Error>(result: Result<T, E>): result is Success<T> => result.ok;

export const isErr = <T, E = Error>(result: Result<T, E>): result is Failure<E> => !result.ok;
