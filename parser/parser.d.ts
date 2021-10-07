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

export type ParserOptions = {
  quiet?: boolean;
};

// TOOD: Do I need this?
export const SyntaxError: any;

// Allow to fetch util functions from parser directly. I'd like to inline those
// functions directly in this file, but then the tests can't find it since jest
// can't import from .d.ts files as there's no accompanying ts/js file
export * from './utils';

export function parse(input: string, options?: ParserOptions): ParserProgram;
