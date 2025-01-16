import type { AstNode, Program } from '../ast';

export type ParserOptions = Partial<{
  quiet: boolean;
  grammarSource: string;
  includeLocation: boolean;
  failOnWarn: boolean;
  stage: 'vertex' | 'fragment' | 'either';
  tracer: {
    trace: (e: {
      type: 'rule.enter' | 'rule.match' | 'rule.fail';
      rule: string;
      result: any;
    }) => void;
  };
}>;

// Allow to fetch util functions from parser directly. I'd like to inline those
// functions directly in this file, but then the tests can't find it since jest
// can't import from .d.ts files as there's no accompanying ts/js file
export {
  renameBinding,
  renameBindings,
  renameType,
  renameTypes,
  renameFunction,
  renameFunctions,
  debugEntry,
  debugFunctionEntry,
  debugScopes,
} from './utils';

export type Parse = {
  (input: string, options?: ParserOptions): Program;
};

// Convenience export to cast the parser in tests
export type Parser = {
  parse: Parse;
};

export const parse: Parse;
