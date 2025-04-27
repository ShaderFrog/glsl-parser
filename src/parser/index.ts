import { formatError } from '../error.js';
import * as parser from './parser.js';

/**
 * This is the main entry point for the parser. It parses the source
 * code and returns an AST. It protects the user from the horrific peggy
 * SyntaxError, by wrapping it in a nicer custom error.
 */
const parse = formatError(parser);

export default parse;
