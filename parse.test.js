const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');

const grammar = fs
  .readFileSync(path.join('.', 'peg/glsl-pegjs-grammar.pegjs'))
  .toString();
const parser = pegjs.generate(grammar);

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
  statement: (node) => generate(node.children),
  declarator_list: (node) => generate(node.children),
  declarator: (node) =>
    generate(node.qualifiers) +
    generate(node.specifier) +
    generate(node.identifier),
  type_specifier: (node) =>
    generate(node.specifier) + generate(node.quantifier),
  identifier: (node) => node.identifier + generate(node.children),
  // Tokens - should these all be in "keyword" or other to avoid one node
  // per thing? Compare to babel
  ';': (node) => node.type + generate(node.children),
  float: (node) => node.type + generate(node.children),
};

test('adds 1 + 2 to equal 3', () => {
  const ast = parser.parse('float a;');
  console.log(util.inspect(ast, false, null, true));
  console.log('Output:', '\n' + generate(ast));
});
