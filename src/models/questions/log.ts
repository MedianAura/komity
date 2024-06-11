import { type ConfirmQuestion } from 'inquirer';

const LogQuestion: ConfirmQuestion = {
  type: 'confirm',
  default: 'Y',
  message: 'Add commit to changelog ?',
  name: 'log',
};

export { LogQuestion };
