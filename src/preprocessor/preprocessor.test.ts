import fs from 'fs';
import path from 'path';
import peggy from 'peggy';
import util from 'util';
import {
  preprocessComments,
  preprocessAst,
  PreprocessorProgram,
} from './preprocessor';
import generate from './generator';

const fileContents = (filePath: string): string =>
  fs.readFileSync(filePath).toString();

const grammar = fileContents('./src/preprocessor/preprocessor-grammar.pegjs');
const parser = peggy.generate(grammar, { cache: true });
const parse = (src: string) => parser.parse(src) as PreprocessorProgram;

const debugProgram = (program: string): void => {
  debugAst(parse(program));
};

const debugAst = (ast: any) => {
  console.log(util.inspect(ast, false, null, true));
};

const expectParsedProgram = (sourceGlsl: string) => {
  const ast = parse(sourceGlsl);
  const glsl = generate(ast);
  if (glsl !== sourceGlsl) {
    debugAst(ast);
    expect(glsl).toBe(sourceGlsl);
  }
};

// test('pre test file', () => {
//   expectParsedProgram(fileContents('./preprocess-test-grammar.glsl'));
// });

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

test('nested expand macro', () => {
  const program = `#define X Y
#define Y Z
X`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`Z`);
});

test('binary evaluation', () => {
  const program = `
#if 1 + 1 > 0
true
#endif
`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
true
`);
});

test('if expression', () => {
  const program = `
#define A
before if
#if !defined(A) && (defined(B) && C == 2)
inside first if
#endif
#if ((defined(B) && C == 2) || defined(A))
inside second if
#endif
after if
`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
before if
inside second if
after if
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

  const ast = parse(program);
  preprocessAst(ast);
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

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
before if
inside elif
after if`);
});

test('empty branch', () => {
  const program = `before if
#ifdef GL_ES
precision mediump float;
#endif
after if`;

  const ast = parse(program);

  preprocessAst(ast);
  expect(generate(ast)).toBe(`before if
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

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
before if
else body
after if`);
});

test('self referential object macro', () => {
  const program = `
#define first first second
#define second first
second`;

  // If this has an infinte loop, the test will never finish
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
first second`);
});

test('self referential function macro', () => {
  const program = `
#define foo() foo()
foo()`;

  // If this has an infinte loop, the test will never finish
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
foo()`);
});

test('self referential macro combinations', () => {
  const program = `
#define b c
#define first(a,b) a + b
#define second first(1,b)
second`;

  // If this has an infinte loop, the test will never finish
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
1 + c`);
});

test("function call macro isn't expanded", () => {
  const program = `
#define foo() no expand
foo`;

  const ast = parse(program);
  // debugAst(ast);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
foo`);
});

test("macro that isn't macro function call call is expanded", () => {
  const program = `
#define foo () yes expand
foo`;

  const ast = parse(program);
  // debugAst(ast);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
() yes expand`);
});

test('unterminated macro function call', () => {
  const program = `
#define foo() yes expand
foo(
foo()`;

  const ast = parse(program);
  expect(() => preprocessAst(ast)).toThrow(
    'foo( unterminated macro invocation'
  );
});

test('macro function calls with no arguments', () => {
  const program = `
#define foo() yes expand
foo()
foo
()`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
yes expand
yes expand`);
});

test('macro function calls with bad arguments', () => {
  expect(() => {
    preprocessAst(
      parse(`
      #define foo( a, b ) a + b
      foo(1,2,3)`)
    );
  }).toThrow("'foo': Too many arguments for macro");

  expect(() => {
    preprocessAst(
      parse(`
      #define foo( a ) a + b
      foo(,)`)
    );
  }).toThrow("'foo': Too many arguments for macro");

  expect(() => {
    preprocessAst(
      parse(`
      #define foo( a, b ) a + b
      foo(1)`)
    );
  }).toThrow("'foo': Not enough arguments for macro");
});

test('macro function calls with arguments', () => {
  const program = `
#define foo( a, b ) a + b
foo(x + y, (z-t + vec3(0.0, 1.0)))
foo
(q,
r)
foo(,)`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
x + y + (z-t + vec3(0.0, 1.0))
q + r
 + `);
});

test('nested function macro expansion', () => {
  const program = `
#define X Z
#define foo(x, y) x + y
foo (foo (a, X), c)`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
a + Z + c`);
});

test('token pasting', () => {
  const program = `
#define COMMAND(NAME)  { NAME, NAME ## _command ## x ## y }
COMMAND(x)`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
{ x, x_commandxy }`);
});

test('preservation', () => {
  const program = `
#line 0
#version 100 "hi"
#define GL_es_profile 1
#extension all : disable
#error whoopsie
#define  A 1
before if
#if A == 1 || B == 2
inside if
#define A
#elif A == 1 || defined(B) && C == 2
float a;
#define B
#endif
outside endif
#pragma mypragma: something(else)
function_call line after program`;

  const ast = parse(program);

  preprocessAst(ast, {
    // ignoreMacro: (identifier, body) => {
    //   // return identifier === 'A';
    // },
    preserve: {
      conditional: (path) => false,
      line: (path) => true,
      error: (path) => true,
      extension: (path) => true,
      pragma: (path) => true,
      version: (path) => true,
    },
  });
  expect(generate(ast)).toBe(`
#line 0
#version 100 "hi"
#extension all : disable
#error whoopsie
before if
inside if
outside endif
#pragma mypragma: something(else)
function_call line after program`);
});

/*
test('debug', () => {
  const program = `
precision highp float;
precision mediump int;
precision lowp int;
`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
varying vec2 vUv;
`);
});
*/
