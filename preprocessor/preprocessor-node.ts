import { AstNode } from '../core/node';

export interface PreprocessorBinaryNode extends AstNode {
  type: 'binary';
  left: PreprocessorAstNode;
  right: PreprocessorAstNode;
  operator: PreprocessorLiteralNode;
}

export type PreprocessorIfPart =
  | PreprocessorIfNode
  | PreprocessorIfDefNode
  | PreprocessorIfndefNode;

export interface PreprocessorConditionalNode extends AstNode {
  type: 'conditional';
  ifPart: PreprocessorIfPart;
  elseIfParts: PreprocessorElseIfNode[];
  elsePart: PreprocessorElseNode;
  endif: PreprocessorLiteralNode;
  wsEnd: string;
}

export interface PreprocessorDefineArgumentsNode extends AstNode {
  type: 'define_arguments';
  define: string;
  identifier: PreprocessorIdentifierNode;
  lp: PreprocessorLiteralNode;
  args: PreprocessorLiteralNode[];
  rp: PreprocessorLiteralNode;
  body: string;
}

export interface PreprocessorDefineNode extends AstNode {
  type: 'define';
  define: string;
  identifier: PreprocessorIdentifierNode;
  body: string;
}

export interface PreprocessorElseNode extends AstNode {
  type: 'else';
  token: string;
  wsEnd: string;
  body: PreprocessorAstNode;
}

export interface PreprocessorElseIfNode extends AstNode {
  type: 'elseif';
  token: string;
  expression: PreprocessorAstNode;
  wsEnd: string;
  body: PreprocessorAstNode;
}

export interface PreprocessorErrorNode extends AstNode {
  type: 'error';
  error: string;
  message: string;
}

export interface PreprocessorExtensionNode extends AstNode {
  type: 'extension';
  extension: string;
  name: string;
  colon: string;
  behavior: string;
}

export interface PreprocessorGroupNode extends AstNode {
  type: 'group';
  lp: PreprocessorLiteralNode;
  expression: PreprocessorAstNode;
  rp: PreprocessorLiteralNode;
}

export interface PreprocessorIdentifierNode extends AstNode {
  type: 'identifier';
  identifier: string;
  wsEnd: string;
}

export interface PreprocessorIfNode extends AstNode {
  type: 'if';
  token: string;
  expression: PreprocessorAstNode;
  body: PreprocessorAstNode;
}

export interface PreprocessorIfDefNode extends AstNode {
  type: 'ifdef';
  token: string;
  identifier: PreprocessorIdentifierNode;
  body: PreprocessorAstNode;
}

export interface PreprocessorIfndefNode extends AstNode {
  type: 'ifndef';
  token: string;
  identifier: PreprocessorIdentifierNode;
  body: PreprocessorAstNode;
}

export interface PreprocessorIntConstantNode extends AstNode {
  type: 'int_constant';
  token: string;
  wsEnd: string;
}

export interface PreprocessorLineNode extends AstNode {
  type: 'line';
  line: string;
  value: string;
}

export interface PreprocessorLiteralNode extends AstNode {
  type: 'literal';
  literal: string;
  wsStart: string;
  wsEnd: string;
}

export interface PreprocessorPragmaNode extends AstNode {
  type: 'pragma';
  pragma: string;
  body: string;
}

export interface PreprocessorSegmentNode extends AstNode {
  type: 'segment';
  blocks: PreprocessorAstNode[];
}

export interface PreprocessorTextNode extends AstNode {
  type: 'text';
  text: string;
}

export interface PreprocessorUnaryDefinedNode extends AstNode {
  type: 'unary_defined';
  operator: PreprocessorLiteralNode;
  lp: PreprocessorLiteralNode;
  identifier: PreprocessorIdentifierNode;
  rp: PreprocessorLiteralNode;
}

export interface PreprocessorUnaryNode extends AstNode {
  type: 'unary';
  operator: PreprocessorLiteralNode;
  expression: PreprocessorAstNode;
}

export interface PreprocessorUndefNode extends AstNode {
  type: 'undef';
  undef: string;
  identifier: PreprocessorIdentifierNode;
}

export interface PreprocessorVersionNode extends AstNode {
  type: 'version';
  version: PreprocessorLiteralNode;
  value: string;
  profile: string;
}

export type PreprocessorAstNode =
  | PreprocessorBinaryNode
  | PreprocessorConditionalNode
  | PreprocessorDefineArgumentsNode
  | PreprocessorDefineNode
  | PreprocessorElseNode
  | PreprocessorElseIfNode
  | PreprocessorErrorNode
  | PreprocessorExtensionNode
  | PreprocessorGroupNode
  | PreprocessorIdentifierNode
  | PreprocessorIfNode
  | PreprocessorIfDefNode
  | PreprocessorIfndefNode
  | PreprocessorIntConstantNode
  | PreprocessorLineNode
  | PreprocessorLiteralNode
  | PreprocessorPragmaNode
  | PreprocessorSegmentNode
  | PreprocessorTextNode
  | PreprocessorUnaryDefinedNode
  | PreprocessorUnaryNode
  | PreprocessorUndefNode
  | PreprocessorVersionNode;
