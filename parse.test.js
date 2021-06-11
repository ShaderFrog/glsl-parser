const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');
const { generate } = require('./generator');

const file = (filePath) => fs.readFileSync(path.join('.', filePath)).toString();

const grammar = file('peg/glsl-pegjs-grammar.pegjs');
const testFile = file('glsltest.glsl');
const parser = pegjs.generate(grammar);

const middle = /\/\* start \*\/((.|[\r\n])+)(\/\* end \*\/)?/m;

const debugProgram = (program) => {
  const ast = parser.parse(program);
  console.log(util.inspect(ast.program[0], false, null, true));
};

const debugStatement = (stmt) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parser.parse(program);
  console.log(util.inspect(ast.program[0], false, null, true));
};

const expectParsedStatement = (stmt) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parser.parse(program);
  const glsl = generate(ast);
  if (glsl !== program) {
    console.log(util.inspect(ast.program[0], false, null, true));
    expect(glsl.match(middle)[1]).toBe(stmt);
  }
};

const parseStatement = (stmt) => {
  const program = `void main() {${stmt}}`;
  return parser.parse(program);
};

const expectParsedProgram = (sourceGlsl) => {
  const ast = parser.parse(sourceGlsl);
  const glsl = generate(ast);
  if (glsl !== sourceGlsl) {
    console.log(util.inspect(ast, false, null, true));
    expect(glsl).toBe(sourceGlsl);
  }
};

test('headers', () => {
  // The following includes the varying/attribute case which only works in GL
  // ES 1.00, and will need to be updated when the switch is implemented
  expectParsedProgram(`
    precision mediump float;
    precision highp int;

    in vec4 varName;
    out vec4 varName;

    varying vec4 varName, blarName;
    uniform vec4 varName;
    attribute vec4 varName;
  `);
});

test('if statement', () => {
  expectParsedStatement(`
    if(i != 0) { aFunction(); }
    else if(i == 2) { bFunction(); }
    else { cFunction(); }
  `);
});

// TODO: You're working on removing .children -> and see the tests, now nodes
// like '<=' are erroring. What should these nodes like <= be stored as?
test('do while loop', () => {
  expectParsedStatement(`
    do {
      aFunction();
      break;
      continue;
      return;
    } while(i <= 99);
  `);
});

test('while loop', () => {
  expectParsedStatement(`
    while(i <= 99) {
      aFunction();
      break;
      continue;
      return;
    }
  `);
});

test('for loop', () => {
  expectParsedStatement(`
    for(int a = 0; b <= 99; c++) {
      break;
      continue;
      return;
      aFunction();
    }
  `);
});

test('infinite for loop', () => {
  expectParsedStatement(`
    for(;;) {
    }
  `);
});

test('switch error', () => {
  expect(() =>
    parseStatement(`
    switch (easingId) {
      result = cubicIn();
    }
  `)
  ).toThrow(/must start with a case or default label/);
});

test('switch statement', () => {
  expectParsedStatement(`
    switch (easingId) {
      case 0:
          result = cubicIn();
          break;
      case 1:
          result = cubicOut();
          break;
      }
  `);
});

test('comments', () => {
  expectParsedProgram(`
  /* starting comment */
  // hi
  void main() {
    /* comment */// hi
    /* comment */ // hi
    statement(); // hi
    /* start */ statement(); /* end */
  }
  `);
});

test('parses function_call . postfix_expression', () => {
  expectParsedStatement('texture().rgb;');
});

test('parses postfix_expression as function_identifier', () => {
  expectParsedStatement('a().length();');
});

test('parses a test file', () => {
  expectParsedProgram(testFile);
});

test('operators', () => {
  expectParsedStatement('1 || 2 && 2 ^^ 3 >> 4 << 5;');
});

test('declaration', () => {
  expectParsedStatement('const float x = 1.0, y = 2.0;');
});

test('assignment', () => {
  expectParsedStatement('x |= 1.0;');
});

test('struct', () => {
  expectParsedProgram(`
    struct light {
      float intensity;
      vec3 position, color;
      
    } lightVar;

    struct S { float f; };
  `);
});

test('buffer variables', () => {
  expectParsedProgram(`
    buffer b {
      float u[];
      vec4 v[];
    } name[3]; 
  `);
});

test('arrays', () => {
  expectParsedProgram(`
    float frequencies[3];
    uniform vec4 lightPosition[4];
    light lights[];
    const int numLights = 2;
    light lights[numLights];

    buffer b {
      float u[]; 
      vec4 v[];
    } name[3]; 
  `);
});

// test('debug', () => {
//   debugProgram(`
//   buffer b {
//     float u[];
//     vec4 v[];
//   } name[3];
//   `);
// });
