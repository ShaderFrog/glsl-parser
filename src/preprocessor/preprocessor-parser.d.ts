import type { PreprocessorProgram } from './preprocessor';
import { SyntaxError } from '../error.ts';

export type ParserOptions = {};

export function parse(
  input: string,
  options?: ParserOptions
): PreprocessorProgram;

export const SyntaxError: typeof SyntaxError;
