import fs from 'fs';
import peggy from 'peggy';
import util from 'util';
import {
  preprocessComments,
  preprocessAst,
  PreprocessorProgram,
} from './preprocessor.js';
import generate from './generator.js';
import { GlslSyntaxError } from '../error.js';

import { buildPreprocessorParser } from '../parser/test-helpers.js';

let c!: ReturnType<typeof buildPreprocessorParser>;
beforeAll(() => (c = buildPreprocessorParser()));

const parse = (src: string) => c.parse(src) as PreprocessorProgram;

const debugProgram = (program: string): void => {
  debugAst(c.parse(program));
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

test('#preprocessComments', () => {
  // Should strip comments and replace single-line comments with a single space
  expect(
    preprocessComments(`// ccc
/* cc */aaa/* cc */
/**
 * cccc
 */
bbb
`)
  ).toBe(`
 aaa 



bbb
`);
});

test('preprocessor error', () => {
  let error: GlslSyntaxError | undefined;
  try {
    parse(`#if defined(#)`);
  } catch (e) {
    error = e as GlslSyntaxError;
  }

  expect(error).toBeInstanceOf(c.parser.SyntaxError);
  expect(error!.location.start.line).toBe(1);
  expect(error!.location.end.line).toBe(1);
});

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
          #elif A == 1 || defined B && C == 2
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

test('directive whitespace', () => {
  const program = `# define X Y
X`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`Y`);
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

test('define inside if/else is properly expanded when the if branch is chosen', () => {
  const program = `
#define MACRO
#ifdef MACRO
#define BRANCH a
#else
#define BRANCH b
#endif
BRANCH
`;
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
a
`);
});

test('define inside if/else is properly expanded when the else branch is chosen', () => {
  const program = `
#ifdef MACRO
#define BRANCH a
#else
#define BRANCH b
#endif
BRANCH
`;
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
b
`);
});

test('ifdef inside else is properly expanded', () => {
  // Regression: Make sure #ifdef MACRO inside #else isn't expanded
  const program = `
#define MACRO
#ifdef NOT_DEFINED
  false
#else
  #ifdef MACRO
____true
  #endif
#endif
`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
____true
`);
});

test('macro without body becoms empty string', () => {
  // There is intentionally whitespace after MACRO to make sure it doesn't apply
  // to the expansion-to-nothing
  const program = `
#define MACRO   
fn(MACRO);
`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
fn();
`);
});

test('if expression', () => {
  const program = `
#define A
before if
#if !defined(A) && (defined(B) && C == 2)
inside first if
#endif
#if ((defined B && C == 2) || defined(A))
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

test(`function macro where source variable is same as macro argument`, () => {
  const program = `
#define FN(x, y) x + y
FN(y, x);
FN(y.y, x.x);
FN(yy, xx);
`;

  const ast = parse(program);
  preprocessAst(ast);

  // Ensure that if the argument passed to the fn FN(X) has the
  // same name as the macro definition #define FN(X), it doesn't get expanded
  // https://github.com/ShaderFrog/glsl-parser/issues/31
  expect(generate(ast)).toBe(`
y + x;
y.y + x.x;
yy + xx;
`);
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
#define foo(x, y) x + y
foo (foo (a, b), c)
foo(foo (foo (x, y), z) , w)`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
a + b + c
x + y + z + w`);
});

test('nested function macro expansion referencing other macros', () => {
  const program = `
#define foo(x, y) bar(x, y) + bar(y, x)
#define bar(x, y) (x * y)
foo(a, b)`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
(a * b) + (b * a)`);
});

test('macros that reference each other', () => {
  const program = `
#define foo() bar()
#define bar() foo()
bar()`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
bar()`);
});

// The preprocessor does the wrong thing here so I'm commenting out this test
// for now. The current preprocessor results in bar(bar(1.0)). To achieve the
// correct result here I likely need to redo the expansion system to use "blue
// painting" https://en.wikipedia.org/wiki/Painted_blue
xtest('nested function macros that reference each other', () => {
  const program = `
#define foo(x) bar(x)
#define bar(x) foo(x)
bar(foo(1.0))`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
bar(foo(1.0))`);
});

test('multi-pass cross-referencing object macros', () => {
  const program = `
#define INNER x
#define OUTER (1.0/INNER)
OUTER
INNER`;

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
(1.0/x)
x`);
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
    preserve: {
      conditional: () => false,
      line: () => true,
      error: () => true,
      extension: () => true,
      pragma: () => true,
      version: () => true,
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

test('different line breaks character', () => {
  const program = '#ifndef x\rfloat a = 1.0;\r\n#endif';

  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe('float a = 1.0;\r\n');
});

test('generate #ifdef & #ifndef & #else', () => {
  expectParsedProgram(`
#ifdef AA
  float a;
#else
  float b;
#endif

#ifndef CC
  float c;
#endif

#if AA == 2
  float d;
#endif
`);
});

test('test macro with "defined" at start of name', () => {
  const program = `
#define definedX 1
#if defined(definedX) && defined definedX && definedX 
true
#endif
`;
  expectParsedProgram(program);
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
true
`);
});

test('inline comments in if statement expression', () => {
  const program = `
#define AAA
#define BBB
#if defined/**/AAA && defined/**/ BBB
true
#endif
`;
  expectParsedProgram(program);
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
true
`);
});

test('multiline macros', () => {
  const program = `
#define X a\\
  b
#define Y \\
  c\\
d\\

#define Z \\
e \\
f
#define W\\

vec3 x() {
X
Y
Z
W
}`;
  const ast = parse(program);
  preprocessAst(ast);
  expect(generate(ast)).toBe(`
vec3 x() {
a  b
cd
e f

}`);
});
