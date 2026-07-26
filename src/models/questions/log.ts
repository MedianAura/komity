import { type DistinctQuestion } from 'inquirer';

const LogQuestion: DistinctQuestion = {
  type: 'confirm',
  default: true,
  message: 'Add commit to changelog ?',
  name: 'log',
};

export { LogQuestion };
