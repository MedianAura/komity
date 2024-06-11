import { type ListQuestion } from 'inquirer';
import longest from 'longest';

export const types = [
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
  message: 'Commit Type :',
  choices,
  name: 'type',
};

export { TypeQuestion };
