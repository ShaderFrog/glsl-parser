import type { AstNode, Program } from '../core/ast';

// TOOD: Do I need this?
export const SyntaxError: any;

export function parse(input: string): Program;
