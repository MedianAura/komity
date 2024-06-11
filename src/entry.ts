import 'reflect-metadata';

import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();

export async function run(): Promise<number> {
  const program = await import('./main.js');
  return program.run();
}
