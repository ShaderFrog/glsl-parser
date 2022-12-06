import { AstNode } from './node';

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

const isNode = (node: AstNode) => !!node?.type;
const isTraversable = (node: any) => isNode(node) || Array.isArray(node);

/**
 * Converts an AST to a singe value, visiting nodes and using visitor callbacks
 * to generate the node's value. TODO: Could this be done with a reducetree
 * function? Also this is different than the enter/exit visitors in the ast
 * visitor function. Can these be merged into the same strategy?
 */

export interface Program {
  type: 'program';
  program: AstNode[];
  scopes: Scope[];
  wsStart?: string;
  wsEnd?: string;
}

export type Path<NodeType> = {
  node: NodeType;
  parent: Program | AstNode | undefined;
  parentPath: Path<any> | undefined;
  key: string | undefined;
  index: number | undefined;
  skip: () => void;
  remove: () => void;
  replaceWith: (replacer: AstNode) => void;
  findParent: (test: (p: Path<any>) => boolean) => Path<any> | undefined;

  skipped?: boolean;
  removed?: boolean;
  replaced?: any;
};

const makePath = <NodeType>(
  node: NodeType,
  parent: AstNode | Program | undefined,
  parentPath: Path<any> | undefined,
  key: string | undefined,
  index: number | undefined
): Path<NodeType> => ({
  node,
  parent,
  parentPath,
  key,
  index,
  skip: function () {
    this.skipped = true;
  },
  remove: function () {
    this.removed = true;
  },
  replaceWith: function (replacer) {
    this.replaced = replacer;
  },
  findParent: function (test) {
    return !parentPath
      ? parentPath
      : test(parentPath)
      ? parentPath
      : parentPath.findParent(test);
  },
});

export type NodeVisitor<NodeType> = {
  enter?: (p: Path<NodeType>) => void;
  exit?: (p: Path<NodeType>) => void;
};

// This builds a type of all AST types to a visitor type. Aka it builds
//   {
//     function_call: NodeVisitor<FunctionCall>,
//     ...
//   }
// AstNode['type'] is the union of all the type properties of all AST nodes.
// Extract pulls out the type from the AstNode union where the "type"
// property matches the NodeType (like "function_call"). Pretty sweet!
export type NodeVisitors = {
  [NodeType in AstNode['type']]?: NodeVisitor<
    Extract<AstNode, { type: NodeType }>
  >;
} & { program?: NodeVisitor<Program> };

/**
 * Apply the visitor pattern to an AST that conforms to this compiler's spec
 */
const visit = (ast: Program | AstNode, visitors: NodeVisitors) => {
  const visitNode = (
    node: AstNode | Program,
    parent?: AstNode | Program,
    parentPath?: Path<any>,
    key?: string,
    index?: number
  ) => {
    const visitor = visitors[node.type];
    const path = makePath(node, parent, parentPath, key, index);
    const parentNode = parent as any;

    if (visitor?.enter) {
      visitor.enter(path as any);
      if (path.removed) {
        if (!key || !parent) {
          throw new Error(
            `Asked to remove ${node} but no parent key was present in ${parent}`
          );
        }
        if (typeof index === 'number') {
          parentNode[key].splice(index, 1);
        } else {
          parentNode[key] = null;
        }
        return path;
      }
      if (path.replaced) {
        if (!key || !parent) {
          throw new Error(
            `Asked to remove ${node} but no parent key was present in ${parent}`
          );
        }
        if (typeof index === 'number') {
          parentNode[key].splice(index, 1, path.replaced);
        } else {
          parentNode[key] = path.replaced;
        }
      }
      if (path.skipped) {
        return path;
      }
    }

    Object.entries(node)
      .filter(([_, nodeValue]) => isTraversable(nodeValue))
      .forEach(([nodeKey, nodeValue]) => {
        if (Array.isArray(nodeValue)) {
          for (let i = 0, offset = 0; i - offset < nodeValue.length; i++) {
            const child = nodeValue[i - offset];
            const res = visitNode(child, node, path, nodeKey, i - offset);
            if (res?.removed) {
              offset += 1;
            }
          }
        } else {
          visitNode(nodeValue, node, path, nodeKey);
        }
      });

    visitor?.exit?.(path as any);
  };

  visitNode(ast);
};

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
const makeGenerator = (generators: NodeGenerators): Generator => {
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

const makeEveryOtherGenerator = (generate: Generator): EveryOtherGenerator => {
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

export { visit, makeGenerator, makeEveryOtherGenerator };
