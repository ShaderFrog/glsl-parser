import generate from './parser/generator.js';
import * as parser from './parser/parser.js';
import parse from './parser/index.js';

// I tried "export * from './error.js'" here but it doesn't seem to make
// GlslSyntaxError available to consumers of the module?
export { GlslSyntaxError } from './error.js';

export { generate, parser, parse };
