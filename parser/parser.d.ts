import type { AstNode, Program } from '../core/ast';

export type ScopeIndex = {
  [name: string]: { references: AstNode[] };
};

export type Scope = {
  name: string;
  parent?: Scope;
  bindings: ScopeIndex;
  types: ScopeIndex;
  functions: ScopeIndex;
};

export interface ParserProgram extends Program {
  scopes: Scope[];
}

// TOOD: Do I need this?
export const SyntaxError: any;

export function parse(input: string): ParserProgram;
