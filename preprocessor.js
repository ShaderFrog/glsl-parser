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

const file = (filePath) => fs.readFileSync(path.join('.', filePath)).toString();

const grammar = file('peg/preprocessor.pegjs');
const testFile = file('glsltest.glsl');
const parser = pegjs.generate(grammar, { cache: true });

const debugProgram = (program) => {
  const ast = parser.parse(program);
  console.log(util.inspect(ast, false, null, true));
};

const expectParsedProgram = (sourceGlsl) => {
  const ast = parser.parse(sourceGlsl);
  const glsl = generate(ast);
  if (glsl !== sourceGlsl) {
    console.log(util.inspect(ast, false, null, true));
    expect(glsl).toBe(sourceGlsl);
  }
};

const isNode = (node) => !!node?.type;
const isTraversable = (node) => isNode(node) || Array.isArray(node);

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

const makePath = (node, key, index) => ({
  node,
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

const replaceDefines = (text, defines) =>
  Object.entries(defines).reduce(
    (result, [key, value]) =>
      result.replace(new RegExp(`\\b${key}\\b`, 'g'), value),
    text
  );

const expandInExpression = (expression, defines) => {
  visit(expression, {
    unary_defined: { enter: (path) => path.skip() },
    identifier: {
      enter: (path) => {
        path.node.identifier = replaceDefines(path.node.identifier, defines);
      },
    },
  });
};

const visit = (ast, visitors) => {
  const visitNode = (node, parent, key, index) => {
    const visitor = visitors[node.type];
    if (visitor?.enter) {
      const path = makePath(node, parent, key, index);
      visitor.enter(path);
      if (path.removed) {
        if (index) {
          parent[key].splice(index, 1);
        } else {
          parent[key] = null;
        }
        return;
      }
      if (path.replaced) {
        if (typeof index === 'number') {
          parent[key].splice(index, 1, path.replaced);
        } else {
          parent[key] = path.replaced;
        }
        if (path.skipped) {
          return;
        }
      }
    }

    Object.entries(node)
      .filter(([nodeKey, nodeValue]) => isTraversable(nodeValue))
      .forEach(([nodeKey, nodeValue]) => {
        if (Array.isArray(nodeValue)) {
          nodeValue
            .filter(isNode)
            .forEach((child, index) => visitNode(child, node, nodeKey, index));
        } else {
          visitNode(nodeValue, node, nodeKey);
        }
      });

    return visitor?.exit?.(node, parent, key, index);
  };

  return visitNode(ast);
};

const evaluteExpression = (node, defines) =>
  evaluate(node, {
    int_constant: (node) => parseInt(node.token, 10),
    unary_defined: (node) => node.identifier in defines,
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

const preprocess = (ast) => {
  const defines = {};

  // Preprocess macros... TODO evaluate expressions? TODO delete nodes?
  // This is the "preprocessing" phase
  visit(ast, {
    conditional: {
      enter: (path) => {
        // Expand macros
        expandInExpression(path.node.ifPart.expression, defines);
        path.node.elseIfParts.forEach((elif) => {
          expandInExpression(elif.expression, defines);
        });
        path.node.elsePart &&
          expandInExpression(path.node.elsePart.expression, defines);

        const ifResult = evaluteExpression(
          path.node.ifPart.expression,
          defines
        );

        path.replaceWith({
          ...path.node,
          ifPart: ifResult ? path.node.ifPart.body : null,
          elsePart: null,
          endif: null,
          wsEnd: null, // Remove linebreak after endif
        });
      },
    },
    text: {
      enter: (path) => {
        path.node.text = replaceDefines(path.node.text, defines);
      },
    },
    define: {
      enter: (path) => {
        defines[path.node.identifier.identifier] = path.node.body;
      },
    },
    undef: {
      enter: (path) => {
        delete defines[path.node.identifier.identifier];
      },
    },
  });
};

module.exports = {
  preprocess,
  generate,
};
