// Source diagnostic logs are reduced to their static message, never endpoint/body/credential context.
export const logger = { warn: (_context: unknown, message?: string) => console.warn(message ?? "Quickex diagnostic warning") };
