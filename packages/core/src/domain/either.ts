/**
 * Functional disjoint-union primitives used for explicit success/failure flow.
 */
export type Left<L> = Readonly<{ readonly _tag: 'Left'; readonly left: L }>;
export type Right<R> = Readonly<{ readonly _tag: 'Right'; readonly right: R }>;

/**
 * Represents either a failure (`Left<L>`) or success (`Right<R>`).
 */
export type Either<L, R> = Left<L> | Right<R>;

/**
 * Constructs a `Left`.
 */
export const left = <L, R = never>(value: L): Either<L, R> => ({ _tag: 'Left', left: value });
/**
 * Constructs a `Right`.
 */
export const right = <R, L = never>(value: R): Either<L, R> => ({ _tag: 'Right', right: value });

/**
 * Type guard for `Left`.
 */
export const isLeft = <L, R>(value: Either<L, R>): value is Left<L> => value._tag === 'Left';
/**
 * Type guard for `Right`.
 */
export const isRight = <L, R>(value: Either<L, R>): value is Right<R> => value._tag === 'Right';
