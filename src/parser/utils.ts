import type { AstNode } from '../ast/index.js';
import { Scope } from './scope.js';

export const renameBindings = (
  scope: Scope,
  mangle: (name: string, node: AstNode) => string
) => {
  Object.entries(scope.bindings).forEach(([name, binding]) => {
    binding.references.forEach((node) => {
      if (node.type === 'declaration') {
        node.identifier.identifier = mangle(node.identifier.identifier, node);
      } else if (node.type === 'identifier') {
        node.identifier = mangle(node.identifier, node);
      } else if (node.type === 'parameter_declaration' && node.identifier) {
        node.identifier.identifier = mangle(node.identifier.identifier, node);
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
  });
};

export const renameTypes = (
  scope: Scope,
  mangle: (name: string, node: AstNode) => string
) => {
  Object.entries(scope.types).forEach(([name, type]) => {
    type.references.forEach((node) => {
      if (node.type === 'type_name') {
        node.identifier = mangle(node.identifier, node);
      } else {
        console.warn('Unknown type node', node);
        throw new Error(`Type ${node.type} not recognized`);
      }
    });
  });
};

export const renameFunctions = (
  scope: Scope,
  mangle: (name: string, node: AstNode) => string
) => {
  Object.entries(scope.functions).forEach(([fnName, overloads]) => {
    Object.entries(overloads).forEach(([signature, overload]) => {
      overload.references.forEach((node) => {
        if (node.type === 'function') {
          node['prototype'].header.name.identifier = mangle(
            node['prototype'].header.name.identifier,
            node
          );
        } else if (
          node.type === 'function_call' &&
          node.identifier.type === 'postfix'
        ) {
          // @ts-ignore
          const specifier = node.identifier.expression.identifier.specifier;
          if (specifier) {
            specifier.identifier = mangle(specifier.identifier, node);
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
          node.identifier.specifier.identifier = mangle(
            node.identifier.specifier.identifier,
            node
          );
        } else if (
          node.type === 'function_call' &&
          node.identifier.type === 'identifier'
        ) {
          node.identifier.identifier = mangle(node.identifier.identifier, node);
        } else {
          console.warn('Unknown function node to rename', node);
          throw new Error(`Function for type ${node.type} not recognized`);
        }
      });
    });
  });
};

export const xor = (a: any, b: any): boolean => (a || b) && !(a && b);
