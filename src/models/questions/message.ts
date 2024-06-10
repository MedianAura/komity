import { type InputQuestion } from 'inquirer';

const DescriptionQuestion: InputQuestion = {
  type: 'input',
  message: 'Description pour le changelog :\n',
  name: 'description',
  validate(description) {
    if (description.trim().length === 0) {
      return 'description est requise';
    }

    return true;
  },
  when(answers) {
    return answers.log;
  },
};

export { DescriptionQuestion };
