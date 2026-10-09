import type { IncomingMessage, ServerResponse } from "node:http";
export function gateEnabled(env?: NodeJS.ProcessEnv): boolean;
export function createAccessGate(options?: {
  env?: NodeJS.ProcessEnv;
  basePath?: string;
  healthPath?: string;
  now?: () => number;
  deliveredSite?: (slug: string) => Promise<boolean>;
}): (req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>;
export function accessGateVitePlugin(): {
  name: string;
  configureServer: (server: import("vite").ViteDevServer) => void;
};
