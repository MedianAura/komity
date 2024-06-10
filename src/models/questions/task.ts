import { type ConfirmQuestion, type InputQuestion } from 'inquirer';
import { getFromContainer } from '@medianaura/di-manager';
import { GitService, GitServiceToken } from '../../services/git.js';

const git = getFromContainer<GitService>(GitServiceToken);
const branch = cleanBranch(git.getBranch() ?? '');

const TaskNumberQuestion: InputQuestion = {
  type: 'input',
  message: 'Tâche Jira :',
  name: 'task',
  default: branch,
  when(answers) {
    return answers.isTaskAffected;
  },
};

const hasTaskQuestion: ConfirmQuestion = {
  type: 'confirm',
  name: 'isTaskAffected',
  message: 'Est-ce que le commit est lié à une tâche ?',
  default: true,
};

function cleanBranch(branch: string): string | undefined {
  let cleanBranch = (branch.split('/').pop() ?? '').split('-');

  if (cleanBranch.length > 2) {
    cleanBranch = cleanBranch.splice(0, 2);
  }

  if (cleanBranch.length === 2) {
    return cleanBranch.join('-').toLowerCase();
  }

  return undefined;
}

const TaskQuestion = [hasTaskQuestion, TaskNumberQuestion];

export { TaskQuestion };
