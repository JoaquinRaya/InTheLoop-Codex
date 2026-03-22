/**
 * Driving port for response payload validation use case.
 */
import type { Either } from '../../domain/either.js';
import type { PayloadValidationError, ResponsePayload } from '../../domain/response-payload.js';

/**
 * Validates a raw response payload into canonical domain shape.
 */
export type ForValidatingResponsePayload = (
  payload: Readonly<Partial<Record<string, string | number>>>
) => Either<PayloadValidationError, ResponsePayload>;
