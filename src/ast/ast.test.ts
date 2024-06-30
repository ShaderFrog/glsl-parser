import {
  AstNode,
  BinaryNode,
  IdentifierNode,
  LiteralNode,
} from './ast-types.js';
import { Path, visit } from './visit.js';

const visitLogger = () => {
  const visitLog: Array<['enter' | 'exit', AstNode['type']]> = [];
  const track = (type: 'enter' | 'exit') => (path: Path<any>) =>
    visitLog.push([type, path.node.type]);
  const enter = track('enter');
  const exit = track('exit');
  return [visitLog, enter, exit, track] as const;
};

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
  const [visitLog, enter, exit] = visitLogger();

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
        enter(path);
        path.replaceWith(identifier('baz'));
      },
      exit,
    },
    binary: {
      enter,
      exit,
    },
    literal: {
      enter,
      exit,
    },
    identifier: {
      enter: (path) => {
        enter(path);
        if (path.node.identifier === 'baz') {
          sawBaz = true;
        }
        if (path.node.identifier === 'bar') {
          sawBar = true;
        }
      },
      exit,
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
});

test('visit stop()', () => {
  const [visitLog, enter, exit] = visitLogger();

  const tree: BinaryNode = {
    type: 'binary',
    operator: literal('-'),
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

  visit(tree, {
    group: {
      enter,
      exit,
    },
    binary: {
      enter,
      exit,
    },
    literal: {
      enter,
      exit,
    },
    identifier: {
      enter: (path) => {
        enter(path);
        if (path.node.identifier === 'foo') {
          path.stop();
        }
      },
      exit,
    },
  });

  expect(visitLog).toEqual([
    ['enter', 'binary'],

    // tree.operator
    ['enter', 'literal'],
    ['exit', 'literal'],

    // tree.left
    ['enter', 'binary'],
    ['enter', 'literal'],
    ['exit', 'literal'],

    // stop on first identifier!
    ['enter', 'identifier'],
  ]);
});
