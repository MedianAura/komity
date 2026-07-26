export interface CommitType {
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
    value: 'feature',
  },
  // ## Correction
  {
    description: 'Correction of an issue.',
    name: 'Correction',
    value: 'fix',
  },
  {
    description: 'Change that change the user interface or the user experience.',
    name: 'Style',
    value: 'style',
  },
  // ## Refactor
  {
    description: 'Code Refactoring.',
    name: 'Refactor',
    value: 'refactor',
  },
  {
    description: "Chore that doesn't modify the code.",
    name: 'Maintenance',
    value: 'maintenance',
  },
  // ## Documentation
  {
    description: 'Documentation only changes.',
    name: 'Documentation',
    value: 'doc',
  },
  // ## Test
  {
    description: 'Adding unit tests or correcting existing tests.',
    name: 'Test',
    value: 'test',
  },
  // ## Dependence
  {
    description: 'Dependencies update.',
    name: 'Dependencies',
    value: 'dep',
  },
];
