import type { Scope } from './parser';

export const renameBindings = (
  scope: Scope,
  preserve: Set<string>,
  suffix: string
) => {
  Object.entries(scope.bindings).forEach(([name, binding]) => {
    binding.references.forEach((ref) => {
      if (ref.doNotDescope) {
        return;
      }
      if (ref.type === 'declaration') {
        // both are "in" vars expected in vertex shader
        if (!preserve.has(ref.identifier.identifier)) {
          ref.identifier.identifier = `${ref.identifier.identifier}_${suffix}`;
        }
      } else if (ref.type === 'identifier') {
        // TODO: does this block get called anymore??
        if (!preserve.has(ref.identifier)) {
          ref.identifier = `${ref.identifier}_${suffix}`;
        }
      } else if (ref.type === 'parameter_declaration') {
        ref.declaration.identifier.identifier = `${ref.declaration.identifier.identifier}_${suffix}`;
      } else {
        console.log(ref);
        throw new Error(`Binding for type ${ref.type} not recognized`);
      }
    });
  });
};

export const renameTypes = (
  scope: Scope,
  preserve: Set<string>,
  suffix: string
) => {
  Object.entries(scope.types).forEach(([name, type]) => {
    type.references.forEach((ref) => {
      if (ref.doNotDescope) {
        return;
      }
      if (ref.type === 'struct') {
        if (!preserve.has(ref.typeName.identifier)) {
          ref.typeName.identifier = `${ref.typeName.identifier}_${suffix}`;
        }
      } else if (ref.type === 'identifier') {
        ref.identifier = `${ref.identifier}_${suffix}`;
      } else if (ref.type === 'function_call') {
        ref.identifier.specifier.identifier = `${ref.identifier.specifier.identifier}_${suffix}`;
      } else {
        console.log(ref);
        throw new Error(`Binding for type ${ref.type} not recognized`);
      }
    });
  });
};

export const renameFunctions = (
  scope: Scope,
  suffix: string,
  map: { [name: string]: string }
) => {
  Object.entries(scope.functions).forEach(([name, binding]) => {
    binding.references.forEach((ref) => {
      if (ref.type === 'function_header') {
        ref.name.identifier =
          map[ref.name.identifier] || `${ref.name.identifier}_${suffix}`;
      } else if (ref.type === 'function_call') {
        if (ref.identifier.type === 'postfix') {
          ref.identifier.expr.identifier.specifier.identifier =
            map[ref.identifier.expr.identifier.specifier.identifier] ||
            `${ref.identifier.expr.identifier.specifier.identifier}_${suffix}`;
        } else {
          ref.identifier.specifier.identifier =
            map[ref.identifier.specifier.identifier] ||
            `${ref.identifier.specifier.identifier}_${suffix}`;
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
