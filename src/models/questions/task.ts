import { type ConfirmQuestion, type InputQuestion } from 'inquirer';
import { getFromContainer } from '@medianaura/di-manager';
import { GitService, GitServiceToken } from '../../services/git.js';

const TaskNumberQuestion: InputQuestion = {
  type: 'input',
  message: 'Issue Id :',
  name: 'task',
  // Résolu au moment du prompt : au chargement du module, on ne sait pas encore
  // si la commande a besoin de git, ni même si on est dans un dépôt.
  default() {
    const git = getFromContainer<GitService>(GitServiceToken);
    return cleanBranch(git.getBranch() ?? '');
  },
  when(answers) {
    return answers.isTaskAffected;
  },
};

const hasTaskQuestion: ConfirmQuestion = {
  type: 'confirm',
  name: 'isTaskAffected',
  message: 'Is the commit solving a issue ?',
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
