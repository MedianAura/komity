import inquirer, { type Answers } from 'inquirer';
import { InjectDependency } from '@medianaura/di-manager';
import { resolveCommitInput } from '../helpers/commit-input.js';
import { assembleCommitMessage, type CommitPayload, parseCommitPayload } from '../helpers/commit-payload.js';
import { KomityError } from '../helpers/errors.js';
import { Logger } from '../helpers/logger.js';
import { SCHEMA_VERSION } from '../helpers/schema.js';
import { DescriptionQuestion, LogQuestion, SubjectQuestion, TaskQuestion, TypeQuestion } from '../models/questions/index.js';
import { CacheService, CacheServiceToken } from '../services/cache.js';
import { GitService, GitServiceToken } from '../services/git.js';

export interface CommitOptions {
  commit?: boolean;
  input?: string;
  json?: boolean;
}

export class CommitRunner {
  @InjectDependency(GitServiceToken)
  private readonly git!: GitService;

  @InjectDependency(CacheServiceToken)
  private readonly cache!: CacheService;

  public async run(options: CommitOptions = {}): Promise<void> {
    if (options.input === undefined) {
      await this.runInteractive(options);
      return;
    }

    await this.runFromPayload(options.input, options);
  }

  private async runInteractive(options: CommitOptions): Promise<void> {
    if (options.json) {
      throw new KomityError('input-required', 'komity --json commit requires --input; the interactive prompt has no JSON form.');
    }

    // Le garde-fou vaut au-delà de `--json` : sans lui, `komity commit` en CI
    // bloque sur inquirer jusqu'au timeout du job.
    if (!process.stdin.isTTY) {
      throw new KomityError('not-interactive', 'komity commit requires --input when stdin is not a TTY.');
    }

    // Seule commande interactive : elle seule efface l'écran et affiche la
    // bannière. `validate` tourne en hook `commit-msg` — le faire ailleurs
    // revenait à vider le terminal à chaque commit.
    Logger.clear();
    Logger.title('Commit message generator');

    await this.assertStagingIsDirty();

    const commitMessage = await this.getCommitMessage();

    await this.git.commit(commitMessage);
    this.cache.clearCache();
  }

  private async runFromPayload(input: string, options: CommitOptions): Promise<void> {
    const commitMessage = assembleCommitMessage(parseCommitPayload(await resolveCommitInput(input)));

    // Sans `--commit`, komity n'écrit rien dans le dépôt : l'assemblage seul.
    if (options.commit) {
      await this.assertStagingIsDirty();
      await this.git.commit(commitMessage);
      this.cache.clearCache();
    }

    if (options.json) {
      console.log(JSON.stringify({ schema: SCHEMA_VERSION, ok: true, committed: Boolean(options.commit), message: commitMessage }));
      return;
    }

    console.log(commitMessage);
  }

  private async assertStagingIsDirty(): Promise<void> {
    if (await this.git.isClean()) {
      throw new KomityError('nothing-staged', 'No files added to staging! Did you forget to run git add?');
    }
  }

  private async getCommitMessage(): Promise<string> {
    const commitMessage = this.cache.getCache();

    // Si on a pas de cache utilisé le prompts
    if (commitMessage === '') {
      return this.showUserPrompt();
    }

    // Si on a une cache proposé de l'utilisé.
    const answers = await inquirer.prompt([
      {
        type: 'confirm',
        default: 'Y',
        message: 'Un message de commit existe deja voulez-vous le réutilisé ?',
        name: 'retry',
      },
    ]);

    if (!answers.retry) {
      return this.showUserPrompt();
    }

    return commitMessage;
  }

  private async showUserPrompt(): Promise<string> {
    const answers = await inquirer.prompt([TypeQuestion, SubjectQuestion, LogQuestion, DescriptionQuestion, ...TaskQuestion]);

    const commitMessage = assembleCommitMessage(this.toPayload(answers));
    this.cache.setCache(commitMessage);
    return commitMessage;
  }

  // Le prompt et `--input` convergent ici : un seul rendu, une seule dérive
  // possible.
  private toPayload(answers: Answers): CommitPayload {
    return {
      type: answers.type as string,
      scope: answers.isTaskAffected ? (answers.task as string) : undefined,
      subject: answers.subject as string,
      body: answers.description as string | undefined,
      log: Boolean(answers.log),
    };
  }
}
