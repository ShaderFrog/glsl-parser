import type { AstNode } from '../ast/index.js';
import {
  FunctionScopeIndex,
  Scope,
  ScopeIndex,
  TypeScopeIndex,
} from './scope.js';

export const renameBindings = (
  bindings: ScopeIndex,
  mangle: (name: string) => string
) =>
  Object.entries(bindings).reduce<ScopeIndex>((acc, [name, binding]) => {
    const mangled = mangle(name);
    binding.references.forEach((node) => {
      if (node.type === 'declaration') {
        node.identifier.identifier = mangled;
      } else if (node.type === 'identifier') {
        node.identifier = mangled;
      } else if (node.type === 'parameter_declaration' && node.identifier) {
        node.identifier.identifier = mangled;
        /* Ignore case of:
        layout(std140,column_major) uniform;
        uniform Material
        {
        uniform vec2 prop;
        }
         */
      } else if (node.type !== 'interface_declarator') {
        console.warn('Unknown binding node', node);
        throw new Error(`Binding for type ${node.type} not recognized`);
      }
    });
    return {
      ...acc,
      [mangled]: binding,
    };
  }, {});

export const renameTypes = (
  types: TypeScopeIndex,
  mangle: (name: string) => string
) =>
  Object.entries(types).reduce<TypeScopeIndex>((acc, [name, type]) => {
    const mangled = mangle(name);
    type.references.forEach((node) => {
      if (node.type === 'type_name') {
        node.identifier = mangled;
      } else {
        console.warn('Unknown type node', node);
        throw new Error(`Type ${node.type} not recognized`);
      }
    });
    return {
      ...acc,
      [mangled]: type,
    };
  }, {});

export const renameFunctions = (
  functions: FunctionScopeIndex,
  mangle: (name: string) => string
) =>
  Object.entries(functions).reduce<FunctionScopeIndex>(
    (acc, [fnName, overloads]) => {
      const mangled = mangle(fnName);
      Object.entries(overloads).forEach(([signature, overload]) => {
        overload.references.forEach((node) => {
          if (node.type === 'function') {
            node['prototype'].header.name.identifier = mangled;
          } else if (
            node.type === 'function_call' &&
            node.identifier.type === 'postfix'
          ) {
            // @ts-ignore
            const specifier = node.identifier.expression.identifier.specifier;
            if (specifier) {
              specifier.identifier = mangled;
            } else {
              console.warn('Unknown function node to rename', node);
              throw new Error(
                `Function specifier type ${node.type} not recognized`
              );
            }
          } else if (
            node.type === 'function_call' &&
            'specifier' in node.identifier &&
            'identifier' in node.identifier.specifier
          ) {
            node.identifier.specifier.identifier = mangled;
          } else if (
            node.type === 'function_call' &&
            node.identifier.type === 'identifier'
          ) {
            node.identifier.identifier = mangled;
          } else {
            console.warn('Unknown function node to rename', node);
            throw new Error(`Function for type ${node.type} not recognized`);
          }
        });
      });
      return {
        ...acc,
        [mangled]: overloads,
      };
    },
    {}
  );

export const xor = (a: any, b: any): boolean => (a || b) && !(a && b);
