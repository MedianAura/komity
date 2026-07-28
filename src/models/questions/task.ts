import { type DistinctQuestion } from 'inquirer';
import { getFromContainer } from '@medianaura/di-manager';
import { GitService, GitServiceToken } from '../../services/git.js';

const TaskNumberQuestion: DistinctQuestion = {
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

const TaskConfirmQuestion: DistinctQuestion = {
  type: 'confirm',
  name: 'isTaskAffected',
  message: 'Is the commit solving a issue ?',
  default: true,
};

// Le scope est un lien vers le gestionnaire de tâches, pas une étiquette : seul
// l'identifiant y a sa place. Une branche `9-select-nested-actions` porte le
// numéro d'issue puis un slug — proposer `9-select` donnerait un lien mort.
const BRANCH_ISSUE = /^(\d+)(?:-|$)/;
const BRANCH_TICKET = /^([a-z]+-[a-z\d]+)(?:-|$)/i;

function cleanBranch(branch: string): string | undefined {
  const segment = branch.split('/').pop() ?? '';

  // Un numéro nu en tête est une issue GitHub/GitLab : c'est la forme `#999`
  // qui en fait un lien, pas le numéro seul.
  const issue = BRANCH_ISSUE.exec(segment)?.[1];
  if (issue !== undefined) {
    return `#${issue}`;
  }

  return BRANCH_TICKET.exec(segment)?.[1]?.toLowerCase();
}

const TaskQuestion: DistinctQuestion[] = [TaskConfirmQuestion, TaskNumberQuestion];

export { TaskQuestion };
