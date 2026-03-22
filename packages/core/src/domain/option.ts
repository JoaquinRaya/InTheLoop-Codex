/**
 * Functional optional-value primitives used across core domain/application code.
 */
export type None = Readonly<{ readonly _tag: 'None' }>;
export type Some<T> = Readonly<{ readonly _tag: 'Some'; readonly value: T }>;

/**
 * Represents either no value (`None`) or a present value (`Some<T>`).
 */
export type Option<T> = None | Some<T>;

/**
 * Constructs a `None` option.
 */
export const none = <T = never>(): Option<T> => ({ _tag: 'None' });
/**
 * Constructs a `Some` option.
 */
export const some = <T>(value: T): Option<T> => ({ _tag: 'Some', value });

/**
 * Type guard for `None`.
 */
export const isNone = <T>(option: Option<T>): option is None => option._tag === 'None';
/**
 * Type guard for `Some`.
 */
export const isSome = <T>(option: Option<T>): option is Some<T> => option._tag === 'Some';
