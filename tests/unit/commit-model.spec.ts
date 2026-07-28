import dedent from 'dedent';
import { CommitModel } from '../../src/models/commit.js';

function entryFor(body: string): string {
  const commit = new CommitModel();
  commit.setBody(body);

  return commit.description;
}

describe('CommitModel.setBody', () => {
  // La convention d'origine du dépôt : marqueur nu, le corps entier fait
  // l'entrée. Les quatre commits `[log]` de l'historique sont écrits comme ça.
  it('prend le corps entier quand le marqueur est nu', () => {
    const body = dedent`
      adding the changelog generator feature

      [log]
    `;

    expect(entryFor(body)).toBe('Adding the changelog generator feature.');
  });

  // Le cas qui motive le changement : le corps porte le raisonnement, le
  // marqueur porte ce que lit l'utilisateur.
  it('prend le seul texte du marqueur quand il en porte un', () => {
    const body = dedent`
      Deux directions, comme prévu dans l'issue. Le rapport distingue les règles
      pour que l'agent sache quoi corriger, et la composition sort dans
      commit-payload.ts.

      [log] Ajoute une sortie --json aux commandes
    `;

    expect(entryFor(body)).toBe('Ajoute une sortie --json aux commandes.');
  });

  // Régression : `sanitizeDescription` ne filtrait que la ligne strictement
  // égale à `[log]`, le marqueur se retrouvait donc dans le changelog rendu.
  it('ne laisse jamais le marqueur dans le texte rendu', () => {
    expect(entryFor('[log] une entrée')).not.toContain('[log]');
    expect(entryFor('corps\n\n[log]')).not.toContain('[log]');
  });

  it('retire les remorques git sous marqueur nu', () => {
    const body = dedent`
      corrige la redirection

      Closes #12
      Refs #4
      Co-Authored-By: Quelqu'un <personne@example.com>
      Signed-off-by: Quelqu'un <personne@example.com>

      [log]
    `;

    expect(entryFor(body)).toBe('Corrige la redirection.');
  });

  it('ne prend pas un marqueur en milieu de mot pour le marqueur', () => {
    expect(entryFor('dialogue [logique] revu\n\n[log]')).toBe('Dialogue [logique] revu.');
  });
});

function taskFor(header: string): string {
  const commit = new CommitModel();
  commit.setTask(header);

  return commit.getTask();
}

describe('CommitModel.setTask', () => {
  it('accepte un identifiant de suivi à suffixe numérique', () => {
    expect(taskFor('fix(JIRA-99999): corrige la redirection')).toBe('[JIRA-99999]');
  });

  // Régression : le suffixe était contraint à `\d+`, ce qui écartait les
  // identifiants Redmine dont la seconde moitié est un mot.
  it('accepte un identifiant de suivi à suffixe non numérique', () => {
    expect(taskFor('fix(REDMINE-Bob): corrige la redirection')).toBe('[REDMINE-BOB]');
  });

  // Régression : `#` n'étant pas dans `\w`, le scope GitHub/GitLab ne matchait
  // pas et le commit sortait au changelog sans sa tâche.
  it('accepte un renvoi d’issue GitHub ou GitLab', () => {
    expect(taskFor('fix(#999): corrige la redirection')).toBe('[#999]');
  });

  // Déjà présent dans l'historique du dépôt : le retirer ferait disparaître des
  // tâches de changelogs qui les portent aujourd'hui.
  it('accepte toujours un numéro nu', () => {
    expect(taskFor('fix(12): corrige la redirection')).toBe('[12]');
  });

  it('ne pose pas de tâche sans scope', () => {
    expect(taskFor('fix: corrige la redirection')).toBe('');
  });

  // Le scope est un lien : `#99-doing-something` ne pointe sur rien. Le lire
  // comme `#99` fabriquerait une tâche que l'auteur n'a pas écrite.
  it('refuse un identifiant suivi d’un slug plutôt que de le tronquer', () => {
    expect(taskFor('fix(#99-doing-something): corrige la redirection')).toBe('');
    expect(taskFor('fix(JIRA-99999-corrige): corrige la redirection')).toBe('');
  });

  // Régression : non ancrée, l'expression prenait la première parenthèse venue
  // et tirait une tâche du sujet.
  it('ne lit pas une parenthèse du sujet comme un scope', () => {
    expect(taskFor('fix: corrige la redirection (12) au retour')).toBe('');
    expect(taskFor('fix(#9): corrige la redirection (12) au retour')).toBe('[#9]');
  });
});
