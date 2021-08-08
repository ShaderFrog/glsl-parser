const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');
const preprocess = require('./preprocessor.js');
const generate = require('./generator.js');

const file = (filePath) =>
  fs.readFileSync(path.join(__dirname, filePath)).toString();

const grammar = file('preprocessor.pegjs');
// const testFile = file('../glsltest.glsl');
const parser = pegjs.generate(grammar, { cache: true });

const debugProgram = (program) => {
  debugAst(parser.parse(program));
};

const debugAst = (ast) => {
  console.log(util.inspect(ast, false, null, true));
};

const expectParsedProgram = (sourceGlsl) => {
  const ast = parser.parse(sourceGlsl);
  const glsl = generate(ast);
  if (glsl !== sourceGlsl) {
    debugAst(ast);
    expect(glsl).toBe(sourceGlsl);
  }
};

test('preprocessor ast', () => {
  expectParsedProgram(`
#line 0
#version 100 "hi"
#define GL_es_profile 1
#extension all : disable
#error whoopsie
#define A 1
before if
      #if A == 1 || B == 2
      inside if
      #define A
          #elif A == 1 || defined(B) && C == 2
          float a;
          #elif A == 1 || defined(B) && C == 2
          float a;
      #define B
      #endif
outside endif
#pragma mypragma: something(else)
final line after program
`);
});

test('evaluate if branch', () => {
  const program = `
#define A
before if
#if defined(A)
inside if
#endif
after if
`;

  const ast = parser.parse(program);
  preprocess(ast);
  expect(generate(ast)).toBe(`
before if
inside if
after if
`);
});

test('evaluate elseif branch', () => {
  const program = `
#define A
before if
#if defined(B)
inside if
#elif defined(A)
inside elif
#else
else body
#endif
after if`;

  const ast = parser.parse(program);
  preprocess(ast);
  expect(generate(ast)).toBe(`
before if
inside elif
after if`);
});

test('evaluate else branch', () => {
  const program = `
#define A
before if
#if defined(D)
inside if
#elif defined(E)
inside elif
#else
else body
#endif
after if`;

  const ast = parser.parse(program);
  preprocess(ast);
  expect(generate(ast)).toBe(`
before if
else body
after if`);
});

test('debug preprocesor', () => {
  const program = `#line 0
  #version 100 "hi"
  #define GL_es_profile 1
  #extension all : disable
  #error whoopsie
  #define A 1
  before if
        #if A == 1 || B == 2
        inside if
        #define A
            #elif A == 1 || defined(B) && C == 2
            float a;
            #elif A == 1 || defined(B) && C == 2
            float a;
        #define B
        #endif
        outside endif
        #pragma mypragma: something(else)
        final line after program
  `;

  const ast = parser.parse(program);
  // debugAst(ast);

  preprocess(ast, {
    // ignoreMacro: (identifier, body) => {
    //   // return identifier === 'A';
    // },
    preserve: {
      conditional: (path) => false,
      line: (path) => false,
    },
  });
  // console.log(generate(ast));
});
