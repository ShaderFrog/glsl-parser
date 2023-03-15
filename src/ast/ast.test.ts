import { visit } from '.';
import { AstNode, BinaryNode } from './node';

test('visit()', () => {
  const tree: BinaryNode = {
    type: 'binary',
    operator: '-',
    // mock location data
    location: {
      start: { line: 0, column: 0, offset: 0 },
      end: { line: 0, column: 0, offset: 0 },
    },
    left: {
      type: 'binary',
      operator: '+',
      left: {
        type: 'identifier',
        identifier: 'foo',
      },
      right: {
        type: 'identifier',
        identifier: 'bar',
      },
    },
    right: {
      type: 'group',
      expression: {
        type: 'identifier',
        identifier: 'baz',
      },
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
          grandparent = path.findParent(({ node }) => node.operator === '-')
            ?.node;
          parent = path.findParent(({ node }) => node.operator === '+')?.node;
          unfound = path.findParent(({ node }) => node.operator === '*')?.node;
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
