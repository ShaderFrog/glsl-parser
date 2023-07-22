import generate from './generator';
import { renameBindings, renameFunctions, renameTypes } from './utils';
import { UNKNOWN_TYPE } from './grammar';
import { buildParser, nextWarn } from './test-helpers';

let c!: ReturnType<typeof buildParser>;
beforeAll(() => (c = buildParser()));

test('scope bindings and type names', () => {
  const ast = c.parseSrc(`
float selfref, b = 1.0, c = selfref;
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
    'selfref',
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
    'Block',
  ]);
  expect(Object.keys(ast.scopes[0].functions)).toEqual(['fnName']);
  expect(Object.keys(ast.scopes[0].types)).toEqual(['light']);
});

test('scope references', () => {
  const ast = c.parseSrc(
    `
float selfref, b = 1.0, c = selfref;
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

float protoFn(float x);

float shadowed;
float reused;
float unused;
void useMe() {}
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
  unknown();

  MyStruct dataArray[1] = {
    {1.0}
  };

  protoFn(1.0);
  useMe();
}`,
    { quiet: true }
  );
  expect(ast.scopes[0].bindings.selfref.references).toHaveLength(2);
  expect(ast.scopes[0].bindings.b.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.c.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.myMat.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.structArr.references).toHaveLength(2);
  expect(ast.scopes[0].bindings.shadowed.references).toHaveLength(1);
  expect(ast.scopes[0].types.structType.references).toHaveLength(2);
  expect(ast.scopes[0].functions.useMe['void: void'].references).toHaveLength(
    2
  );
  expect(ast.scopes[2].bindings.arg1.references).toHaveLength(2);
  expect(ast.scopes[2].bindings.arg2.references).toHaveLength(1);
  expect(ast.scopes[2].bindings.shadowed.references).toHaveLength(4);
  // reused - used in inner scope
  expect(ast.scopes[0].bindings.reused.references).toHaveLength(4);
  // compound - used in first innermost scope only
  expect(ast.scopes[4].bindings.compound.references).toHaveLength(2);
  // compound - used in last innermost scope only
  expect(ast.scopes[5].bindings.compound.references).toHaveLength(3);

  expect(
    ast.scopes[0].functions.unknown['UNKNOWN TYPE: void'].references
  ).toHaveLength(1);
  expect(
    ast.scopes[0].functions.unknown['UNKNOWN TYPE: void'].declaration
  ).toBe(undefined);
});

test('scope binding declarations', () => {
  const ast = c.parseSrc(
    `
float selfref, b = 1.0, c = selfref;
void main() {
  selfref += d;
}`,
    { quiet: true }
  );
  expect(ast.scopes[0].bindings.selfref.references).toHaveLength(3);
  expect(ast.scopes[0].bindings.selfref.declaration).toBeTruthy();
  expect(ast.scopes[0].bindings.b.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.b.declaration).toBeTruthy();
  expect(ast.scopes[0].bindings.c.references).toHaveLength(1);
  expect(ast.scopes[0].bindings.c.declaration).toBeTruthy();

  expect(ast.scopes[1].bindings.d.references).toHaveLength(1);
  expect(ast.scopes[1].bindings.d.declaration).toBeFalsy();
});

test('struct constructor identified in scope', () => {
  const ast = c.parseSrc(`
struct light {
  float intensity;
  vec3 position;
};
light lightVar = light(3.0, vec3(1.0, 2.0, 3.0));
`);
  expect(ast.scopes[0].types.light.references).toHaveLength(3);
});

test('function overloaded scope', () => {
  const ast = c.parseSrc(`
vec4 overloaded(vec4 x) {
  return x;
}
float overloaded(float x) {
  return x;
}`);
  expect(Object.entries(ast.scopes[0].functions.overloaded)).toHaveLength(2);
});

test('overriding glsl builtin function', () => {
  // "noise" is a built-in GLSL function that should be identified and renamed
  const ast = c.parseSrc(`
float noise() {}
float fn() {
    vec2 uv;
    uv += noise();
}
`);

  expect(ast.scopes[0].functions.noise);
  renameFunctions(ast.scopes[0], (name) => `${name}_FUNCTION`);
  expect(generate(ast)).toBe(`
float noise_FUNCTION() {}
float fn_FUNCTION() {
    vec2 uv;
    uv += noise_FUNCTION();
}
`);
});

test('rename bindings and functions', () => {
  const ast = c.parseSrc(
    `
float selfref, b = 1.0, c = selfref;
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
void x() {}
vec3 fnName(float arg1, vec3 arg2) {
  float shadowed = arg1;
  float y = x().length();
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
}
vec4 LinearToLinear( in vec4 value ) {
  return value;
}
vec4 mapTexelToLinear( vec4 value ) { return LinearToLinear( value ); }
vec4 linearToOutputTexel( vec4 value ) { return LinearToLinear( value ); }
`,
    { quiet: true }
  );

  renameBindings(ast.scopes[0], (name) => `${name}_VARIABLE`);
  renameFunctions(ast.scopes[0], (name) => `${name}_FUNCTION`);

  expect(generate(ast)).toBe(`
float selfref_VARIABLE, b_VARIABLE = 1.0, c_VARIABLE = selfref_VARIABLE;
mat2x2 myMat_VARIABLE = mat2( vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) );
struct {
  float s;
  float t;
} structArr_VARIABLE[];
struct structType {
  float s;
  float t;
};
structType z_VARIABLE;

float shadowed_VARIABLE;
float reused_VARIABLE;
float unused_VARIABLE;
void x_FUNCTION() {}
vec3 fnName_FUNCTION(float arg1, vec3 arg2) {
  float shadowed = arg1;
  float y = x_FUNCTION().length();
  structArr_VARIABLE[0].x++;

  if(true) {
    float x = shadowed + 1 + reused_VARIABLE;
  }

  {
    float compound;
    compound = shadowed + reused_VARIABLE;
  }

  {
    float compound;
    compound = shadowed + reused_VARIABLE + compound;
  }
}
vec4 LinearToLinear_FUNCTION( in vec4 value ) {
  return value;
}
vec4 mapTexelToLinear_FUNCTION( vec4 value ) { return LinearToLinear_FUNCTION( value ); }
vec4 linearToOutputTexel_FUNCTION( vec4 value ) { return LinearToLinear_FUNCTION( value ); }
`);
});

test('detecting struct scope and usage', () => {
  const ast = c.parseSrc(`
struct StructName {
  vec3 color;
};
struct OtherStruct {
  StructName inner;
};
StructName proto(StructName x, StructName[3]);

subroutine StructName colorRedBlue();
subroutine (colorRedBlue) StructName redColor() {
  return StructName(1.0, 0.0, 0.0, 1.0);
}

StructName reflectedLight = StructName(vec3(0.0));
StructName main(in StructName x, StructName[3] y) {
  StructName ref = StructName();
  float a = 1.0 + StructName(1.0).color.x;
  struct StructName {
    vec3 color;
  };
  StructName ref2 = StructName();
  float a2 = 1.0 + StructName(1.0).color.x;
}
`);
  renameTypes(ast.scopes[0], (name) => `${name}_x`);
  expect(generate(ast)).toBe(`
struct StructName_x {
  vec3 color;
};
struct OtherStruct_x {
  StructName_x inner;
};
StructName_x proto(StructName_x x, StructName_x[3]);

subroutine StructName_x colorRedBlue();
subroutine (colorRedBlue) StructName_x redColor() {
  return StructName_x(1.0, 0.0, 0.0, 1.0);
}

StructName_x reflectedLight = StructName_x(vec3(0.0));
StructName_x main(in StructName_x x, StructName_x[3] y) {
  StructName_x ref = StructName_x();
  float a = 1.0 + StructName_x(1.0).color.x;
  struct StructName {
    vec3 color;
  };
  StructName ref2 = StructName();
  float a2 = 1.0 + StructName(1.0).color.x;
}
`);
  // Ensure structs aren't added to global function scope since they should be
  // identified as types
  expect(Object.keys(ast.scopes[0].functions)).toEqual([
    'proto',
    'colorRedBlue',
    'redColor',
    'main',
  ]);
  expect(Object.keys(ast.scopes[0].bindings)).toEqual(['reflectedLight']);
  expect(Object.keys(ast.scopes[0].types)).toEqual([
    'StructName',
    'OtherStruct',
  ]);
  expect(ast.scopes[0].types.StructName.references).toHaveLength(16);

  // Inner struct definition should be found in inner fn scope
  expect(Object.keys(ast.scopes[2].types)).toEqual(['StructName']);
});

test('fn args shadowing global scope identified as separate bindings', () => {
  const ast = c.parseSrc(`
attribute vec3 position;
vec3 func(vec3 position) {
  return position;
}`);
  renameBindings(ast.scopes[0], (name) =>
    name === 'position' ? 'renamed' : name
  );
  // The func arg "position" shadows the global binding, it should be untouched
  expect(generate(ast)).toBe(`
attribute vec3 renamed;
vec3 func(vec3 position) {
  return position;
}`);
});

test('I do not yet know what to do with layout()', () => {
  const ast = c.parseSrc(`
layout(std140,column_major) uniform;
float a;
uniform Material
{
uniform vec2 vProp;
};`);

  // This shouldn't crash - see the comment block in renameBindings()
  renameBindings(ast.scopes[0], (name) => `${name}_x`);
  expect(generate(ast)).toBe(`
layout(std140,column_major) uniform;
float a_x;
uniform Material
{
uniform vec2 vProp;
};`);
});

test(`(regression) ensure self-referenced variables don't appear as types`, () => {
  const ast = c.parseSrc(`
float a = 1.0, c = a;
`);
  expect(Object.keys(ast.scopes[0].types)).toEqual([]);
});

test('identifies a declared function with references', () => {
  const ast = c.parseSrc(`
vec4[3] main(float a, vec3 b) {}
void x() {
  float a = 1.0;
  float b = 1.0;
  main(a, b);
}
`);
  const signature = 'vec4[3]: float, vec3';
  // Should have found no types
  expect(ast.scopes[0].types).toMatchObject({});
  // Should have found one overload signature
  expect(ast.scopes[0].functions).toHaveProperty('main');
  expect(ast.scopes[0].functions.main).toHaveProperty(signature);
  expect(Object.keys(ast.scopes[0].functions.main)).toHaveLength(1);
  // Should be declared with references
  expect(ast.scopes[0].functions.main[signature].declaration).toBeTruthy();
  expect(ast.scopes[0].functions.main[signature].references).toHaveLength(2);
});

test('does not match function overload with different argument length', () => {
  const ast = c.parseSrc(
    `
float main(float a, float b) {}
void x() {
  main(a, b, c);
}
`,
    { quiet: true }
  );

  const unknownSig = `${UNKNOWN_TYPE}: ${UNKNOWN_TYPE}, ${UNKNOWN_TYPE}, ${UNKNOWN_TYPE}`;
  const knownSig = `float: float, float`;
  // Should have found no types
  expect(ast.scopes[0].types).toMatchObject({});
  // Should have found one overload signature
  expect(ast.scopes[0].functions).toHaveProperty('main');
  expect(ast.scopes[0].functions.main).toHaveProperty(knownSig);
  expect(ast.scopes[0].functions.main).toHaveProperty(unknownSig);
  expect(Object.keys(ast.scopes[0].functions.main)).toHaveLength(2);
  // Declaration should not match bad overload
  expect(ast.scopes[0].functions.main[knownSig].declaration).toBeTruthy();
  expect(ast.scopes[0].functions.main[knownSig].references).toHaveLength(1);
  // Bad call should not match definition
  expect(ast.scopes[0].functions.main[unknownSig].declaration).toBeFalsy();
  expect(ast.scopes[0].functions.main[unknownSig].references).toHaveLength(1);
});

test('handles declared, undeclared, and unknown function cases', () => {
  const ast = c.parseSrc(
    `
// Prototype for undeclared function
float main(float, float, float[3]);

// Prototype and definition for declared function
float main(float a, float b);
float main(float a, float b) {}

void x() {
  main(a, b);
  main(a, b, c);
  main(a, b, c, d);
}
`,
    { quiet: true }
  );

  const defSig = `float: float, float`;
  const undefSig = `float: float, float, float[3]`;
  const unknownSig = `${UNKNOWN_TYPE}: ${UNKNOWN_TYPE}, ${UNKNOWN_TYPE}, ${UNKNOWN_TYPE}, ${UNKNOWN_TYPE}`;

  // Should have found no types
  expect(ast.scopes[0].types).toMatchObject({});

  // Should have found 3 overload signatures. One overload for defined, one for
  // undefined, and one for the unknown call
  expect(ast.scopes[0].functions).toHaveProperty('main');
  expect(Object.keys(ast.scopes[0].functions.main)).toHaveLength(3);
  expect(ast.scopes[0].functions.main).toHaveProperty(defSig);
  expect(ast.scopes[0].functions.main).toHaveProperty(undefSig);
  expect(ast.scopes[0].functions.main).toHaveProperty(unknownSig);

  // Defined function has prototype, definition
  expect(ast.scopes[0].functions.main[defSig].declaration).toBeTruthy();
  expect(ast.scopes[0].functions.main[defSig].references).toHaveLength(3);

  // Undeclared call has prototype and call, but no declaration
  expect(ast.scopes[0].functions.main[undefSig].declaration).toBeFalsy();
  expect(ast.scopes[0].functions.main[undefSig].references).toHaveLength(2);

  // Unknown function is hanging out by itself
  expect(ast.scopes[0].functions.main[unknownSig].declaration).toBeFalsy();
  expect(ast.scopes[0].functions.main[unknownSig].references).toHaveLength(1);
});

test('warns on undeclared functions and structs', () => {
  const next = nextWarn();

  c.parseSrc(`
MyStruct x = MyStruct();
void main() {
  a();
  a(1);
  z += 1;
}
struct MyStruct { float y; };
`);

  expect(next()).toContain('undeclared function: "MyStruct"');
  expect(next()).toContain('undeclared type: "MyStruct"');
  expect(next()).toContain('undeclared function: "a"');
  expect(next()).toContain('No matching overload for function: "a"');
  expect(next()).toContain('Encountered undefined variable: "z"');
  expect(next()).toContain('Type "MyStruct" was used before it was declared');
});

test('warns on duplicate declarations', () => {
  const next = nextWarn();

  c.parseSrc(`
struct MyStruct { float y; };
struct MyStruct { float y; };
float dupefloat = 1.0;
float dupefloat = 1.0;
float dupefn(float b);
float dupefn(float);
void dupefn() {}
void dupefn() {}
`);

  expect(next()).toContain('duplicate type declaration: "MyStruct"');
  expect(next()).toContain('duplicate variable declaration: "dupefloat"');
  expect(next()).toContain('duplicate function prototype: "dupefn"');
  expect(next()).toContain('duplicate function definition: "dupefn"');
});

test('undeclared variables are added to the expected scope', () => {
  const ast = c.parseSrc(
    `
void a() {
  MyStruct x;
  a();
}
`,
    { quiet: true }
  );
  // Function should get added to global scope
  expect(ast.scopes[0].types).toMatchObject({});
  expect(ast.scopes[0].functions).toHaveProperty('a');
  // Struct should get added to inner scope
  expect(ast.scopes[1].types).toHaveProperty('MyStruct');
});

test('postfix is added to scope', () => {
  const ast = c.parseSrc(`
void a() {}
void main() {
  float y = a().xyz;
  float z = a().length();
}`);
  const a = Object.values(ast.scopes[0].functions.a)[0];
  expect(a.references).toHaveLength(3);
});
