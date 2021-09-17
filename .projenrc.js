const { TaimosTypescriptLibrary } = require('@taimos/projen');
const { DependenciesUpgradeMechanism, Gitpod, DevEnvironmentDockerImage } = require('projen');

const project = new TaimosTypescriptLibrary({
  defaultReleaseBranch: 'main',
  name: 'aws-authenticate',
  description: 'AWS CLI tool for authorization',
  keywords: ['amazon',
    'aws',
    'auth'],
  license: 'MIT',
  bin: {
    'aws-authenticate': 'lib/index.js',
  },
  deps: [
    'aws-sdk',
    'minimist',
    'proxy-agent',
  ],
  gitpod: false,
  devDeps: [
    '@taimos/projen',
    'ts-node',
    '@types/minimist',
  ],
  pullRequestTemplateContents: [`* **Please check if the PR fulfills these requirements**
- [ ] The commit message describes your change
- [ ] Tests for the changes have been added if possible (for bug fixes / features)
- [ ] Docs have been added / updated (for bug fixes / features)
- [ ] Changes are mentioned in the changelog (for bug fixes / features)


* **What kind of change does this PR introduce?** (Bug fix, feature, docs update, ...)



* **What is the current behavior?** (You can also link to an open issue here)



* **What is the new behavior (if this is a feature change)?**



* **Does this PR introduce a breaking change?** (What changes might users need to make in their setup due to this PR?)



* **Other information**:`],
});

const gp = new Gitpod(project, {
  dockerImage: DevEnvironmentDockerImage.fromImage('taimos/gitpod'),
});
gp.addCustomTask({
  init: 'yarn install --check-files --frozen-lockfile',
  command: 'npx projen build',
});

project.synth();