export interface AstNode {
  type: string;
  wsStart?: string;
  wsEnd?: string;
}

const isNode = (node: AstNode) => !!node?.type;
const isTraversable = (node: any) => isNode(node) || Array.isArray(node);

/**
 * Converts an AST to a singe value, visiting nodes and using visitor callbacks
 * to generate the node's value. TODO: Could this be done with a reducetree
 * function? Also this is different than the enter/exit visitors in the ast
 * visitor function. Can these be merged into the same strategy?
 */
const evaluate = (ast: AstNode, visitors) => {
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
  replaceWith: (replacer: any) => void;
  findParent: (test: (p: Path) => boolean) => Path | null;

  _skipped?: boolean;
  _removed?: boolean;
  _replaced?: any;
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
    this._skipped = true;
  },
  remove: function () {
    this._removed = true;
  },
  replaceWith: function (replacer) {
    this._replaced = replacer;
  },
  findParent: function (test) {
    return parentPath
      ? test(parentPath)
        ? parentPath
        : parentPath.findParent(test)
      : null;
  },
});

/**
 * Apply the visitor pattern to an AST that conforms to this compiler's spec
 */
const visit = (ast: AstNode, visitors) => {
  const visitNode = (node, parent, parentPath, key, index) => {
    const visitor = visitors[node.type];
    const path = makePath(node, parent, parentPath, key, index);

    if (visitor?.enter) {
      visitor.enter(path);
      if (path._removed) {
        if (typeof index === 'number') {
          parent[key].splice(index, 1);
        } else {
          parent[key] = null;
        }
        return path;
      }
      if (path._replaced) {
        if (typeof index === 'number') {
          parent[key].splice(index, 1, path._replaced);
        } else {
          parent[key] = path._replaced;
        }
      }
      if (path._skipped) {
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
          visitNode(nodeValue, node, path, nodeKey);
        }
      });

    visitor?.exit?.(node, parent, key, index);
  };

  return visitNode(ast);
};

/**
 * Stringify an AST
 */
const makeGenerator = (generators) => {
  const gen = (ast) =>
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

const makeEveryOtherGenerator = (generate) => {
  const everyOther = (nodes, everyOther) =>
    nodes.reduce(
      (output, node, index) =>
        output +
        generate(node) +
        (index === nodes.length - 1 ? '' : generate(everyOther[index])),
      ''
    );
  return everyOther;
};

export { evaluate, visit, makeGenerator, makeEveryOtherGenerator };
