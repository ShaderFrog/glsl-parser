/**
 * This file is written by hand, to map to the parser expression results in
 * parser/glsl-grammar.pegjs. It very, very likely contains errors. I put in
 * *AstNode* types where I was lazy or didn't know the core type.
 */

import { Scope } from '../parser/scope';

export interface Program {
  type: 'program';
  program: AstNode[];
  scopes: Scope[];
  wsStart?: string;
  wsEnd?: string;
}

export type LocationInfo = { offset: number; line: number; column: number };

export type LocationObject = {
  start: LocationInfo;
  end: LocationInfo;
};

export interface BaseNode {
  location?: LocationObject;
}

type Whitespace = string | string[];

export interface LiteralNode extends BaseNode {
  type: 'literal';
  literal: string;
  whitespace: Whitespace;
}

export interface KeywordNode extends BaseNode {
  type: 'keyword';
  token: string;
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
  lb: LiteralNode;
  expression: AstNode;
  rb: LiteralNode;
}

export interface AssignmentNode extends BaseNode {
  type: 'assignment';
  left: AstNode;
  operator: LiteralNode;
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
  break: KeywordNode;
  semi: LiteralNode;
}

export interface CompoundStatementNode extends BaseNode {
  type: 'compound_statement';
  lb: LiteralNode;
  statements: AstNode[];
  rb: LiteralNode;
}

export interface ConditionExpressionNode extends BaseNode {
  type: 'condition_expression';
  specified_type: AstNode;
  identifier: IdentifierNode;
  operator: LiteralNode;
  initializer: AstNode;
}

export interface ContinueStatementNode extends BaseNode {
  type: 'continue_statement';
  continue: KeywordNode;
  semi: LiteralNode;
}

export interface DeclarationStatementNode extends BaseNode {
  type: 'declaration_statement';
  declaration: AstNode;
  semi: LiteralNode;
}

export interface DeclarationNode extends BaseNode {
  type: 'declaration';
  identifier: IdentifierNode;
  quantifier: ArraySpecifierNode[];
  operator: LiteralNode;
  initializer: AstNode;
}

export interface DeclaratorListNode extends BaseNode {
  type: 'declarator_list';
  specified_type: AstNode;
  declarations: AstNode[];
  commas: LiteralNode[];
}

export interface DefaultCaseNode extends BaseNode {
  type: 'default_case';
  statements: [];
  default: AstNode;
  colon: LiteralNode;
}

export interface DiscardStatementNode extends BaseNode {
  type: 'discard_statement';
  discard: KeywordNode;
  semi: LiteralNode;
}

export interface DoStatementNode extends BaseNode {
  type: 'do_statement';
  do: KeywordNode;
  body: AstNode;
  while: KeywordNode;
  lp: LiteralNode;
  expression: AstNode;
  rp: LiteralNode;
  semi: LiteralNode;
}

export interface DoubleConstantNode extends BaseNode {
  type: 'double_constant';
  token: string;
  whitespace: Whitespace;
}

export interface ExpressionStatementNode extends BaseNode {
  type: 'expression_statement';
  expression: AstNode;
  semi: LiteralNode;
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

type SimpleStatement =
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
  for: KeywordNode;
  body: CompoundStatementNode | SimpleStatement;
  lp: LiteralNode;
  init: AstNode;
  initSemi: LiteralNode;
  condition: ConditionExpressionNode;
  conditionSemi: LiteralNode;
  operation: AstNode;
  rp: LiteralNode;
}

export interface FullySpecifiedTypeNode extends BaseNode {
  type: 'fully_specified_type';
  qualifiers: AstNode[];
  specifier: TypeSpecifierNode;
}

export interface FunctionNode extends BaseNode {
  type: 'function';
  prototype: FunctionPrototypeNode;
  body: CompoundStatementNode;
}

export interface FunctionCallNode extends BaseNode {
  type: 'function_call';
  identifier: AstNode;
  lp: LiteralNode;
  args: AstNode[];
  rp: LiteralNode;
}

export interface FunctionHeaderNode extends BaseNode {
  type: 'function_header';
  returnType: FullySpecifiedTypeNode;
  name: IdentifierNode;
  lp: LiteralNode;
}

export interface FunctionPrototypeNode extends BaseNode {
  type: 'function_prototype';
  header: FunctionHeaderNode;
  parameters: ParameterDeclarationNode[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface GroupNode extends BaseNode {
  type: 'group';
  lp: LiteralNode;
  expression: AstNode;
  rp: LiteralNode;
}

export interface IfStatementNode extends BaseNode {
  type: 'if_statement';
  if: KeywordNode;
  body: AstNode;
  lp: LiteralNode;
  condition: AstNode;
  rp: LiteralNode;
  else: AstNode[];
}

export interface InitializerListNode extends BaseNode {
  type: 'initializer_list';
  lb: LiteralNode;
  initializers: AstNode[];
  commas: LiteralNode[];
  rb: LiteralNode;
}

export interface IntConstantNode extends BaseNode {
  type: 'int_constant';
  token: string;
  whitespace: Whitespace;
}

export interface InterfaceDeclaratorNode extends BaseNode {
  type: 'interface_declarator';
  qualifiers: AstNode;
  interface_type: AstNode;
  lp: LiteralNode;
  declarations: AstNode;
  rp: LiteralNode;
  identifier?: QuantifiedIdentifierNode;
}

export interface LayoutQualifierIdNode extends BaseNode {
  type: 'layout_qualifier_id';
  identifier: IdentifierNode;
  operator: LiteralNode;
  expression: AstNode;
}

export interface LayoutQualifierNode extends BaseNode {
  type: 'layout_qualifier';
  layout: KeywordNode;
  lp: LiteralNode;
  qualifiers: AstNode[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface ParameterDeclarationNode extends BaseNode {
  type: 'parameter_declaration';
  qualifier: AstNode[];
  specifier: TypeSpecifierNode;
  identifier: IdentifierNode;
  quantifier: ArraySpecifierNode[];
}

export interface PostfixNode extends BaseNode {
  type: 'postfix';
  expression: AstNode;
  postfix: AstNode;
}

export interface PrecisionNode extends BaseNode {
  type: 'precision';
  prefix: KeywordNode;
  qualifier: KeywordNode;
  specifier: TypeSpecifierNode;
}

export interface PreprocessorNode extends BaseNode {
  type: 'preprocessor';
  line: string;
  _: string | string[];
}

export interface QualifierDeclaratorNode extends BaseNode {
  type: 'qualifier_declarator';
  qualifiers: AstNode[];
  declarations: IdentifierNode[];
  commas: LiteralNode[];
}

export interface QuantifiedIdentifierNode extends BaseNode {
  type: 'quantified_identifier';
  identifier: IdentifierNode;
  quantifier: ArraySpecifierNode[];
}

export interface QuantifierNode extends BaseNode {
  type: 'quantifier';
  lb: LiteralNode;
  expression: AstNode;
  rb: LiteralNode;
}

export interface ReturnStatementNode extends BaseNode {
  type: 'return_statement';
  return: KeywordNode;
  expression: AstNode;
  semi: LiteralNode;
}

export interface StructNode extends BaseNode {
  type: 'struct';
  lb: LiteralNode;
  declarations: AstNode[];
  rb: LiteralNode;
  struct: KeywordNode;
  typeName: TypeNameNode;
}

export interface StructDeclarationNode extends BaseNode {
  type: 'struct_declaration';
  declaration: StructDeclaratorNode;
  semi: LiteralNode;
}

export interface StructDeclaratorNode extends BaseNode {
  type: 'struct_declarator';
  specified_type: FullySpecifiedTypeNode;
  declarations: QuantifiedIdentifierNode[];
  commas: LiteralNode[];
}

export interface SubroutineQualifierNode extends BaseNode {
  type: 'subroutine_qualifier';
  subroutine: KeywordNode;
  lp: LiteralNode;
  type_names: TypeNameNode[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface SwitchCaseNode extends BaseNode {
  type: 'switch_case';
  statements: [];
  case: AstNode;
  test: AstNode;
  colon: LiteralNode;
}

export interface SwitchStatementNode extends BaseNode {
  type: 'switch_statement';
  switch: KeywordNode;
  lp: LiteralNode;
  expression: AstNode;
  rp: LiteralNode;
  lb: LiteralNode;
  cases: AstNode[];
  rb: LiteralNode;
}

export interface TernaryNode extends BaseNode {
  type: 'ternary';
  expression: AstNode;
  question: LiteralNode;
  left: AstNode;
  right: AstNode;
  colon: LiteralNode;
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
  operator: LiteralNode;
  expression: AstNode;
}

export interface WhileStatementNode extends BaseNode {
  type: 'while_statement';
  while: KeywordNode;
  lp: LiteralNode;
  condition: AstNode;
  rp: LiteralNode;
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
