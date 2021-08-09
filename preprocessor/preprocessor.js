const { visit, evaluate } = require('../core/ast.js');

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

module.exports = preprocess;
