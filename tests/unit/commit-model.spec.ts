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
