/**
 * This file is written by hand, to map to the parser expression results in
 * parser/glsl-grammar.pegjs. It very, very likely contains errors. I put in
 * *any* types where I was lazy or didn't know the core type.
 */

export interface AstNode {
  // Only used on preprocessor nodes
  wsStart?: string;
  wsEnd?: string;
}

export interface LiteralNode extends AstNode {
  type: 'literal';
  literal: string;
  whitespace: string | string[];
}

export interface KeywordNode extends AstNode {
  type: 'keyword';
  token: string;
  whitespace: string | string[];
}

export interface IdentifierNode extends AstNode {
  type: 'identifier';
  identifier: string;
  whitespace: string;
}

export interface ArraySpecifierNode extends AstNode {
  type: 'array_specifier';
  lb: LiteralNode;
  expression: any;
  rb: LiteralNode;
}

export interface ArraySpecifiersNode extends AstNode {
  type: 'array_specifiers';
  specifiers: ArraySpecifierNode[];
}

export interface AssignmentNode extends AstNode {
  type: 'assignment';
  left: any;
  operator: LiteralNode;
  right: any;
}

export interface BinaryNode extends AstNode {
  type: 'binary';
  operator: any;
  left: any;
  right: any;
}

export interface BoolConstantNode extends AstNode {
  type: 'bool_constant';
  token: string;
  whitespace: string;
}

export interface BreakStatementNode extends AstNode {
  type: 'break_statement';
  break: KeywordNode;
  semi: LiteralNode;
}

export interface CompoundStatementNode extends AstNode {
  type: 'compound_statement';
  lb: LiteralNode;
  statements: any[];
  rb: LiteralNode;
}

export interface ConditionExpressionNode extends AstNode {
  type: 'condition_expression';
  specified_type: any;
  identifier: IdentifierNode;
  operator: LiteralNode;
  initializer: any;
}

export interface ContinueStatementNode extends AstNode {
  type: 'continue_statement';
  continue: KeywordNode;
  semi: LiteralNode;
}

export interface DeclarationStatementNode extends AstNode {
  type: 'declaration_statement';
  declaration: any;
  semi: LiteralNode;
}

export interface DeclarationNode extends AstNode {
  type: 'declaration';
  identifier: IdentifierNode;
  quantifier: any;
  operator: LiteralNode;
  initializer: any;
}

export interface DeclaratorListNode extends AstNode {
  type: 'declarator_list';
  specified_type: any;
  declarations: any[];
  commas: LiteralNode[];
}

export interface DefaultCaseNode extends AstNode {
  type: 'default_case';
  statements: [];
  default: any;
  colon: LiteralNode;
}

export interface DiscardStatementNode extends AstNode {
  type: 'discard_statement';
  discard: KeywordNode;
  semi: LiteralNode;
}

export interface DoStatementNode extends AstNode {
  type: 'do_statement';
  do: KeywordNode;
  body: any;
  while: KeywordNode;
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
  semi: LiteralNode;
}

export interface DoubleConstantNode extends AstNode {
  type: 'double_constant';
  token: string;
  whitespace: string;
}

export interface ExpressionStatementNode extends AstNode {
  type: 'expression_statement';
  expression: any;
  semi: LiteralNode;
}

export interface FieldSelectionNode extends AstNode {
  type: 'field_selection';
  dot: LiteralNode;
  selection: LiteralNode;
}

export interface FloatConstantNode extends AstNode {
  type: 'float_constant';
  token: string;
  whitespace: string;
}

export interface ForStatementNode extends AstNode {
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

export interface FullySpecifiedTypeNode extends AstNode {
  type: 'fully_specified_type';
  qualifiers: any[];
  specifier: TypeSpecifierNode;
}

export interface FunctionNode extends AstNode {
  type: 'function';
  prototype: FunctionPrototypeNode;
  body: CompoundStatementNode;
}

export interface FunctionCallNode extends AstNode {
  type: 'function_call';
  identifier: IdentifierNode;
  lp: LiteralNode;
  args: any[];
  rp: LiteralNode;
}

export interface FunctionHeaderNode extends AstNode {
  type: 'function_header';
  returnType: FullySpecifiedTypeNode;
  name: IdentifierNode;
  lp: LiteralNode;
}

export interface FunctionPrototypeNode extends AstNode {
  type: 'function_prototype';
  header: FunctionHeaderNode;
  parameters: any[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface GroupNode extends AstNode {
  type: 'group';
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
}

export interface IfStatementNode extends AstNode {
  type: 'if_statement';
  if: KeywordNode;
  body: any;
  lp: LiteralNode;
  condition: any;
  rp: LiteralNode;
  else: any[];
}

export interface InitializerListNode extends AstNode {
  type: 'initializer_list';
  lb: LiteralNode;
  initializers: any[];
  commas: LiteralNode[];
  rb: LiteralNode;
}

export interface IntConstantNode extends AstNode {
  type: 'int_constant';
  token: string;
  whitespace: string;
}

export interface InterfaceDeclaratorNode extends AstNode {
  type: 'interface_declarator';
  qualifiers: any;
  interface_type: any;
  lp: LiteralNode;
  declarations: any;
  rp: LiteralNode;
  identifier: QuantifiedIdentifierNode;
}

export interface LayoutQualifierIdNode extends AstNode {
  type: 'layout_qualifier_id';
  identifier: IdentifierNode;
  operator: LiteralNode;
  expression: any;
}

export interface LayoutQualifierNode extends AstNode {
  type: 'layout_qualifier';
  layout: KeywordNode;
  lp: LiteralNode;
  qualifiers: any[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface ParameterDeclarationNode extends AstNode {
  type: 'parameter_declaration';
  qualifier: any[];
  declaration: ParameterDeclaratorNode | TypeSpecifierNode;
}

export interface ParameterDeclaratorNode extends AstNode {
  type: 'parameter_declarator';
  specifier: any;
  identifier: IdentifierNode;
  quantifier: any;
}

export interface PostfixNode extends AstNode {
  type: 'postfix';
  expression: any;
  postfix: any;
}

export interface PrecisionNode extends AstNode {
  type: 'precision';
  prefix: KeywordNode;
  qualifier: KeywordNode;
  specifier: TypeSpecifierNode;
}

export interface PreprocessorNode extends AstNode {
  type: 'preprocessor';
  line: string;
  _: string | string[];
}

export interface QualifierDeclaratorNode extends AstNode {
  type: 'qualifier_declarator';
  qualifiers: any[];
  declarations: IdentifierNode[];
  commas: LiteralNode[];
}

export interface QuantifiedIdentifierNode extends AstNode {
  type: 'quantified_identifier';
  identifier: IdentifierNode;
  quantifier: any;
}

export interface QuantifierNode extends AstNode {
  type: 'quantifier';
  lb: LiteralNode;
  expression: any;
  rb: LiteralNode;
}

export interface ReturnStatementNode extends AstNode {
  type: 'return_statement';
  return: KeywordNode;
  expression: any;
  semi: LiteralNode;
}

export interface StructNode extends AstNode {
  type: 'struct';
  lb: LiteralNode;
  declarations: any[];
  rb: LiteralNode;
  struct: KeywordNode;
  typeName: LiteralNode;
}

export interface StructDeclarationNode extends AstNode {
  type: 'struct_declaration';
  declaration: StructDeclaratorNode;
  semi: LiteralNode;
}

export interface StructDeclaratorNode extends AstNode {
  type: 'struct_declarator';
  specified_type: FullySpecifiedTypeNode;
  declarations: QuantifiedIdentifierNode[];
  commas: LiteralNode[];
}

export interface SubroutineQualifierNode extends AstNode {
  type: 'subroutine_qualifier';
  subroutine: KeywordNode;
  lp: LiteralNode;
  type_names: IdentifierNode[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface SwitchCaseNode extends AstNode {
  type: 'switch_case';
  statements: [];
  case: any;
  test: any;
  colon: LiteralNode;
}

export interface SwitchStatementNode extends AstNode {
  type: 'switch_statement';
  switch: KeywordNode;
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
  lb: LiteralNode;
  cases: any[];
  rb: LiteralNode;
}

export interface TernaryNode extends AstNode {
  type: 'ternary';
  expression: any;
  question: LiteralNode;
  left: any;
  right: any;
  colon: LiteralNode;
}

export interface TypeSpecifierNode extends AstNode {
  type: 'type_specifier';
  specifier: ArraySpecifierNode;
  quantifier: any;
}

export interface UintConstantNode extends AstNode {
  type: 'uint_constant';
  token: string;
  whitespace: string;
}

export interface UnaryNode extends AstNode {
  type: 'unary';
  operator: LiteralNode;
  expression: any;
}

export interface WhileStatementNode extends AstNode {
  type: 'while_statement';
  while: KeywordNode;
  lp: LiteralNode;
  condition: any;
  rp: LiteralNode;
  body: any;
}

export type AnyAstNode =
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
