import { type ConfirmQuestion } from 'inquirer';

const LogQuestion: ConfirmQuestion = {
  type: 'confirm',
  default: 'Y',
  message: 'Sauvegarder le commit dans le changelog ?',
  name: 'log',
};

export { LogQuestion };
