/**
 * This file is written by hand, to map to the parser expression results in
 * parser/glsl-grammar.pegjs. It very, very likely contains errors. I put in
 * *AstNode* types where I was lazy or didn't know the core type.
 */

import { Scope } from '../parser/scope.js';

// The overall result of parsing, which incldues the AST and scopes
export interface Program {
  type: 'program';
  program: (PreprocessorNode | DeclarationStatementNode | FunctionNode)[];
  scopes: Scope[];
  wsStart?: string;
  wsEnd?: string;
}

// Optional source code location info, set by { includeLocation: true }
export type LocationInfo = { offset: number; line: number; column: number };

export type LocationObject = {
  start: LocationInfo;
  end: LocationInfo;
};

export interface BaseNode {
  location?: LocationObject;
}

export type Whitespace = string | string[];

// Types reused across nodes
export type TypeQualifiers = (
  | KeywordNode
  | SubroutineQualifierNode
  | LayoutQualifierNode
)[];
export type Semicolon = LiteralNode<';'>;
export type Comma = LiteralNode<','>;

// This is my best guess at what can be in an expression. It's probably wrong!
export type Expression =
  | LiteralNode
  | KeywordNode
  | IdentifierNode
  | TypeNameNode
  | ArraySpecifierNode
  | AssignmentNode
  | BinaryNode
  | BoolConstantNode
  | ConditionExpressionNode
  | DefaultCaseNode
  | DoubleConstantNode
  | FieldSelectionNode
  | FloatConstantNode
  | FullySpecifiedTypeNode
  | FunctionCallNode
  | GroupNode
  | InitializerListNode
  | IntConstantNode
  | PostfixNode
  | PreprocessorNode
  | QuantifiedIdentifierNode
  | QuantifierNode
  | SwitchCaseNode
  | TernaryNode
  | TypeSpecifierNode
  | UintConstantNode
  | UnaryNode;

export interface LiteralNode<Literal = string> extends BaseNode {
  type: 'literal';
  literal: Literal;
  whitespace: Whitespace;
}

export interface KeywordNode<Token = string> extends BaseNode {
  type: 'keyword';
  token: Token;
  whitespace: Whitespace;
}

export interface IdentifierNode extends BaseNode {
  type: 'identifier';
  identifier: string;
  whitespace: Whitespace;
}

export interface TypeNameNode extends BaseNode {
  type: 'type_name';
  identifier: string;
  whitespace: Whitespace;
}

export interface ArraySpecifierNode extends BaseNode {
  type: 'array_specifier';
  lb: LiteralNode<'['>;
  expression: Expression;
  rb: LiteralNode<']'>;
}

export interface AssignmentNode extends BaseNode {
  type: 'assignment';
  left: AstNode;
  operator: LiteralNode<
    '=' | '*=' | '/=' | '%=' | '+=' | '-=' | '<<="' | '>>=' | '&=' | '^=' | '|='
  >;
  right: AstNode;
}

export interface BinaryNode extends BaseNode {
  type: 'binary';
  operator: LiteralNode;
  left: AstNode;
  right: AstNode;
}

export interface BoolConstantNode extends BaseNode {
  type: 'bool_constant';
  token: string;
  whitespace: Whitespace;
}

export interface BreakStatementNode extends BaseNode {
  type: 'break_statement';
  break: KeywordNode<'break'>;
  semi: Semicolon;
}

export interface CompoundStatementNode extends BaseNode {
  type: 'compound_statement';
  lb: LiteralNode<'['>;
  statements: AstNode[];
  rb: LiteralNode<']'>;
}

export interface ConditionExpressionNode extends BaseNode {
  type: 'condition_expression';
  specified_type: FullySpecifiedTypeNode;
  identifier: IdentifierNode;
  operator: LiteralNode;
  initializer: InitializerListNode;
}

export interface ContinueStatementNode extends BaseNode {
  type: 'continue_statement';
  continue: KeywordNode<'continue'>;
  semi: Semicolon;
}

export interface DeclarationStatementNode extends BaseNode {
  type: 'declaration_statement';
  declaration:
    | PrecisionNode
    | InterfaceDeclaratorNode
    | QualifierDeclaratorNode
    | DeclaratorListNode
    | FunctionHeaderNode;
  semi: Semicolon;
}

export interface DeclarationNode extends BaseNode {
  type: 'declaration';
  identifier: IdentifierNode;
  quantifier: ArraySpecifierNode[];
  equal?: LiteralNode<'='>;
  initializer?: AstNode;
}

export interface DeclaratorListNode extends BaseNode {
  type: 'declarator_list';
  specified_type: FullySpecifiedTypeNode;
  declarations: DeclarationNode[];
  commas: Comma[];
}

export interface DefaultCaseNode extends BaseNode {
  type: 'default_case';
  statements: [];
  default: KeywordNode<'default'>;
  colon: LiteralNode<':'>;
}

export interface DiscardStatementNode extends BaseNode {
  type: 'discard_statement';
  discard: KeywordNode<'discard'>;
  semi: Semicolon;
}

export interface DoStatementNode extends BaseNode {
  type: 'do_statement';
  do: KeywordNode<'do'>;
  body: AstNode;
  while: KeywordNode<'while'>;
  lp: LiteralNode<'('>;
  expression: Expression;
  rp: LiteralNode<')'>;
  semi: Semicolon;
}

export interface DoubleConstantNode extends BaseNode {
  type: 'double_constant';
  token: string;
  whitespace: Whitespace;
}

export interface ExpressionStatementNode extends BaseNode {
  type: 'expression_statement';
  expression: Expression;
  semi: Semicolon;
}

export interface FieldSelectionNode extends BaseNode {
  type: 'field_selection';
  dot: LiteralNode;
  selection: LiteralNode;
}

export interface FloatConstantNode extends BaseNode {
  type: 'float_constant';
  token: string;
  whitespace: Whitespace;
}

export type SimpleStatement =
  | ContinueStatementNode
  | BreakStatementNode
  | ReturnStatementNode
  | DiscardStatementNode
  | DeclarationStatementNode
  | ExpressionStatementNode
  | IfStatementNode
  | SwitchStatementNode
  | WhileStatementNode;

export interface ForStatementNode extends BaseNode {
  type: 'for_statement';
  for: KeywordNode<'for'>;
  body: CompoundStatementNode | SimpleStatement;
  lp: LiteralNode<'('>;
  init: AstNode;
  initSemi: Semicolon;
  condition: ConditionExpressionNode;
  conditionSemi: Semicolon;
  operation: AstNode;
  rp: LiteralNode<')'>;
}

export interface FullySpecifiedTypeNode extends BaseNode {
  type: 'fully_specified_type';
  qualifiers?: TypeQualifiers;
  specifier: TypeSpecifierNode;
}

export interface FunctionNode extends BaseNode {
  type: 'function';
  prototype: FunctionPrototypeNode;
  body: CompoundStatementNode;
}

export interface FunctionCallNode extends BaseNode {
  type: 'function_call';
  identifier: IdentifierNode | TypeSpecifierNode | PostfixNode;
  lp: LiteralNode<'('>;
  args: AstNode[];
  rp: LiteralNode<')'>;
}

export interface FunctionHeaderNode extends BaseNode {
  type: 'function_header';
  returnType: FullySpecifiedTypeNode;
  name: IdentifierNode;
  lp: LiteralNode<'('>;
}

export interface FunctionPrototypeNode extends BaseNode {
  type: 'function_prototype';
  header: FunctionHeaderNode;
  parameters: ParameterDeclarationNode[];
  commas: Comma[];
  rp: LiteralNode<')'>;
}

export interface GroupNode extends BaseNode {
  type: 'group';
  lp: LiteralNode<'('>;
  expression: Expression;
  rp: LiteralNode<')'>;
}

export interface IfStatementNode extends BaseNode {
  type: 'if_statement';
  if: KeywordNode<'if'>;
  body: AstNode;
  lp: LiteralNode<'('>;
  condition: AstNode;
  rp: LiteralNode<')'>;
  else: AstNode[];
}

export interface InitializerListNode extends BaseNode {
  type: 'initializer_list';
  lb: LiteralNode<'['>;
  initializers: AstNode[];
  commas: Comma[];
  rb: LiteralNode<']'>;
}

export interface IntConstantNode extends BaseNode {
  type: 'int_constant';
  token: string;
  whitespace: Whitespace;
}

export interface InterfaceDeclaratorNode extends BaseNode {
  type: 'interface_declarator';
  qualifiers: TypeQualifiers;
  interface_type: IdentifierNode;
  lp: LiteralNode<'('>;
  declarations: AstNode;
  rp: LiteralNode<')'>;
  identifier?: QuantifiedIdentifierNode;
}

export interface LayoutQualifierIdNode extends BaseNode {
  type: 'layout_qualifier_id';
  identifier: IdentifierNode;
  operator: LiteralNode;
  expression: Expression;
}

export interface LayoutQualifierNode extends BaseNode {
  type: 'layout_qualifier';
  layout: KeywordNode<'layout'>;
  lp: LiteralNode<'('>;
  qualifiers: LayoutQualifierIdNode[];
  commas: Comma[];
  rp: LiteralNode<')'>;
}

export interface ParameterDeclarationNode extends BaseNode {
  type: 'parameter_declaration';
  qualifier: KeywordNode[];
  specifier: TypeSpecifierNode;
  identifier: IdentifierNode;
  quantifier: ArraySpecifierNode[];
}

export interface PostfixNode extends BaseNode {
  type: 'postfix';
  expression: Expression;
  postfix: AstNode;
}

export interface PrecisionNode extends BaseNode {
  type: 'precision';
  prefix: KeywordNode<'prefix'>;
  qualifier: KeywordNode<'highp' | 'mediump' | 'lowp'>;
  specifier: TypeSpecifierNode;
}

export interface PreprocessorNode extends BaseNode {
  type: 'preprocessor';
  line: string;
  _: string | string[];
}

export interface QualifierDeclaratorNode extends BaseNode {
  type: 'qualifier_declarator';
  qualifiers: TypeQualifiers;
  declarations: IdentifierNode[];
  commas: Comma[];
}

export interface QuantifiedIdentifierNode extends BaseNode {
  type: 'quantified_identifier';
  identifier: IdentifierNode;
  quantifier: ArraySpecifierNode[];
}

export interface QuantifierNode extends BaseNode {
  type: 'quantifier';
  lb: LiteralNode<'['>;
  expression: Expression;
  rb: LiteralNode<']'>;
}

export interface ReturnStatementNode extends BaseNode {
  type: 'return_statement';
  return: KeywordNode<'return'>;
  expression: Expression;
  semi: Semicolon;
}

export interface StructNode extends BaseNode {
  type: 'struct';
  lb: LiteralNode<'['>;
  declarations: StructDeclarationNode[];
  rb: LiteralNode<']'>;
  struct: KeywordNode<'struct'>;
  typeName: TypeNameNode;
}

export interface StructDeclarationNode extends BaseNode {
  type: 'struct_declaration';
  declaration: StructDeclaratorNode;
  semi: Semicolon;
}

export interface StructDeclaratorNode extends BaseNode {
  type: 'struct_declarator';
  specified_type: FullySpecifiedTypeNode;
  declarations: QuantifiedIdentifierNode[];
  commas: Comma[];
}

export interface SubroutineQualifierNode extends BaseNode {
  type: 'subroutine_qualifier';
  subroutine: KeywordNode<'subroutine'>;
  lp: LiteralNode<'('>;
  type_names: TypeNameNode[];
  commas: Comma[];
  rp: LiteralNode<')'>;
}

export interface SwitchCaseNode extends BaseNode {
  type: 'switch_case';
  statements: [];
  case: KeywordNode<'case'>;
  test: AstNode;
  colon: LiteralNode<':'>;
}

export interface SwitchStatementNode extends BaseNode {
  type: 'switch_statement';
  switch: KeywordNode<'switch'>;
  lp: LiteralNode<'('>;
  expression: Expression;
  rp: LiteralNode<')'>;
  lb: LiteralNode<'['>;
  cases: AstNode[];
  rb: LiteralNode<']'>;
}

export interface TernaryNode extends BaseNode {
  type: 'ternary';
  expression: Expression;
  question: LiteralNode<'?'>;
  left: AstNode;
  right: AstNode;
  colon: LiteralNode<':'>;
}

export interface TypeSpecifierNode extends BaseNode {
  type: 'type_specifier';
  specifier: KeywordNode | IdentifierNode | StructNode | TypeNameNode;
  quantifier: ArraySpecifierNode[] | null;
}

export interface UintConstantNode extends BaseNode {
  type: 'uint_constant';
  token: string;
  whitespace: Whitespace;
}

export interface UnaryNode extends BaseNode {
  type: 'unary';
  operator: LiteralNode<'++' | '--' | '+' | '-' | '!' | '~'>;
  expression: Expression;
}

export interface WhileStatementNode extends BaseNode {
  type: 'while_statement';
  while: KeywordNode<'while'>;
  lp: LiteralNode<'('>;
  condition: AstNode;
  rp: LiteralNode<')'>;
  body: AstNode;
}

export type AstNode =
  | LiteralNode
  | KeywordNode
  | IdentifierNode
  | TypeNameNode
  | ArraySpecifierNode
  | AssignmentNode
  | BinaryNode
  | BoolConstantNode
  | BreakStatementNode
  | CompoundStatementNode
  | ConditionExpressionNode
  | ContinueStatementNode
  | DeclarationStatementNode
  | DeclarationNode
  | DeclaratorListNode
  | DefaultCaseNode
  | DiscardStatementNode
  | DoStatementNode
  | DoubleConstantNode
  | ExpressionStatementNode
  | FieldSelectionNode
  | FloatConstantNode
  | ForStatementNode
  | FullySpecifiedTypeNode
  | FunctionNode
  | FunctionCallNode
  | FunctionHeaderNode
  | FunctionPrototypeNode
  | GroupNode
  | IfStatementNode
  | InitializerListNode
  | IntConstantNode
  | InterfaceDeclaratorNode
  | LayoutQualifierIdNode
  | LayoutQualifierNode
  | ParameterDeclarationNode
  | PostfixNode
  | PrecisionNode
  | PreprocessorNode
  | QualifierDeclaratorNode
  | QuantifiedIdentifierNode
  | QuantifierNode
  | ReturnStatementNode
  | StructNode
  | StructDeclarationNode
  | StructDeclaratorNode
  | SubroutineQualifierNode
  | SwitchCaseNode
  | SwitchStatementNode
  | TernaryNode
  | TypeSpecifierNode
  | UintConstantNode
  | UnaryNode
  | WhileStatementNode;
