// https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.40.pdf
// https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf

{{
  // Apparently peggy can't handle an open curly brace in a string, see
  // https://github.com/pegjs/pegjs/issues/187
  const OPEN_CURLY = String.fromCharCode(123);

  const makeScope = (name, parent) => ({
    name,
    parent,
    bindings: {},
    types: {},
    functions: {},
  });

  // Types (aka struct) scope
  const addTypes = (scope, ...types) => {
    types.forEach(([identifier, type]) => {
      scope.types[identifier] = {
        references: [type]
      };
    });
  };
  const addTypeReference = (scope, name, reference) => {
    scope.types[name].references.push(reference);
  };
  const findTypeScope = (scope, typeName) => {
    if(!scope) {
      return null;
    }
    if(typeName in scope.types) {
      return scope;
    }
    return findTypeScope(scope.parent, typeName);
  }
  const isDeclaredType = (scope, typeName) => findTypeScope(scope, typeName) !== null;

  // Bindings (aka variables, parameters) scope
  const createBindings = (scope, ...bindings) => {
    bindings.forEach(([identifier, binding]) => {
      const newBinding = scope.bindings[identifier] || { references: [] };
      newBinding.initializer = binding;
      newBinding.references.unshift(binding);
      scope.bindings[identifier] = newBinding
    });
  };
  const addBindingReference = (scope, name, reference) => {
    // In the case of "float a = 1, b = a;" we parse the final "a" before the
    // parent declarator list is parsed. So we might need to add the final "a"
    // to the scope first.
    const foundScope = findBindingScope(scope, name);
    if(foundScope) {
      foundScope.bindings[name].references.push(reference);
    } else {
      createBindings(scope, [name, reference]);
    }
  };
  const findBindingScope = (scope, name) => {
    if(!scope) {
      return null;
    }
    if(name in scope.bindings) {
      return scope;
    }
    return findBindingScope(scope.parent, name);
  }

  // Function scope
  const createFunction = (scope, name, declaration) => {
    scope.functions[name] = { references: [declaration] }
  };
  const addFunctionReference = (scope, name, reference) => {
    const global = findGlobalScope(scope);
    if(name in global.functions) {
      global.functions[name].references.push(reference);
    } else {
      createFunction(global, name, reference);
    }
  };
  const findGlobalScope = scope => scope.parent ? findGlobalScope(scope.parent) : scope;
  const isDeclaredFunction = (scope, fnName) => fnName in findGlobalScope(scope).functions;

  const node = (type, attrs) => ({
    type,
    ...attrs
  });

  // A "partial" is data that's computed as part of a production, but is then
  // merged into some higher rule, and doesn't itself become a node.
  const partial = (typeNameOrAttrs, attrs) => ({
    partial:
      attrs === undefined
        ? typeNameOrAttrs
        : {
            type: typeNameOrAttrs,
            ...attrs,
          },
  });

  // Filter out "empty" elements from an array
  const xnil = (...args) => args.flat().filter(e =>
    e !== undefined && e !== null && e !== '' && e.length !== 0
  )

  // Given an array of nodes with potential null empty values, convert to text.
  // Kind of like $(rule) but filters out empty rules
  const toText = (...args) => xnil(args).join('');

  const ifOnly = arr => arr.length > 1 ? arr : arr[0];

  // Remove empty elements and return value if only 1 element remains
  const collapse = (...args) => ifOnly(xnil(args));

  // Create a left associative tree of nodes
	const leftAssociate = (...nodes) =>
    nodes.flat().reduce((current, [operator, expr]) => ({
      type: 'binary',
      operator,
      left: current,
      right: expr
    }));

  // Group the statements in a switch statement into cases / default arrays
  const groupCases = (statements) => statements.reduce((cases, stmt) => {
    const partial = stmt.partial || {};
    if(partial.type === 'case_label') {
      return [
        ...cases,
        node(
          'switch_case',
          {
            statements: [],
            case: partial.case,
            test: partial.test,
            colon: partial.colon,
          }
        )
      ];
    } else if(partial.type === 'default_label') {
      return [
        ...cases,
        node(
          'default_case',
          {
            statements: [],
            default: partial.default,
            colon: partial.colon,
          }
        )
      ];
    // It would be nice to encode this in the grammar instead of a manual check
    } else if(!cases.length) {
      throw new Error('A switch statement body must start with a case or default label');
    } else {
      const tail = cases.slice(-1)[0];
      return [...cases.slice(0, -1), {
        ...tail,
        statements: [
          ...tail.statements,
          stmt
        ]
      }];
    }
  }, []);

  // From https://www.khronos.org/registry/OpenGL-Refpages/gl4/index.php
  // excluding gl_ prefixed builtins, which don't appear to be functions
  const builtIns = new Set([
    'abs',
    'acos',
    'acosh',
    'all',
    'any',
    'asin',
    'asinh',
    'atan',
    'atanh',
    'atomicAdd',
    'atomicAnd',
    'atomicCompSwap',
    'atomicCounter',
    'atomicCounterDecrement',
    'atomicCounterIncrement',
    'atomicExchange',
    'atomicMax',
    'atomicMin',
    'atomicOr',
    'atomicXor',
    'barrier',
    'bitCount',
    'bitfieldExtract',
    'bitfieldInsert',
    'bitfieldReverse',
    'ceil',
    'clamp',
    'cos',
    'cosh',
    'cross',
    'degrees',
    'determinant',
    'dFdx',
    'dFdxCoarse',
    'dFdxFine',
    'dFdy',
    'dFdyCoarse',
    'dFdyFine',
    'distance',
    'dot',
    'EmitStreamVertex',
    'EmitVertex',
    'EndPrimitive',
    'EndStreamPrimitive',
    'equal',
    'exp',
    'exp2',
    'faceforward',
    'findLSB',
    'findMSB',
    'floatBitsToInt',
    'floatBitsToUint',
    'floor',
    'fma',
    'fract',
    'frexp',
    'fwidth',
    'fwidthCoarse',
    'fwidthFine',
    'greaterThan',
    'greaterThanEqual',
    'groupMemoryBarrier',
    'imageAtomicAdd',
    'imageAtomicAnd',
    'imageAtomicCompSwap',
    'imageAtomicExchange',
    'imageAtomicMax',
    'imageAtomicMin',
    'imageAtomicOr',
    'imageAtomicXor',
    'imageLoad',
    'imageSamples',
    'imageSize',
    'imageStore',
    'imulExtended',
    'intBitsToFloat',
    'interpolateAtCentroid',
    'interpolateAtOffset',
    'interpolateAtSample',
    'inverse',
    'inversesqrt',
    'isinf',
    'isnan',
    'ldexp',
    'length',
    'lessThan',
    'lessThanEqual',
    'log',
    'log2',
    'matrixCompMult',
    'max',
    'memoryBarrier',
    'memoryBarrierAtomicCounter',
    'memoryBarrierBuffer',
    'memoryBarrierImage',
    'memoryBarrierShared',
    'min',
    'mix',
    'mod',
    'modf',
    'noise',
    'noise1',
    'noise2',
    'noise3',
    'noise4',
    'normalize',
    'not',
    'notEqual',
    'outerProduct',
    'packDouble2x32',
    'packHalf2x16',
    'packSnorm2x16',
    'packSnorm4x8',
    'packUnorm',
    'packUnorm2x16',
    'packUnorm4x8',
    'pow',
    'radians',
    'reflect',
    'refract',
    'round',
    'roundEven',
    'sign',
    'sin',
    'sinh',
    'smoothstep',
    'sqrt',
    'step',
    'tan',
    'tanh',
    'texelFetch',
    'texelFetchOffset',
    'texture',
    'textureGather',
    'textureGatherOffset',
    'textureGatherOffsets',
    'textureGrad',
    'textureGradOffset',
    'textureLod',
    'textureLodOffset',
    'textureOffset',
    'textureProj',
    'textureProjGrad',
    'textureProjGradOffset',
    'textureProjLod',
    'textureProjLodOffset',
    'textureProjOffset',
    'textureQueryLevels',
    'textureQueryLod',
    'textureSamples',
    'textureSize',
    'transpose',
    'trunc',
    'uaddCarry',
    'uintBitsToFloat',
    'umulExtended',
    'unpackDouble2x32',
    'unpackHalf2x16',
    'unpackSnorm2x16',
    'unpackSnorm4x8',
    'unpackUnorm',
    'unpackUnorm2x16',
    'unpackUnorm4x8',
    'usubBorrow',
    // GLSL ES 1.00
    'texture2D', 'textureCube'
  ]);
}}

// Per-parse initializations
{
  const warn = (...args) => !options.quiet && console.warn(...args);

  let scope = makeScope('global');
  let scopes = [scope];

  const pushScope = scope => {
    // console.log('pushing scope at ',text());
    scopes.push(scope);
    return scope;
  };
  const popScope = scope => {
    // console.log('popping scope at ',text());
    if(!scope.parent) {
      throw new Error('popped bad scope', scope, 'at', text());
    }
    return scope.parent;
  };
}

// Extra whitespace here at start is to help with screenshots by adding
// extra linebreaks
start = wsStart:_ program:translation_unit {
  return { type: 'program', wsStart, program, scopes };
}
// "compatibility profile only and vertex language only; same as in when in a
// vertex shader"
ATTRIBUTE = token:"attribute" t:terminal { return node('keyword', { token, whitespace: t }); }
// "varying compatibility profile only and vertex and fragment languages only;
// same as out when in a vertex shader and same as in when in a fragment shader"
VARYING = token:"varying" t:terminal { return node('keyword', { token, whitespace: t }); }

// TODO: Look into factoring out the whitespace so these become one keyword rule
CONST = token:"const" t:terminal { return node('keyword', { token, whitespace: t }); }
BOOL = token:"bool" t:terminal { return node('keyword', { token, whitespace: t }); }
FLOAT = token:"float" t:terminal { return node('keyword', { token, whitespace: t }); }
DOUBLE = token:"double" t:terminal { return node('keyword', { token, whitespace: t }); }
INT = token:"int" t:terminal { return node('keyword', { token, whitespace: t }); }
UINT = token:"uint" t:terminal { return node('keyword', { token, whitespace: t }); }
BREAK = token:"break" t:terminal { return node('keyword', { token, whitespace: t }); }
CONTINUE = token:"continue" t:terminal { return node('keyword', { token, whitespace: t }); }
DO = token:"do" t:terminal { return node('keyword', { token, whitespace: t }); }
ELSE = token:"else" t:terminal { return node('keyword', { token, whitespace: t }); }
FOR = token:"for" t:terminal { return node('keyword', { token, whitespace: t }); }
IF = token:"if" t:terminal { return node('keyword', { token, whitespace: t }); }
DISCARD = token:"discard" t:terminal { return node('keyword', { token, whitespace: t }); }
RETURN = token:"return" t:terminal { return node('keyword', { token, whitespace: t }); }
SWITCH = token:"switch" t:terminal { return node('keyword', { token, whitespace: t }); }
CASE = token:"case" t:terminal { return node('keyword', { token, whitespace: t }); }
DEFAULT = token:"default" t:terminal { return node('keyword', { token, whitespace: t }); }
SUBROUTINE = token:"subroutine" t:terminal { return node('keyword', { token, whitespace: t }); }
BVEC2 = token:"bvec2" t:terminal { return node('keyword', { token, whitespace: t }); }
BVEC3 = token:"bvec3" t:terminal { return node('keyword', { token, whitespace: t }); }
BVEC4 = token:"bvec4" t:terminal { return node('keyword', { token, whitespace: t }); }
IVEC2 = token:"ivec2" t:terminal { return node('keyword', { token, whitespace: t }); }
IVEC3 = token:"ivec3" t:terminal { return node('keyword', { token, whitespace: t }); }
IVEC4 = token:"ivec4" t:terminal { return node('keyword', { token, whitespace: t }); }
UVEC2 = token:"uvec2" t:terminal { return node('keyword', { token, whitespace: t }); }
UVEC3 = token:"uvec3" t:terminal { return node('keyword', { token, whitespace: t }); }
UVEC4 = token:"uvec4" t:terminal { return node('keyword', { token, whitespace: t }); }
VEC2 = token:"vec2" t:terminal { return node('keyword', { token, whitespace: t }); }
VEC3 = token:"vec3" t:terminal { return node('keyword', { token, whitespace: t }); }
VEC4 = token:"vec4" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT2 = token:"mat2" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT3 = token:"mat3" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT4 = token:"mat4" t:terminal { return node('keyword', { token, whitespace: t }); }
CENTROID = token:"centroid" t:terminal { return node('keyword', { token, whitespace: t }); }
IN = token:"in" t:terminal { return node('keyword', { token, whitespace: t }); }
OUT = token:"out" t:terminal { return node('keyword', { token, whitespace: t }); }
INOUT = token:"inout" t:terminal { return node('keyword', { token, whitespace: t }); }
UNIFORM = token:"uniform" t:terminal { return node('keyword', { token, whitespace: t }); }
PATCH = token:"patch" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLE = token:"sample" t:terminal { return node('keyword', { token, whitespace: t }); }
BUFFER = token:"buffer" t:terminal { return node('keyword', { token, whitespace: t }); }
SHARED = token:"shared" t:terminal { return node('keyword', { token, whitespace: t }); }
COHERENT = token:"coherent" t:terminal { return node('keyword', { token, whitespace: t }); }
VOLATILE = token:"volatile" t:terminal { return node('keyword', { token, whitespace: t }); }
RESTRICT = token:"restrict" t:terminal { return node('keyword', { token, whitespace: t }); }
READONLY = token:"readonly" t:terminal { return node('keyword', { token, whitespace: t }); }
WRITEONLY = token:"writeonly" t:terminal { return node('keyword', { token, whitespace: t }); }
DVEC2 = token:"dvec2" t:terminal { return node('keyword', { token, whitespace: t }); }
DVEC3 = token:"dvec3" t:terminal { return node('keyword', { token, whitespace: t }); }
DVEC4 = token:"dvec4" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT2 = token:"dmat2" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT3 = token:"dmat3" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT4 = token:"dmat4" t:terminal { return node('keyword', { token, whitespace: t }); }
NOPERSPECTIVE = token:"noperspective" t:terminal { return node('keyword', { token, whitespace: t }); }
FLAT = token:"flat" t:terminal { return node('keyword', { token, whitespace: t }); }
SMOOTH = token:"smooth" t:terminal { return node('keyword', { token, whitespace: t }); }
LAYOUT = token:"layout" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT2X2 = token:"mat2x2" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT2X3 = token:"mat2x3" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT2X4 = token:"mat2x4" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT3X2 = token:"mat3x2" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT3X3 = token:"mat3x3" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT3X4 = token:"mat3x4" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT4X2 = token:"mat4x2" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT4X3 = token:"mat4x3" t:terminal { return node('keyword', { token, whitespace: t }); }
MAT4X4 = token:"mat4x4" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT2X2 = token:"dmat2x2" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT2X3 = token:"dmat2x3" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT2X4 = token:"dmat2x4" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT3X2 = token:"dmat3x2" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT3X3 = token:"dmat3x3" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT3X4 = token:"dmat3x4" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT4X2 = token:"dmat4x2" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT4X3 = token:"dmat4x3" t:terminal { return node('keyword', { token, whitespace: t }); }
DMAT4X4 = token:"dmat4x4" t:terminal { return node('keyword', { token, whitespace: t }); }
ATOMIC_UINT = token:"atomic_uint" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER1D = token:"sampler1D" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2D = token:"sampler2D" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER3D = token:"sampler3D" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLERCUBE = token:"samplerCube" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER1DSHADOW = token:"sampler1DShadow" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2DSHADOW = token:"sampler2DShadow" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLERCUBESHADOW = token:"samplerCubeShadow" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER1DARRAY = token:"sampler1DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2DARRAY = token:"sampler2DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER1DARRAYSHADOW = token:"sampler1DArrayShadow" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2DARRAYSHADOW = token:"sampler2DArrayshadow" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER1D = token:"isampler1D" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER2D = token:"isampler2D" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER3D = token:"isampler3D" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLERCUBE = token:"isamplerCube" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER1DARRAY = token:"isampler1Darray" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER2DARRAY = token:"isampler2DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER1D = token:"usampler1D" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER2D = token:"usampler2D" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER3D = token:"usampler3D" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLERCUBE = token:"usamplerCube" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER1DARRAY = token:"usampler1DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER2DARRAY = token:"usampler2DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2DRECT = token:"sampler2DRect" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2DRECTSHADOW = token:"sampler2DRectshadow" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER2DRECT = token:"isampler2DRect" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER2DRECT = token:"usampler2DRect" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLERBUFFER = token:"samplerBuffer" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLERBUFFER = token:"isamplerBuffer" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLERBUFFER = token:"usamplerBuffer" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLERCUBEARRAY = token:"samplerCubeArray" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLERCUBEARRAYSHADOW = token:"samplerCubeArrayShadow" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLERCUBEARRAY = token:"isamplerCubeArray" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLERCUBEARRAY = token:"usamplerCubeArray" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2DMS = token:"sampler2DMS" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER2DMS = token:"isampler2DMS" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER2DMS = token:"usampler2DMS" t:terminal { return node('keyword', { token, whitespace: t }); }
SAMPLER2DMSARRAY = token:"sampler2DMSArray" t:terminal { return node('keyword', { token, whitespace: t }); }
ISAMPLER2DMSARRAY = token:"isampler2DMSArray" t:terminal { return node('keyword', { token, whitespace: t }); }
USAMPLER2DMSARRAY = token:"usampler2DMSArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE1D = token:"image1D" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE1D = token:"iimage1D" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE1D = token:"uimage1D" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE2D = token:"image2D" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE2D = token:"iimage2D" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE2D = token:"uimage2D" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE3D = token:"image3D" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE3D = token:"iimage3D" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE3D = token:"uimage3D" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE2DRECT = token:"image2DRect" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE2DRECT = token:"iimage2DRect" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE2DRECT = token:"uimage2DRect" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGECUBE = token:"imageCube" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGECUBE = token:"iimageCube" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGECUBE = token:"uimageCube" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGEBUFFER = token:"imageBuffer" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGEBUFFER = token:"iimageBuffer" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGEBUFFER = token:"uimageBuffer" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE1DARRAY = token:"image1DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE1DARRAY = token:"iimage1DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE1DARRAY = token:"uimage1DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE2DARRAY = token:"image2DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE2DARRAY = token:"iimage2DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE2DARRAY = token:"uimage2DArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGECUBEARRAY = token:"imageCubeArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGECUBEARRAY = token:"iimageCubeArray" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGECUBEARRAY = token:"uimageCubeArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE2DMS = token:"image2DMS" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE2DMS = token:"iimage2DMS" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE2DMS = token:"uimage2DMS" t:terminal { return node('keyword', { token, whitespace: t }); }
IMAGE2DMSARRAY = token:"image2DMArray" t:terminal { return node('keyword', { token, whitespace: t }); }
IIMAGE2DMSARRAY = token:"iimage2DMSArray" t:terminal { return node('keyword', { token, whitespace: t }); }
UIMAGE2DMSARRAY = token:"uimage2DMSArray" t:terminal { return node('keyword', { token, whitespace: t }); }
STRUCT = token:"struct" t:terminal { return node('keyword', { token, whitespace: t }); }
VOID = token:"void" t:terminal { return node('keyword', { token, whitespace: t }); }
WHILE = token:"while" t:terminal { return node('keyword', { token, whitespace: t }); }

INVARIANT = token:"invariant" t:terminal { return node('keyword', { token, whitespace: t }); }
PRECISE = token:"precise" t:terminal { return node('keyword', { token, whitespace: t }); }
HIGH_PRECISION = token:"highp" t:terminal { return node('keyword', { token, whitespace: t }); }
MEDIUM_PRECISION = token:"mediump" t:terminal { return node('keyword', { token, whitespace: t }); }
LOW_PRECISION = token:"lowp" t:terminal { return node('keyword', { token, whitespace: t }); }
PRECISION = token:"precision" t:terminal { return node('keyword', { token, whitespace: t }); }

FLOATCONSTANT = token:floating_constant _:_? { return node('float_constant', { token, whitespace: _ }); }
DOUBLECONSTANT = token:floating_constant _:_? { return node('double_constant', { token, whitespace: _ }); }
INTCONSTANT = token:integer_constant _:_? { return node('int_constant', { token, whitespace: _ }); }
UINTCONSTANT = token:integer_constant _:_? { return node('uint_constant', { token, whitespace: _ }); }
BOOLCONSTANT
  = token:("true" / "false") _:_ { return node('bool_constant', { token, whitespace:_ }); }
FIELD_SELECTION = IDENTIFIER

keyword "keyword" = ATTRIBUTE / VARYING / CONST / BOOL / FLOAT / DOUBLE / INT / UINT
  / BREAK / CONTINUE / DO / ELSE / FOR / IF / DISCARD / RETURN / SWITCH / CASE
  / DEFAULT / SUBROUTINE / BVEC2 / BVEC3 / BVEC4 / IVEC2 / IVEC3 / IVEC4 / UVEC2
  / UVEC3 / UVEC4 / VEC2 / VEC3 / VEC4 / MAT2 / MAT3 / MAT4 / CENTROID / IN
  / OUT / INOUT / UNIFORM / PATCH / SAMPLE / BUFFER / SHARED / COHERENT
  / VOLATILE / RESTRICT / READONLY / WRITEONLY / DVEC2 / DVEC3 / DVEC4 / DMAT2
  / DMAT3 / DMAT4 / NOPERSPECTIVE / FLAT / SMOOTH / LAYOUT / MAT2X2 / MAT2X3
  / MAT2X4 / MAT3X2 / MAT3X3 / MAT3X4 / MAT4X2 / MAT4X3 / MAT4X4 / DMAT2X2
  / DMAT2X3 / DMAT2X4 / DMAT3X2 / DMAT3X3 / DMAT3X4 / DMAT4X2 / DMAT4X3
  / DMAT4X4 / ATOMIC_UINT / SAMPLER1D / SAMPLER2D / SAMPLER3D / SAMPLERCUBE
  / SAMPLER1DSHADOW / SAMPLER2DSHADOW / SAMPLERCUBESHADOW / SAMPLER1DARRAY
  / SAMPLER2DARRAY / SAMPLER1DARRAYSHADOW / SAMPLER2DARRAYSHADOW / ISAMPLER1D
  / ISAMPLER2D / ISAMPLER3D / ISAMPLERCUBE / ISAMPLER1DARRAY / ISAMPLER2DARRAY
  / USAMPLER1D / USAMPLER2D / USAMPLER3D / USAMPLERCUBE / USAMPLER1DARRAY
  / USAMPLER2DARRAY / SAMPLER2DRECT / SAMPLER2DRECTSHADOW / ISAMPLER2DRECT
  / USAMPLER2DRECT / SAMPLERBUFFER / ISAMPLERBUFFER / USAMPLERBUFFER
  / SAMPLERCUBEARRAY / SAMPLERCUBEARRAYSHADOW / ISAMPLERCUBEARRAY
  / USAMPLERCUBEARRAY / SAMPLER2DMS / ISAMPLER2DMS / USAMPLER2DMS
  / SAMPLER2DMSARRAY / ISAMPLER2DMSARRAY / USAMPLER2DMSARRAY / IMAGE1D
  / IIMAGE1D / UIMAGE1D / IMAGE2D / IIMAGE2D / UIMAGE2D / IMAGE3D / IIMAGE3D
  / UIMAGE3D / IMAGE2DRECT / IIMAGE2DRECT / UIMAGE2DRECT / IMAGECUBE
  / IIMAGECUBE / UIMAGECUBE / IMAGEBUFFER / IIMAGEBUFFER / UIMAGEBUFFER
  / IMAGE1DARRAY / IIMAGE1DARRAY / UIMAGE1DARRAY / IMAGE2DARRAY / IIMAGE2DARRAY
  / UIMAGE2DARRAY / IMAGECUBEARRAY / IIMAGECUBEARRAY / UIMAGECUBEARRAY
  / IMAGE2DMS / IIMAGE2DMS / UIMAGE2DMS / IMAGE2DMSARRAY / IIMAGE2DMSARRAY
  / UIMAGE2DMSARRAY / STRUCT / VOID / WHILE / INVARIANT / PRECISE
  / HIGH_PRECISION / MEDIUM_PRECISION / LOW_PRECISION / PRECISION

LEFT_OP = token:"<<" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_OP = token:">>" _:_? { return node('literal', { literal: token, whitespace: _ }); }
INC_OP = token:"++" _:_? { return node('literal', { literal: token, whitespace: _ }); }
DEC_OP = token:"--" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LE_OP = token:"<=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
GE_OP = token:">=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
EQ_OP = token:"==" _:_? { return node('literal', { literal: token, whitespace: _ }); }
NE_OP = token:"!=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
AND_OP = token:"&&" _:_? { return node('literal', { literal: token, whitespace: _ }); }
OR_OP = token:"||" _:_? { return node('literal', { literal: token, whitespace: _ }); }
XOR_OP = token:"^^" _:_? { return node('literal', { literal: token, whitespace: _ }); }
MUL_ASSIGN = token:"*=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
DIV_ASSIGN = token:"/=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
ADD_ASSIGN = token:"+=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
MOD_ASSIGN = token:"%=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LEFT_ASSIGN = token:"<<=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_ASSIGN = token:">>=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
AND_ASSIGN = token:"&=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
XOR_ASSIGN = token:"^=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
OR_ASSIGN = token:"|=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
SUB_ASSIGN = token:"-=" _:_? { return node('literal', { literal: token, whitespace: _ }); }

LEFT_PAREN = token:"(" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_PAREN = token:")" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LEFT_BRACKET = token:"[" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_BRACKET = token:"]" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LEFT_BRACE = token:"{" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_BRACE = token:"}" _:_? { return node('literal', { literal: token, whitespace: _ }); }
DOT = token:"." _:_? { return node('literal', { literal: token, whitespace: _ }); }
COMMA = token:"," _:_? { return node('literal', { literal: token, whitespace: _ }); }
COLON = token:":" _:_? { return node('literal', { literal: token, whitespace: _ }); }
EQUAL = token:"=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
SEMICOLON = token:";" _:_? { return node('literal', { literal: token, whitespace: _ }); }
BANG = token:"!" _:_? { return node('literal', { literal: token, whitespace: _ }); }
DASH = token:"-" _:_? { return node('literal', { literal: token, whitespace: _ }); }
TILDE = token:"~" _:_? { return node('literal', { literal: token, whitespace: _ }); }
PLUS = token:"+" _:_? { return node('literal', { literal: token, whitespace: _ }); }
STAR = token:"*" _:_? { return node('literal', { literal: token, whitespace: _ }); }
SLASH = token:"/" _:_? { return node('literal', { literal: token, whitespace: _ }); }
PERCENT = token:"%" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LEFT_ANGLE = token:"<" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_ANGLE = token:">" _:_? { return node('literal', { literal: token, whitespace: _ }); }
VERTICAL_BAR = token:"|" _:_? { return node('literal', { literal: token, whitespace: _ }); }
CARET = token:"^" _:_? { return node('literal', { literal: token, whitespace: _ }); }
AMPERSAND = token:"&" _:_? { return node('literal', { literal: token, whitespace: _ }); }
QUESTION = token:"?" _:_? { return node('literal', { literal: token, whitespace: _ }); }

IDENTIFIER = !keyword identifier:$([A-Za-z_] [A-Za-z_0-9]*) _:_? { return node('identifier', { identifier, whitespace: _ }); }
TYPE_NAME = !keyword ident:IDENTIFIER {
  const { identifier } = ident;

  // We do scope checking and parsing all in one pass. In the case of calling an
  // undefined function, here, we don't know that we're in a function, so we
  // can't warn appropriately. If we return false for the missing typename, the
  // program won't parse, since the function call node won't match since it uses
  // type_name for the function_identifier. So all we can do here is go on our
  // merry way if the type isn't known.

  // This only applies to structs. I'm not sure if it's right. Because TYPE_NAME
  // is used in lots of places, it's easier to put this check here.
  let found;
  if(found = findTypeScope(scope, identifier)) {
    addTypeReference(found, identifier, ident);
  // I removed this because a type name reference here can't be renamed because
  // it's just a string and we don't know the parent node. This might apply
  // to the type reference above as well
  // } else if(found = findFunctionScope(scope, identifier)) {
    // addFunctionReference(found, identifier, identifier);
  }
  
  return ident;
}

// Integers
integer_constant
  = $(hexadecimal_constant integer_suffix?)
  / $(decimal_constant integer_suffix?)
  / $(octal_constant integer_suffix?)

integer_suffix = [uU]
decimal_constant = $([1-9] digit*)
octal_constant = "0" [0-7]*
hexadecimal_constant = "0" [xX] [0-9a-fA-F]*

digit = [0-9]

// Floating point
floating_constant
  = $(fractional_constant exponent_part? floating_suffix?)
  / $(digit_sequence exponent_part floating_suffix?)
fractional_constant = $(digit_sequence? "." digit_sequence?)
exponent_part "exponent" = $([eE] [+-]? digit_sequence)

// digit_sequence
digit_sequence = $digit+
floating_suffix = [fF] / "lf" / "LF"

primary_expression "primary expression"
  = FLOATCONSTANT
  / INTCONSTANT
  / UINTCONSTANT
  / BOOLCONSTANT
  / DOUBLECONSTANT
  / lp:LEFT_PAREN expression:expression rp:RIGHT_PAREN {
    return node('group', { lp, expression, rp });
  }
  / ident:IDENTIFIER {
    const { identifier } = ident;
    addBindingReference(scope, identifier, ident);
    return ident;
  }

postfix_expression
  = body:(
      // function_call needs to come first, because in the case of "a.length()"
      // where "a.length" is the function identifier(!), primary_expression
      // would consume "a" and then fail to parse, if it came first.
      function_call postfix_expression_suffix*
      / primary_expression postfix_expression_suffix*
    ) {
      // Postfix becomes a left associative tree
      return body.flat().reduceRight((postfix, expression) =>
          postfix ?
            node('postfix', { expression, postfix }) :
            expression
        );
    }
postfix_expression_suffix
  = integer_index
  / field_selection
  / INC_OP
  / DEC_OP

// Note these are reused in function_identifier for the part of
// postfix_expression that is inlined
integer_index = lb:LEFT_BRACKET expression:integer_expression rb:RIGHT_BRACKET {
  return node('quantifier', { lb, expression, rb });
}
field_selection = dot:DOT selection:FIELD_SELECTION {
  return node('field_selection', { dot, selection });
}

// The grammar only uses this for the index. I assume it's to evaluate something
// that returns an integer
integer_expression
  = expression

function_call
  = function_identifier:function_identifier
    // The grammar has left_paren here. To help de-left-recurse
    // function_identifier, it's moved into the function identifier above.
    args:function_arguments?
    rp:RIGHT_PAREN {
      // Warning: This may be brittle. The langauge spec says that a
      // function_call name is a "type_specifier" which can be "float[3](...)"
      // or a TYPE_NAME. If it's a TYPE_NAME, it will have an identifier, so
      // add it to the referenced scope. If it's a constructor (the "float"
      // case) it won't, so don't add a reference to it
      
      const identifier = function_identifier.partial;
      const fnName = (identifier.identifier.type === 'postfix') ?
        identifier.identifier.expression.identifier.specifier.identifier :
        identifier.identifier.specifier.identifier;
      
      const n = node('function_call', { ...identifier, args, rp });

      // struct constructors are stored in scope types, not scope functions,
      // skip them (the isDeclaredType check)
      const isDeclared = isDeclaredFunction(scope, fnName);
      if(
        fnName && !isDeclaredType(scope, fnName) &&
        // GLSL has built in functions that users can override
        (isDeclared || !builtIns.has(fnName))
      ) {
        if(!isDeclared) {
          warn(`Warning: Function "${fnName}" has not been declared`);
        }
        addFunctionReference(scope, fnName, n);
      }

      return n;
    }

function_arguments =
  v:VOID {
    return [v];
  }
  / head:assignment_expression
    tail:(COMMA assignment_expression)* {
      // For convenience, we don't store commas as trees, but rather flatten
      // into an array
      return [head, ...tail.flat()];
    }

// Grammar Note: Constructors look like functions, but lexical analysis
// recognized most of them as keywords. They are now recognized through
// “type_specifier”. Methods (.length), subroutine array calls, and identifiers
// are recognized through postfix_expression.

// a().length();        <--- postfix_expression as function_identifier
// vs
// texture().rgb;    <--- function_call . postfix_expression

function_identifier
  = identifier:(
    // Handle a().length()
    head:chained_function_call suffix:function_suffix lp:LEFT_PAREN {
      return partial({ head: [head, suffix], lp });
    }
    // Handle texture().rgb
    / head:type_specifier suffix:function_suffix? lp:LEFT_PAREN {
      return partial({ head: [head, suffix], lp });
    }
  ) {
    return partial({
      lp: identifier.partial.lp,
      identifier: [identifier.partial.head].flat().reduceRight((postfix, expression) =>
        postfix ?
          node('postfix', { expression, postfix }) :
          expression
      )
    });
    }

function_suffix
  // Handle subroutine case, aka "subroutineName[1]()"
  = integer_index
  // Handle method case, aka "a.length()"
  / field_selection

chained_function_call
  // For a normal function call, the identifier can itself be function_call. To
  // enable parsing "a().length()" - only allow "a" to be a type_specifier, not
  // itself a function call. "a()()" is invalid GLSL even though the grammar
  // technically allows it. GLSL doesn't have first class functions.
  = identifier:type_specifier
    lp:LEFT_PAREN
    args:function_arguments?
    rp:RIGHT_PAREN {
      return node('function_call', { identifier, lp, args, rp });
    }

unary_expression "unary expression"
  = postfix_expression
  / operator:(INC_OP / DEC_OP / PLUS / DASH / BANG / TILDE)
    expression:unary_expression {
      return node('unary', { operator, expression });
    }

multiplicative_expression
  = head:unary_expression
    tail:(
      op:(STAR / SLASH / PERCENT)
      expr:unary_expression
    )* {
      return leftAssociate(head, tail);
    }

additive_expression
  = head:multiplicative_expression
    tail:(
      op:(PLUS / DASH)
      expr:multiplicative_expression
    )* {
      return leftAssociate(head, tail);
    }

shift_expression
  = head:additive_expression
    tail:(
      op:(RIGHT_OP / LEFT_OP)
      expr:additive_expression
    )* {
      return leftAssociate(head, tail);
    }

relational_expression
  = head:shift_expression
    tail:(
      op:(LE_OP / GE_OP / LEFT_ANGLE / RIGHT_ANGLE)
      expr:shift_expression
    )* {
      return leftAssociate(head, tail);
    }

equality_expression "equality expression"
  = head:relational_expression
    tail:(
      op:(EQ_OP / NE_OP)
      expr:relational_expression
    )* {
      return leftAssociate(head, tail);
    }

and_expression "and expression"
  = head:equality_expression
    tail:(
      op:AMPERSAND
      expr:equality_expression
    )* {
      return leftAssociate(head, tail);
    }

exclusive_or_expression
  = head:and_expression
    tail:(
      op:CARET
      expr:and_expression
    )* {
      return leftAssociate(head, tail);
    }

inclusive_or_expression
  = head:exclusive_or_expression
    tail:(
      op:VERTICAL_BAR
      expr:exclusive_or_expression
    )* {
      return leftAssociate(head, tail);
    }

logical_and_expression
  = head:inclusive_or_expression
    tail:(
      op:AND_OP
      expr:inclusive_or_expression
    )* {
      return leftAssociate(head, tail);
    }

logical_xor_expression
  = head:logical_and_expression
    tail:(
      op:XOR_OP
      expr:logical_and_expression
    )* {
      return leftAssociate(head, tail);
    }

logical_or_expression
  = head:logical_xor_expression
    tail:(
      op:OR_OP
      expr:logical_xor_expression
    )* {
      return leftAssociate(head, tail);
    }

ternary_expression
  = expression:logical_or_expression
    suffix:(
      question:QUESTION
      left:expression
      colon:COLON
      right:assignment_expression {
        return { question, left, right, colon };
      }
    )? {
      // ? and : operators are right associative, which happens automatically
      // in pegjs grammar
      return suffix ?
        node('ternary', { expression, ...suffix }) :
        expression
    }

assignment_expression
  // Note, I switched the order of these because a conditional expression can
  // hijack the production because it can also be a unary_expression
  = left:unary_expression
    operator:assignment_operator
    right:assignment_expression {
      return node('assignment', { left, operator, right });
    }
    / ternary_expression

assignment_operator "asignment"
  = EQUAL / MUL_ASSIGN / DIV_ASSIGN / MOD_ASSIGN / ADD_ASSIGN / SUB_ASSIGN
  / LEFT_ASSIGN / RIGHT_ASSIGN / AND_ASSIGN / XOR_ASSIGN / OR_ASSIGN

expression "expression"
  = head:assignment_expression
    tail:(
      op:COMMA expr:assignment_expression
    )* {
      return leftAssociate(head, tail);
    }

// I'm leaving this in because there might be future use in hinting to the
// compiler the expression must only be constant
constant_expression
  = ternary_expression

declaration_statement = declaration:declaration {
  return node(
    'declaration_statement',
    {
        declaration: declaration[0],
        semi: declaration[1],
      }
  );
}

// Note the grammar allows prototypes inside function bodies, but:
//  "Function declarations (prototypes) cannot occur inside of functions;
//   they must be at global scope, or for the built-in functions, outside the
//   global scope, otherwise a compile-time error results."

// Don't factor out the semicolon from these lines up into
// "declaration_statement". Doing so causes some productions to consume input
// that's meant for a later production.
//
// The "function_prototype SEMICOLON" was moved out of this list and into
// function_prototype_no_new_scope, so that fn prototypes go first, then
// functions, then declarations
declaration
  = function_prototype_no_new_scope SEMICOLON
  // Statements starting with "precision", like "precision highp float"
  / precision_declarator SEMICOLON
  // Grouped in/out/uniform/buffer declarations with a { members } block after.
  / interface_declarator SEMICOLON
  // A statement starting with only qualifiers like "in precision a;"
  / qualifier_declarator SEMICOLON
  // Handles most identifiers. Interface declarator handles layout() {} blocks.
  // init_declartor_list needs to come after it, otherwise it eats the layout
  // part without handling the open brace after it
  / init_declarator_list SEMICOLON

qualifier_declarator =
  qualifiers:type_qualifiers
  head:IDENTIFIER?
  tail:(COMMA IDENTIFIER)* {
    return node(
      'qualifier_declarator',
      {
        qualifiers,
        // Head is optional, so remove falsey
        declarations: xnil([head, ...tail.map(t => t[1])]),
        commas: tail.map(t => t[0])
      }
    );
  }

interface_declarator
  = qualifiers:type_qualifiers
    interface_type:IDENTIFIER
    lp:LEFT_BRACE
    declarations:struct_declaration_list
    rp:RIGHT_BRACE
    identifier:quantified_identifier? {
      const n = node(
        'interface_declarator',
        { qualifiers, interface_type, lp, declarations, rp, identifier }
      );
      createBindings(scope, [interface_type.identifier, n]);
      return n;
    }

precision_declarator "precision statement"
  // As in "precision highp float"
  = prefix:PRECISION qualifier:precision_qualifier specifier:type_specifier {
    return node('precision', { prefix, qualifier, specifier });
  }

function_prototype_new_scope "function prototype"
  = header:function_header_new_scope params:function_parameters? rp:RIGHT_PAREN {
    return node('function_prototype', { header, ...params, rp });
  }

function_header_new_scope "function header"
  = returnType:fully_specified_type
    name:IDENTIFIER
    lp:LEFT_PAREN {
      const n = node(
        'function_header',
        { returnType, name, lp }
      );
      scope = pushScope(makeScope(name.identifier, scope));
      return n;
    }

// Function prototype is used for both actual prototypes as well as function
// declarations. Prototypes don't introduce a new scope. It would be better to
// do this at function_definition, but the scope starts at the open left paren,
// so I don't think this can be done higher up
function_prototype_no_new_scope "function prototype scope"
  = header:function_header_no_new_scope params:function_parameters? rp:RIGHT_PAREN {
    return node('function_prototype', { header, ...params, rp });
  }

function_header_no_new_scope "function header scope"
  = returnType:fully_specified_type
    name:IDENTIFIER
    lp:LEFT_PAREN {
      return node(
        'function_header',
        { returnType, name, lp }
      );
    }

function_parameters "function parameters"
  = head:parameter_declaration tail:(COMMA parameter_declaration)* {
    return {
      parameters: [head, ...tail.map(t => t[1])],
      commas: tail.map(t => t[0])
    }
  }

// Parameter note: vec4[1] param and vec4 param[1] are equivalent
parameter_declaration "parameter declaration"
  = qualifier:parameter_qualifier*
    declaration:(parameter_declarator / type_specifier) {
      return node(
        'parameter_declaration',
        { qualifier, declaration }
      );
    }

// Note array_specifier is "[const_expr]"
parameter_declarator "parameter declarator"
  = specifier:type_specifier
    identifier:IDENTIFIER
    quantifier:array_specifier? {
      return node(
        'parameter_declarator',
        { specifier, identifier, quantifier }
      );
    }

// I added this because on page 114, it says formal parameters can only have
// memory qualifiers, but there's no rule for it
// "Formal parameters can have parameter, precision, and memory qualifiers, but
// no other qualifiers."
parameter_qualifier = CONST / IN / OUT / INOUT / memory_qualifier / precision_qualifier
memory_qualifier = COHERENT / VOLATILE / RESTRICT / READONLY / WRITEONLY

init_declarator_list
  = head:initial_declaration
    tail:(
      op:COMMA
      expr:subsequent_declaration
    )* {
      const declarations = [
        head.declaration, ...tail.map(t => t[1])
      ].filter(decl => !!decl.identifier);

      createBindings(scope, ...declarations.map(decl => [decl.identifier.identifier, decl]));

      // TODO: I might need to start storing node parents for easy traversal
      return node(
        'declarator_list',
        {
          specified_type: head.specified_type,
          declarations,
          commas: tail.map(t => t[0])
        }
      );
    }

subsequent_declaration
  = identifier:IDENTIFIER
    quantifier:array_specifier?
    suffix:(
      EQUAL initializer
    )? {
      const [operator, initializer] = suffix || [];
      return node(
        'declaration',
        { identifier, quantifier, operator, initializer }
      );
  }

// declaration > init_declarator_list > single_declaration
initial_declaration
  // Apparently "float;" is a legal statement. I have no idea why.
  = specified_type:fully_specified_type
    suffix:(
      IDENTIFIER array_specifier? (EQUAL initializer)?
    )? {
      // No gaurantee of a suffix because fully_specified_type contains a
      // type_specifier which includes structs and type_names (IDENTIFIERs)
      const [identifier, quantifier, suffix_tail] = suffix || [];
      const [operator, initializer] = suffix_tail || [];

      // Break out the specified type so it can be grouped into the
      // declarator_list
      return {
        declaration: node(
          'declaration',
          { identifier, quantifier, operator, initializer }
        ),
        specified_type
      };
  }

fully_specified_type
  // qualifier is like const, specifier is like float, and float[1]
  = qualifiers:type_qualifiers? specifier:type_specifier {
    return node(
      'fully_specified_type',
      { qualifiers, specifier }
    );
  }

layout_qualifier
  = layout:LAYOUT
    lp:LEFT_PAREN
    qualifiers:(
      head:layout_qualifier_id
      tail:(COMMA layout_qualifier_id)* {
        return partial({
          qualifiers: [head, ...tail.map(t => t[1])],
          commas: tail.map(t => t[0])
        });
      }
    )
    rp:RIGHT_PAREN {
      return node(
        'layout_qualifier',
        { layout, lp, ...(qualifiers.partial), rp }
      );
    }

layout_qualifier_id
  = identifier:IDENTIFIER tail:(EQUAL constant_expression)? {
    const [operator, expression] = tail || [];
    return node('layout_qualifier_id', { identifier, operator, expression });
  }
  / SHARED

type_qualifiers = single_type_qualifier+

single_type_qualifier "single type qualifier"
  = storage_qualifier
  / layout_qualifier
  / precision_qualifier
  / interpolation_qualifier
  / INVARIANT
  / PRECISE

interpolation_qualifier "interpolation qualifier"
  = SMOOTH / FLAT / NOPERSPECTIVE

storage_qualifier "storage qualifier"
  = CONST / INOUT / IN / OUT / CENTROID / PATCH / SAMPLE / UNIFORM / BUFFER
  / SHARED / COHERENT / VOLATILE / RESTRICT / READONLY / WRITEONLY
  // Note the grammar doesn't allow varying nor attribute. To support GLSL ES
  // 1.0, I've included it here
  // TODO: Turn off in GLSL ES 1.00 vs 3.00 parsing
  / VARYING / ATTRIBUTE
  / subroutine:SUBROUTINE
    type_names:(
      lp:LEFT_PAREN
      head:TYPE_NAME
      tail:(COMMA TYPE_NAME)*
      rp:RIGHT_PAREN {
        return partial({
          lp,
          type_names: [head, ...tail.map(t => t[1])],
          commas: tail.map(t => t[0]),
          rp,
        });
      })? {
        return node(
          'subroutine_qualifier',
          {
            subroutine,
            ...(type_names?.partial),
          }
        );
      }

type_specifier "type specifier"
  = specifier:type_specifier_nonarray quantifier:array_specifier? {
    return node('type_specifier', { specifier, quantifier });
  }

// used by type_specifier only
type_specifier_nonarray "type specifier"
  = VOID / FLOAT / DOUBLE / INT / UINT / BOOL / VEC2 / VEC3 / VEC4 / DVEC2
  / DVEC3 / DVEC4 / BVEC2 / BVEC3 / BVEC4 / IVEC2 / IVEC3 / IVEC4 / UVEC2
  / UVEC3 / UVEC4 / MAT2 / MAT3 / MAT4 / MAT2X2 / MAT2X3 / MAT2X4 / MAT3X2
  / MAT3X3 / MAT3X4 / MAT4X2 / MAT4X3 / MAT4X4 / DMAT2 / DMAT3 / DMAT4 
  / DMAT2X2 / DMAT2X3 / DMAT2X4 / DMAT3X2 / DMAT3X3 / DMAT3X4 / DMAT4X2 
  / DMAT4X3 / DMAT4X4 / ATOMIC_UINT / SAMPLER1D / SAMPLER2D / SAMPLER3D 
  / SAMPLERCUBE / SAMPLER1DSHADOW / SAMPLER2DSHADOW / SAMPLERCUBESHADOW
  / SAMPLER1DARRAY / SAMPLER2DARRAY / SAMPLER1DARRAYSHADOW 
  / SAMPLER2DARRAYSHADOW / SAMPLERCUBEARRAY / SAMPLERCUBEARRAYSHADOW 
  / ISAMPLER1D / ISAMPLER2D / ISAMPLER3D / ISAMPLERCUBE / ISAMPLER1DARRAY
  / ISAMPLER2DARRAY / ISAMPLERCUBEARRAY / USAMPLER1D / USAMPLER2D / USAMPLER3D
  / USAMPLERCUBE / USAMPLER1DARRAY / USAMPLER2DARRAY / USAMPLERCUBEARRAY
  / SAMPLER2DRECT / SAMPLER2DRECTSHADOW / ISAMPLER2DRECT / USAMPLER2DRECT
  / SAMPLERBUFFER / ISAMPLERBUFFER / USAMPLERBUFFER / SAMPLER2DMS / ISAMPLER2DMS
  / USAMPLER2DMS / SAMPLER2DMSARRAY / ISAMPLER2DMSARRAY / USAMPLER2DMSARRAY
  / IMAGE1D / IIMAGE1D / UIMAGE1D / IMAGE2D / IIMAGE2D / UIMAGE2D / IMAGE3D
  / IIMAGE3D / UIMAGE3D / IMAGE2DRECT / IIMAGE2DRECT / UIMAGE2DRECT / IMAGECUBE
  / IIMAGECUBE / UIMAGECUBE / IMAGEBUFFER / IIMAGEBUFFER / UIMAGEBUFFER
  / IMAGE1DARRAY / IIMAGE1DARRAY / UIMAGE1DARRAY / IMAGE2DARRAY / IIMAGE2DARRAY
  / UIMAGE2DARRAY / IMAGECUBEARRAY / IIMAGECUBEARRAY / UIMAGECUBEARRAY
  / IMAGE2DMS / IIMAGE2DMS / UIMAGE2DMS / IMAGE2DMSARRAY / IIMAGE2DMSARRAY
  / UIMAGE2DMSARRAY / struct_specifier / TYPE_NAME

array_specifier "array specifier"
  = specifiers:(
      lb:LEFT_BRACKET expression:constant_expression? rb:RIGHT_BRACKET {
        return node('array_specifier', { lb, expression, rb });
      }
    )+ {
      return node('array_specifiers', { specifiers });
    }

precision_qualifier "precision qualifier"
  = HIGH_PRECISION / MEDIUM_PRECISION / LOW_PRECISION

struct_specifier "struct specifier"
  = struct:STRUCT
    typeName:IDENTIFIER?
    lb:LEFT_BRACE
    declarations:struct_declaration_list
    rb:RIGHT_BRACE {
      const n = node('struct', { lb, declarations, rb, struct, typeName });
      // Anonymous structs don't get a type name
      if(typeName) {
        addTypes(scope, [typeName.identifier, n]);

        // Struct names also become constructors for functions. Needing to track
        // this as both a type and a function makes me think my scope data model
        // is probably wrong
        // addFunctionReference(scope, typeName.identifier, n);
      }
      return n;
    }

struct_declaration_list = (
    declaration:struct_declaration
    semi:SEMICOLON {
      return node('struct_declaration', { declaration, semi });
    }
  )+

struct_declaration
  = specified_type:fully_specified_type
    head:quantified_identifier
    tail:(COMMA quantified_identifier)* {
      return node(
        'struct_declarator', 
        {
          specified_type,
          declarations: [head, ...tail.map(t => t[1])],
          commas: tail.map(t => t[0])
        }
      );
    }

// Fields inside of structs and interace blocks. They don't show up in scope
quantified_identifier
  = identifier:IDENTIFIER quantifier:array_specifier? {
    return node('quantified_identifier', { identifier, quantifier });
  }

// This is what comes after the equals sign in a variable initialization
initializer
  = assignment_expression
  // Example: mat2x2 b = { vec2( 1.0, 0.0 ), vec2( 0.0, 1.0 ) };
  / lb:LEFT_BRACE
    head:initializer
    tail:(COMMA initializer)*
    trailing:COMMA?
    rb:RIGHT_BRACE {
      // TODO: Scope
      return node(
        'initializer_list',
        {
          lb,
          initializers: [head, ...tail.map(t => t[1])],
          commas: xnil(tail.map(t => t[0]), trailing),
          rb
        }
      );
    }

statement
  = compound_statement
  / simple_statement

// All of these should end in SEMICOLON if they expect them
simple_statement
  = jump_statement // Moved up to let "continue", etc, get picked up first
  / declaration_statement
  / expression_statement
  / if_statement
  / switch_statement
  / case_label
  / iteration_statement

// { block of statements } that introduces a new scope
compound_statement =
  lb:(sym:LEFT_BRACE {
    scope = pushScope(makeScope(OPEN_CURLY, scope));
    return sym;
  })
  statements:statement_list?
  rb:RIGHT_BRACE {
    scope = popScope(scope);
    return node(
      'compound_statement',
      { lb, statements: (statements || []).flat(), rb }
    );
  }

// { block of statements } that doesn't introduce a new scope, such as the body
// of a for loop, since "for(" technically starts the new scope
compound_statement_no_new_scope = 
  lb:LEFT_BRACE
  statements:statement_list?
  rb:RIGHT_BRACE {
    return node(
      'compound_statement',
      { lb, statements: (statements || []).flat(), rb }
    );
  }

statement_no_new_scope
  = compound_statement_no_new_scope / simple_statement

statement_list = (statement / preprocessor)+

expression_statement = expression:expression? semi:SEMICOLON {
  return node('expression_statement', { expression, semi });
}

// Note: The Khronos grammar calls this "selection statement"
if_statement
  = ifSymbol:IF
    lp:LEFT_PAREN
    condition:expression
    rp:RIGHT_PAREN
    tail:(
      statement (ELSE statement)?
    ) {
      const [body, elseBranch] = tail;
      return node(
        'if_statement',
        {
          'if': ifSymbol,
          body,
          lp,
          condition,
          rp,
          ...(elseBranch && { 'else': elseBranch.flat() }),
        });
  }

switch_statement
  = switchSymbol:SWITCH
    lp:LEFT_PAREN
    expression:expression
    rp:RIGHT_PAREN
    lb:LEFT_BRACE
    statements:statement_list
    rb:RIGHT_BRACE {
      // TODO: Scope?
      return node(
        'switch_statement',
        {
          switch: switchSymbol,
          lp,
          expression,
          rp,
          lb,
          cases: groupCases(statements),
          rb
        }
      );
    }

case_label
  = caseSymbol:CASE test:expression colon:COLON {
    return partial('case_label', { 'case': caseSymbol, test, colon });
  }
  / defaultSymbol:DEFAULT colon:COLON {
    return partial('default_label', { default: defaultSymbol, colon });
  }

iteration_statement "iteration statement"
  = whileSymbol:(sym:WHILE {
      scope = pushScope(makeScope('while', scope));
      return sym;
    })
    lp:LEFT_PAREN
    condition:condition
    rp:RIGHT_PAREN
    body:statement_no_new_scope {
      scope = popScope(scope);
      return node(
        'while_statement',
        {
          while: whileSymbol,
          lp,
          condition,
          rp,
          body
        }
      );
    }
  // Grammar note: "the do-while loop, which cannot declare a variable in its
  // condition-expression" - page 136. Scope is left up to statement prodcution
  / doSymbol:DO
    body:statement
    whileSymbol:WHILE
    lp:LEFT_PAREN
    expression:expression
    rp:RIGHT_PAREN
    semi:SEMICOLON {
      return node(
        'do_statement',
        {
          do: doSymbol,
          body,
          while: whileSymbol,
          lp,
          expression,
          rp,
          semi
        }
      );
    }
  / forSymbol:(sym:FOR {
      scope = pushScope(makeScope('for', scope));
      return sym;
    })
    lp:LEFT_PAREN
    init:(
      expression_statement /
      declaration_statement
    )?
    condition:condition?
    conditionSemi:SEMICOLON
    operation:expression?
    rp:RIGHT_PAREN
    body:statement_no_new_scope {
      scope = popScope(scope);
      return node(
        'for_statement',
        {
          'for': forSymbol,
          body,
          lp,
          init: init.expression || init.declaration,
          initSemi: init.semi,
          condition,
          conditionSemi,
          operation,
          rp
        }
      );
    }

condition
  // A condition is used in a for loop middle case, and also a while loop (but
  // not a do-while loop). I don't think this case is valid for either? An
  // expression makes sense
  = specified_type:fully_specified_type
    identifier:IDENTIFIER
    operator:EQUAL
    initializer:initializer {
      const n = node(
        'condition_expression',
        { specified_type, identifier, operator, initializer }
      );
      createBindings(scope, [identifier.identifier, n]);
      return n;
    }
    / expression

jump_statement "jump statement"
  = jump:CONTINUE semi:SEMICOLON {
    return node('continue_statement', { continue: jump, semi });
  }
  / jump:BREAK semi:SEMICOLON {
    return node('break_statement', { break: jump, semi });
  }
  / jump:RETURN expression:expression? semi:SEMICOLON {
    return node('return_statement', { return: jump, expression, semi });
  }
  / jump:DISCARD semi:SEMICOLON { // Fragment shader only.
    return node('discard_statement', { discard: jump, semi });
  }

// TODO: This allows shaders with preprocessors to be parsed, and puts the
// preprocessor line in the AST. Do I want to do this, or do I want to
// always preprocess shaders before parsing? Not preprocessing will likely
// break the ability to parse if there is wacky define using
preprocessor "prepocessor" = line:$('#' [^\n]*) _:_? { return node('preprocessor', { line, _ }); }

// Translation unit is start of grammar
translation_unit = (external_declaration / preprocessor)+

function_prototype_statement = 
  declaration:function_prototype_no_new_scope semi:SEMICOLON {
    addFunctionReference(scope, declaration.header.name.identifier, declaration);
    const n = node(
      'declaration_statement',
      {
          declaration,
          semi,
        }
    );
    return n;
  }

function_prototype = 
  fp:function_prototype_no_new_scope semi:SEMICOLON {
    addFunctionReference(scope, fp.header.name.identifier, fp);
    return [fp, semi];
  }

// "function_prototype_statement" isn't in the grammar. It's removed from
// declaration_statement and added here to catch function prototypes. The issue
// is that the other productions cause barfing:
// - If function definitioss go first, they try to match prototypes, and
//   introduce a new scope in function_prototype, but then *backtrack* and the
//   scope isn't popped.
// - If declaration_statement comes first (which in the originally grammar
//   catches fn prototypes as declarations), the reverse problem happens.
//   init_declarator_list sees a function (not prototype) and initially thinks
//   it's a prototype declaration (because it's before the { body }), then it
//   adds this prototype declaration to the scope bindings (which is incorrect,
//   it should be in scope.functions, notbindings), and then backtracks, and the
//   scope is now corrupted.
// My solution is to force a separate prototype path separately
// See https://github.com/peggyjs/peggy/issues/330 for more
external_declaration
  = function_prototype_statement / function_definition / declaration_statement

function_definition = prototype:function_prototype_new_scope body:compound_statement_no_new_scope {
  const n = node('function', { prototype, body });

  const bindings = (prototype.parameters || [])
    // Ignore any param without an identifier, aka main(void)
    .filter(p => !!p.declaration.identifier)
    .map(p => [p.declaration.identifier.identifier, p]);
  createBindings(scope, ...bindings)

  scope = popScope(scope);
  addFunctionReference(scope, prototype.header.name.identifier, n);

  return n;
}

// The whitespace is optional so that we can put comments immediately after
// terminals, like void/* comment */
// The ending whitespace is so that linebreaks can happen after comments
_ "whitespace" = w:whitespace? rest:(comment whitespace?)* {
  return collapse(w, rest);
}

comment
  = single_comment
  // Intention is to handle any type of comment case. A multiline comment
  // can be followed by more multiline comments, or a single comment, and
  // collapse everything into one array
  / a:multiline_comment d:(
    x:whitespace cc:comment { return xnil(x, cc); }
  )* { return xnil(a, d.flat()); }

single_comment = $('//' [^\n]*)
multiline_comment = $("/*" inner:(!"*/" i:. { return i; })* "*/")

whitespace
  = $[ \t\n\r]+

// A terminal node is something like "void" with optional whitespace and/or
// comments after it. By convention whitespace is stored as children of
// terminals in the AST.
// We need to avoid the case of "voidsomething" hence the negative lookahead
terminal = ![A-Za-z_0-9] _:_? { return _; }
