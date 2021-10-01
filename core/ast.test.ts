const util = require('util');
const { visit } = require('./ast.ts');

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

  let found1;
  let found2;
  let unfound;

  visit(tree, {
    ident: {
      enter: (path) => {
        const { node } = path;
        if (node.identifier === 'b') {
          found1 = path.findParent(({ node }) => node.type === 'root');
          found2 = path.findParent(({ node }) => node.type === 'group');
        }
      },
    },
  });

  expect(found1).not.toBeNull();
  expect(found1.node.type).toBe('root');
  expect(found2).not.toBeNull();
  expect(found2.node.type).toBe('group');
  expect(unfound).not.toBeDefined();
});
