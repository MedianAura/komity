import { type InputQuestion } from 'inquirer';

const DescriptionQuestion: InputQuestion = {
  type: 'input',
  message: 'Changelog message :\n',
  name: 'description',
  validate(description) {
    if (description.trim().length === 0) {
      return 'message is required';
    }

    return true;
  },
  when(answers) {
    return answers.log;
  },
};

export { DescriptionQuestion };
