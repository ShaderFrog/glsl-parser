import { AstNode, TypeSpecifierNode, visit } from '../ast';
import { buildParser, inspect } from './test-helpers';

let c!: ReturnType<typeof buildParser>;
beforeAll(() => (c = buildParser()));

test('declarations', () => {
  c.expectParsedProgram(`
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
  c.expectParsedProgram(`
    precision mediump float;
    precision highp int;

    in vec4 varName1;
    out vec4 varName2;

    varying vec4 varName3, blarName;
    uniform vec4 varName4;
    attribute vec4 varName5;
  `);
});

test('if statement', () => {
  c.expectParsedStatement(
    `if(i != 0) { aFunction(); }
else if(i == 2) { bFunction(); }
else { cFunction(); }`,
    {
      quiet: true,
    }
  );
});

test('do while loop', () => {
  c.expectParsedStatement(
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
  c.expectParsedStatement(
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
  c.expectParsedStatement(`
    for(;;) {
    }
  `);
  // For loop with jump statements
  c.expectParsedStatement(
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
  c.expectParsedStatement(`
    for(int i = 0; bool x = false; i++) {}
  `);
});

test('switch error', () => {
  // Test the semantic analysis case
  expect(() =>
    c.parse(
      `void main() {
    switch (easingId) {
      result = cubicIn();
    }
}`,
      { quiet: true }
    )
  ).toThrow(/must start with a case or default label/);
});

test('switch statement', () => {
  c.expectParsedStatement(
    `
    switch (easingId) {
      case 0:
          result = cubicIn();
          break;
      case 1:
          result = cubicOut();
          break;
      default:
          result = 1.0;
      }
  `,
    { quiet: true }
  );
});

test('qualifier declarations', () => {
  // The expected node here is "qualifier_declarator", which would be nice to
  // test for at some point, maybe when doing more AST analysis
  c.expectParsedProgram(`
    invariant precise in a, b,c;
  `);
});

test('number notations', () => {
  // Integer hex notation
  c.expectParsedStatement(`highp uint value = 0x1234u;`);
  c.expectParsedStatement(`uint c = 0xffffffff;`);
  c.expectParsedStatement(`uint d = 0xffffffffU;`);
  // Octal
  c.expectParsedStatement(`uint d = 021234;`);
  // Double precision floating point
  c.expectParsedStatement(`double c, d = 2.0LF;`);
  // uint
  c.expectParsedStatement(`uint k = 3u;`);
  c.expectParsedStatement(`uint f = -1u;`);
});

test('layout', () => {
  c.expectParsedProgram(` 
    layout(location = 4, component = 2) in vec2 a;
    layout(location = 3) in vec4 normal1;
    layout(location = 9) in mat4 transforms[2];
    layout(location = 3) in vec4 normal2;

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

    layout(std140,column_major) uniform;
  `);
});

test('parses comments', () => {
  c.expectParsedProgram(
    `
    /* starting comment */
    // hi
    void main(float x) {
      /* comment */// hi
      /* comment */ // hi
      statement(); // hi
      /* start */ statement(); /* end */
    }
  `,
    { quiet: true }
  );
});

test('parses functions', () => {
  c.expectParsedProgram(`
    // Prototypes
    vec4 f(in vec4 x, out vec4 y);
    int newFunction(in bvec4 aBvec4,   // read-only
      out vec3 aVec3,                  // write-only
      inout int aInt);                 // read-write
    highp float rand( const in vec2 uv ) {}
    highp float otherFn( const in vec3 rectCoords[ 4 ]  ) {}
  `);
});

test('parses function_call . postfix_expression', () => {
  c.expectParsedStatement('texture().rgb;', { quiet: true });
});

test('parses postfix_expression as function_identifier', () => {
  c.expectParsedStatement('a().length();', { quiet: true });
});

test('parses postfix expressions after non-function calls (aka map.length())', () => {
  c.expectParsedProgram(
    `
void main() {
  float y = x().length();
  float x = map.length();
  for (int i = 0; i < map.length(); i++) {
  }
}
`,
    { quiet: true }
  );
});

test('postfix, unary, binary expressions', () => {
  c.expectParsedStatement('x ++ + 1.0 + + 2.0;', { quiet: true });
});

test('operators', () => {
  c.expectParsedStatement('1 || 2 && 2 ^^ 3 >> 4 << 5;');
});

test('declaration', () => {
  c.expectParsedStatement('const float x = 1.0, y = 2.0;');
});

test('assignment', () => {
  c.expectParsedStatement('x |= 1.0;', { quiet: true });
});

test('ternary', () => {
  c.expectParsedStatement(
    'float y = x == 1.0 ? x == 2.0 ? 1.0 : 3.0 : x == 3.0 ? 4.0 : 5.0;',
    { quiet: true }
  );
});

test('structs', () => {
  c.expectParsedProgram(`
    struct light {
      float intensity;
      vec3 position, color;
    } lightVar;
    light lightVar2;

    struct S { float f; };
  `);
});

test('buffer variables', () => {
  c.expectParsedProgram(`
    buffer b {
      float u[];
      vec4 v[];
    } name[3]; 
  `);
});

test('arrays', () => {
  c.expectParsedProgram(`
    float frequencies[3];
    uniform vec4 lightPosition[4];
    struct light { int a; };
    light lights[];
    const int numLights = 2;
    light lights2[numLights];

    buffer b {
      float u[]; 
      vec4 v[];
    } name[3];

    // Array initializers
    float array[3] = float[3](1.0, 2.0, 3.0);
    float array2[3] = float[](1.0, 2.0, 3.0);

    // Function with array as return type
    float[5] foo() { }
  `);
});

test('initializer list', () => {
  c.expectParsedProgram(`
    vec4 a[3][2] = {
      vec4[2](vec4(0.0), vec4(1.0)),
      vec4[2](vec4(0.0), vec4(1.0)),
      vec4[2](vec4(0.0), vec4(1.0))
    };
  `);
});

test('subroutines', () => {
  c.expectParsedProgram(`
    subroutine vec4 colorRedBlue();

    // option 1
    subroutine (colorRedBlue ) vec4 redColor() {
        return vec4(1.0, 0.0, 0.0, 1.0);
    }

    // // option 2
    subroutine (colorRedBlue ) vec4 blueColor() {
        return vec4(0.0, 0.0, 1.0, 1.0);
    }
  `);
});

test('Locations with location disabled', () => {
  const src = `void main() {}`;
  const ast = c.parseSrc(src); // default argument is no location information
  expect(ast.program[0].location).toBe(undefined);
  expect(ast.scopes[0].location).toBe(undefined);
});

test('built-in function names should be identified as keywords', () => {
  console.warn = jest.fn();

  const src = `
void main() {
  void x = texture2D();
}`;
  const ast = c.parseSrc(src);

  // Built-ins should not appear in scope
  expect(ast.scopes[0].functions).not.toHaveProperty('texture2D');
  expect(ast.scopes[1].functions).not.toHaveProperty('texture2D');

  let specifier: TypeSpecifierNode;
  visit(ast, {
    function_call: {
      enter: (path) => {
        inspect(path.node);
        if (path.node.identifier.type === 'type_specifier') {
          specifier = path.node.identifier;
        }
      },
    },
  });

  // Builtins like texture2D should be recognized as a type_name since that's
  // how user defined functions are treated
  expect(specifier!.specifier.type).toBe('type_name');

  // Should not warn about built in function call being undefined
  expect(console.warn).not.toHaveBeenCalled();
});

test('Parser locations', () => {
  const src = `// Some comment
void main() {
  float x = 1.0;

  {
    float x = 1.0;
  }
}`;
  const ast = c.parseSrc(src, { includeLocation: true });
  // The main fn location should start at "void"
  expect(ast.program[0].location).toStrictEqual({
    start: { line: 2, column: 1, offset: 16 },
    end: { line: 8, column: 2, offset: 76 },
  });

  // The global scope is the entire program
  expect(ast.scopes[0].location).toStrictEqual({
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 8, column: 2, offset: 76 },
  });

  // The scope created by the main fn should start at the open paren of the fn
  // header, because fn scopes include fn arguments
  expect(ast.scopes[1].location).toStrictEqual({
    start: { line: 2, column: 10, offset: 25 },
    end: { line: 8, column: 1, offset: 75 },
  });

  // The inner compound statement { scope }
  expect(ast.scopes[2].location).toStrictEqual({
    start: { line: 5, column: 3, offset: 50 },
    end: { line: 7, column: 3, offset: 73 },
  });
});

test('fails on error', () => {
  expect(() =>
    c.parse(
      `float a;
      float a;`,
      { failOnWarn: true }
    )
  ).toThrow(/duplicate variable declaration: "a"/);
});
