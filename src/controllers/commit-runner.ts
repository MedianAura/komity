import { InjectDependency } from '@medianaura/di-manager';
import { GitService, GitServiceToken } from '../services/git.js';

export class CommitRunner {
  @InjectDependency(GitServiceToken)
  private readonly git!: GitService;

  public async run(): Promise<void> {
    const stagingIsClean = await this.git.isClean();
    if (stagingIsClean) {
      throw new Error('No files added to staging! Did you forget to run git add?');
    }

    // const commitMessage = await this.getCommitMessage();

    // await this.git.commit(commitMessage);
    // this.cache.clearCache();
  }
}
