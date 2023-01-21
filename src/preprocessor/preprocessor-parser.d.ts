import type { PreprocessorProgram } from './preprocessor';

export type ParserOptions = {};

export function parse(
  input: string,
  options?: ParserOptions
): PreprocessorProgram;
