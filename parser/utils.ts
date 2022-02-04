import type { Scope } from './parser';

export const renameBindings = (
  scope: Scope,
  mangle: (name: string) => string
) => {
  Object.entries(scope.bindings).forEach(([name, binding]) => {
    binding.references.forEach((ref) => {
      if (ref.doNotDescope) {
        return;
      }
      if (ref.type === 'declaration') {
        ref.identifier.identifier = mangle(ref.identifier.identifier);
      } else if (ref.type === 'identifier') {
        ref.identifier = mangle(ref.identifier);
      } else if (ref.type === 'parameter_declaration') {
        ref.declaration.identifier.identifier = mangle(
          ref.declaration.identifier.identifier
        );
      } else if (ref.type === 'interface_declarator') {
        /* intentionally empty, for
        layout(std140,column_major) uniform;
        uniform Material
        {
        uniform vec2 prop;
        }
         */
      } else {
        console.log(ref);
        throw new Error(`Binding for type ${ref.type} not recognized`);
      }
    });
  });
};

export const renameTypes = (scope: Scope, mangle: (name: string) => string) => {
  Object.entries(scope.types).forEach(([name, type]) => {
    type.references.forEach((ref) => {
      if (ref.doNotDescope) {
        return;
      }
      if (ref.type === 'struct') {
        ref.typeName.identifier = mangle(ref.typeName.identifier);
      } else if (ref.type === 'identifier') {
        ref.identifier = mangle(ref.identifier);
      } else if (ref.type === 'function_call') {
        ref.identifier.specifier.identifier = mangle(
          ref.identifier.specifier.identifier
        );
      } else {
        console.log(ref);
        throw new Error(`Binding for type ${ref.type} not recognized`);
      }
    });
  });
};

export const renameFunctions = (
  scope: Scope,
  mangle: (name: string) => string
) => {
  Object.entries(scope.functions).forEach(([name, binding]) => {
    binding.references.forEach((ref) => {
      if (ref.type === 'function_header') {
        ref.name.identifier = mangle(ref.name.identifier);
      } else if (ref.type === 'function_call') {
        if (ref.identifier.type === 'postfix') {
          ref.identifier.expr.identifier.specifier.identifier = mangle(
            ref.identifier.expr.identifier.specifier.identifier
          );
        } else {
          ref.identifier.specifier.identifier = mangle(
            ref.identifier.specifier.identifier
          );
        }
        // Structs type names also become constructors. However, their renaming is
        // handled by bindings
      } else if (ref.type !== 'struct') {
        console.log(ref);
        throw new Error(`Function for type ${ref.type} not recognized`);
      }
    });
  });
};
