import { lintCommitMessage } from '../../src/helpers/commit-lint.js';
import { assembleCommitMessage } from '../../src/helpers/commit-payload.js';

function codes(message: string): string[] {
  return lintCommitMessage(message).map((warning) => warning.code);
}

describe('lintCommitMessage', () => {
  it('ne dit rien sur un message correct', () => {
    expect(lintCommitMessage('fix(#54): corrige la redirection\n\ndétail\n\n[log] Corrige la redirection.')).toEqual([]);
  });

  describe('subject-trailing-task', () => {
    // Le piège qui a coûté la journée : le commit est légal, il passe validate,
    // et le changelog ne lui attache aucune tâche parce que le scope est la
    // seule position lue.
    it('signale une tâche en fin de sujet quand le scope est vide', () => {
      const warnings = lintCommitMessage('fix: corrige la redirection (#54)');

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({ code: 'subject-trailing-task', field: 'subject' });
      expect(warnings[0]?.message).toContain('#54');
    });

    // Redondant, mais pas faux : la tâche est déjà là où le changelog la lit.
    it('se tait quand le scope porte déjà la tâche', () => {
      expect(codes('fix(#54): corrige la redirection (#54)')).toEqual([]);
    });

    it('ignore une parenthèse qui n’est pas une référence de tâche', () => {
      expect(codes('fix: corrige la redirection (enfin)')).toEqual([]);
    });

    it('ignore une référence au milieu du sujet', () => {
      expect(codes('fix: corrige (#54) la redirection')).toEqual([]);
    });
  });

  describe('changelog-entry-too-long', () => {
    // Le marqueur nu publie tout le corps. Formulé sur l'entrée dérivée plutôt
    // que sur le corps brut : c'est le texte qui atterrit dans CHANGELOG.md.
    it('signale une entrée dérivée de plus de trois lignes', () => {
      const body = ['une', 'deux', 'trois', 'quatre'].join('\n');
      const warnings = lintCommitMessage(`feature: ajoute\n\n${body}\n\n[log]`);

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toMatchObject({ code: 'changelog-entry-too-long', field: 'changelog' });
      expect(warnings[0]?.message).toContain('4');
    });

    it('se tait quand le marqueur porte sa propre ligne', () => {
      const body = ['une', 'deux', 'trois', 'quatre'].join('\n');

      expect(codes(`feature: ajoute\n\n${body}\n\n[log] Ajoute la chose.`)).toEqual([]);
    });

    it('se tait sans marqueur, si long soit le corps', () => {
      const body = ['une', 'deux', 'trois', 'quatre'].join('\n');

      expect(codes(`feature: ajoute\n\n${body}`)).toEqual([]);
    });

    // Les remorques sont retirées avant le compte : elles ne se rendent jamais
    // dans le changelog, donc les compter ferait crier sur une entrée courte.
    it('ne compte pas les remorques git', () => {
      const body = ['une', 'deux', 'Closes #17', 'Co-Authored-By: Quelquun <x@y.z>'].join('\n');

      expect(codes(`feature: ajoute\n\n${body}\n\n[log]`)).toEqual([]);
    });
  });

  // Le lint tourne aussi sur `validate`, donc sur des messages que komity n'a
  // pas assemblés : rien ne doit exploser sur un en-tête cassé.
  it('se tait sur un message sans en-tête analysable', () => {
    expect(codes('pas un en-tête du tout')).toEqual([]);
    expect(codes('')).toEqual([]);
  });

  it('ignore les messages générés par git', () => {
    expect(codes('Merge branch "main" (#54)')).toEqual([]);
  });

  // Contrat de non-régression : ce que komity assemble ne doit jamais déclencher
  // son propre lint quand la charge utile est bien formée.
  it('ne signale rien sur un message que komity vient d’assembler', () => {
    const message = assembleCommitMessage({ type: 'fix', scope: '#54', subject: 'corrige', body: 'détail', changelog: 'Corrige la redirection' });

    expect(lintCommitMessage(message)).toEqual([]);
  });
});
