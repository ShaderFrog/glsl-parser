import type { AstNode, Program } from './ast-types.js';

const isNode = (node: AstNode) => !!node?.type;
const isTraversable = (node: any) => isNode(node) || Array.isArray(node);

export type Path<NodeType> = {
  node: NodeType;
  parent: Program | AstNode | undefined;
  parentPath: Path<any> | undefined;
  key: string | undefined;
  index: number | undefined;
  stop: () => void;
  skip: () => void;
  remove: () => void;
  replaceWith: (replacer: AstNode) => void;
  findParent: (test: (p: Path<any>) => boolean) => Path<any> | undefined;

  stopped?: boolean;
  skipped?: boolean;
  removed?: boolean;
  replaced?: any;
};

const makePath = <NodeType>(
  node: NodeType,
  parent: AstNode | Program | undefined,
  parentPath: Path<any> | undefined,
  key: string | undefined,
  index: number | undefined
): Path<NodeType> => ({
  node,
  parent,
  parentPath,
  key,
  index,
  stop: function () {
    this.stopped = true;
  },
  skip: function () {
    this.skipped = true;
  },
  remove: function () {
    this.removed = true;
  },
  replaceWith: function (replacer) {
    this.replaced = replacer;
  },
  findParent: function (test) {
    return !parentPath
      ? parentPath
      : test(parentPath)
      ? parentPath
      : parentPath.findParent(test);
  },
});

export type NodeVisitor<NodeType> = {
  enter?: (p: Path<NodeType>) => void;
  exit?: (p: Path<NodeType>) => void;
};

// This builds a type of all AST types to a visitor type. Aka it builds
//   {
//     function_call: NodeVisitor<FunctionCall>,
//     ...
//   }
// AstNode['type'] is the union of all the type properties of all AST nodes.
// Extract pulls out the type from the AstNode union where the "type"
// property matches the NodeType (like "function_call"). Pretty sweet!
export type NodeVisitors = {
  [NodeType in AstNode['type']]?: NodeVisitor<
    Extract<AstNode, { type: NodeType }>
  >;
} & { program?: NodeVisitor<Program> };

/**
 * Apply the visitor pattern to an AST that conforms to this compiler's spec
 */
export const visit = (ast: Program | AstNode, visitors: NodeVisitors) => {
  let stopped = false;

  const visitNode = (
    node: AstNode | Program,
    parent?: AstNode | Program,
    parentPath?: Path<any>,
    key?: string,
    index?: number
  ) => {
    // Handle case where stop happened at exit
    if (stopped) {
      return;
    }

    const visitor = visitors[node.type];
    const path = makePath(node, parent, parentPath, key, index);
    const parentNode = parent as any;

    if (visitor?.enter) {
      visitor.enter(path as any);
      if (path.removed) {
        if (!key || !parent) {
          throw new Error(
            `Asked to remove ${node} but no parent key was present in ${parent}`
          );
        }
        if (typeof index === 'number') {
          parentNode[key].splice(index, 1);
        } else {
          parentNode[key] = null;
        }
        return path;
      }
      if (path.replaced) {
        if (!key || !parent) {
          throw new Error(
            `Asked to remove ${node} but no parent key was present in ${parent}`
          );
        }
        if (typeof index === 'number') {
          parentNode[key].splice(index, 1, path.replaced);
        } else {
          parentNode[key] = path.replaced;
        }
      }
      if (path.skipped) {
        return path;
      }
    }

    if (path.stopped) {
      stopped = true;
      return;
    }

    if (path.replaced) {
      const replacedNode = path.replaced as AstNode;
      visitNode(replacedNode, parent, parentPath, key, index);
    } else {
      Object.entries(node)
        .filter(([_, nodeValue]) => isTraversable(nodeValue))
        .forEach(([nodeKey, nodeValue]) => {
          if (Array.isArray(nodeValue)) {
            for (
              let i = 0, offset = 0;
              i - offset < nodeValue.length && !stopped;
              i++
            ) {
              const child = nodeValue[i - offset];
              const res = visitNode(child, node, path, nodeKey, i - offset);
              if (res?.removed) {
                offset += 1;
              }
            }
          } else {
            if (!stopped) {
              visitNode(nodeValue, node, path, nodeKey);
            }
          }
        });

      if (!stopped) {
        visitor?.exit?.(path as any);
      }
    }
  };

  visitNode(ast);
};
