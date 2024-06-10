import { type ListQuestion } from 'inquirer';
import longest from 'longest';

export const types = [
  // ## Nouveau Feature
  {
    description: "Nouvelle fonctionnalité pour bonifié l'offre utilisateur..",
    name: 'Nouvelle Fonctionnalité',
    value: 'feature',
  },
  // ## Correction
  {
    description: 'Correction sur le code',
    name: 'Correction',
    value: 'fix',
  },
  {
    description: "Changement qui affecte l'aspect visuel de l'application",
    name: 'Style',
    value: 'style',
  },
  // ## Refactor
  {
    description: 'Modification de code : Complexité, Cognitivité, Performance ou Visuel',
    name: 'Refactor',
    value: 'refactor',
  },
  {
    description: "Changement qui n'affecte pas le code : Prettier, Configuration, Pipeline",
    name: 'Maintenance',
    value: 'maintenance',
  },
  // ## Documentation
  {
    description: 'Ajout de documentation : Cookbook, Readme, Commentaire',
    name: 'Documentation',
    value: 'doc',
  },
  // ## Test
  {
    description: 'Ajout ou Correction de test unitaire ou e2e',
    name: 'Test',
    value: 'test',
  },
  // ## Dependence
  {
    description: 'Mise à jour des dépendences',
    name: 'Dependencies',
    value: 'dep',
  },
];

const length = (longest(types.map((type) => type.name)) as string).length + 1;
const choices = types.map((type) => {
  return {
    name: `${(type.name + ':').padEnd(length)} ${type.description}`,
    value: type.value,
    short: type.value,
  };
});

const TypeQuestion: ListQuestion = {
  type: 'list',
  message: 'Choisir le type de changement pour le commit :',
  choices,
  name: 'type',
};

export { TypeQuestion };
