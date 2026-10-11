export function stagingClerk(env?: NodeJS.ProcessEnv): boolean;
export function developmentClerkHost(key: string | undefined): string;
export function stagingIdentityBindings(env?: NodeJS.ProcessEnv): Record<string, string>;
export function applicationUserId(nativeUserId: string, env?: NodeJS.ProcessEnv): string | null;
export function assertStagingClerk(env?: NodeJS.ProcessEnv): void;
export function assertFrontendClerk(env?: NodeJS.ProcessEnv): void;
