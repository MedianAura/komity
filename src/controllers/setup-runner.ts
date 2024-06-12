import fsExtra from 'fs-extra';
import path from 'node:path';
import { sprintf } from 'sprintf-js';
import { Logger } from '../helpers/logger.js';
import { changelogTemplate } from '../templates/changelog.js';

const { writeFileSync, existsSync } = fsExtra;

export class SetupRunner {
  public async run(title: string): Promise<void> {
    const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');

    if (existsSync(changelogPath)) {
      throw new Error(`Changelog file already exists at <${changelogPath}>`);
    }

    writeFileSync(changelogPath, sprintf(changelogTemplate, { title }), { encoding: 'utf8' });

    Logger.success('Changelog file created');
  }
}
