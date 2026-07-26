import chalk from 'chalk';
import { type DistinctQuestion } from 'inquirer';
import { SUBJECT_MAX_LENGTH } from '../../helpers/commit-message.js';

const SubjectQuestion: DistinctQuestion = {
  type: 'input',
  message: `Commit message (${SUBJECT_MAX_LENGTH.toString(10)} chars max) :\n`,
  name: 'subject',
  validate(subject: string) {
    const message = `Commit message must be or under ${SUBJECT_MAX_LENGTH.toString(10)} characters. Current length : ${subject.length.toString(10)} characters.`;

    if (subject.trim().length === 0) {
      return 'commit message is required';
    }

    if (subject.length > SUBJECT_MAX_LENGTH) {
      return message;
    }

    return true;
  },
  transformer(subject: string): string {
    const color = subject.length <= SUBJECT_MAX_LENGTH ? chalk.green : chalk.red;
    return color(`(${subject.length.toString(10)}) ${subject}`);
  },
};

export { SubjectQuestion };
