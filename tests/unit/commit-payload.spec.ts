import { isValidCommitMessage } from '../../src/helpers/commit-message.js';
import { assembleCommitMessage, parseCommitPayload } from '../../src/helpers/commit-payload.js';
import { KomityError } from '../../src/helpers/errors.js';

describe('assembleCommitMessage', () => {
  // Corps et bloc [log] vides laissent leurs séparateurs : c'est exactement ce
  // que produisait le chemin interactif, et `git commit` les recolle.
  it('rend un en-tête sans scope', () => {
    expect(assembleCommitMessage({ type: 'fix', subject: 'corrige la redirection' })).toBe('fix: corrige la redirection\n\n\n\n');
  });

  it('met le scope en majuscules', () => {
    expect(assembleCommitMessage({ type: 'fix', scope: 'ab-12', subject: 'corrige' })).toContain('fix(AB-12): corrige');
  });

  it('ajoute le bloc [log] quand il est demandé', () => {
    const message = assembleCommitMessage({ type: 'feature', subject: 'ajoute', body: 'détail', log: true });

    expect(message).toBe('feature: ajoute\n\ndétail\n\n[log]');
  });

  // Le contrat de l'issue : ce que komity assemble doit passer komity validate.
  it('produit un message que la validation accepte', () => {
    const message = assembleCommitMessage({ type: 'fix', scope: 'ab-12', subject: 'corrige', body: 'détail', log: true });

    expect(isValidCommitMessage(message)).toBe(true);
  });
});

describe('parseCommitPayload', () => {
  it('applique les valeurs par défaut', () => {
    expect(parseCommitPayload('{"type":"fix","subject":"corrige"}')).toEqual({
      type: 'fix',
      scope: undefined,
      subject: 'corrige',
      body: undefined,
      log: false,
    });
  });

  it.each([
    ['pas du JSON', 'invalid-payload'],
    ['[]', 'invalid-payload'],
    ['{"type":"nope","subject":"x"}', 'type-unknown'],
    ['{"type":"fix"}', 'subject-missing'],
    ['{"type":"fix","subject":"   "}', 'subject-missing'],
    [`{"type":"fix","subject":"${'x'.repeat(101)}"}`, 'subject-too-long'],
    ['{"type":"fix","subject":"x","scope":12}', 'invalid-payload'],
    ['{"type":"fix","subject":"x","log":"yes"}', 'invalid-payload'],
  ])('rejette %s avec le code %s', (raw, code) => {
    expect(() => parseCommitPayload(raw)).toThrow(KomityError);

    try {
      parseCommitPayload(raw);
      expect.unreachable();
    } catch (error) {
      expect((error as KomityError).code).toBe(code);
    }
  });

  it('annonce les types valides quand le type est inconnu', () => {
    try {
      parseCommitPayload('{"type":"nope","subject":"x"}');
      expect.unreachable();
    } catch (error) {
      expect((error as KomityError).details.allowedTypes).toContain('fix');
    }
  });
});
