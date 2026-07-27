import { defineConfig, getVersionPrompt } from '@medianaura/automaton';

export default () => {
  return defineConfig({
    jobs: [
      {
        id: 'version',
        name: 'Create a new version',
        actions: [
          {
            type: 'run',
            run: (answers) => {
              if (!answers.confirm) {
                process.exit(4);
              }
            },
          },
          {
            type: 'cmd',
            cmd: 'npm whoami',
          },
          {
            type: 'cmd',
            cmd: 'automaton package',
          },
          {
            type: 'cmd',
            cmd: 'npm version --force --no-git-tag-version %(version)s',
          },
          {
            type: 'cmd',
            cmd: 'git add .',
          },
          {
            type: 'cmd',
            cmd: 'git commit -m "doc: mise à jour pour la version %(version)s"',
          },
          {
            type: 'cmd',
            cmd: 'git tag -a v%(version)s -m "doc: creation de la version %(version)s"',
          },
          {
            type: 'cmd',
            cmd: 'npm publish --access public',
          },
          {
            type: 'cmd',
            cmd: 'git push',
          },
          {
            type: 'cmd',
            cmd: 'git push --tags --no-verify',
          },
        ],
        prompts: [getVersionPrompt],
      },
      {
        id: 'package',
        name: 'Create a new version',
        actions: [
          {
            type: 'cmd',
            cmd: 'npm run build',
          },
        ],
      },
    ],
  });
};
