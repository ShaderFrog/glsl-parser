const util = require('util');

const isNode = (node) => !!node?.type;
const isTraversable = (node) => isNode(node) || Array.isArray(node);

/**
 * Converts an AST to a singe value, visiting nodes and using visitor callbacks
 * to generate the node's value. TODO: Could this be done with a reducetree
 * function? Also this is different than the enter/exit visitors in the ast
 * visitor function. Can these be merged into the same strategy?
 */
const evaluate = (ast, visitors) => {
  const visit = (node) => {
    const visitor = visitors[node.type];
    if (!visitor) {
      throw new Error(`No visitor for ${node.type}`);
    }
    return visitors[node.type](node, visit);
  };
  return visit(ast);
};

const makePath = (node, parent, key, index) => ({
  node,
  parent,
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
});

/**
 * Apply the visitor pattern to an AST that conforms to this compiler's spec
 */
const visit = (ast, visitors) => {
  const visitNode = (node, parent, key, index) => {
    const visitor = visitors[node.type];
    if (visitor?.enter) {
      const path = makePath(node, parent, key, index);
      visitor.enter(path);
      if (path.removed) {
        if (typeof index === 'number') {
          parent[key].splice(index, 1);
        } else {
          parent[key] = null;
        }
        return path;
      }
      if (path.replaced) {
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
            const path = visitNode(child, node, nodeKey, i - offset);
            if (path?.removed) {
              offset += 1;
            }
          }
        } else {
          visitNode(nodeValue, node, nodeKey);
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
      : `NO GENERATOR FOR ${ast.type}` + util.inspect(ast, false, null, true);
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

module.exports = { evaluate, visit, makeGenerator, makeEveryOtherGenerator };
