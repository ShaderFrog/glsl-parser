const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');
const { preprocess, generate } = require('./preprocessor.js');

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
      #if A == 1 || B == 2
      #define A
          #elif A == 1 || defined(B) && C == 2
          float a;
          #elif A == 1 || defined(B) && C == 2
          float a;
      #define B
      #endif
      #pragma mypragma: something(else)
`);
});

test('what is going on', () => {
  const program = `
    #define B C
    #define C 3
    #if B == 3 || defined(B)
      insideif B B
      #undef C
    #endif
    success B B lastline
  `;

  const ast = parser.parse(program);
  preprocess(ast);
  console.log(generate(ast));
});
