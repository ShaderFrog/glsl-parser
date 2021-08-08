const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');

/**
 * Stringify an AST
 */
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

const generateWithEveryOther = (nodes, everyOther) =>
  nodes.reduce(
    (output, node, index) =>
      output +
      generate(node) +
      (index === nodes.length - 1 ? '' : generate(everyOther[index])),
    ''
  );

const generators = {
  program: (node) => generate(node.ws) + generate(node.program),
  preprocessor: (node) => generate(node.line) + generate(node._),
  keyword: (node) => generate(node.token) + generate(node.whitespace),

  precision: (node) =>
    generate(node.prefix) + generate(node.qualifier) + generate(node.specifier),

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
  condition_expression: (node) =>
    generate(node.specified_type) +
    generate(node.identifier) +
    generate(node.declarator) +
    generate(node.op) +
    generate(node.initializer),
  declaration_statement: (node) =>
    generate(node.declaration) + generate(node.semi),
  fully_specified_type: (node) =>
    generate(node.qualifiers) + generate(node.specifier),
  layout_qualifier: (node) =>
    generate(node.layout) +
    generate(node.lp) +
    generateWithEveryOther(node.qualifiers, node.commas) +
    generate(node.rp),
  layout_qualifier_id: (node) =>
    generate(node.identifier) +
    generate(node.operator) +
    generate(node.expression),

  switch_case: (node) =>
    generate(node.case) +
    generate(node.test) +
    generate(node.colon) +
    generate(node.statements),
  default_case: (node) =>
    generate(node.default) + generate(node.colon) + generate(node.statements),

  declaration: (node) =>
    generate(node.specified_type) +
    generate(node.identifier) +
    generate(node.quantifier) +
    generate(node.operator) +
    generate(node.initializer),
  declarator_list: (node) =>
    generate(node.specified_type) +
    generateWithEveryOther(node.declarations, node.commas),
  declarator: (node) =>
    generate(node.specified_type) +
    generate(node.identifier) +
    generate(node.qualifiers) +
    generate(node.quantifier),
  type_specifier: (node) =>
    generate(node.specifier) +
    generate(node.quantifier) +
    generate(node.declarations),
  array_specifiers: (node) => generate(node.specifiers),
  array_specifier: (node) =>
    generate(node.lb) + generate(node.expression) + generate(node.rb),
  identifier: (node) => node.identifier + generate(node.whitespace),
  function: (node) =>
    generate(node['prototype']) + generate(node.body) + generate(node.rp),
  function_header: (node) =>
    generate(node.returnType) + generate(node.name) + generate(node.lp),
  function_prototype: (node) =>
    generate(node.header.returnType) +
    generate(node.header.name) +
    generate(node.header.lp) +
    (node.parameters
      ? generateWithEveryOther(node.parameters, node.commas)
      : '') +
    generate(node.rp),
  parameter_declaration: (node) =>
    generate(node.qualifier) + generate(node.declaration),
  compound_statement: (node) =>
    generate(node.lb) + generate(node.statements) + generate(node.rb),
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
  quantified_identifier: (node) =>
    generate(node.identifier) + generate(node.quantifier),
  field_selection: (node) => generate(node.dot) + generate(node.selection),

  subroutine_qualifier: (node) =>
    generate(node.subroutine) +
    generate(node.lp) +
    generate(node.type_names) +
    generate(node.commas) +
    generate(node.rp),

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
  group: (node) =>
    generate(node.lp) + generate(node.expression) + generate(node.rp),
  unary: (node) => generate(node.operator) + generate(node.expression),

  float_constant: (node) => generate(node.token) + generate(node.whitespace),
  double_constant: (node) => generate(node.token) + generate(node.whitespace),
  int_constant: (node) => generate(node.token) + generate(node.whitespace),
  uint_constant: (node) => generate(node.token) + generate(node.whitespace),
  bool_constant: (node) => generate(node.token) + generate(node.whitespace),

  literal: (node) => generate(node.literal) + generate(node.whitespace),

  struct: (node) =>
    generate(node.struct) +
    generate(node.identifier) +
    generate(node.lb) +
    generate(node.declarations) +
    generate(node.rb),

  struct_declaration: (node) =>
    generate(node.declaration) + generate(node.semi),

  interface_declarator: (node) =>
    generate(node.qualifiers) +
    generate(node.interface_type) +
    generate(node.lp) +
    generate(node.declarations) +
    generate(node.rp) +
    generate(node.identifier),

  struct_declarator: (node) =>
    generate(node.specified_type) +
    generateWithEveryOther(node.declarations, node.commas),

  initializer_list: (node) =>
    generate(node.lb) +
    generateWithEveryOther(node.initializers, node.commas) +
    generate(node.rb),

  qualifier_declarator: (node) =>
    generate(node.qualifiers) +
    generateWithEveryOther(node.declarations, node.commas),
};

module.exports = generate;
