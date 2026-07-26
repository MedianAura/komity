import fsExtra from 'fs-extra';
import fs from 'node:fs';
import path from 'node:path';
import { InjectDependency } from '@medianaura/di-manager';
import { reportSuccess } from '../helpers/output.js';
import { CommitModel } from '../models/commit.js';
import { ChangelogGeneratorService, ChangelogGeneratorServiceToken } from '../services/generate.js';
import { GitService, GitServiceToken } from '../services/git.js';

const { writeFileSync } = fsExtra;

export class GenerateRunner {
  @InjectDependency(GitServiceToken)
  private readonly git!: GitService;

  @InjectDependency(ChangelogGeneratorServiceToken)
  private readonly generator!: ChangelogGeneratorService;

  public async run(next: string, options: { json?: boolean; preview?: boolean }): Promise<void> {
    const changelogPath = path.resolve(process.cwd(), 'CHANGELOG.md');

    if (!fs.existsSync(changelogPath)) {
      throw new Error(`Changelog file not found at <${changelogPath}>`);
    }

    let content = fs.readFileSync(changelogPath, { encoding: 'utf8' });
    if (!content.includes('[//]: # "TEMPLATE"')) {
      throw new Error(`The Changelog File doesn't contain <[//]: # "TEMPLATE">.`);
    }

    const tag = await this.getCurrentTag();

    const list: CommitModel[] = [];
    const logs = await this.git.log(tag);

    for (const log of logs) {
      const raw = log.rawBody ?? '';
      if (!raw.includes('[log]')) continue;

      const commit = new CommitModel();

      commit.hash = log.hash ?? '';
      commit.author = log.authorName ?? '';
      commit.setDate(log.authorDate ?? '');
      commit.setSubject(log.subject ?? '');
      commit.setBody(log.body ?? '');

      list.push(commit);
    }

    const log = this.generator.generate(list, next);

    if (options.preview) {
      if (options.json) {
        reportSuccess(true, '', { changelog: log, written: false });
        return;
      }

      console.log(log);
      return;
    }

    // Fonction de remplacement : un `$&` ou `$1` dans un message de commit serait
    // sinon réinterprété par String#replace et corromprait le changelog.
    content = content.replace('[//]: # "TEMPLATE"', () => `[//]: # "TEMPLATE"\r\n\r\n${log}`);
    writeFileSync(changelogPath, content, { encoding: 'utf8' });

    reportSuccess(options.json, 'Writing Changelog completed.', { path: changelogPath, written: true });
  }

  private async getCurrentTag(): Promise<string> {
    return this.git.getLatestTag() ?? '';
  }
}
