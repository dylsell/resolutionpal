export class ServiceError extends Error {
  constructor(public code: string, message: string, public status = 503, public retryAfter?: number) { super(message); }
}
