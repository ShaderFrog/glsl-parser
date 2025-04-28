import type { PreprocessorProgram, PreprocessorOptions } from './preprocessor';
import { SyntaxError } from '../error.ts';

export function parse(
  input: string,
  options?: PreprocessorOptions
): PreprocessorProgram;

export const SyntaxError: typeof SyntaxError;
