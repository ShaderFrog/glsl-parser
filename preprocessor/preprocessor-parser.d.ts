import type { AstNode, Program } from '../core/ast';

export type ParserOptions = {};

export function parse(
  input: string,
  options?: ParserOptions
): PreprocessorProgram;
