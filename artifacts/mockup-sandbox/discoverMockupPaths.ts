import { glob } from "node:fs/promises";
import path from "node:path";

/** Fixed local pattern only; excludes the private/hidden paths fast-glob excluded. */
export async function discoverMockupPaths(root: string): Promise<string[]> {
  const files: string[] = [];
  for await (const file of glob("src/components/mockups/**/*.tsx", {
    cwd: root,
    exclude: file => file.split(path.sep).some(part => part.startsWith("_") || part.startsWith(".")),
  })) files.push(file.split(path.sep).join("/"));
  return files.sort();
}
