import type { AstNode, Program } from '../ast';

export type ParserOptions = {};

export function parse(
  input: string,
  options?: ParserOptions
): PreprocessorProgram;
