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
  devDeps: [
    '@taimos/projen',
    'ts-node',
    '@types/minimist',
  ],
  gitpod: true,
  tsconfig: {
    compilerOptions: {
      lib: ['es2019', 'dom'],
    },
  },
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

project.synth();