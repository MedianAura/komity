import envPaths from 'env-paths';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function cacheOrTemporaryDirectory(appName: string): string {
  const { cache } = envPaths(appName);

  if (cache) return cache;

  return path.join(tmpdir(), 'cache', appName);
}
