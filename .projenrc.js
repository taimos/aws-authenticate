const { TaimosTypescriptLibrary } = require('@taimos/projen');
const { github } = require('projen');

const project = new TaimosTypescriptLibrary({
  defaultReleaseBranch: 'main',
  name: 'aws-authenticate',
  description: 'AWS CLI tool for authorization',
  keywords: [
    'amazon',
    'aws',
    'auth',
  ],
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
    '@types/minimist',
  ],
  tsconfig: {
    compilerOptions: {
      lib: ['es2019', 'dom'],
    },
  },
});

project.synth();