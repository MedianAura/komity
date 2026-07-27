import fsExtra from 'fs-extra';
import fs from 'node:fs';
import path from 'node:path';
import { InjectDependency } from '@medianaura/di-manager';
import { Logger } from '../helpers/logger.js';
import { reportSuccess } from '../helpers/output.js';
import { CommitModel } from '../models/commit.js';
import { ChangelogGeneratorService, ChangelogGeneratorServiceToken } from '../services/generate.js';
import { GitService, GitServiceToken } from '../services/git.js';

const { writeFileSync } = fsExtra;

// Les deux styles de guillemets : `setup` écrit le marqueur en apostrophes et
// Prettier reformate les commentaires markdown dans un sens ou dans l'autre. Ne
// reconnaître que la forme en guillemets doubles faisait échouer `generate` sur
// le fichier que `setup` venait d'écrire.
const TEMPLATE_MARKER = /\[\/\/\]: # (["'])TEMPLATE\1/;

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
    if (!TEMPLATE_MARKER.test(content)) {
      throw new Error(`The Changelog File doesn't contain <[//]: # "TEMPLATE">.`);
    }

    // Sortie du réseau avant la lecture des tags. L'échec n'est pas fatal — les
    // tags locaux suffisent — mais il est rapporté : un changelog dont la borne
    // basse est un tag périmé est faux en silence, ce qui est pire que lent.
    const fetched = this.git.fetchTags();
    if (!fetched && !options.json) {
      Logger.warn('Could not fetch tags from the remote; falling back on local tags.');
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
        reportSuccess(true, '', { changelog: log, written: false, fetchedTags: fetched });
        return;
      }

      console.log(log);
      return;
    }

    // Fonction de remplacement : un `$&` ou `$1` dans un message de commit serait
    // sinon réinterprété par String#replace et corromprait le changelog.
    content = content.replace(TEMPLATE_MARKER, (marker) => `${marker}\r\n\r\n${log}`);
    writeFileSync(changelogPath, content, { encoding: 'utf8' });

    reportSuccess(options.json, 'Writing Changelog completed.', { path: changelogPath, written: true, fetchedTags: fetched });
  }

  private async getCurrentTag(): Promise<string> {
    return this.git.getLatestTag() ?? '';
  }
}
