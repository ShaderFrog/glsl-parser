// This file is compiled and inlined in /glsl-grammar.pegjs. See build-parser.sh
// and note that file is called in parse.test.ts
import {
  AstNode,
  LocationObject,
  ArraySpecifierNode,
  FunctionPrototypeNode,
  KeywordNode,
  FunctionNode,
  FunctionCallNode,
  TypeNameNode,
} from '../ast';
import { xor } from './utils';

export type TypeScopeEntry = {
  declaration?: TypeNameNode;
  references: TypeNameNode[];
};
export type TypeScopeIndex = {
  [name: string]: TypeScopeEntry;
};
export type ScopeEntry = { declaration?: AstNode; references: AstNode[] };
export type ScopeIndex = {
  [name: string]: ScopeEntry;
};
export type FunctionOverloadDefinition = {
  returnType: string;
  parameterTypes: string[];
  declaration?: FunctionNode;
  references: AstNode[];
};
export type FunctionOverloadIndex = {
  [signature: string]: FunctionOverloadDefinition;
};
export type FunctionScopeIndex = {
  [name: string]: FunctionOverloadIndex;
};

export type Scope = {
  name: string;
  parent?: Scope;
  bindings: ScopeIndex;
  types: TypeScopeIndex;
  functions: FunctionScopeIndex;
  location?: LocationObject;
};

export const UNKNOWN_TYPE = 'UNKNOWN TYPE';

export type FunctionSignature = [
  returnType: string,
  parameterTypes: string[],
  signature: string
];

export const makeScopeIndex = (
  firstReference: AstNode,
  declaration?: AstNode
): ScopeEntry => ({
  declaration,
  references: [firstReference],
});

export const findTypeScope = (
  scope: Scope | undefined,
  typeName: string
): Scope | null => {
  if (!scope) {
    return null;
  }
  if (typeName in scope.types) {
    return scope;
  }
  return findTypeScope(scope.parent, typeName);
};

export const isDeclaredType = (scope: Scope, typeName: string) =>
  findTypeScope(scope, typeName) !== null;

export const findBindingScope = (
  scope: Scope | undefined,
  name: string
): Scope | null => {
  if (!scope) {
    return null;
  }
  if (name in scope.bindings) {
    return scope;
  }
  return findBindingScope(scope.parent, name);
};

export const extractConstant = (expression: AstNode): string => {
  let result = UNKNOWN_TYPE;
  // Keyword case, like float
  if ('token' in expression) {
    result = expression.token;
    // User defined type
  } else if (
    'identifier' in expression &&
    typeof expression.identifier === 'string'
  ) {
    result = expression.identifier;
  } else {
    console.warn(result, expression);
  }
  return result;
};

export const quantifiersSignature = (quantifier: ArraySpecifierNode[]) =>
  quantifier.map((q) => `[${extractConstant(q.expression)}]`).join('');

export const functionDeclarationSignature = (
  node: FunctionNode | FunctionPrototypeNode
): FunctionSignature => {
  const proto = node.type === 'function' ? node.prototype : node;
  const { specifier } = proto.header.returnType;
  const quantifiers = specifier.quantifier || [];

  const parameterTypes = proto?.parameters?.map(({ specifier, quantifier }) => {
    // todo: saving place on putting quantifiers here
    const quantifiers =
      // vec4[1][2] param
      specifier.quantifier ||
      // vec4 param[1][3]
      quantifier ||
      [];
    return `${extractConstant(specifier.specifier)}${quantifiersSignature(
      quantifiers
    )}`;
  }) || ['void'];

  const returnType = `${
    (specifier.specifier as KeywordNode).token
  }${quantifiersSignature(quantifiers)}`;

  return [
    returnType,
    parameterTypes,
    `${returnType}: ${parameterTypes.join(', ')}`,
  ];
};

export const doSignaturesMatch = (
  definitionSignature: string,
  definition: FunctionOverloadDefinition,
  callSignature: FunctionSignature
) => {
  if (definitionSignature === callSignature[0]) {
    return true;
  }
  const left = [definition.returnType, ...definition.parameterTypes];
  const right = [callSignature[0], ...callSignature[1]];

  // Special case. When comparing "a()" to "a(1)", a() has paramater VOID, and
  // a(1) has type UNKNOWN. This will pass as true in the final check of this
  // function, even though it's not.
  if (left.length === 2 && xor(left[1] === 'void', right[1] === 'void')) {
    return false;
  }

  return (
    left.length === right.length &&
    left.every(
      (type, index) =>
        type === right[index] ||
        type === UNKNOWN_TYPE ||
        right[index] === UNKNOWN_TYPE
    )
  );
};

export const findOverloadDefinition = (
  signature: FunctionSignature,
  index: FunctionOverloadIndex
): FunctionOverloadDefinition | undefined => {
  return Object.entries(index).reduce<
    ReturnType<typeof findOverloadDefinition>
  >((found, [overloadSignature, overloadDefinition]) => {
    return (
      found ||
      (doSignaturesMatch(overloadSignature, overloadDefinition, signature)
        ? overloadDefinition
        : undefined)
    );
  }, undefined);
};

export const functionUseSignature = (
  node: FunctionCallNode
): FunctionSignature => {
  const parameterTypes =
    node.args.length === 0
      ? ['void']
      : node.args
          .filter((arg) => (arg as any).literal !== ',')
          .map(() => UNKNOWN_TYPE);
  const returnType = UNKNOWN_TYPE;
  return [
    returnType,
    parameterTypes,
    `${returnType}: ${parameterTypes.join(', ')}`,
  ];
};

export const newOverloadIndex = (
  returnType: string,
  parameterTypes: string[],
  firstReference: AstNode,
  declaration?: FunctionNode
): FunctionOverloadDefinition => ({
  returnType,
  parameterTypes,
  declaration,
  references: [firstReference],
});

export const findGlobalScope = (scope: Scope): Scope =>
  scope.parent ? findGlobalScope(scope.parent) : scope;

export const isDeclaredFunction = (scope: Scope, fnName: string) =>
  fnName in findGlobalScope(scope).functions;
