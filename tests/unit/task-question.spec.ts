import 'reflect-metadata';
import { container } from 'tsyringe';
import { TaskQuestion } from '../../src/models/questions/task.js';
import { GitServiceToken } from '../../src/services/git.js';

// `TaskQuestion` est le couple [confirmation, numéro] : c'est le second qui
// porte le défaut dérivé de la branche.
const [TaskConfirmQuestion, TaskNumberQuestion] = TaskQuestion;

function defaultFor(branch: string): string | undefined {
  container.registerInstance(GitServiceToken, { getBranch: () => branch });

  const resolve = (TaskNumberQuestion as { default: () => string | undefined }).default;
  return resolve();
}

describe('TaskQuestion', () => {
  afterEach(() => {
    container.clearInstances();
  });

  it('ne pose la question du numéro que si le commit résout une issue', () => {
    const when = (TaskNumberQuestion as { when: (answers: Record<string, unknown>) => unknown }).when;

    expect(when({ isTaskAffected: true })).toBe(true);
    expect(when({ isTaskAffected: false })).toBe(false);
    expect(TaskConfirmQuestion?.name).toBe('isTaskAffected');
  });

  // Le défaut est résolu à l'appel et non au chargement du module : hors dépôt,
  // `getBranch` rend `undefined` et le prompt doit rester utilisable.
  it('ne propose rien hors dépôt', () => {
    expect(defaultFor('')).toBeUndefined();
  });

  it('retient l’identifiant de suivi et laisse tomber le slug', () => {
    expect(defaultFor('feature/AB-12-corrige-la-redirection')).toBe('ab-12');
    expect(defaultFor('AB-12')).toBe('ab-12');
  });

  // Régression : le découpage prenait les deux premiers segments quels qu'ils
  // soient, donc `12-corrige`. Le scope est un lien vers l'issue — tronqué, il
  // ne pointe sur rien.
  it('dérive un renvoi GitHub d’une branche numérotée', () => {
    expect(defaultFor('9-select-nested-actions-by-dotted-id-path')).toBe('#9');
    expect(defaultFor('feature/12-corrige-la-redirection')).toBe('#12');
    expect(defaultFor('12')).toBe('#12');
  });

  // Sans identifiant reconnaissable, mieux vaut un prompt vide qu'un lien mort.
  it('ne propose rien quand la branche ne porte pas d’identifiant', () => {
    expect(defaultFor('master')).toBeUndefined();
    expect(defaultFor('feature/hotfix')).toBeUndefined();
  });
});
