import type { AstNode } from '../core/ast';

export interface Program extends AstNode {
  blocks: AstNode;
}

// TOOD: Do I need this?
export const SyntaxError: any;

export function parse(input: string): Program;
