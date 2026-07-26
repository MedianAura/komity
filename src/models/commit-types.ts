export interface CommitType {
  /**
   * Jetons conventional-commits acceptés en entrée pour ce type. Toujours
   * présent, éventuellement vide : un champ parfois absent est plus coûteux à
   * consommer côté agent qu'un tableau vide.
   *
   * La règle est asymétrique et volontairement : komity *accepte* l'alias en
   * lecture (`validate`) mais *écrit* toujours la forme canonique (`commit`).
   * Sinon un dépôt qui adopte le hook accumule un historique mixte, `feat:`
   * écrit à la main et `feature:` écrit par komity.
   */
  aliases: string[];
  description: string;
  name: string;
  value: string;
}

// Données pures, hors du module de question : la commande `types` et la
// validation n'ont pas à charger inquirer pour lire cette liste.
export const types: CommitType[] = [
  // ## Nouveau Feature
  {
    description: 'New feature for the user',
    name: 'Feature',
    aliases: ['feat'],
    value: 'feature',
  },
  // ## Correction
  {
    description: 'Correction of an issue.',
    name: 'Correction',
    aliases: [],
    value: 'fix',
  },
  {
    description: 'Change that change the user interface or the user experience.',
    name: 'Style',
    aliases: [],
    value: 'style',
  },
  // ## Refactor
  {
    description: 'Code Refactoring.',
    name: 'Refactor',
    aliases: [],
    value: 'refactor',
  },
  // ## Performance
  // Type canonique et non alias de `refactor` : le conventional `perf` n'avait
  // aucun équivalent ici, et le ranger sous Refactor classerait un gain de
  // performance dans la mauvaise section du changelog.
  {
    description: 'Change that improves performance.',
    name: 'Performance',
    aliases: [],
    value: 'perf',
  },
  {
    description: "Chore that doesn't modify the code.",
    name: 'Maintenance',
    aliases: ['chore', 'ci', 'build'],
    value: 'maintenance',
  },
  // ## Documentation
  {
    description: 'Documentation only changes.',
    name: 'Documentation',
    aliases: ['docs'],
    value: 'doc',
  },
  // ## Test
  {
    description: 'Adding unit tests or correcting existing tests.',
    name: 'Test',
    aliases: [],
    value: 'test',
  },
  // ## Dependence
  {
    description: 'Dependencies update.',
    name: 'Dependencies',
    aliases: ['deps'],
    value: 'dep',
  },
];

// Index unique jeton -> type. Tout ce qui doit interpréter un type de commit
// passe par `resolveType` : la validation, l'assemblage du message et le
// regroupement du changelog. C'est aussi la couture derrière laquelle une
// configuration par projet viendra se substituer à cette table.
const byToken = new Map<string, CommitType>();
for (const type of types) {
  byToken.set(type.value, type);
  for (const alias of type.aliases) {
    byToken.set(alias, type);
  }
}

/**
 * Correspondance exacte, sans repli sur la casse : `Feature:` reste refusé comme
 * avant l'introduction des alias.
 */
export function resolveType(token: string): CommitType | undefined {
  return byToken.get(token);
}

/**
 * Tout ce que komity accepte en entrée, formes canoniques et alias confondus.
 * C'est le sens de `allowedTypes` dans les charges utiles `--json` : la question
 * à laquelle un agent répond avec, c'est « qu'ai-je le droit d'écrire ».
 */
export const acceptedTypes: string[] = types.flatMap((type) => [type.value, ...type.aliases]);
