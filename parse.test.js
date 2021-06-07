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

const debugStatement = (stmt) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parser.parse(program);
  console.log(
    util.inspect(
      ast.program[0].children[0].children[0].children[0],
      false,
      null,
      true
    )
  );
};

const expectParsedStatement = (stmt) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parser.parse(program);
  const glsl = generate(ast);
  if (glsl !== program) {
    console.log(
      util.inspect(
        ast.program[0].children[0].children[0].children[0],
        false,
        null,
        true
      )
    );
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

test('if statement', () => {
  expectParsedStatement(`
    if(i != 0) { aFunction(); }
    else if(i == 2) { bFunction(); }
    else { cFunction(); }
  `);
});

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

// test('debug', () => {
//   // TODO: Make float a keyword (i'm not sure what else to do) and move things
//   // into whitespace key
//   debugStatement('const float a = 1.0;');
// });
