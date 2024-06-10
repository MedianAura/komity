import {createRequire} from 'node:module';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import clear from 'rollup-plugin-clear';
import ts from "rollup-plugin-ts";

const require = createRequire(import.meta.url);
const packageJSON = require('./package.json');
let commands = [];

const plugins = [
  clear({
    targets: ['dist'],
    watch: true,
  }),
  json(),
  ts({
    transpiler: 'swc',
    swcConfig: {
      sourceMaps: true,
      inlineSourcesContent: true,
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: false,
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        target: 'es2015',
        loose: true,
        minify: {
          compress: false,
          mangle: false,
        },
      },
    }
  }),
  resolve(),
  commonjs(),
];

const dependencies = ['tslib']
dependencies.push(...Object.keys(packageJSON.dependencies ?? {}).map((d) => d));
dependencies.push(...Object.keys(packageJSON.peerDependencies ?? {}).map((d) => d));
dependencies.push(...Object.keys(packageJSON.devDependencies ?? {}).map((d) => d));

export default [
  {
    cache: false,
    context: 'this',
    input: './src/entry.ts',
    external: dependencies,
    output: [
      {
        format: 'esm',
        file: packageJSON.main,
        sourcemap: process.env.BUILD === 'development' ? 'inline' : false,
        inlineDynamicImports: true
      },
    ],
    plugins: plugins,
  },
];
