import inquirer, { type Answers } from 'inquirer';
import { sprintf } from 'sprintf-js';
import { InjectDependency } from '@medianaura/di-manager';
import { DescriptionQuestion, LogQuestion, SubjectQuestion, TaskQuestion, TypeQuestion } from '../models/questions/index.js';
import { CacheService, CacheServiceToken } from '../services/cache.js';
import { GitService, GitServiceToken } from '../services/git.js';

export class CommitRunner {
  @InjectDependency(GitServiceToken)
  private readonly git!: GitService;

  @InjectDependency(CacheServiceToken)
  private readonly cache!: CacheService;

  public async run(): Promise<void> {
    const stagingIsClean = await this.git.isClean();
    if (stagingIsClean) {
      throw new Error('No files added to staging! Did you forget to run git add?');
    }

    const commitMessage = await this.getCommitMessage();

    await this.git.commit(commitMessage);
    this.cache.clearCache();
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

    const head = this.buildHead(answers);

    let logMessage = '';
    if (answers.log) {
      logMessage = `[log]`;
    }

    const commitMessage = [head, answers.description, logMessage].join('\n\n');
    this.cache.setCache(commitMessage);
    return commitMessage;
  }

  private buildHead(answers: Answers): string {
    let taskMessage = '';
    if (answers.isTaskAffected) {
      taskMessage = `(${answers.task.toUpperCase() as string})`;
    }

    return sprintf('%(type)s%(task)s: %(description)s', {
      type: answers.type,
      task: taskMessage.charAt(0).toLowerCase() + taskMessage.slice(1),
      description: answers.subject,
    });
  }
}
