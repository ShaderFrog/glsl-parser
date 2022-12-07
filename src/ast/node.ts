/**
 * This file is written by hand, to map to the parser expression results in
 * parser/glsl-grammar.pegjs. It very, very likely contains errors. I put in
 * *any* types where I was lazy or didn't know the core type.
 */

export interface LiteralNode {
  type: 'literal';
  literal: string;
  whitespace: string | string[];
}

export interface KeywordNode {
  type: 'keyword';
  token: string;
  whitespace: string | string[];
}

export interface IdentifierNode {
  type: 'identifier';
  identifier: string;
  whitespace: string;
}

export interface ArraySpecifierNode {
  type: 'array_specifier';
  lb: LiteralNode;
  expression: any;
  rb: LiteralNode;
}

export interface ArraySpecifiersNode {
  type: 'array_specifiers';
  specifiers: ArraySpecifierNode[];
}

export interface AssignmentNode {
  type: 'assignment';
  left: any;
  operator: LiteralNode;
  right: any;
}

export interface BinaryNode {
  type: 'binary';
  operator: any;
  left: any;
  right: any;
}

export interface BoolConstantNode {
  type: 'bool_constant';
  token: string;
  whitespace: string;
}

export interface BreakStatementNode {
  type: 'break_statement';
  break: KeywordNode;
  semi: LiteralNode;
}

export interface CompoundStatementNode {
  type: 'compound_statement';
  lb: LiteralNode;
  statements: any[];
  rb: LiteralNode;
}

export interface ConditionExpressionNode {
  type: 'condition_expression';
  specified_type: any;
  identifier: IdentifierNode;
  operator: LiteralNode;
  initializer: any;
}

export interface ContinueStatementNode {
  type: 'continue_statement';
  continue: KeywordNode;
  semi: LiteralNode;
}

export interface DeclarationStatementNode {
  type: 'declaration_statement';
  declaration: any;
  semi: LiteralNode;
}

export interface DeclarationNode {
  type: 'declaration';
  identifier: IdentifierNode;
  quantifier: any;
  operator: LiteralNode;
  initializer: any;
}

export interface DeclaratorListNode {
  type: 'declarator_list';
  specified_type: any;
  declarations: any[];
  commas: LiteralNode[];
}

export interface DefaultCaseNode {
  type: 'default_case';
  statements: [];
  default: any;
  colon: LiteralNode;
}

export interface DiscardStatementNode {
  type: 'discard_statement';
  discard: KeywordNode;
  semi: LiteralNode;
}

export interface DoStatementNode {
  type: 'do_statement';
  do: KeywordNode;
  body: any;
  while: KeywordNode;
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
  semi: LiteralNode;
}

export interface DoubleConstantNode {
  type: 'double_constant';
  token: string;
  whitespace: string;
}

export interface ExpressionStatementNode {
  type: 'expression_statement';
  expression: any;
  semi: LiteralNode;
}

export interface FieldSelectionNode {
  type: 'field_selection';
  dot: LiteralNode;
  selection: LiteralNode;
}

export interface FloatConstantNode {
  type: 'float_constant';
  token: string;
  whitespace: string;
}

export interface ForStatementNode {
  type: 'for_statement';
  for: KeywordNode;
  body: any;
  lp: LiteralNode;
  init: any;
  initSemi: LiteralNode;
  condition: any;
  conditionSemi: LiteralNode;
  operation: any;
  rp: LiteralNode;
}

export interface FullySpecifiedTypeNode {
  type: 'fully_specified_type';
  qualifiers: any[];
  specifier: TypeSpecifierNode;
}

export interface FunctionNode {
  type: 'function';
  prototype: FunctionPrototypeNode;
  body: CompoundStatementNode;
}

export interface FunctionCallNode {
  type: 'function_call';
  identifier: AstNode;
  lp: LiteralNode;
  args: any[];
  rp: LiteralNode;
}

export interface FunctionHeaderNode {
  type: 'function_header';
  returnType: FullySpecifiedTypeNode;
  name: IdentifierNode;
  lp: LiteralNode;
}

export interface FunctionPrototypeNode {
  type: 'function_prototype';
  header: FunctionHeaderNode;
  parameters: any[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface GroupNode {
  type: 'group';
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
}

export interface IfStatementNode {
  type: 'if_statement';
  if: KeywordNode;
  body: any;
  lp: LiteralNode;
  condition: any;
  rp: LiteralNode;
  else: any[];
}

export interface InitializerListNode {
  type: 'initializer_list';
  lb: LiteralNode;
  initializers: any[];
  commas: LiteralNode[];
  rb: LiteralNode;
}

export interface IntConstantNode {
  type: 'int_constant';
  token: string;
  whitespace: string;
}

export interface InterfaceDeclaratorNode {
  type: 'interface_declarator';
  qualifiers: any;
  interface_type: any;
  lp: LiteralNode;
  declarations: any;
  rp: LiteralNode;
  identifier?: QuantifiedIdentifierNode;
}

export interface LayoutQualifierIdNode {
  type: 'layout_qualifier_id';
  identifier: IdentifierNode;
  operator: LiteralNode;
  expression: any;
}

export interface LayoutQualifierNode {
  type: 'layout_qualifier';
  layout: KeywordNode;
  lp: LiteralNode;
  qualifiers: any[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface ParameterDeclarationNode {
  type: 'parameter_declaration';
  qualifier: any[];
  declaration: ParameterDeclaratorNode | TypeSpecifierNode;
}

export interface ParameterDeclaratorNode {
  type: 'parameter_declarator';
  specifier: any;
  identifier: IdentifierNode;
  quantifier: any;
}

export interface PostfixNode {
  type: 'postfix';
  expression: any;
  postfix: any;
}

export interface PrecisionNode {
  type: 'precision';
  prefix: KeywordNode;
  qualifier: KeywordNode;
  specifier: TypeSpecifierNode;
}

export interface PreprocessorNode {
  type: 'preprocessor';
  line: string;
  _: string | string[];
}

export interface QualifierDeclaratorNode {
  type: 'qualifier_declarator';
  qualifiers: any[];
  declarations: IdentifierNode[];
  commas: LiteralNode[];
}

export interface QuantifiedIdentifierNode {
  type: 'quantified_identifier';
  identifier: IdentifierNode;
  quantifier: any;
}

export interface QuantifierNode {
  type: 'quantifier';
  lb: LiteralNode;
  expression: any;
  rb: LiteralNode;
}

export interface ReturnStatementNode {
  type: 'return_statement';
  return: KeywordNode;
  expression: any;
  semi: LiteralNode;
}

export interface StructNode {
  type: 'struct';
  lb: LiteralNode;
  declarations: any[];
  rb: LiteralNode;
  struct: KeywordNode;
  typeName: IdentifierNode;
}

export interface StructDeclarationNode {
  type: 'struct_declaration';
  declaration: StructDeclaratorNode;
  semi: LiteralNode;
}

export interface StructDeclaratorNode {
  type: 'struct_declarator';
  specified_type: FullySpecifiedTypeNode;
  declarations: QuantifiedIdentifierNode[];
  commas: LiteralNode[];
}

export interface SubroutineQualifierNode {
  type: 'subroutine_qualifier';
  subroutine: KeywordNode;
  lp: LiteralNode;
  type_names: IdentifierNode[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface SwitchCaseNode {
  type: 'switch_case';
  statements: [];
  case: any;
  test: any;
  colon: LiteralNode;
}

export interface SwitchStatementNode {
  type: 'switch_statement';
  switch: KeywordNode;
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
  lb: LiteralNode;
  cases: any[];
  rb: LiteralNode;
}

export interface TernaryNode {
  type: 'ternary';
  expression: any;
  question: LiteralNode;
  left: any;
  right: any;
  colon: LiteralNode;
}

export interface TypeSpecifierNode {
  type: 'type_specifier';
  specifier: KeywordNode | IdentifierNode | StructNode;
  quantifier: any;
}

export interface UintConstantNode {
  type: 'uint_constant';
  token: string;
  whitespace: string;
}

export interface UnaryNode {
  type: 'unary';
  operator: LiteralNode;
  expression: any;
}

export interface WhileStatementNode {
  type: 'while_statement';
  while: KeywordNode;
  lp: LiteralNode;
  condition: any;
  rp: LiteralNode;
  body: any;
}

export type AstNode =
  | LiteralNode
  | KeywordNode
  | IdentifierNode
  | ArraySpecifierNode
  | ArraySpecifiersNode
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
  | ParameterDeclaratorNode
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
