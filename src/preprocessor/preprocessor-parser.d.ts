import type { PreprocessorProgram, PreprocessorOptions } from './preprocessor';
import type { PreprocessorAstNode } from './preprocessor-node';
import { SyntaxError } from '../error.ts';

export function parse(
  input: string,
  options?: PreprocessorOptions
): PreprocessorProgram;

export const SyntaxError: typeof SyntaxError;
