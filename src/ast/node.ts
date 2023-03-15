/**
 * This file is written by hand, to map to the parser expression results in
 * parser/glsl-grammar.pegjs. It very, very likely contains errors. I put in
 * *any* types where I was lazy or didn't know the core type.
 */

type LocationInfo = { offset: number; line: number; column: number };

export interface BaseNode {
  location: {
    start: LocationInfo;
    end: LocationInfo;
  };
}

export interface LiteralNode extends BaseNode {
  type: 'literal';
  literal: string;
  whitespace: string | string[];
}

export interface KeywordNode extends BaseNode {
  type: 'keyword';
  token: string;
  whitespace: string | string[];
}

export interface IdentifierNode extends BaseNode {
  type: 'identifier';
  identifier: string;
  whitespace: string;
}

export interface ArraySpecifierNode extends BaseNode {
  type: 'array_specifier';
  lb: LiteralNode;
  expression: any;
  rb: LiteralNode;
}

export interface ArraySpecifiersNode extends BaseNode {
  type: 'array_specifiers';
  specifiers: ArraySpecifierNode[];
}

export interface AssignmentNode extends BaseNode {
  type: 'assignment';
  left: any;
  operator: LiteralNode;
  right: any;
}

export interface BinaryNode extends BaseNode {
  type: 'binary';
  operator: any;
  left: any;
  right: any;
}

export interface BoolConstantNode extends BaseNode {
  type: 'bool_constant';
  token: string;
  whitespace: string;
}

export interface BreakStatementNode extends BaseNode {
  type: 'break_statement';
  break: KeywordNode;
  semi: LiteralNode;
}

export interface CompoundStatementNode extends BaseNode {
  type: 'compound_statement';
  lb: LiteralNode;
  statements: any[];
  rb: LiteralNode;
}

export interface ConditionExpressionNode extends BaseNode {
  type: 'condition_expression';
  specified_type: any;
  identifier: IdentifierNode;
  operator: LiteralNode;
  initializer: any;
}

export interface ContinueStatementNode extends BaseNode {
  type: 'continue_statement';
  continue: KeywordNode;
  semi: LiteralNode;
}

export interface DeclarationStatementNode extends BaseNode {
  type: 'declaration_statement';
  declaration: any;
  semi: LiteralNode;
}

export interface DeclarationNode extends BaseNode {
  type: 'declaration';
  identifier: IdentifierNode;
  quantifier: any;
  operator: LiteralNode;
  initializer: any;
}

export interface DeclaratorListNode extends BaseNode {
  type: 'declarator_list';
  specified_type: any;
  declarations: any[];
  commas: LiteralNode[];
}

export interface DefaultCaseNode extends BaseNode {
  type: 'default_case';
  statements: [];
  default: any;
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
  body: any;
  while: KeywordNode;
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
  semi: LiteralNode;
}

export interface DoubleConstantNode extends BaseNode {
  type: 'double_constant';
  token: string;
  whitespace: string;
}

export interface ExpressionStatementNode extends BaseNode {
  type: 'expression_statement';
  expression: any;
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
  whitespace: string;
}

export interface ForStatementNode extends BaseNode {
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

export interface FullySpecifiedTypeNode extends BaseNode {
  type: 'fully_specified_type';
  qualifiers: any[];
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
  args: any[];
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
  parameters: any[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface GroupNode extends BaseNode {
  type: 'group';
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
}

export interface IfStatementNode extends BaseNode {
  type: 'if_statement';
  if: KeywordNode;
  body: any;
  lp: LiteralNode;
  condition: any;
  rp: LiteralNode;
  else: any[];
}

export interface InitializerListNode extends BaseNode {
  type: 'initializer_list';
  lb: LiteralNode;
  initializers: any[];
  commas: LiteralNode[];
  rb: LiteralNode;
}

export interface IntConstantNode extends BaseNode {
  type: 'int_constant';
  token: string;
  whitespace: string;
}

export interface InterfaceDeclaratorNode extends BaseNode {
  type: 'interface_declarator';
  qualifiers: any;
  interface_type: any;
  lp: LiteralNode;
  declarations: any;
  rp: LiteralNode;
  identifier?: QuantifiedIdentifierNode;
}

export interface LayoutQualifierIdNode extends BaseNode {
  type: 'layout_qualifier_id';
  identifier: IdentifierNode;
  operator: LiteralNode;
  expression: any;
}

export interface LayoutQualifierNode extends BaseNode {
  type: 'layout_qualifier';
  layout: KeywordNode;
  lp: LiteralNode;
  qualifiers: any[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface ParameterDeclarationNode extends BaseNode {
  type: 'parameter_declaration';
  qualifier: any[];
  declaration: ParameterDeclaratorNode | TypeSpecifierNode;
}

export interface ParameterDeclaratorNode extends BaseNode {
  type: 'parameter_declarator';
  specifier: any;
  identifier: IdentifierNode;
  quantifier: any;
}

export interface PostfixNode extends BaseNode {
  type: 'postfix';
  expression: any;
  postfix: any;
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
  qualifiers: any[];
  declarations: IdentifierNode[];
  commas: LiteralNode[];
}

export interface QuantifiedIdentifierNode extends BaseNode {
  type: 'quantified_identifier';
  identifier: IdentifierNode;
  quantifier: any;
}

export interface QuantifierNode extends BaseNode {
  type: 'quantifier';
  lb: LiteralNode;
  expression: any;
  rb: LiteralNode;
}

export interface ReturnStatementNode extends BaseNode {
  type: 'return_statement';
  return: KeywordNode;
  expression: any;
  semi: LiteralNode;
}

export interface StructNode extends BaseNode {
  type: 'struct';
  lb: LiteralNode;
  declarations: any[];
  rb: LiteralNode;
  struct: KeywordNode;
  typeName: IdentifierNode;
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
  type_names: IdentifierNode[];
  commas: LiteralNode[];
  rp: LiteralNode;
}

export interface SwitchCaseNode extends BaseNode {
  type: 'switch_case';
  statements: [];
  case: any;
  test: any;
  colon: LiteralNode;
}

export interface SwitchStatementNode extends BaseNode {
  type: 'switch_statement';
  switch: KeywordNode;
  lp: LiteralNode;
  expression: any;
  rp: LiteralNode;
  lb: LiteralNode;
  cases: any[];
  rb: LiteralNode;
}

export interface TernaryNode extends BaseNode {
  type: 'ternary';
  expression: any;
  question: LiteralNode;
  left: any;
  right: any;
  colon: LiteralNode;
}

export interface TypeSpecifierNode extends BaseNode {
  type: 'type_specifier';
  specifier: KeywordNode | IdentifierNode | StructNode;
  quantifier: any;
}

export interface UintConstantNode extends BaseNode {
  type: 'uint_constant';
  token: string;
  whitespace: string;
}

export interface UnaryNode extends BaseNode {
  type: 'unary';
  operator: LiteralNode;
  expression: any;
}

export interface WhileStatementNode extends BaseNode {
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
