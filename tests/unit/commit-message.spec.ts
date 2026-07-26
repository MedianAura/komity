import dedent from 'dedent';
import { extractHeader, isValidCommitMessage, validateCommitMessage } from '../../src/helpers/commit-message.js';

describe('extractHeader', () => {
  it('saute les lignes vides et les commentaires du gabarit', () => {
    const message = dedent`
      # Please enter the commit message for your changes.
      #

      fix: quelque chose
      # Committer: quelqu'un
    `;

    expect(extractHeader(message)).toBe('fix: quelque chose');
  });

  it('renvoie une chaîne vide pour un message sans ligne réelle', () => {
    expect(extractHeader('\n\n# tout est commenté\n')).toBe('');
  });
});

describe('isValidCommitMessage', () => {
  it('accepte un en-tête valide', () => {
    expect(isValidCommitMessage('fix: quelque chose\n')).toBe(true);
  });

  it('accepte un en-tête portant un scope', () => {
    expect(isValidCommitMessage('fix(AB-12): quelque chose\n')).toBe(true);
  });

  it('accepte un en-tête valide sous des commentaires', () => {
    expect(isValidCommitMessage('# gabarit\n\nfeature: quelque chose\n')).toBe(true);
  });

  // Régression de #1 : avec le drapeau `m`, cette ligne de corps satisfaisait
  // le motif et l'en-tête n'était jamais réellement contrôlé.
  it("refuse un en-tête invalide qu'une ligne de corps rendait valide", () => {
    const message = dedent`
      fixed the login bug

      fix: this line is what actually satisfies the regex
    `;

    expect(isValidCommitMessage(message)).toBe(false);
  });

  it('refuse un type inconnu', () => {
    expect(isValidCommitMessage('nope: quelque chose\n')).toBe(false);
  });

  it('refuse un en-tête sans espace après les deux-points', () => {
    expect(isValidCommitMessage('fix:quelque chose\n')).toBe(false);
  });

  it.each([
    ["Merge branch 'main' into feature", 'merge'],
    ["Merge remote-tracking branch 'origin/main'", 'merge distant'],
    ['Revert "fix: quelque chose"', 'revert'],
    ['fixup! fix: quelque chose', 'fixup'],
    ['squash! fix: quelque chose', 'squash'],
  ])('laisse passer %s (%s)', (header) => {
    expect(isValidCommitMessage(`${header}\n\ncorps\n`)).toBe(true);
  });
});

describe('validateCommitMessage', () => {
  it.each([
    ['', 'header-missing'],
    ['nope: quelque chose', 'type-unknown'],
    ['pas du tout un en-tête', 'format-invalid'],
    ['fix:sans espace', 'format-invalid'],
    [`fix: ${'x'.repeat(101)}`, 'subject-too-long'],
    [`fix(AB-12): ${'x'.repeat(101)}`, 'subject-too-long'],
  ])('classe <%s> en %s', (message, rule) => {
    const result = validateCommitMessage(message);

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.rule)).toEqual([rule]);
  });

  // La longueur porte sur le sujet seul : `type(scope): ` ne compte pas, sinon
  // un scope long rognerait le budget de description.
  it('mesure le sujet sans le préfixe de type', () => {
    expect(validateCommitMessage(`fix(AB-12): ${'x'.repeat(100)}`).valid).toBe(true);
  });

  it('ne mesure pas la longueur des messages générés par git', () => {
    expect(validateCommitMessage(`Merge branch '${'x'.repeat(200)}'`).valid).toBe(true);
  });

  it("expose l'en-tête isolé et les types acceptés", () => {
    const result = validateCommitMessage('# gabarit\n\nnope: quelque chose\n');

    expect(result.header).toBe('nope: quelque chose');
    expect(result.allowedTypes).toContain('fix');
  });
});
