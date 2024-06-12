import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Logger } from '../helpers/logger.js';
import { types } from '../models/questions/type.js';

export class ValidateRunner {
  public async run(commitFile: string): Promise<void> {
    const commitMessage = readFileSync(path.resolve(process.cwd(), commitFile), { encoding: 'utf8' });

    if (commitMessage.startsWith('Merge branch') || commitMessage.startsWith('Merge remote-tracking branch')) {
      return;
    }

    const validTypes = types.map((type) => type.value).join('|');
    const regex = new RegExp(`^(${validTypes})(\\(.*\\))?:\\s.*$`, 'gm');

    if (regex.exec(commitMessage) === null) {
      throw new Error('Commit is invalid.');
    }

    Logger.success('Commit is valid.');
  }
}
