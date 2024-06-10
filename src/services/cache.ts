import fsExtra from 'fs-extra';
import path from 'node:path';
import { registry } from 'tsyringe';
import { cacheOrTemporaryDirectory } from '../helpers/cache-directory.js';

const { emptyDirSync, ensureDirSync, existsSync, readFileSync, writeFileSync } = fsExtra;

export const CacheServiceToken = Symbol('CacheService');

@registry([{ token: CacheServiceToken, useClass: CacheService }])
export class CacheService {
  private readonly cacheDirectory: string;

  private readonly fileName = 'commitHistory.txt';

  constructor() {
    this.cacheDirectory = cacheOrTemporaryDirectory('conventionnal');
    ensureDirSync(this.cacheDirectory);
  }

  public getCache(): string {
    if (!existsSync(this.filePath)) return '';
    return readFileSync(this.filePath, { encoding: 'utf8' });
  }

  public setCache(content: string): void {
    writeFileSync(this.filePath, content, { encoding: 'utf8' });
  }

  public clearCache(): void {
    emptyDirSync(this.cacheDirectory);
  }

  get filePath(): string {
    return path.resolve(this.cacheDirectory, this.fileName);
  }
}
