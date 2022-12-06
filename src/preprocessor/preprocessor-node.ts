export interface IPreprocessorNode {
  // Only used on preprocessor nodes
  wsStart?: string;
  wsEnd?: string;
}

export interface PreprocessorBinaryNode extends IPreprocessorNode {
  type: 'binary';
  left: PreprocessorAstNode;
  right: PreprocessorAstNode;
  operator: PreprocessorLiteralNode;
}

export type PreprocessorIfPart =
  | PreprocessorIfNode
  | PreprocessorIfDefNode
  | PreprocessorIfndefNode;

export interface PreprocessorConditionalNode extends IPreprocessorNode {
  type: 'conditional';
  ifPart: PreprocessorIfPart;
  elseIfParts: PreprocessorElseIfNode[];
  elsePart: PreprocessorElseNode;
  endif: PreprocessorLiteralNode;
  wsEnd: string;
}

export interface PreprocessorDefineArgumentsNode extends IPreprocessorNode {
  type: 'define_arguments';
  define: string;
  identifier: PreprocessorIdentifierNode;
  lp: PreprocessorLiteralNode;
  args: PreprocessorLiteralNode[];
  rp: PreprocessorLiteralNode;
  body: string;
}

export interface PreprocessorDefineNode extends IPreprocessorNode {
  type: 'define';
  define: string;
  identifier: PreprocessorIdentifierNode;
  body: string;
}

export interface PreprocessorElseNode extends IPreprocessorNode {
  type: 'else';
  token: string;
  wsEnd: string;
  body: PreprocessorAstNode;
}

export interface PreprocessorElseIfNode extends IPreprocessorNode {
  type: 'elseif';
  token: string;
  expression: PreprocessorAstNode;
  wsEnd: string;
  body: PreprocessorAstNode;
}

export interface PreprocessorErrorNode extends IPreprocessorNode {
  type: 'error';
  error: string;
  message: string;
}

export interface PreprocessorExtensionNode extends IPreprocessorNode {
  type: 'extension';
  extension: string;
  name: string;
  colon: string;
  behavior: string;
}

export interface PreprocessorGroupNode extends IPreprocessorNode {
  type: 'group';
  lp: PreprocessorLiteralNode;
  expression: PreprocessorAstNode;
  rp: PreprocessorLiteralNode;
}

export interface PreprocessorIdentifierNode extends IPreprocessorNode {
  type: 'identifier';
  identifier: string;
  wsEnd: string;
}

export interface PreprocessorIfNode extends IPreprocessorNode {
  type: 'if';
  token: string;
  expression: PreprocessorAstNode;
  body: PreprocessorAstNode;
}

export interface PreprocessorIfDefNode extends IPreprocessorNode {
  type: 'ifdef';
  token: string;
  identifier: PreprocessorIdentifierNode;
  body: PreprocessorAstNode;
}

export interface PreprocessorIfndefNode extends IPreprocessorNode {
  type: 'ifndef';
  token: string;
  identifier: PreprocessorIdentifierNode;
  body: PreprocessorAstNode;
}

export interface PreprocessorIntConstantNode extends IPreprocessorNode {
  type: 'int_constant';
  token: string;
  wsEnd: string;
}

export interface PreprocessorLineNode extends IPreprocessorNode {
  type: 'line';
  line: string;
  value: string;
}

export interface PreprocessorLiteralNode extends IPreprocessorNode {
  type: 'literal';
  literal: string;
  wsStart: string;
  wsEnd: string;
}

export interface PreprocessorPragmaNode extends IPreprocessorNode {
  type: 'pragma';
  pragma: string;
  body: string;
}

export interface PreprocessorSegmentNode extends IPreprocessorNode {
  type: 'segment';
  blocks: PreprocessorAstNode[];
}

export interface PreprocessorTextNode extends IPreprocessorNode {
  type: 'text';
  text: string;
}

export interface PreprocessorUnaryDefinedNode extends IPreprocessorNode {
  type: 'unary_defined';
  operator: PreprocessorLiteralNode;
  lp: PreprocessorLiteralNode;
  identifier: PreprocessorIdentifierNode;
  rp: PreprocessorLiteralNode;
}

export interface PreprocessorUnaryNode extends IPreprocessorNode {
  type: 'unary';
  operator: PreprocessorLiteralNode;
  expression: PreprocessorAstNode;
}

export interface PreprocessorUndefNode extends IPreprocessorNode {
  type: 'undef';
  undef: string;
  identifier: PreprocessorIdentifierNode;
}

export interface PreprocessorVersionNode extends IPreprocessorNode {
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
