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

describe('alias conventional-commits', () => {
  it.each([['feat'], ['docs'], ['chore'], ['ci'], ['build'], ['deps']])('accepte <%s> en lecture', (alias) => {
    expect(isValidCommitMessage(`${alias}: quelque chose\n`)).toBe(true);
  });

  it('accepte un alias portant un scope', () => {
    expect(isValidCommitMessage('feat(AB-12): quelque chose\n')).toBe(true);
  });

  // `perf` est un type canonique et non un alias : il a sa propre section de
  // changelog, alors que `refactor` le classerait au mauvais endroit.
  it('accepte <perf> comme type canonique', () => {
    expect(isValidCommitMessage('perf: quelque chose\n')).toBe(true);
  });

  it('annonce les alias parmi les types acceptés', () => {
    const result = validateCommitMessage('nope: quelque chose\n');

    expect(result.allowedTypes).toContain('feat');
    expect(result.allowedTypes).toContain('feature');
    expect(result.allowedTypes).toContain('perf');
  });

  // Les alias n'ouvrent pas la casse : la correspondance reste exacte.
  it('refuse un jeton connu mais capitalisé', () => {
    const result = validateCommitMessage('Feat: quelque chose\n');

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.rule)).toEqual(['type-unknown']);
  });

  // Un type connu qui casse sur la forme reste `format-invalid` : la correction
  // à faire n'est pas la même que pour un jeton inconnu.
  it('distingue une forme cassée sur un alias connu', () => {
    const result = validateCommitMessage('feat:sans espace\n');

    expect(result.errors.map((error) => error.rule)).toEqual(['format-invalid']);
  });
});
