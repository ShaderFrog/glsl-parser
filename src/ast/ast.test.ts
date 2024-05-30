import {
  AstNode,
  BinaryNode,
  IdentifierNode,
  LiteralNode,
} from './ast-types.js';
import { visit } from './visit.js';

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

test('visit with replace', () => {
  const visitLog: Array<['enter' | 'exit', AstNode['type']]> = [];

  const tree: BinaryNode = {
    type: 'binary',
    operator: literal('-'),
    // mock location data
    location: {
      start: { line: 0, column: 0, offset: 0 },
      end: { line: 0, column: 0, offset: 0 },
    },
    left: identifier('foo'),
    right: {
      type: 'group',
      lp: literal('('),
      rp: literal(')'),
      expression: identifier('bar'),
    },
  };

  let sawBar = false;
  let sawBaz = false;

  visit(tree, {
    group: {
      enter: (path) => {
        visitLog.push(['enter', path.node.type]);
        path.replaceWith(identifier('baz'));
      },
      exit: (path) => {
        visitLog.push(['exit', path.node.type]);
      },
    },
    binary: {
      enter: (path) => {
        visitLog.push(['enter', path.node.type]);
      },
      exit: (path) => {
        visitLog.push(['exit', path.node.type]);
      },
    },
    literal: {
      enter: (path) => {
        visitLog.push(['enter', path.node.type]);
      },
      exit: (path) => {
        visitLog.push(['exit', path.node.type]);
      },
    },
    identifier: {
      enter: (path) => {
        visitLog.push(['enter', path.node.type]);
        if (path.node.identifier === 'baz') {
          sawBaz = true;
        }
        if (path.node.identifier === 'bar') {
          sawBar = true;
        }
      },
      exit: (path) => {
        visitLog.push(['exit', path.node.type]);
      },
    },
  });

  expect(visitLog).toEqual([
    ['enter', 'binary'],

    // tree.operator
    ['enter', 'literal'],
    ['exit', 'literal'],

    // tree.left
    ['enter', 'identifier'],
    ['exit', 'identifier'],

    // tree.right
    ['enter', 'group'],
    // No exit because it got replaced

    // Replaced tree.right
    ['enter', 'identifier'],
    ['exit', 'identifier'],

    ['exit', 'binary'],
  ]);

  // The children of the node that got replaced should not be visited
  expect(sawBar).toBeFalsy();

  // The children of the new replacement node should be visited
  expect(sawBaz).toBeTruthy();
})
