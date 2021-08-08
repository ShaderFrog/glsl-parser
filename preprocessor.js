const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');

const generate = (ast) =>
  typeof ast === 'string'
    ? ast
    : ast === null || ast === undefined
    ? ''
    : Array.isArray(ast)
    ? ast.map(generate).join('')
    : ast.type in generators
    ? generators[ast.type](ast)
    : `NO GENERATOR FOR ${ast.type}` + util.inspect(ast, false, null, true);

// TODO: How to organize this code? The shader AST will need similar abstractions
const generators = {
  program: (node) => generate(node.blocks) + generate(node.wsEnd),
  segment: (node) => generate(node.blocks),
  text: (node) => generate(node.text),
  literal: (node) =>
    generate(node.wsStart) + generate(node.literal) + generate(node.wsEnd),
  identifier: (node) => generate(node.identifier) + generate(node.wsEnd),

  binary: (node) =>
    generate(node.left) + generate(node.operator) + generate(node.right),
  group: (node) =>
    generate(node.lp) + generate(node.expression) + generate(node.rp),
  unary: (node) => generate(node.operator) + generate(node.expression),
  unary_defined: (node) =>
    generate(node.operator) +
    generate(node.lp) +
    generate(node.identifier) +
    generate(node.rp),
  int_constant: (node) => generate(node.token) + generate(node.wsEnd),

  elseif: (node) =>
    generate(node.token) +
    generate(node.expression) +
    generate(node.body) +
    generate(node.wsEnd),
  if: (node) =>
    generate(node.token) +
    generate(node.expression) +
    generate(node.wsEnd) +
    generate(node.body),
  ifdef: (node) =>
    generate(node.token) + generate(node.identifier) + generate(node.wsEnd),
  ifndef: (node) =>
    generate(node.token) + generate(node.identifier) + generate(node.wsEnd),
  error: (node) =>
    generate(node.error) + generate(node.message) + generate(node.wsEnd),

  undef: (node) =>
    generate(node.undef) + generate(node.identifier) + generate(node.wsEnd),
  define: (node) =>
    generate(node.wsStart) +
    generate(node.define) +
    generate(node.identifier) +
    generate(node.body) +
    generate(node.wsEnd),
  define_arguments: (node) =>
    generate(node.wsStart) +
    generate(node.define) +
    generate(node.identifier) +
    generate(node.lp) +
    generate(node.args) +
    generate(node.rp) +
    generate(node.body) +
    generate(node.wsEnd),

  conditional: (node) =>
    generate(node.wsStart) +
    generate(node.ifPart) +
    generate(node.body) +
    generate(node.elseIfParts) +
    generate(node.elsePart) +
    generate(node.endif) +
    generate(node.wsEnd),

  version: (node) =>
    generate(node.version) +
    generate(node.value) +
    generate(node.profile) +
    generate(node.wsEnd),
  pragma: (node) =>
    generate(node.pragma) + generate(node.body) + generate(node.wsEnd),
  line: (node) =>
    generate(node.line) + generate(node.value) + generate(node.wsEnd),
  extension: (node) =>
    generate(node.extension) +
    generate(node.name) +
    generate(node.colon) +
    generate(node.behavior) +
    generate(node.wsEnd),
};

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

const expandMacros = (text, defines) =>
  Object.entries(defines).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\b${key}\\b`, 'g'), value),
    text
  );

const identity = (x) => x;

// Given an expression AST node, visit it to expand the macro defines to in the
// right places
const expandInExpressions = (defines, ...expressions) => {
  expressions.filter(identity).forEach((expression) => {
    visit(expression, {
      unary_defined: {
        enter: (path) => {
          path.skip();
        },
      },
      identifier: {
        enter: (path) => {
          path.node.identifier = expandMacros(path.node.identifier, defines);
        },
      },
    });
  });
};

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

const evaluateIfPart = (defines, ifPart) => {
  if (ifPart.type === 'if') {
    return evaluteExpression(ifPart.expression, defines);
  } else if (ifPart.type === 'ifdef') {
    return ifPart.identifier.identifier in defines;
  } else if (ifPart.type === 'ifndef') {
    return !(ifPart.identifier.identifier in defines);
  }
};

// TODO: Are all of these operators equivalent between javascript and GLSL?
const evaluteExpression = (node, defines) =>
  evaluate(node, {
    // TODO: Handle non-base-10 numbers. Should these be parsed in the peg grammar?
    int_constant: (node) => parseInt(node.token, 10),
    unary_defined: (node) => node.identifier.identifier in defines,
    identifier: (node) => node.identifier,
    binary: ({ left, right, operator: { literal } }, visit) => {
      switch (literal) {
        // multiplicative
        case '*': {
          return visit(left) * visit(right);
        }
        // multiplicative
        case '/': {
          return visit(left) / visit(right);
        }
        // multiplicative
        case '%': {
          return visit(left) % visit(right);
        }
        // additive +
        case '-': {
          return visit(left) - visit(right);
        }
        // additive
        case '-': {
          return visit(left) - visit(right);
        }
        // bit-wise shift
        case '<<': {
          return visit(left) << visit(right);
        }
        // bit-wise shift
        case '>>': {
          return visit(left) >> visit(right);
        }
        // relational
        case '<': {
          return visit(left) < visit(right);
        }
        // relational
        case '>': {
          return visit(left) > visit(right);
        }
        // relational
        case '<=': {
          return visit(left) <= visit(right);
        }
        // relational
        case '>=': {
          return visit(left) >= visit(right);
        }
        // equality
        case '==': {
          return visit(left) == visit(right);
        }
        // equality
        case '!=': {
          return visit(left) != visit(right);
        }
        // bit-wise and
        case '&': {
          return visit(left) & visit(right);
        }
        // bit-wise exclusive or
        case '^': {
          return visit(left) ^ visit(right);
        }
        // bit-wise inclusive or
        case '|': {
          return visit(left) | visit(right);
        }
        // logical and
        case '&&': {
          return visit(left) && visit(right);
        }
        // inclusive or
        case '||': {
          return visit(left) || visit(right);
        }
      }
    },
  });

const shouldPreserve = (preserve) => (path) => {
  const test = preserve?.[path.node.type];
  return typeof test === 'function' ? test(path) : test;
};

/**
 * Perform the preprocessing logic, aka the "preprocessing" phase of the compiler.
 * Expand macros, evaluate conditionals, etc
 * TODO: Define the strategy for conditionally removing certain macro types
 * and conditionally expanding certain expressions. And take in optiona list
 * of pre defined thigns?
 * TODO: Handle __LINE__ and other constants.
 */
const preprocess = (ast, options = {}) => {
  const defines = { ...options.defines };
  // const defineValues = { ...options.defines };
  const { preserve, ignoreMacro } = options;
  const preserveNode = shouldPreserve(preserve);

  visit(ast, {
    conditional: {
      enter: (path) => {
        const { node } = path;
        // TODO: Determining if we need to handle edge case conditionals here
        if (preserveNode(path)) {
          return;
        }

        // Expand macros
        expandInExpressions(
          defines,
          node.ifPart.expression,
          ...node.elseIfParts.map((elif) => elif.expression),
          node.elsePart?.expression
        );

        if (evaluateIfPart(defines, node.ifPart)) {
          path.replaceWith(node.ifPart.body);
          // path.replaceWith({
          //   ...node,
          //   ifPart: node.ifPart.body,
          //   elsePart: null,
          //   endif: null,
          //   wsEnd: null, // Remove linebreak after endif
          // });
        } else {
          !node.elseIfParts.reduce(
            (res, elif) =>
              res ||
              (evaluteExpression(elif.expression, defines) &&
                (path.replaceWith(elif.body) || true)),
            false
          ) &&
            node.elsePart &&
            path.replaceWith(node.elsePart.body);
        }
      },
    },
    text: {
      enter: (path) => {
        path.node.text = expandMacros(path.node.text, defines);
      },
    },
    define: {
      enter: (path) => {
        const {
          identifier: { identifier },
          body,
        } = path.node;

        // TODO: Abandoning this for now until I know more concrete use cases
        // const shouldIgnore = ignoreMacro?.(identifier, body);
        // defineValues[identifier] = body;

        // if (!shouldIgnore) {
        defines[identifier] = body;
        !preserveNode(path) && path.remove();
        // }
      },
    },
    undef: {
      enter: (path) => {
        delete defines[path.node.identifier.identifier];
        !preserveNode(path) && path.remove();
      },
    },
    error: {
      enter: (path) => {
        if (options.stopOnError) {
          throw new Error(path.node.message);
        }
        !preserveNode(path) && path.remove();
      },
    },
    pragma: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
    version: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
    extension: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
    // TODO: Causes a failure
    line: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
  });
};

module.exports = {
  preprocess,
  generate,
};
