const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');

const generate = (ast) =>
  typeof ast === 'string'
    ? ast
    : !ast
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
    generate(node.token) + generate(node.expression) + generate(node.wsEnd),
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

test('preprocessor test', () => {
  expectParsedProgram(`
#line 0
#version 100 "hi"
#define GL_es_profile 1
#extension all : disable
#error whoopsie
#if A == 1 || (B == 2)
      #if A == 1 || B == 2
      #define A
          #elif A == 1 || defined(B) && C == 2
          float a;
          #elif A == 1 || defined(B) && C == 2
          float a;
      #define B
      #endif
      #pragma mypragma: something(else)
 #define A
    #line 10
    #undef A
    #elif A == 1 || defined(B)
 #define B
#endif
`);
});

const isNode = (node) => !!node?.type;
const isTraversable = (node) => isNode(node) || Array.isArray(node);

const borf = (ast, visitors) => {
  const visit = (node) => {
    const visitor = visitors[node.type];
    if (!visitor) {
      throw new Error(`ERROR: NO VISITOR FOR ${node.type}`);
    }
    return visitors[node.type](node, visit);
  };
  return visit(ast);
};

const visit = (ast, visitors) => {
  const visitNode = (node, parent, key, index) => {
    const visitor = visitors[node.type];
    if (visitor?.skip) {
      return;
    }
    visitor?.enter?.(node, parent, key, index);

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

test('what is going on', () => {
  const program = `
    #define B C
    #define C 3
    // TODO is defined(B) subject to macro expansion?
    #if B == 1 || defined(B)
      success B B
      #undef C
    #endif
    success B B
  `;

  const defines = {};

  const expand = (text, defines) =>
    Object.entries(defines).reduce(
      (result, [key, value]) =>
        result.replace(new RegExp(`\\b${key}\\b`, 'g'), value),
      text
    );

  const ast = parser.parse(program);

  // Preprocess macros... TODO evaluate expressions? TODO delete nodes?
  // This is the "preprocessing" phase
  visit(ast, {
    if: {
      enter: (node) => {
        visit(node.expression, {
          unary_defined: {
            skip: true,
          },
          identifier: {
            enter: (node) => {
              node.identifier = expand(node.identifier, defines);
            },
          },
        });

        const result = borf(node.expression, {
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

        console.log('result', result);
      },
    },
    text: {
      enter: (node) => {
        node.text = expand(node.text, defines);
      },
    },
    define: {
      enter: (node) => {
        defines[node.identifier.identifier] = node.body;
      },
    },
    undef: {
      enter: (node) => {
        delete defines[node.identifier.identifier];
      },
    },
  });
  console.log(generate(ast));

  // debugProgram(program);
});
