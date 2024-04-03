import type { AstNode, Program } from './ast-types.js';

type NodeGenerator<NodeType> = (node: NodeType) => string;

export type NodeGenerators = {
  [NodeType in AstNode['type']]: NodeGenerator<
    Extract<AstNode, { type: NodeType }>
  >;
} & { program?: NodeGenerator<Program> };

export type Generator = (
  ast: Program | AstNode | AstNode[] | string | string[] | undefined | null
) => string;

/**
 * Stringify an AST
 */
export const makeGenerator = (generators: NodeGenerators): Generator => {
  const gen = (
    ast: Program | AstNode | AstNode[] | string | string[] | undefined | null
  ): string =>
    typeof ast === 'string'
      ? ast
      : ast === null || ast === undefined
      ? ''
      : Array.isArray(ast)
      ? ast.map(gen).join('')
      : ast.type in generators
      ? (generators[ast.type] as Generator)(ast)
      : `NO GENERATOR FOR ${ast.type}` + ast;
  return gen;
};

export type EveryOtherGenerator = (nodes: AstNode[], eo: AstNode[]) => string;

export const makeEveryOtherGenerator = (
  generate: Generator
): EveryOtherGenerator => {
  const everyOther = (nodes: AstNode[], eo: AstNode[]) =>
    nodes.reduce(
      (output, node, index) =>
        output +
        generate(node) +
        (index === nodes.length - 1 ? '' : generate(eo[index])),
      ''
    );
  return everyOther;
};
