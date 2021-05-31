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

const expectParsedStatement = (stmt) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parser.parse(program);
  const glsl = generate(ast);
  if (glsl !== program) {
    console.log(util.inspect(ast, false, null, true));
    expect(stmt).toBe(glsl.match(middle)[1]);
  }
};

const expectParsedProgram = (sourceGlsl) => {
  const ast = parser.parse(sourceGlsl);
  const glsl = generate(ast);
  if (glsl !== sourceGlsl) {
    console.log(util.inspect(ast, false, null, true));
    expect(sourceGlsl).toBe(glsl);
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
    for(int i = 0; i <= 99; i++) {
      break;
      continue;
      return;
      aFunction();
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
