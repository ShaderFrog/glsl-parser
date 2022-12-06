/**
 * This grammar is based on:
 * Khronos Shading Language Version 4.60.7
 * https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf
 *
 * And I used some Microsoft preprocessor documentation for the grammar base:
 * https://docs.microsoft.com/en-us/cpp/preprocessor/grammar-summary-c-cpp?view=msvc-160
 */

{
  const node = (type, attrs) => ({
    type,
    ...attrs
  });

  // Filter out "empty" elements from an array
  const xnil = (...args) => args.flat().filter(e =>
    e !== undefined && e !== null && e !== '' && e.length !== 0
  )

  const ifOnly = arr => arr.length > 1 ? arr : arr[0];

  // Remove empty elements and return value if only 1 element remains
  const collapse = (...args) => ifOnly(xnil(args));

  // Create a left associative tree of nodes
	const leftAssociate = (...nodes) =>
    nodes.flat().reduce((current, [operator, expr]) => ({
      type: 'binary',
      operator: operator,
      left: current,
      right: expr
    }));
}

start = program

program = 
  program:text_or_control_lines
  wsEnd:_? {
    return node('program', { program: program.blocks, wsEnd });
  }

// GLSL only allows for integers in constant expressions
INTCONSTANT = token:integer_constant _:_? { return node('int_constant', { token, wsEnd: _ }); }

LEFT_OP = token:"<<" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
RIGHT_OP = token:">>" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
LE_OP = token:"<=" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
GE_OP = token:">=" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
EQ_OP = token:"==" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
NE_OP = token:"!=" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
AND_OP = token:"&&" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
OR_OP = token:"||" _:_? { return node('literal', { literal: token, wsEnd: _ }); }

LEFT_PAREN = token:"(" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
RIGHT_PAREN = token:")" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
COMMA = token:"," _:_? { return node('literal', { literal: token, wsEnd: _ }); }
BANG = token:"!" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
DASH = token:"-" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
TILDE = token:"~" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
PLUS = token:"+" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
STAR = token:"*" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
SLASH = token:"/" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
PERCENT = token:"%" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
LEFT_ANGLE = token:"<" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
RIGHT_ANGLE = token:">" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
VERTICAL_BAR = token:"|" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
CARET = token:"^" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
AMPERSAND = token:"&" _:_? { return node('literal', { literal: token, wsEnd: _ }); }
COLON = token:":" _:_? { return node('literal', { literal: token, wsEnd: _ }); }

DEFINE = wsStart:_? token:"#define" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
INCLUDE = wsStart:_? token:"#include" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
LINE = wsStart:_? token:"#line" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
UNDEF = wsStart:_? token:"#undef" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
ERROR = wsStart:_? token:"#error" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
PRAGMA = wsStart:_? token:"#pragma" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
DEFINED = wsStart:_? token:"defined" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
IF = wsStart:_? token:"#if" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
IFDEF = wsStart:_? token:"#ifdef" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
IFNDEF = wsStart:_? token:"#ifndef" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
ELIF = wsStart:_? token:"#elif" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
ELSE = wsStart:_? token:"#else" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
ENDIF = wsStart:_? token:"#endif" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
VERSION = wsStart:_? token:"#version" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }
EXTENSION = wsStart:_? token:"#extension" wsEnd:_? { return node('literal', { literal: token, wsStart, wsEnd }); }

IDENTIFIER = identifier:$([A-Za-z_] [A-Za-z_0-9]*) _:_? { return node('identifier', { identifier, wsEnd: _ }); }
IDENTIFIER_NO_WS = identifier:$([A-Za-z_] [A-Za-z_0-9]*) { return node('identifier', { identifier }); }

// Integers
integer_constant "number"
  = $(decimal_constant integer_suffix?)
  / $(octal_constant integer_suffix?)
  / $(hexadecimal_constant integer_suffix?)

integer_suffix = [uU]

// Collapsing the above becomes
decimal_constant = $([1-9] digit*)
octal_constant = "0" [0-7]*
hexadecimal_constant = "0" [xX] [0-9a-fA-F]*

digit = [0-9]

// Basically any valid source code
text_or_control_lines =
  blocks:(
    control_line
    / text:text+ {
      return node('text', { text: text.join('') });
    }
  )+ {
    return node('segment', { blocks });
  }

// Any preprocessor or directive line
control_line "control line"
  = conditional
  / line:(
    define:DEFINE
      identifier:IDENTIFIER_NO_WS
      lp:LEFT_PAREN
      args:(
        head:IDENTIFIER
        tail:(COMMA IDENTIFIER)* {
          return [head, ...tail.flat()];
        }
      )?
      rp:RIGHT_PAREN
      body:token_string? {
        return node('define_arguments', { define, identifier, lp, args: args || [], rp, body } )
      }
      / define:DEFINE identifier:IDENTIFIER body:token_string? {
        return node('define', { define, identifier, body } )
      }
      / line:LINE value:$digit+ {
        return node('line', { line, value });
      }
      / undef:UNDEF identifier:IDENTIFIER {
        return node('undef', { undef, identifier });
      }
      / error:ERROR message:token_string {
        return node('error', { error, message });
      }
      / pragma:PRAGMA body:token_string {
        return node('pragma', { pragma, body });
      }
      // The cpp preprocessor spec doesn't have version in it, I added it.
      // "profile" is defined on page 14 of GLSL spec
      / version:VERSION value:integer_constant profile:token_string? {
        return node('version', { version, value, profile });
      }
      / extension:EXTENSION name:IDENTIFIER colon:COLON behavior:token_string {
        return node('extension', { extension, name, colon, behavior });
      }
    )
    wsEnd:[\n]? {
      return { ...line, wsEnd };
    }

// Any series of characters on the same line,
// for example "abc 123" in "#define A abc 123"
token_string "token string" = $([^\n]+)

// Any non-control line. Ending newline for text is optional because program
// might end on a non-newline
text "text" = $(!(whitespace? "#") [^\n]+ [\n]? / [\n])

conditional
  = ifPart:(
      ifLine:if_line
      wsEnd:[\n]
      body:text_or_control_lines? {
        return { ...ifLine, body, wsEnd };
      }
    )
    elseIfParts:(
      token:ELIF
      expression:constant_expression
      wsEnd: [\n]
      elseIfBody:text_or_control_lines? {
        return node('elseif', { token, expression, wsEnd, body: elseIfBody });
      }
    )*
    elsePart:(
      token:ELSE
      wsEnd: [\n]
      elseBody:text_or_control_lines? {
        return node('else', { token, wsEnd, body: elseBody });
      }
    )?
    endif:ENDIF
    wsEnd:[\n]? { // optional because the program can end with endif
      return node('conditional', { ifPart, elseIfParts, elsePart, endif, wsEnd, });
    }

if_line "if"
  = token:IFDEF identifier:IDENTIFIER {
    return node('ifdef', { token, identifier });
  }
  / token:IFNDEF identifier:IDENTIFIER {
    return node('ifndef', { token, identifier });
  }
  / token:IF expression:constant_expression? {
    return node('if', { token, expression });
  }

// The following encodes the operator precedence for preprocessor #if
// expressions, as defined on page 12 of
// https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf

primary_expression "primary expression"
  = INTCONSTANT
  / lp:LEFT_PAREN expression:constant_expression rp:RIGHT_PAREN {
    return node('group', { lp, expression, rp });
  }
  / IDENTIFIER

unary_expression "unary expression"
  // "defined" is a unary operator, it can appear with optional parens. I'm not
  // sure if it makes sense to have it in the unary_expression section
  = operator:DEFINED lp:LEFT_PAREN identifier:IDENTIFIER rp:RIGHT_PAREN {
    return node('unary_defined', { operator, lp, identifier, rp, });
  }
  / operator:(PLUS / DASH / BANG / TILDE)
    expression:unary_expression {
      return node('unary', { operator, expression });
    }
  / primary_expression

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

logical_or_expression "logical or expression"
  = head:logical_and_expression
    tail:(
      op:OR_OP
      expr:logical_and_expression
    )* {
      return leftAssociate(head, tail);
    }

// I added this as a maybe entry point to expressions
constant_expression "constant expression" = logical_or_expression

// The whitespace is optional so that we can put comments immediately after
// terminals, like void/* comment */
// The ending whitespace is so that linebreaks can happen after comments
_ "whitespace or comment" = w:whitespace? rest:(comment whitespace?)* {
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

whitespace "whitespace" = $[ \t]+
