/**
 * Helper functions used by preprocessor-grammar.pegjs. Also re-exports
 * functions from other files used in the grammar.
 */

import {
  AstNode,
  CompoundStatementNode,
  LocationInfo,
  LocationObject,
  BinaryNode,
  FunctionPrototypeNode,
  LiteralNode,
  FunctionNode,
  FunctionCallNode,
  TypeNameNode,
  FullySpecifiedTypeNode,
  TypeSpecifierNode,
} from '../ast/index.js';
import { ParserOptions } from './parser.js';
import {
  Scope,
  findGlobalScope,
  findOverloadDefinition,
  findTypeScope,
  functionDeclarationSignature,
  functionUseSignature,
  newOverloadIndex,
  isDeclaredFunction,
  isDeclaredType,
  makeScopeIndex,
  findBindingScope,
} from './scope.js';

export {
  Scope,
  findGlobalScope,
  findOverloadDefinition,
  findTypeScope,
  functionDeclarationSignature,
  functionUseSignature,
  newOverloadIndex,
  isDeclaredFunction,
  isDeclaredType,
};

export const UNKNOWN_TYPE = 'UNKNOWN TYPE';

// Peggyjs globals
type Text = () => string;
type Location = () => LocationObject;

// Context passed to makeLocals
type Context = {
  text: Text;
  location: Location;
  options: ParserOptions;
  scope: Scope;
  scopes: Scope[];
};

// A "partial" is data that's computed as part of definition production, but is then
// merged into some higher rule, and doesn't itself become definition node.
export type PartialNode = { partial: any };
export const partial = (typeNameOrAttrs: string | object, attrs: object) => ({
  partial:
    attrs === undefined
      ? typeNameOrAttrs
      : {
          type: typeNameOrAttrs,
          ...attrs,
        },
});

// Filter out "empty" elements from an array
export const xnil = (...args: any[]) =>
  args
    .flat()
    .filter((e) => e !== undefined && e !== null && e !== '' && e.length !== 0);

// Given an array of nodes with potential null empty values, convert to text.
// Kind of like $(rule) but filters out empty rules
export const toText = (...args: any[]) => xnil(args).join('');

export const ifOnly = (arr: any[]) => (arr.length > 1 ? arr : arr[0]);

// Remove empty elements and return value if only 1 element remains
export const collapse = (...args: any[]) => ifOnly(xnil(args));

// Create definition left associative tree of nodes
export const leftAssociate = (
  head: AstNode,
  ...tail: [[LiteralNode, AstNode]][]
) =>
  tail.flat().reduce<AstNode | BinaryNode>(
    (left, [operator, right]) => ({
      type: 'binary',
      operator,
      left,
      right,
    }),
    head
  );

// From https://www.khronos.org/opengl/wiki/Built-in_Variable_(GLSL)
export const BUILT_INS = {
  vertex: new Set([
    'gl_VertexID',
    'gl_InstanceID',
    'gl_DrawID',
    'gl_BaseVertex',
    'gl_BaseInstance',
    'gl_Position',
    'gl_PointSize',
    'gl_ClipDistance',
  ]),
  fragment: new Set([
    'gl_FragColor',
    'gl_FragData',
    'gl_FragCoord',
    'gl_FrontFacing',
    'gl_PointCoord',
    'gl_SampleID',
    'gl_SamplePosition',
    'gl_SampleMaskIn',
    'gl_ClipDistance',
    'gl_PrimitiveID',
    'gl_Layer',
    'gl_ViewportIndex',
    'gl_FragDepth',
    'gl_SampleMask',
  ]),
};

// From https://www.khronos.org/registry/OpenGL-Refpages/gl4/index.php
// excluding gl_ prefixed builtins, which don't appear to be functions
export const FN_BUILT_INS = new Set([
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
  'texture2D',
  'textureCube',
]);

/**
 * Uses a closure to provide Peggyjs-parser-execution-aware context
 */
export const makeLocals = (context: Context) => {
  const getLocation = (loc?: LocationObject) => {
    // Try to avoid calling getLocation() more than neccessary
    if (!context.options.includeLocation) {
      return;
    }
    // Intentionally drop the "source" and "offset" keys from the location object
    const { start, end } = loc || context.location();
    return { start, end };
  };

  // getLocation() (and etc. functions) are not available in global scope,
  // so node() is moved to per-parse scope
  const node = (type: AstNode['type'], attrs: any): AstNode => {
    const n: AstNode = {
      type,
      ...attrs,
    };
    if (context.options.includeLocation) {
      n.location = getLocation();
    }
    return n;
  };

  const makeScope = (
    name: string,
    parent?: Scope,
    startLocation?: LocationObject
  ): Scope => {
    let newLocation = getLocation(startLocation);

    return {
      name,
      parent,
      ...(newLocation ? { location: newLocation } : false),
      bindings: {},
      types: {},
      functions: {},
    };
  };

  const warn = (message: string): void => {
    if (context.options.failOnWarn) {
      throw new Error(message);
    }
    if (!context.options.quiet) {
      console.warn(message);
    }
  };

  const pushScope = (scope: Scope) => {
    context.scopes.push(scope);
    return scope;
  };
  const popScope = (scope: Scope) => {
    if (!scope.parent) {
      throw new Error(`Popped bad scope ${scope} at ${context.text()}`);
    }
    return scope.parent;
  };

  const setScopeEnd = (scope: Scope, end: LocationInfo) => {
    if (context.options.includeLocation) {
      if (!scope.location) {
        console.error(`No end location at ${context.text()}`);
      } else {
        scope.location.end = end;
      }
    }
  };

  /**
   * Use this when you encounter a function call. warns() if the function is
   * not defined or doesn't have a known overload. See the "Caution" note in the
   * README for the false positive in findOverloadDefinition()
   */
  const addFunctionCallReference = (
    scope: Scope,
    name: string,
    fnRef: FunctionCallNode
  ) => {
    const global = findGlobalScope(scope);

    const signature = functionUseSignature(fnRef);
    if (!global.functions[name]) {
      warn(
        `Encountered undeclared function: "${name}" with signature "${signature[2]}"`
      );
      global.functions[name] = {
        [signature[2]]: newOverloadIndex(signature[0], signature[1], fnRef),
      };
    } else {
      const existingOverload = findOverloadDefinition(
        signature,
        global.functions[name]
      );
      if (!existingOverload) {
        warn(
          `No matching overload for function: "${name}" with signature "${signature[2]}"`
        );
        global.functions[name][signature[2]] = newOverloadIndex(
          signature[0],
          signature[1],
          fnRef
        );
      } else {
        existingOverload.references.push(fnRef);
      }
    }
  };

  /**
   * Create a definition for a function in the global scope. Use this when you
   * encounter a function definition.
   */
  const createFunctionDefinition = (
    scope: Scope,
    name: string,
    fnRef: FunctionNode
  ) => {
    const global = findGlobalScope(scope);

    const signature = functionDeclarationSignature(fnRef);
    if (!global.functions[name]) {
      global.functions[name] = {};
    }
    const existing = global.functions[name][signature[2]];
    if (existing) {
      if (existing.declaration) {
        warn(
          `Encountered duplicate function definition: "${name}" with signature "${signature[2]}"`
        );
      } else {
        existing.declaration = fnRef;
      }
      existing.references.push(fnRef);
    } else {
      global.functions[name][signature[2]] = newOverloadIndex(
        signature[0],
        signature[1],
        fnRef
      );
      global.functions[name][signature[2]].declaration = fnRef;
    }
  };

  /**
   * Create a definition for a function prototype. This is *not* the function
   * declaration in scope.
   */
  const createFunctionPrototype = (
    scope: Scope,
    name: string,
    fnRef: FunctionPrototypeNode
  ) => {
    const global = findGlobalScope(scope);

    const signature = functionDeclarationSignature(fnRef);
    if (!global.functions[name]) {
      global.functions[name] = {};
    }
    const existing = global.functions[name][signature[2]];
    if (existing) {
      warn(
        `Encountered duplicate function prototype: "${name}" with signature "${signature[2]}"`
      );
      existing.references.push(fnRef);
    } else {
      global.functions[name][signature[2]] = newOverloadIndex(
        signature[0],
        signature[1],
        fnRef
      );
    }
  };

  /**
   * Add the use of a struct TYPE_NAME to the scope. Use this when you know
   * you've encountered a struct name.
   */
  const addTypeReference = (
    scope: Scope,
    name: string,
    reference: TypeNameNode
  ) => {
    const declaredScope = findTypeScope(scope, name);
    if (declaredScope) {
      declaredScope.types[name].references.push(reference);
    } else {
      warn(`Encountered undeclared type: "${name}"`);
      scope.types[name] = {
        references: [reference],
      };
    }
  };

  /**
   * Create a new user defined type (struct) scope entry. Use this only when you
   * know this is a valid struct definition. If the struct name is already
   * defined, warn()
   */
  const createType = (
    scope: Scope,
    name: string,
    declaration: TypeNameNode
  ) => {
    if (name in scope.types) {
      if (scope.types[name].declaration) {
        warn(`Encountered duplicate type declaration: "${name}"`);
      } else {
        warn(`Type "${name}" was used before it was declared`);
        scope.types[name].declaration = declaration;
      }
      scope.types[name].references.push(declaration);
    } else {
      scope.types[name] = {
        declaration,
        references: [declaration],
      };
    }
  };

  /**
   * Given a TypeSpecifier, check if it includes a TYPE_NAME node, and if so,
   * track it in scope. Use this on any TypeSpecifier.
   */
  const addTypeIfFound = (
    scope: Scope,
    node: FullySpecifiedTypeNode | TypeSpecifierNode
  ) => {
    const specifier =
      node.type === 'fully_specified_type'
        ? node?.specifier?.specifier
        : node?.specifier;

    if (specifier.type === 'type_name') {
      const name = specifier.identifier;
      addTypeReference(scope, name, specifier);
      // If type is 'struct', then it was declared in struct_specifier. If
    } else if (specifier.type !== 'struct' && specifier.type !== 'keyword') {
      console.warn('Unknown specifier', specifier);
      throw new Error(
        `Unknown declarator specifier ${specifier?.type}. Please file a bug against @shaderfrog/glsl-parser and incldue your source grammar.`
      );
    }
  };

  /**
   * Create new variable declarations in the scope. Only use this when you know
   * the variable is being defined by the AstNode in question.
   */
  const createBindings = (scope: Scope, ...bindings: [string, AstNode][]) => {
    bindings.forEach(([identifier, binding]) => {
      const existing = scope.bindings[identifier];
      if (existing) {
        warn(`Encountered duplicate variable declaration: "${identifier}"`);
        existing.references.unshift(binding);
      } else {
        scope.bindings[identifier] = makeScopeIndex(binding, binding);
      }
    });
  };

  /**
   * When a variable name is encountered in the AST, either add it to the scope
   * it's defined in, or if it's not defined, warn(), and add a scope entry
   * without a declaraiton.
   * Used in the parse tree when you don't know if a variable should be defined
   * yet or not, like encountering an IDENTIFIER in an expression.
   */
  const addOrCreateBindingReference = (
    scope: Scope,
    name: string,
    reference: AstNode
  ) => {
    // In the case of "float definition = 1, b = definition;" we parse the final "definition" before the
    // parent declarator list is parsed. So we might need to add the final "definition"
    // to the scope first.
    const foundScope = findBindingScope(scope, name);
    if (foundScope) {
      foundScope.bindings[name].references.push(reference);
    } else {
      if (
        !context.options.stage ||
        (context.options.stage === 'vertex' && !BUILT_INS.vertex.has(name)) ||
        (context.options.stage === 'fragment' &&
          !BUILT_INS.fragment.has(name)) ||
        (context.options.stage === 'either' &&
          !BUILT_INS.vertex.has(name) &&
          !BUILT_INS.fragment)
      ) {
        warn(`Encountered undefined variable: "${name}"`);
      }
      // This intentionally does not provide a declaration
      scope.bindings[name] = makeScopeIndex(reference);
    }
  };

  // Group the statements in a switch statement into cases / default arrays
  const groupCases = (statements: (AstNode | PartialNode)[]) =>
    statements.reduce<AstNode[]>((cases, stmt) => {
      const partial = 'partial' in stmt ? stmt.partial : {};
      if (partial.type === 'case_label') {
        return [
          ...cases,
          node('switch_case', {
            statements: [],
            case: partial.case,
            test: partial.test,
            colon: partial.colon,
          }),
        ];
      } else if (partial.type === 'default_label') {
        return [
          ...cases,
          node('default_case', {
            statements: [],
            default: partial.default,
            colon: partial.colon,
          }),
        ];
        // It would be nice to encode this in the grammar instead of a manual check
      } else if (!cases.length) {
        throw new Error(
          'A switch statement body must start with a case or default label'
        );
      } else {
        // While converting this file to Typescript, I don't remember what this
        // else case is covering
        const tail = cases.slice(-1)[0];
        return [
          ...cases.slice(0, -1),
          {
            ...tail,
            statements: [...(tail as CompoundStatementNode).statements, stmt],
          } as AstNode,
        ];
      }
    }, []);

  context.scope = makeScope('global');
  context.scopes = [context.scope];

  return {
    getLocation,
    node,
    makeScope,
    warn,
    pushScope,
    popScope,
    setScopeEnd,
    createFunctionDefinition,
    addFunctionCallReference,
    createFunctionPrototype,
    groupCases,
    addTypeReference,
    addTypeIfFound,
    createType,
    createBindings,
    addOrCreateBindingReference,
  };
};
