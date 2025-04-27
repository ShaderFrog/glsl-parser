import generate from './generator.js';
import {
  preprocessAst,
  preprocessComments,
  PreprocessorOptions,
  visitPreprocessedAst,
} from './preprocessor.js';
import { formatError } from '../error.js';

// This index file is currently only for package publishing, where the whole
// library exists in the dist/ folder, so the below import is relative to dist/
import * as parser from './preprocessor-parser.js';

/**
 * This is the main entry point for the preprocessor. It parses the source
 * code and returns an AST. It protects the user from the horrific peggy
 * SyntaxError, by wrapping it in a nicer custom error.
 */
const parse = (src: string, options?: PreprocessorOptions) =>
  formatError(parser)(
    options?.preserveComments ? src : preprocessComments(src),
    options
  );

const preprocess = (src: string, options?: PreprocessorOptions) =>
  generate(preprocessAst(parse(src, options)));

export default preprocess;

export {
  parse,
  preprocessAst,
  preprocessComments,
  generate,
  preprocess,
  parser,
  visitPreprocessedAst,
};
