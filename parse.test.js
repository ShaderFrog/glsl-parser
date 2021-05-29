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
  program: (node) => generate(node.ws) + generate(node.program),
  statement: (node) => generate(node.children),
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
  field_selection: (node) => generate(node.dot) + generate(node.selection),

  group: (node) => generate(node.children),
  unary: (node) =>
    generate(node.operator) +
    generate(node.expression) +
    generate(node.children),

  float_constant: (node) => generate(node.children),
  double_constant: (node) => generate(node.children),
  int_constant: (node) => generate(node.children),
  uint_constant: (node) => generate(node.children),

  return: (node) =>
    generate(node.type) + generate(node.children) + generate(node.expression),

  // Tokens - should these all be in "keyword" or other to avoid one node
  // per thing? Compare to babel
  '(': (node) => node.type + generate(node.children),
  ')': (node) => node.type + generate(node.children),
  '[': (node) => node.type + generate(node.children),
  ']': (node) => node.type + generate(node.children),
  '{': (node) => node.type + generate(node.children),
  '}': (node) => node.type + generate(node.children),
  '.': (node) => node.type + generate(node.children),
  ',': (node) => node.type + generate(node.children),
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

  attribute: (node) => generate(node.type) + generate(node.children),
  varying: (node) => generate(node.type) + generate(node.children),
  const: (node) => generate(node.type) + generate(node.children),
  bool: (node) => generate(node.type) + generate(node.children),
  float: (node) => generate(node.type) + generate(node.children),
  double: (node) => generate(node.type) + generate(node.children),
  int: (node) => generate(node.type) + generate(node.children),
  uint: (node) => generate(node.type) + generate(node.children),
  break: (node) => generate(node.type) + generate(node.children),
  continue: (node) => generate(node.type) + generate(node.children),
  do: (node) => generate(node.type) + generate(node.children),
  else: (node) => generate(node.type) + generate(node.children),
  for: (node) =>
    node.expression
      ? generate(node.forSymbol) +
        generate(node.expression) +
        generate(node.body)
      : generate(node.type) + generate(node.children),
  if: (node) =>
    node.if
      ? generate(node.if) + generate(node.condition) + generate(node.body)
      : generate(node.type) + generate(node.children),
  discard: (node) => generate(node.type) + generate(node.children),
  switch: (node) => generate(node.type) + generate(node.children),
  case: (node) => generate(node.type) + generate(node.children),
  default: (node) => generate(node.type) + generate(node.children),
  subroutine: (node) => generate(node.type) + generate(node.children),
  bvec2: (node) => generate(node.type) + generate(node.children),
  bvec3: (node) => generate(node.type) + generate(node.children),
  bvec4: (node) => generate(node.type) + generate(node.children),
  ivec2: (node) => generate(node.type) + generate(node.children),
  ivec3: (node) => generate(node.type) + generate(node.children),
  ivec4: (node) => generate(node.type) + generate(node.children),
  uvec2: (node) => generate(node.type) + generate(node.children),
  uvec3: (node) => generate(node.type) + generate(node.children),
  uvec4: (node) => generate(node.type) + generate(node.children),
  vec2: (node) => generate(node.type) + generate(node.children),
  vec3: (node) => generate(node.type) + generate(node.children),
  vec4: (node) => generate(node.type) + generate(node.children),
  mat2: (node) => generate(node.type) + generate(node.children),
  mat3: (node) => generate(node.type) + generate(node.children),
  mat4: (node) => generate(node.type) + generate(node.children),
  centroid: (node) => generate(node.type) + generate(node.children),
  in: (node) => generate(node.type) + generate(node.children),
  out: (node) => generate(node.type) + generate(node.children),
  inout: (node) => generate(node.type) + generate(node.children),
  uniform: (node) => generate(node.type) + generate(node.children),
  patch: (node) => generate(node.type) + generate(node.children),
  sample: (node) => generate(node.type) + generate(node.children),
  buffer: (node) => generate(node.type) + generate(node.children),
  shared: (node) => generate(node.type) + generate(node.children),
  coherent: (node) => generate(node.type) + generate(node.children),
  volatile: (node) => generate(node.type) + generate(node.children),
  restrict: (node) => generate(node.type) + generate(node.children),
  readonly: (node) => generate(node.type) + generate(node.children),
  writeonly: (node) => generate(node.type) + generate(node.children),
  dvec2: (node) => generate(node.type) + generate(node.children),
  dvec3: (node) => generate(node.type) + generate(node.children),
  dvec4: (node) => generate(node.type) + generate(node.children),
  dmat2: (node) => generate(node.type) + generate(node.children),
  dmat3: (node) => generate(node.type) + generate(node.children),
  dmat4: (node) => generate(node.type) + generate(node.children),
  noperspective: (node) => generate(node.type) + generate(node.children),
  flat: (node) => generate(node.type) + generate(node.children),
  smooth: (node) => generate(node.type) + generate(node.children),
  layout: (node) => generate(node.type) + generate(node.children),
  mat2x2: (node) => generate(node.type) + generate(node.children),
  mat2x3: (node) => generate(node.type) + generate(node.children),
  mat2x4: (node) => generate(node.type) + generate(node.children),
  mat3x2: (node) => generate(node.type) + generate(node.children),
  mat3x3: (node) => generate(node.type) + generate(node.children),
  mat3x4: (node) => generate(node.type) + generate(node.children),
  mat4x2: (node) => generate(node.type) + generate(node.children),
  mat4x3: (node) => generate(node.type) + generate(node.children),
  mat4x4: (node) => generate(node.type) + generate(node.children),
  dmat2x2: (node) => generate(node.type) + generate(node.children),
  dmat2x3: (node) => generate(node.type) + generate(node.children),
  dmat2x4: (node) => generate(node.type) + generate(node.children),
  dmat3x2: (node) => generate(node.type) + generate(node.children),
  dmat3x3: (node) => generate(node.type) + generate(node.children),
  dmat3x4: (node) => generate(node.type) + generate(node.children),
  dmat4x2: (node) => generate(node.type) + generate(node.children),
  dmat4x3: (node) => generate(node.type) + generate(node.children),
  dmat4x4: (node) => generate(node.type) + generate(node.children),
  atomic_uint: (node) => generate(node.type) + generate(node.children),
  sampler1D: (node) => generate(node.type) + generate(node.children),
  sampler2D: (node) => generate(node.type) + generate(node.children),
  sampler3D: (node) => generate(node.type) + generate(node.children),
  samplerCube: (node) => generate(node.type) + generate(node.children),
  sampler1DShadow: (node) => generate(node.type) + generate(node.children),
  sampler2DShadow: (node) => generate(node.type) + generate(node.children),
  samplerCubeShadow: (node) => generate(node.type) + generate(node.children),
  sampler1DArray: (node) => generate(node.type) + generate(node.children),
  sampler2DArray: (node) => generate(node.type) + generate(node.children),
  sampler1DArrayShadow: (node) => generate(node.type) + generate(node.children),
  sampler2DArrayshadow: (node) => generate(node.type) + generate(node.children),
  isampler1D: (node) => generate(node.type) + generate(node.children),
  isampler2D: (node) => generate(node.type) + generate(node.children),
  isampler3D: (node) => generate(node.type) + generate(node.children),
  isamplerCube: (node) => generate(node.type) + generate(node.children),
  isampler1Darray: (node) => generate(node.type) + generate(node.children),
  isampler2DArray: (node) => generate(node.type) + generate(node.children),
  usampler1D: (node) => generate(node.type) + generate(node.children),
  usampler2D: (node) => generate(node.type) + generate(node.children),
  usampler3D: (node) => generate(node.type) + generate(node.children),
  usamplerCube: (node) => generate(node.type) + generate(node.children),
  usampler1DArray: (node) => generate(node.type) + generate(node.children),
  usampler2DArray: (node) => generate(node.type) + generate(node.children),
  sampler2DRect: (node) => generate(node.type) + generate(node.children),
  sampler2DRectshadow: (node) => generate(node.type) + generate(node.children),
  isampler2DRect: (node) => generate(node.type) + generate(node.children),
  usampler2DRect: (node) => generate(node.type) + generate(node.children),
  samplerBuffer: (node) => generate(node.type) + generate(node.children),
  isamplerBuffer: (node) => generate(node.type) + generate(node.children),
  usamplerBuffer: (node) => generate(node.type) + generate(node.children),
  samplerCubeArray: (node) => generate(node.type) + generate(node.children),
  samplerCubeArrayShadow: (node) =>
    generate(node.type) + generate(node.children),
  isamplerCubeArray: (node) => generate(node.type) + generate(node.children),
  usamplerCubeArray: (node) => generate(node.type) + generate(node.children),
  sampler2DMS: (node) => generate(node.type) + generate(node.children),
  isampler2DMS: (node) => generate(node.type) + generate(node.children),
  usampler2DMS: (node) => generate(node.type) + generate(node.children),
  sampler2DMSArray: (node) => generate(node.type) + generate(node.children),
  isampler2DMSArray: (node) => generate(node.type) + generate(node.children),
  usampler2DMSArray: (node) => generate(node.type) + generate(node.children),
  image1D: (node) => generate(node.type) + generate(node.children),
  iimage1D: (node) => generate(node.type) + generate(node.children),
  uimage1D: (node) => generate(node.type) + generate(node.children),
  image2D: (node) => generate(node.type) + generate(node.children),
  iimage2D: (node) => generate(node.type) + generate(node.children),
  uimage2D: (node) => generate(node.type) + generate(node.children),
  image3D: (node) => generate(node.type) + generate(node.children),
  iimage3D: (node) => generate(node.type) + generate(node.children),
  uimage3D: (node) => generate(node.type) + generate(node.children),
  image2DRect: (node) => generate(node.type) + generate(node.children),
  iimage2DRect: (node) => generate(node.type) + generate(node.children),
  uimage2DRect: (node) => generate(node.type) + generate(node.children),
  imageCube: (node) => generate(node.type) + generate(node.children),
  iimageCube: (node) => generate(node.type) + generate(node.children),
  uimageCube: (node) => generate(node.type) + generate(node.children),
  imageBuffer: (node) => generate(node.type) + generate(node.children),
  iimageBuffer: (node) => generate(node.type) + generate(node.children),
  uimageBuffer: (node) => generate(node.type) + generate(node.children),
  image1DArray: (node) => generate(node.type) + generate(node.children),
  iimage1DArray: (node) => generate(node.type) + generate(node.children),
  uimage1DArray: (node) => generate(node.type) + generate(node.children),
  image2DArray: (node) => generate(node.type) + generate(node.children),
  iimage2DArray: (node) => generate(node.type) + generate(node.children),
  uimage2DArray: (node) => generate(node.type) + generate(node.children),
  imageCubeArray: (node) => generate(node.type) + generate(node.children),
  iimageCubeArray: (node) => generate(node.type) + generate(node.children),
  uimageCubeArray: (node) => generate(node.type) + generate(node.children),
  image2DMS: (node) => generate(node.type) + generate(node.children),
  iimage2DMS: (node) => generate(node.type) + generate(node.children),
  uimage2DMS: (node) => generate(node.type) + generate(node.children),
  image2DMArray: (node) => generate(node.type) + generate(node.children),
  iimage2DMSArray: (node) => generate(node.type) + generate(node.children),
  uimage2DMSArray: (node) => generate(node.type) + generate(node.children),
  struct: (node) => generate(node.type) + generate(node.children),
  void: (node) => generate(node.type) + generate(node.children),
  while: (node) => generate(node.type) + generate(node.children),

  float: (node) => node.type + generate(node.children),
};

test('parsing test', () => {
  const input = `

  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
    for(int i = 0; i < 50; i ++)
    {
      acc -= scene(r + nse(r.y) * 0.013);
      r += rd * 0.015;
    }
  }
  `;
  const ast = parser.parse(input);
  console.log(util.inspect(ast, false, null, true));
  const output = generate(ast);
  console.log('Output:', '\n' + output);
  expect(output).toEqual(input);
});
