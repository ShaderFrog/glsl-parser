export interface AstNode {
  type: string;
  wsStart?: string;
  wsEnd?: string;
  // TODO: This may be a bad idea
  [key: string]: any;
}

const isNode = (node: AstNode) => !!node?.type;
const isTraversable = (node: any) => isNode(node) || Array.isArray(node);

/**
 * Converts an AST to a singe value, visiting nodes and using visitor callbacks
 * to generate the node's value. TODO: Could this be done with a reducetree
 * function? Also this is different than the enter/exit visitors in the ast
 * visitor function. Can these be merged into the same strategy?
 */

export type NodeEvaluators = {
  [nodeType: string]: (node: AstNode, visit: (node: AstNode) => any) => any;
};

const evaluate = (ast: AstNode, visitors: NodeEvaluators) => {
  const visit = (node: AstNode) => {
    const visitor = visitors[node.type];
    if (!visitor) {
      throw new Error(`No evaluate() visitor for ${node.type}`);
    }
    return visitors[node.type](node, visit);
  };
  return visit(ast);
};

export type Path = {
  node: AstNode;
  parent: AstNode | null;
  parentPath: Path | null;
  key: string | null;
  index: number | null;
  skip: () => void;
  remove: () => void;
  replaceWith: (replacer: AstNode) => void;
  findParent: (test: (p: Path) => boolean) => Path | null;

  skipped?: boolean;
  removed?: boolean;
  replaced?: any;
};

const makePath = (
  node: AstNode,
  parent: AstNode | null,
  parentPath: Path | null,
  key: string | null,
  index: number | null
): Path => ({
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
    return parentPath
      ? test(parentPath)
        ? parentPath
        : parentPath.findParent(test)
      : null;
  },
});

export type NodeVisitors = {
  [nodeType: string]: {
    enter?: (p: Path) => void;
    exit?: (p: Path) => void;
  };
};

/**
 * Apply the visitor pattern to an AST that conforms to this compiler's spec
 */
const visit = (ast: AstNode, visitors: NodeVisitors) => {
  const visitNode = (
    node: AstNode,
    parent: AstNode | null,
    parentPath: Path | null,
    key: string | null,
    index: number | null
  ) => {
    const visitor = visitors[node.type];
    const path = makePath(node, parent, parentPath, key, index);

    if (visitor?.enter) {
      visitor.enter(path);
      if (path.removed) {
        if (!key || !parent) {
          throw new Error(
            `Asked to remove ${node.id} but no parent key was present in ${parent?.id}`
          );
        }
        if (typeof index === 'number') {
          parent[key].splice(index, 1);
        } else {
          parent[key] = null;
        }
        return path;
      }
      if (path.replaced) {
        if (!key || !parent) {
          throw new Error(
            `Asked to remove ${node.id} but no parent key was present in ${parent?.id}`
          );
        }
        if (typeof index === 'number') {
          parent[key].splice(index, 1, path.replaced);
        } else {
          parent[key] = path.replaced;
        }
      }
      if (path.skipped) {
        return path;
      }
    }

    Object.entries(node)
      .filter(([nodeKey, nodeValue]) => isTraversable(nodeValue))
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
          visitNode(nodeValue, node, path, nodeKey, null);
        }
      });

    visitor?.exit?.(path);
    // visitor?.exit?.(node, parent, key, index);
  };

  return visitNode(ast, null, null, null, null);
};

export type NodeGenerators = {
  [nodeType: string]: (n: AstNode) => string;
};

export type NodeGenerator = (
  ast: AstNode | string | undefined | null
) => string;

/**
 * Stringify an AST
 */
const makeGenerator = (generators: NodeGenerators): NodeGenerator => {
  const gen = (ast: AstNode | string | undefined | null): string =>
    typeof ast === 'string'
      ? ast
      : ast === null || ast === undefined
      ? ''
      : Array.isArray(ast)
      ? ast.map(gen).join('')
      : ast.type in generators
      ? generators[ast.type](ast)
      : `NO GENERATOR FOR ${ast.type}` + ast;
  return gen;
};

export type EveryOtherGenerator = (nodes: AstNode[], eo: AstNode[]) => string;

const makeEveryOtherGenerator = (
  generate: NodeGenerator
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

export { evaluate, visit, makeGenerator, makeEveryOtherGenerator };
