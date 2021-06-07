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
  program: (node) => generate(node.ws) + generate(node.program),
  preprocessor: (node) => generate(node.line) + generate(node._),
  keyword: (node) => generate(node.token) + generate(node.whitespace),

  precision: (node) =>
    node.prefix
      ? generate(node.prefix) +
        generate(node.qualifier) +
        generate(node.specifier)
      : generate(node.type) + generate(node.children),

  // Statements
  expression_statement: (node) =>
    generate(node.expression) + generate(node.semi),
  if_statement: (node) =>
    generate(node.if) +
    generate(node.lp) +
    generate(node.condition) +
    generate(node.rp) +
    generate(node.body) +
    generate(node.else),
  switch_statement: (node) =>
    generate(node.switch) +
    generate(node.lp) +
    generate(node.expression) +
    generate(node.rp) +
    generate(node.lb) +
    generate(node.cases) +
    generate(node.rb),
  break_statement: (node) => generate(node.break) + generate(node.semi),
  do_statement: (node) =>
    generate(node.do) +
    generate(node.body) +
    generate(node.while) +
    generate(node.lp) +
    generate(node.expression) +
    generate(node.rp) +
    generate(node.semi),
  continue_statement: (node) => generate(node.continue) + generate(node.semi),
  return_statement: (node) =>
    generate(node.return) + generate(node.expression) + generate(node.semi),
  discard_statement: (node) => generate(node.discard) + generate(node.semi),
  while_statement: (node) =>
    generate(node.while) +
    generate(node.lp) +
    generate(node.condition) +
    generate(node.rp) +
    generate(node.body),
  for_statement: (node) =>
    generate(node.for) +
    generate(node.lp) +
    generate(node.init) +
    generate(node.initSemi) +
    generate(node.condition) +
    generate(node.conditionSemi) +
    generate(node.operation) +
    generate(node.rp) +
    generate(node.body),
  declaration_statement: (node) =>
    generate(node.declaration) + generate(node.semi),

  switch_case: (node) =>
    generate(node.case) +
    generate(node.test) +
    generate(node.colon) +
    generate(node.statements),
  default_case: (node) =>
    generate(node.default) + generate(node.colon) + generate(node.statements),

  declaration: (node) => generate(node.declaration) + generate(node.semi),
  declarator_list: (node) => generate(node.children),
  declarator: (node) =>
    generate(node.qualifiers) +
    generate(node.specifier) +
    generate(node.identifier),
  type_specifier: (node) =>
    generate(node.specifier) + generate(node.quantifier),
  identifier: (node) => node.identifier + generate(node.children),
  function: (node) =>
    generate(node['prototype']) + generate(node.children) + generate(node.rp),
  function_prototype: (node) =>
    generate(node.header.returnType) +
    generate(node.header.name) +
    generate(node.header.lp) +
    generate(node.params) +
    generate(node.rp) +
    generate(node.children),
  compound_statement: (node) =>
    generate(node.lb) + generate(node.children) + generate(node.rb),
  function_call: (node) =>
    generate(node.identifier) +
    generate(node.lp) +
    generate(node.args) +
    generate(node.rp),
  parameter_declarator: (node) =>
    generate(node.qualifier) +
    generate(node.specifier) +
    generate(node.identifier),
  postfix: (node) => generate(node.expr) + generate(node.postfix),
  quantifier: (node) =>
    generate(node.lb) + generate(node.expr) + generate(node.rb),
  field_selection: (node) => generate(node.dot) + generate(node.selection),

  assignment: (node) =>
    generate(node.left) + generate(node.operator) + generate(node.right),

  ternary: (node) =>
    generate(node.expr) +
    generate(node.question) +
    generate(node.left) +
    generate(node.colon) +
    generate(node.right),

  binary: (node) =>
    generate(node.left) + generate(node.operator) + generate(node.right),
  group: (node) => generate(node.children),
  unary: (node) =>
    generate(node.operator) +
    generate(node.expression) +
    generate(node.children),

  float_constant: (node) => generate(node.children),
  double_constant: (node) => generate(node.children),
  int_constant: (node) => generate(node.children),
  uint_constant: (node) => generate(node.children),

  // Tokens - should these all be in "keyword" or other to avoid one node
  // per thing? Compare to babel
  '(': (node) => node.type + generate(node.children),
  ')': (node) => node.type + generate(node.children),
  '[': (node) => node.type + generate(node.children),
  ']': (node) => node.type + generate(node.children),
  '{': (node) => node.type + generate(node.children),
  '}': (node) => node.type + generate(node.children),
  '.': (node) => node.type + generate(node.children),
  ',': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  ':': (node) => node.type + generate(node.children),
  // This ugly ternary is the result of using '=' both as a tree, and as a
  // token with whitespace after it. Definitely need to fix this
  '=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  ';': (node) => node.type + generate(node.children),
  '!': (node) => node.type + generate(node.children),
  '-': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '~': (node) => node.type + generate(node.children),
  '+': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '*': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '/': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '%': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '<': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '>': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '|': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '^': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '&': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '?': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),

  '<<': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '>>': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '++': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '--': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '<=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '>=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '==': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '!=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '&&': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '||': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '^^': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '*=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '/=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '+=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '%=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '<<=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '>>=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '&=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '^=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '|=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
  '-=': (node) =>
    (node.children.length && node.children[0].type ? '' : generate(node.type)) +
    generate(node.children),
};

module.exports = { generate, generators };
