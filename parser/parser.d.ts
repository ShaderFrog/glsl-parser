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

export interface Program extends Program {
  scopes: Scope[];
}

export type ParserOptions = {
  quiet?: boolean;
};

// TOOD: Do I need this?
export const SyntaxError: any;

export function parse(input: string, options?: ParserOptions): Program;
