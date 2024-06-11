import chalk from 'chalk';
import { type InputQuestion } from 'inquirer';

const SubjectQuestion: InputQuestion = {
  type: 'input',
  message: 'Commit message (100 chars max) :\n',
  name: 'subject',
  validate(subject: string) {
    const message = `Commit message must be or under 100 characters. Current length : ${subject.length.toString(10)} characters.`;

    if (subject.trim().length === 0) {
      return 'commit message is required';
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
