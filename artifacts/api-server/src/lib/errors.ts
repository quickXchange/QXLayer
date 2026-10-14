export class HttpError extends Error {
  constructor(public status: number, message: string, public retryAfterSeconds?: number) {
    super(message);
  }
}