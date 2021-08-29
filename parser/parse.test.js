const fs = require('fs');
const path = require('path');
const pegjs = require('pegjs');
const util = require('util');
const generate = require('./generator.js');

const fileContents = (filePath) =>
  fs.readFileSync(path.join(__dirname, filePath)).toString();

// Preprocessor setup
const preprocessorGrammar = fileContents('../preprocessor/preprocessor.pegjs');
const preprocessParser = pegjs.generate(preprocessorGrammar, { cache: true });
const { preprocessAst } = require('../preprocessor/preprocessor.js');
const generatePreprocess = require('../preprocessor/generator.js');

const preprocess = (program) => {
  const ast = preprocessParser.parse(program);
  preprocessAst(ast);
  return generatePreprocess(ast);
};

const grammar = fileContents('./glsl-pegjs-grammar.pegjs');
const testFile = fileContents('../glsltest.glsl');
const parser = pegjs.generate(grammar, { cache: true });

const middle = /\/\* start \*\/((.|[\r\n])+)(\/\* end \*\/)?/m;

const debugProgram = (program) => {
  const ast = parser.parse(program);
  console.log(util.inspect(ast.program[0], false, null, true));
};

const debugAst = (ast) => {
  console.log(util.inspect(ast.program, false, null, true));
};

const debugStatement = (stmt) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parser.parse(program);
  console.log(
    util.inspect(ast.program[0].body.statements[0], false, null, true)
  );
};

const expectParsedStatement = (stmt, options = {}) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parser.parse(program, options);
  const glsl = generate(ast);
  if (glsl !== program) {
    console.log(util.inspect(ast.program[0], false, null, true));
    expect(glsl.match(middle)[1]).toBe(stmt);
  }
};

const parseStatement = (stmt, options = {}) => {
  const program = `void main() {${stmt}}`;
  return parser.parse(program, options);
};

const expectParsedProgram = (sourceGlsl, options = {}) => {
  const ast = parser.parse(sourceGlsl, options);
  const glsl = generate(ast);
  if (glsl !== sourceGlsl) {
    console.log(util.inspect(ast, false, null, true));
    expect(glsl).toBe(sourceGlsl);
  }
};

test('scope bindings and type names', () => {
  const ast = parser.parse(`
float a, b = 1.0, c = a;
vec2 texcoord1, texcoord2;
vec3 position;
vec4 myRGBA;
ivec2 textureLookup;
bvec3 less;
float arr1[5] = float[5](3.4, 4.2, 5.0, 5.2, 1.1);
vec4[2] arr2[3]; 
vec4[3][2] arr3;
vec3 fnName() {}
struct light {
  float intensity;
  vec3 position;
};
coherent buffer Block {
  readonly vec4 member1;
  vec4 member2;
};`);
  // debugAst(ast);
  expect(Object.keys(ast.scopes[0].bindings)).toEqual([
    'a',
    'b',
    'c',
    'texcoord1',
    'texcoord2',
    'position',
    'myRGBA',
    'textureLookup',
    'less',
    'arr1',
    'arr2',
    'arr3',
    'fnName',
    'Block',
  ]);
  expect(Object.keys(ast.scopes[0].types)).toEqual(['light']);
});

test('scope references', () => {
  const ast = parser.parse(`
float a, b = 1.0, c = a;
mat2x2 myMat = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );
struct {
  float s;
  float t;
} structArr[];
struct structType {
  float s;
  float t;
};
structType z;

float shadowed;
float reused;
float unused;
vec3 fnName(float arg1, vec3 arg2) {
  float shadowed = arg1;
  structArr[0].x++;

  if(true) {
    float x = shadowed + 1 + reused;
  }

  {
    float compound;
    compound = shadowed + reused;
  }

  {
    float compound;
    compound = shadowed + reused + compound;
  }
}`);
  // debugAst(ast);
  // console.log(
  //   ast.scopes.map((scope, index) => [index, ...Object.keys(scope.bindings)])
  // );
  // expect(ast.scopes).toHaveLength(7);

  // shadowed - not used
  expect(ast.scopes[0].bindings.a.references).toHaveLength(2);
  expect(ast.scopes[0].bindings.b.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.c.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.myMat.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.structArr.references).toHaveLength(2);
  expect(ast.scopes[0].bindings.shadowed.references).toHaveLength(1);
  expect(ast.scopes[0].types.structType.references).toHaveLength(2);
  // shadowed - inner scope
  expect(ast.scopes[1].bindings.arg1.references).toHaveLength(2);
  expect(ast.scopes[1].bindings.arg2.references).toHaveLength(1);
  expect(ast.scopes[1].bindings.shadowed.references).toHaveLength(4);
  // reused - used in inner scope
  expect(ast.scopes[0].bindings.reused.references).toHaveLength(4);
  // compound - used in first innermost scope only
  expect(ast.scopes[3].bindings.compound.references).toHaveLength(2);
  // compound - used in last innermost scope only
  expect(ast.scopes[4].bindings.compound.references).toHaveLength(3);
});

test('declarations', () => {
  expectParsedProgram(`
    float a, b = 1.0, c = a;
    vec2 texcoord1, texcoord2;
    vec3 position;
    vec4 myRGBA;
    ivec2 textureLookup;
    bvec3 less;
  `);
});

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
  expectParsedStatement(
    `
    if(i != 0) { aFunction(); }
    else if(i == 2) { bFunction(); }
    else { cFunction(); }
  `,
    { quiet: true }
  );
});

test('do while loop', () => {
  expectParsedStatement(
    `
    do {
      aFunction();
      break;
      continue;
      return;
    } while(i <= 99);
  `,
    { quiet: true }
  );
});

test('standard while loop', () => {
  expectParsedStatement(
    `
    while(i <= 99) {
      aFunction();
      break;
      continue;
      return;
    }
  `,
    { quiet: true }
  );
});

test('for loops', () => {
  // Infinite for loop
  expectParsedStatement(`
    for(;;) {
    }
  `);
  // For loop with jump statements
  expectParsedStatement(
    `
    for(int a = 0; b <= 99; c++) {
      break;
      continue;
      return;
      aFunction();
    }
  `,
    { quiet: true }
  );
  // Loop with condition variable declaration (GLSL ES 3.00 only)
  expectParsedStatement(`
    for(int i = 0; bool x = false; i++) {}
  `);
});

test('switch error', () => {
  // Test the semantic analysis case
  expect(() =>
    parseStatement(
      `
    switch (easingId) {
      result = cubicIn();
    }
  `,
      { quiet: true }
    )
  ).toThrow(/must start with a case or default label/);
});

test('switch statement', () => {
  expectParsedStatement(
    `
    switch (easingId) {
      case 0:
          result = cubicIn();
          break;
      case 1:
          result = cubicOut();
          break;
      }
  `,
    { quiet: true }
  );
});

test('qualifier declarations', () => {
  // The expected node here is "qualifier_declarator", which would be nice to
  // test for at some point, maybe when doing more AST analysis
  expectParsedProgram(`
    invariant precise in a, b,c;
  `);
});

test('layout', () => {
  expectParsedProgram(`
    layout(location = 4, component = 2) in vec2 a;
    layout(location = 3) in vec4 normal;
    layout(location = 9) in mat4 transforms[2];
    layout(location = 3) in vec4 normal;

    const int start = 6;
    layout(location = start + 2) in vec4 p;

    layout(location = 3) in struct S
    {
      vec3 a; // gets location 3
      mat2 b; // gets locations 4 and 5
      vec4 c[2]; // gets locations 6 and 7
      layout(location = 8) vec2 A; // ERROR, can't use on struct member
    } s;

    layout(location = 4) in block
    {
      vec4 d; // gets location 4
      vec4 e; // gets location 5
      layout(location = 7) vec4 f; // gets location 7
      vec4 g; // gets location 8
      layout(location = 1) vec4 h; // gets location 1
      vec4 i; // gets location 2
      vec4 j; // gets location 3
      vec4 k; // ERROR, location 4 already used
    };

    // From the grammar but I think it's a typo
    // https://github.com/KhronosGroup/GLSL/issues/161
    // layout(location = start + 2) int vec4 p;
  `);
});

test('comments', () => {
  expectParsedProgram(
    `
    /* starting comment */
    // hi
    void main() {
      /* comment */// hi
      /* comment */ // hi
      statement(); // hi
      /* start */ statement(); /* end */
    }
  `,
    { quiet: true }
  );
});

test('functions', () => {
  expectParsedProgram(`
    // Prototypes
    vec4 f(in vec4 x, out vec4 y);
    int newFunction(in bvec4 aBvec4,   // read-only
      out vec3 aVec3,                  // write-only
      inout int aInt);                 // read-write
  `);
});

test('parses function_call . postfix_expression', () => {
  expectParsedStatement('texture().rgb;', { quiet: true });
});

test('parses postfix_expression as function_identifier', () => {
  expectParsedStatement('a().length();', { quiet: true });
});

test('postfix, unary, binary expressions', () => {
  expectParsedStatement('x ++ + 1.0 + + 2.0;');
});

test('parses a test file', () => {
  // console.log(debugProgram(preprocess(testFile)));
  expectParsedProgram(preprocess(testFile));
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

test('ternary', () => {
  expectParsedStatement(
    'float y = x == 1.0 ? x == 2.0 ? 1.0 : 3.0 : x == 3.0 ? 4.0 : 5.0;'
  );
});

test('structs', () => {
  expectParsedProgram(`
    struct light {
      float intensity;
      vec3 position, color;
    } lightVar;
    light lightVar2;

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
    struct light { int a; };
    light lights[];
    const int numLights = 2;
    light lights[numLights];

    buffer b {
      float u[]; 
      vec4 v[];
    } name[3];

    // Array initializers
    float array[3] = float[3](1.0, 2.0, 3.0);
    float array[3] = float[](1.0, 2.0, 3.0);

    // Function with array as return type
    float[5] foo() { }
  `);
});

test('initializer list', () => {
  expectParsedProgram(`
    vec4 a[3][2] = {
      vec4[2](vec4(0.0), vec4(1.0)),
      vec4[2](vec4(0.0), vec4(1.0)),
      vec4[2](vec4(0.0), vec4(1.0))
    };
  `);
});

test('subroutines', () => {
  expectParsedProgram(`
    subroutine vec4 colorRedBlue();

    // option 1
    subroutine (colorRedBlue ) vec4 redColor() {
        return vec4(1.0, 0.0, 0.0, 1.0);
    }

    // // option 2
    // subroutine (colorRedBlue ) vec4 blueColor() {
    //     return vec4(0.0, 0.0, 1.0, 1.0);
    // }
  `);
});

// test('debug', () => {
//   debugProgram(`
//     invariant centroid out vec3 Color, Color;
//   `);
// });

test('blerb', () => {
  const ast = parser.parse(`
float a, b = 1.0, c = a;
mat2x2 myMat = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );
struct {
  float s;
  float t;
} structArr[];
struct structType {
  float s;
  float t;
};
structType z;

float shadowed;
float reused;
float unused;
vec3 fnName(float arg1, vec3 arg2) {
  float shadowed = arg1;
  structArr[0].x++;

  if(true) {
    float x = shadowed + 1 + reused;
  }

  {
    float compound;
    compound = shadowed + reused;
  }

  {
    float compound;
    compound = shadowed + reused + compound;
  }
}`);

  console.log(
    ast.scopes.flatMap((s) =>
      Object.entries(s.bindings).map(([k, v]) => [
        k,
        v.references.map((r) => r.type),
      ])
    )
  );

  // console.log(ast.scopes[0].bindings.a.);
  const rn = (scope, i) => {
    Object.entries(scope.bindings).forEach(([name, binding]) => {
      binding.references.forEach((ref) => {
        if (ref.type === 'declaration') {
          ref.identifier.identifier = `${i}_${ref.identifier.identifier}`;
        } else if (ref.type === 'identifier') {
          ref.identifier = `${i}_${ref.identifier}`;
        } else if (ref.type === 'function_header') {
          ref.name.identifier = `${i}_${ref.name.identifier}`;
        } else if (ref.type === 'parameter_declaration') {
          ref.declaration.identifier.identifier = `${i}_${ref.declaration.identifier.identifier}`;
        } else {
          throw new Error(ref.type);
        }
      });
    });
  };
  ast.scopes.forEach((s, i) => rn(s, i));

  console.log(generate(ast));
});
