import util from 'util';
import { visit, AstNode } from './ast';

test('schlorf', () => {
  const tree = {
    type: 'root',
    left: {
      type: 'ident',
      identifier: 'a',
    },
    right: {
      type: 'group',
      expression: {
        type: 'ident',
        identifier: 'b',
      },
    },
  };

  let found1: AstNode | undefined;
  let found2: AstNode | undefined;
  let unfound;

  visit(tree, {
    ident: {
      enter: (path) => {
        const { node } = path;
        if (node.identifier === 'b') {
          found1 = path.findParent(({ node }) => node.type === 'root')?.node;
          found2 = path.findParent(({ node }) => node.type === 'group')?.node;
        }
      },
    },
  });

  expect(found1).not.toBeNull();
  // @ts-ignore
  expect(found1.node.type).toBe('root');
  expect(found2).not.toBeNull();
  // @ts-ignore
  expect(found2.node.type).toBe('group');
  expect(unfound).not.toBeDefined();
});
