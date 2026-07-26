import fsExtra from 'fs-extra';
import path from 'node:path';
import { sprintf } from 'sprintf-js';
import { reportSuccess } from '../helpers/output.js';
import { changelogTemplate } from '../templates/changelog.js';

const { writeFileSync, existsSync } = fsExtra;

export class SetupRunner {
  public async run(title: string, options: { json?: boolean } = {}): Promise<void> {
    const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');

    if (existsSync(changelogPath)) {
      throw new Error(`Changelog file already exists at <${changelogPath}>`);
    }

    writeFileSync(changelogPath, sprintf(changelogTemplate, { title }), { encoding: 'utf8' });

    reportSuccess(options.json, 'Changelog file created', { path: changelogPath });
  }
}
