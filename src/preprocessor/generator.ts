import { makeGenerator, NodeGenerators } from '../ast/index.js';
import { PreprocessorProgram } from './preprocessor.js';
import { PreprocessorAstNode } from './preprocessor-node.js';

type NodeGenerator<NodeType> = (node: NodeType) => string;

type NodePreprocessorGenerators = {
  [NodeType in PreprocessorAstNode['type']]: NodeGenerator<
    Extract<PreprocessorAstNode, { type: NodeType }>
  >;
} & { program?: NodeGenerator<PreprocessorProgram> };

type Generator = (
  ast:
    | PreprocessorProgram
    | PreprocessorAstNode
    | PreprocessorAstNode[]
    | string
    | string[]
    | undefined
    | null
) => string;

/**
 * Stringify an AST
 */
// @ts-ignore
const makeGeneratorPreprocessor = makeGenerator as (
  generators: NodePreprocessorGenerators
) => Generator;

const generators: NodePreprocessorGenerators = {
  program: (node) => generate(node.program) + generate(node.wsEnd),
  segment: (node) => generate(node.blocks),
  text: (node) => generate(node.text),
  literal: (node) =>
    generate(node.wsStart) + generate(node.literal) + generate(node.wsEnd),
  identifier: (node) => generate(node.identifier) + generate(node.wsEnd),

  binary: (node) =>
    generate(node.left) + generate(node.operator) + generate(node.right),
  group: (node) =>
    generate(node.lp) + generate(node.expression) + generate(node.rp),
  unary: (node) => generate(node.operator) + generate(node.expression),
  unary_defined: (node) =>
    generate(node.operator) +
    generate(node.lp) +
    generate(node.identifier) +
    generate(node.rp),
  int_constant: (node) => generate(node.token) + generate(node.wsEnd),

  elseif: (node) =>
    generate(node.token) +
    generate(node.expression) +
    generate(node.wsEnd) +
    generate(node.body),
  if: (node) =>
    generate(node.token) +
    generate(node.expression) +
    generate(node.wsEnd) +
    generate(node.body),
  ifdef: (node) =>
    generate(node.token) + generate(node.identifier) + generate(node.wsEnd) + generate(node.body),
  ifndef: (node) =>
    generate(node.token) + generate(node.identifier) + generate(node.wsEnd) + generate(node.body),
  else: (node) =>
    generate(node.token) + generate(node.wsEnd) + generate(node.body),
  error: (node) =>
    generate(node.error) + generate(node.message) + generate(node.wsEnd),

  undef: (node) =>
    generate(node.undef) + generate(node.identifier) + generate(node.wsEnd),
  define: (node) =>
    generate(node.wsStart) +
    generate(node.define) +
    generate(node.identifier) +
    generate(node.body) +
    generate(node.wsEnd),
  define_arguments: (node) =>
    generate(node.wsStart) +
    generate(node.define) +
    generate(node.identifier) +
    generate(node.lp) +
    generate(node.args) +
    generate(node.rp) +
    generate(node.body) +
    generate(node.wsEnd),

  conditional: (node) =>
    generate(node.wsStart) +
    generate(node.ifPart) +
    // generate(node.body) +
    generate(node.elseIfParts) +
    generate(node.elsePart) +
    generate(node.endif) +
    generate(node.wsEnd),

  version: (node) =>
    generate(node.version) +
    generate(node.value) +
    generate(node.profile) +
    generate(node.wsEnd),
  pragma: (node) =>
    generate(node.pragma) + generate(node.body) + generate(node.wsEnd),
  line: (node) =>
    generate(node.line) + generate(node.value) + generate(node.wsEnd),
  extension: (node) =>
    generate(node.extension) +
    generate(node.name) +
    generate(node.colon) +
    generate(node.behavior) +
    generate(node.wsEnd),
};

const generate = makeGeneratorPreprocessor(generators);

export default generate;
