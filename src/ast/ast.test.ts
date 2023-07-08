import { AstNode, BinaryNode, IdentifierNode, LiteralNode } from './ast-types';
import { visit } from './visit';

const literal = <T>(literal: T): LiteralNode<T> => ({
  type: 'literal',
  literal,
  whitespace: '',
});
const identifier = (identifier: string): IdentifierNode => ({
  type: 'identifier',
  identifier,
  whitespace: '',
});

test('visit()', () => {
  const tree: BinaryNode = {
    type: 'binary',
    operator: literal('-'),
    // mock location data
    location: {
      start: { line: 0, column: 0, offset: 0 },
      end: { line: 0, column: 0, offset: 0 },
    },
    left: {
      type: 'binary',
      operator: literal('+'),
      left: identifier('foo'),
      right: identifier('bar'),
    },
    right: {
      type: 'group',
      lp: literal('('),
      rp: literal(')'),
      expression: identifier('baz'),
    },
  };

  let grandparent: AstNode | undefined;
  let parent: AstNode | undefined;
  let unfound;

  visit(tree, {
    identifier: {
      enter: (path) => {
        const { node } = path;
        if (node.identifier === 'foo') {
          grandparent = path.findParent(
            ({ node }) => node.operator.literal === '-'
          )?.node;
          parent = path.findParent(({ node }) => node.operator.literal === '+')
            ?.node;
          unfound = path.findParent(({ node }) => node.operator.literal === '*')
            ?.node;
        }
      },
    },
  });

  expect(grandparent).not.toBeNull();
  expect(grandparent?.type).toBe('binary');
  expect(parent).not.toBeNull();
  expect(parent?.type).toBe('binary');
  expect(unfound).not.toBeDefined();
});
