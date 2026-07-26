import { type DistinctQuestion } from 'inquirer';
import longest from 'longest';
import { types } from '../commit-types.js';

const length = (longest(types.map((type) => type.name)) as string).length + 1;
const choices = types.map((type) => {
  return {
    name: `${(type.name + ':').padEnd(length)} ${type.description}`,
    value: type.value,
    short: type.value,
  };
});

const TypeQuestion: DistinctQuestion = {
  // `list` a été renommé `select` dans inquirer 10.
  type: 'select',
  message: 'Commit Type :',
  choices,
  name: 'type',
};

export { TypeQuestion };
