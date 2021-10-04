import type { AstNode, Program } from '../core/ast';

// TOOD: Do I need this?
export const SyntaxError: any;

export type ParserOptions = {};

export function parse(input: string, options?: ParserOptions): Program;
