// Small runner to execute the TypeScript script with ts-node/register
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
require('./create-and-publish-catalog.ts');
