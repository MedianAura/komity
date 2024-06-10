import chalk from 'chalk';
import { type InputQuestion } from 'inquirer';

const SubjectQuestion: InputQuestion = {
  type: 'input',
  message: 'Saisir une courte phrase imperative pour décrire le commit (max 100 chars) :\n',
  name: 'subject',
  validate(subject: string) {
    const message = `Le sujet doit être inférieur ou égal à 100 caractères. Longueur courante : ${subject.length.toString(10)} caractères.`;

    if (subject.trim().length === 0) {
      return 'sujet est requis';
    }

    if (subject.length > 100) {
      return message;
    }

    return true;
  },
  transformer(subject: string): string {
    const color = subject.length <= 100 ? chalk.green : chalk.red;
    return color(`(${subject.length.toString(10)}) ${subject}`);
  },
};

export { SubjectQuestion };
