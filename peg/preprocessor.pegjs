// https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.40.pdf
// https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf

{
  const node = (type, attrs) => ({
    type,
    ...attrs
  });

  // Filter out "empty" elements from an array
  const xnil = (...args) => args.flat().filter(e =>
    e !== undefined && e !== null && e !== '' && e.length !== 0
  )

  // Given an array of nodes with potential null empty values, convert to text.
  // Kind of like $(rule) but filters out empty rules
  const toText = (...args) => xnil(args).join('');

  const ifOnly = arr => arr.length > 1 ? arr : arr[0];

  // Remove empty elements and return value if only 1 element remains
  const collapse = (...args) => ifOnly(xnil(args));

  // Create a left associative tree of nodes
	const leftAssociate = (...nodes) =>
    nodes.flat().reduce((current, [operator, expr]) => ({
      type: "binary",
      operator: operator,
      left: current,
      right: expr
    }));

  // No longer needed?
  // const without = (obj, ...keys) => Object.entries(obj).reduce((acc, [key, value]) => ({
  //   ...acc,
  //   ...(!keys.includes(key) && { [key]: value })
  // }), {});

  // Group the statements in a switch statement into cases / default arrays
  const groupCases = (statements) => statements.reduce((cases, stmt) => {
    if(stmt.type === 'case_label') {
      return [
        ...cases,
        node(
          'switch_case',
          {
            statements: [],
            case: stmt.case,
            test: stmt.test,
            colon: stmt.colon,
          }
        )
      ];
    } else if(stmt.type === 'default_label') {
      return [
        ...cases,
        node(
          'default_case',
          {
            statements: [],
            default: stmt.default,
            colon: stmt.colon,
          }
        )
      ];
    // It would be nice to encode this in the grammar instead of a manual check
    } else if(!cases.length) {
      throw new Error('A switch statement body must start with a case or default label');
    } else {
      const tail = cases.slice(-1)[0];
      return [...cases.slice(0, -1), {
        ...tail,
        statements: [
          ...tail.statements,
          stmt
        ]
      }];
    }
  }, []);
}

// Extra whitespace here at start is to help with screenshots by adding
// extra linebreaks
start = text_or_control_lines

// FLOATCONSTANT = token:floating_constant _:_? { return node('float_constant', { token, whitespace: _ }); }
// DOUBLECONSTANT = token:floating_constant _:_? { return node('double_constant', { token, whitespace: _ }); }
INTCONSTANT = token:integer_constant _:_? { return node('int_constant', { token, whitespace: _ }); }
// UINTCONSTANT = token:integer_constant _:_? { return node('uint_constant', { token, whitespace: _ }); }
// BOOLCONSTANT
//   = token:("true" / "false") _:_ { return node('bool_constant', { token, whitespace:_ }); }

LEFT_OP = token:"<<" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_OP = token:">>" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// INC_OP = token:"++" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// DEC_OP = token:"--" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LE_OP = token:"<=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
GE_OP = token:">=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
EQ_OP = token:"==" _:_? { return node('literal', { literal: token, whitespace: _ }); }
NE_OP = token:"!=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
AND_OP = token:"&&" _:_? { return node('literal', { literal: token, whitespace: _ }); }
OR_OP = token:"||" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// XOR_OP = token:"^^" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// MUL_ASSIGN = token:"*=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// DIV_ASSIGN = token:"/=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// ADD_ASSIGN = token:"+=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// MOD_ASSIGN = token:"%=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// LEFT_ASSIGN = token:"<<=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// RIGHT_ASSIGN = token:">>=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// AND_ASSIGN = token:"&=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// XOR_ASSIGN = token:"^=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// OR_ASSIGN = token:"|=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// SUB_ASSIGN = token:"-=" _:_? { return node('literal', { literal: token, whitespace: _ }); }

LEFT_PAREN = token:"(" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_PAREN = token:")" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// LEFT_BRACKET = token:"[" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// RIGHT_BRACKET = token:"]" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// LEFT_BRACE = token:"{" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// RIGHT_BRACE = token:"}" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// DOT = token:"." _:_? { return node('literal', { literal: token, whitespace: _ }); }
COMMA = token:"," _:_? { return node('literal', { literal: token, whitespace: _ }); }
// COLON = token:":" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// EQUAL = token:"=" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// SEMICOLON = token:";" _:_? { return node('literal', { literal: token, whitespace: _ }); }
BANG = token:"!" _:_? { return node('literal', { literal: token, whitespace: _ }); }
DASH = token:"-" _:_? { return node('literal', { literal: token, whitespace: _ }); }
TILDE = token:"~" _:_? { return node('literal', { literal: token, whitespace: _ }); }
PLUS = token:"+" _:_? { return node('literal', { literal: token, whitespace: _ }); }
STAR = token:"*" _:_? { return node('literal', { literal: token, whitespace: _ }); }
SLASH = token:"/" _:_? { return node('literal', { literal: token, whitespace: _ }); }
PERCENT = token:"%" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LEFT_ANGLE = token:"<" _:_? { return node('literal', { literal: token, whitespace: _ }); }
RIGHT_ANGLE = token:">" _:_? { return node('literal', { literal: token, whitespace: _ }); }
VERTICAL_BAR = token:"|" _:_? { return node('literal', { literal: token, whitespace: _ }); }
CARET = token:"^" _:_? { return node('literal', { literal: token, whitespace: _ }); }
AMPERSAND = token:"&" _:_? { return node('literal', { literal: token, whitespace: _ }); }
// QUESTION = token:"?" _:_? { return node('literal', { literal: token, whitespace: _ }); }

DEFINE = token:"#define" _:_? { return node('literal', { literal: token, whitespace: _ }); }
INCLUDE = token:"#include" _:_? { return node('literal', { literal: token, whitespace: _ }); }
LINE = token:"#line" _:_? { return node('literal', { literal: token, whitespace: _ }); }
UNDEF = token:"#undef" _:_? { return node('literal', { literal: token, whitespace: _ }); }
ERROR = token:"#error" _:_? { return node('literal', { literal: token, whitespace: _ }); }
PRAGMA = token:"#pragma" _:_? { return node('literal', { literal: token, whitespace: _ }); }
DEFINED = token:"defined" _:_? { return node('literal', { literal: token, whitespace: _ }); }
IF = token:"#if" _:_? { return node('literal', { literal: token, whitespace: _ }); }
IFDEF = token:"#ifdef" _:_? { return node('literal', { literal: token, whitespace: _ }); }
IFNDEF = token:"#ifndef" _:_? { return node('literal', { literal: token, whitespace: _ }); }
ELIF = token:"#elif" _:_? { return node('literal', { literal: token, whitespace: _ }); }
ELSE = token:"#else" _:_? { return node('literal', { literal: token, whitespace: _ }); }
ENDIF = token:"#endif" _:_? { return node('literal', { literal: token, whitespace: _ }); }

IDENTIFIER = identifier:$([A-Za-z_] [A-Za-z_0-9]*) _:_? { return node('identifier', { identifier, whitespace: _ }); }

// Spec note: "It is a compile-time error to provide a literal integer whose bit
// pattern cannot fit in 32 bits." This and other ranges are not yet implemented
// here

// Integers
integer_constant
  = $(decimal_constant integer_suffix?)
  / $(octal_constant integer_suffix?)
  / $(hexadecimal_constant integer_suffix?)

integer_suffix = [uU]

// Collapsing the above becomes
decimal_constant = $([1-9] digit*)
octal_constant = "0" [0-7]*
hexadecimal_constant = "0" [xX] [0-9a-fA-F]*

digit = [0-9]

// Floating point
// floating_constant
//   = $(fractional_constant exponent_part? floating_suffix?)
//   / $(digit_sequence exponent_part floating_suffix?)
// fractional_constant = $(digit_sequence? "." digit_sequence?)
// exponent_part "exponent" = $([eE] [+-]? digit_sequence)

// digit_sequence
digit_sequence = $digit+
// floating_suffix = [fF] / "lf" / "LF"


// dang_test_dang = (control_line / text)*
text_or_control_lines =
  blocks:(
    control_line
    / text:text+ {
      // return node('text', { text: text.join('') });
      return node('text', { text });
    }
  )+
  wsEnd:_? {
    return node('program', { blocks, wsEnd });
  }

control_line
  = wsStart:_?
    line:(
      conditional
      / define:DEFINE
        identifier:IDENTIFIER
        lp:LEFT_PAREN
        args:(
          head:IDENTIFIER
          tail:(COMMA IDENTIFIER)* {
            return [head, ...tail.flat()];
          }
        )
        rp:RIGHT_PAREN
        definition:token_string? {
        return node('define_arguments', { define, identifier, lp, args, rp, definition } )
      }
      / define:DEFINE identifier:IDENTIFIER definition:token_string? {
        return node('define', { define, identifier, definition } )
      }
      / INCLUDE 'path_spec' // TODO handle file types?
      / LINE digit_sequence "filename"?
      / UNDEF IDENTIFIER
      / ERROR token_string
      / PRAGMA token_string
    )
    wsEnd:[\n]? {
      return { ...line, wsStart, wsEnd };
    }

// TODO
constant_expression_if =
  DEFINED IDENTIFIER /
  DEFINED LEFT_PAREN IDENTIFIER RIGHT_PAREN /
  constant_expression

conditional
  = ifPart:if_line
    body:text_or_control_lines+
    elseIfParts:(elif_line text_or_control_lines)*
    elsePart:else_part?
    endif:endif_line {
      return node('conditional', { ifPart, body, elseIfParts, elsePart, endif, });
    }

// if_part =
//   if_line text

if_line =
  IF /
  IF constant_expression_if /
  IFDEF IDENTIFIER /
  IFNDEF IDENTIFIER

elif_parts =
  (elif_line text)+
  // elif_line text /
  // elif_parts elif_line text

elif_line =
  ELIF constant_expression_if

else_part =
  else_line text

else_line =
  ELSE

endif_line =
  ENDIF

// Defined from before
// digit_sequence =
//   digit /
//   digit_sequence digit

token_string = $([^\n]+)

token =
  // keyword / // What is this?
  IDENTIFIER
  // constant / // What is this?
  // operator /
  // punctuator

filename = [\S]+

path_spec = [\S]+

// I made up this text rule. I have no idea what's going on
// text "text" = a:$(!(whitespace? "#") [^\n]+ [\n]) { return { nonempty_line: a } } / b:$([\n]) { return { empty_line: b } }
text "text" = $(!(whitespace? "#") [^\n]+ [\n] / [\n])

primary_expression "primary expression"
  // FLOATCONSTANT
  = INTCONSTANT
  // / UINTCONSTANT
  // / BOOLCONSTANT
  // / DOUBLECONSTANT
  / lp:LEFT_PAREN expression:constant_expression rp:RIGHT_PAREN {
    return node('group', { lp, expression, rp });
  }
  / IDENTIFIER

// integer_expression "integer expression"
//   = expression

unary_expression "unary expression"
  = primary_expression
  / operator:(PLUS / DASH / BANG / TILDE)
    expression:unary_expression {
      return node('unary', { operator, expression });
    }

multiplicative_expression "multiplicative expression"
  = head:unary_expression
    tail:(
      op:(STAR / SLASH / PERCENT)
      expr:unary_expression
    )* {
      return leftAssociate(head, tail);
    }

additive_expression "additive expression"
  = head:multiplicative_expression
    tail:(
      op:(PLUS / DASH)
      expr:multiplicative_expression
    )* {
      return leftAssociate(head, tail);
    }

shift_expression "shift expression"
  = head:additive_expression
    tail:(
      op:(RIGHT_OP / LEFT_OP)
      expr:additive_expression
    )* {
      return leftAssociate(head, tail);
    }

relational_expression "relational expression"
  = head:shift_expression
    tail:(
      op:(LE_OP / GE_OP / LEFT_ANGLE / RIGHT_ANGLE)
      expr:shift_expression
    )* {
      return leftAssociate(head, tail);
    }

equality_expression "equality expression"
  = head:relational_expression
    tail:(
      op:(EQ_OP / NE_OP)
      expr:relational_expression
    )* {
      return leftAssociate(head, tail);
    }

and_expression "and expression"
  = head:equality_expression
    tail:(
      op:AMPERSAND
      expr:equality_expression
    )* {
      return leftAssociate(head, tail);
    }

exclusive_or_expression "exclusive or expression"
  = head:and_expression
    tail:(
      op:CARET
      expr:and_expression
    )* {
      return leftAssociate(head, tail);
    }

inclusive_or_expression "inclusive or expression"
  = head:exclusive_or_expression
    tail:(
      op:VERTICAL_BAR
      expr:exclusive_or_expression
    )* {
      return leftAssociate(head, tail);
    }

logical_and_expression "logical and expression"
  = head:inclusive_or_expression
    tail:(
      op:AND_OP
      expr:inclusive_or_expression
    )* {
      return leftAssociate(head, tail);
    }

// I added this as a maybe entry point to expressions
constant_expression = logical_and_expression

// TODO: Compare with exclusive_or_expression
// logical_xor_expression "logical xor expression"
//   = head:logical_and_expression
//     tail:(
//       op:XOR_OP
//       expr:logical_and_expression
//     )* {
//       return leftAssociate(head, tail);
//     }

// logical_or_expression "logical or expression"
//   = head:logical_xor_expression
//     tail:(
//       op:OR_OP
//       expr:logical_xor_expression
//     )* {
//       return leftAssociate(head, tail);
//     }

logical_or_expression "logical or expression"
  = head:logical_and_expression
    tail:(
      op:OR_OP
      expr:logical_and_expression
    )* {
      return leftAssociate(head, tail);
    }

// ternary_expression
//   = expr:logical_or_expression
//     suffix:(
//       question:QUESTION
//       left:expression
//       colon:COLON
//       right:assignment_expression {
//         return { question, left, right, colon };
//       }
//     )? {
//       // ? and : operators are right associative, which happens automatically
//       // in pegjs grammar
//       return suffix ?
//         node('ternary', { expr, ...suffix }) :
//         expr
//     }

// assignment_expression
//   // Note, I switched the order of these because a conditional expression can
//   // hijack the production because it can also be a unary_expression
//   = left:unary_expression
//     operator:assignment_operator
//     right:assignment_expression {
//       return node('assignment', { left, operator, right });
//     }
//     / ternary_expression

// assignment_operator "asignment"
//   = EQUAL / MUL_ASSIGN / DIV_ASSIGN / MOD_ASSIGN / ADD_ASSIGN / SUB_ASSIGN
//   / LEFT_ASSIGN / RIGHT_ASSIGN / AND_ASSIGN / XOR_ASSIGN / OR_ASSIGN

// expression "expression"
//   = head:assignment_expression
//     tail:(
//       op:COMMA expr:assignment_expression
//     )* {
//       return leftAssociate(head, tail);
//     }

// I'm leaving this in because there might be future use in hinting to the
// compiler the expression must only be constant
// constant_expression
//   = ternary_expression

// declaration_statement = declaration:declaration {
//   return node(
//     'declaration_statement',
//     {
//         declaration: declaration[0],
//         semi: declaration[1],
//       }
//   );
// }

// TODO: This allows shaders with preprocessors to be parsed, and puts the
// preprocessor line in the AST. Do I want to do this, or do I want to
// always preprocess shaders before parsing? Not preprocessing will likely
// break the ability to parse if there is wacky define using
preprocessor "prepocessor" = line:$('#' [^\n]*) _:_? { return node('preprocessor', { line, _ }); }

// The whitespace is optional so that we can put comments immediately after
// terminals, like void/* comment */
// The ending whitespace is so that linebreaks can happen after comments
_ "whitespace" = w:whitespace? rest:(comment whitespace?)* {
  return collapse(w, rest);
}

comment
  = single_comment
  // Intention is to handle any type of comment case. A multiline comment
  // can be followed by more multiline comments, or a single comment, and
  // collapse everything into one array
  / a:multiline_comment d:(
    x:whitespace cc:comment { return xnil(x, cc); }
  )* { return xnil(a, d.flat()); }

single_comment = $('//' [^\n]*)
multiline_comment = $("/*" inner:(!"*/" i:. { return i; })* "*/")

whitespace
  = $[ \t]+
  // I removed linebreaks from whitespace to prevent
  // #identifier A \n float from picking up "float"
  // = $[ \t\n\r]+

// A terminal node is something like "void" with optional whitespace and/or
// comments after it. By convention whitespace is stored as children of
// terminals in the AST.
// We need to avoid the case of "voidsomething" hence the negative lookahead
terminal = ![A-Za-z_0-9] _:_? { return _; }
