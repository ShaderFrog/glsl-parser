# Shaderfrog GLSL Compiler

The [Shaderfrog](https://shaderfrog.com/app) GLSL compiler is an open source
GLSL 1.00 and 3.00 parser and preprocessor that compiles [back to
GLSL](parser/generator.ts). Both the parser and preprocessor can preserve
comments and whitespace.

The parser uses PEG grammar via the Peggy Javascript library. The PEG grammars
for both the preprocessor and main parser are in the source code [on
Github](https://github.com/ShaderFrog/glsl-parser).

This library has limited Typescript support.

See [the state of this library](#state-of-this-library) for limitations and
goals of this compiler.

# Usage

## Installation

```bash
npm install --save @shaderfrog/glsl-parser
```

## Parsing

```javascript
const { parser, generate } = require('@shaderfrog/glsl-parser');

// To parse a GLSL program's source code into an AST:
const ast = parser.parse('float a = 1.0;');

// To turn a parsed AST back into a source program
const program = generate(ast);
```

## Preprocessing

See the [GLSL Langauge Spec](https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf) to learn more about GLSL preprocessing. Some notable 
differences from the C++ parser are no "stringize" operator (`#`), no `#include`
operator, and `#if` expressions can only operate on integer constants, not other
types of data. The Shaderfrog GLSL preprocessor can't be used as a C/C++
preprocessor without modification.

```javascript
const preprocess = require('@shaderfrog/glsl-parser/preprocessor');

// Preprocess a program
console.log(preprocess(`
  #define a 1
  float b = a;
`, options));
```

Where `options` is:

```js
{
  // Don't strip comments before preprocessing
  preserveComments: boolean,
  // Macro definitions to use when preprocessing
  defines: {
    SOME_MACRO_NAME: 'macro body'
  },
  // A list of callbacks evaluted for each node type, and returns whether or not
  // this AST node is subject to preprocessing
  preserve: {
    ast_node_name: (path) => boolean
  }
}
```

A preprocessed program string can be handed off to the main GLSL parser.

If you want more  control over preprocessing, the `preprocess` function above is
a convenience method for approximately the following:

```javascript
const {
  preprocessAst,
  preprocessComments,
  generate,
  parser,
} = require('@shaderfrog/glsl-parser/preprocessor');

// Remove comments before preprocessing
const commentsRemoved = preprocessComments(`float a = 1.0;`)

// Parse the source text into an AST
const ast = parser.parse(commentsRemoved);

// Then preproces it, expanding #defines, evaluating #ifs, etc
preprocessAst(ast);

// Then convert it back into a program string, which can be passed to the
// core glsl parser
const preprocessed = preprocessorGenerate(ast);
```

## Manipulating and Searching ASTs

### Visitors

The Shaderfrog parser provides a AST visitor function for manipulating and
searching an AST. The visitor API loosely follows the [Babel visitor API](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-visitors). A visitor object looks
like:

```javascript
const visitors = {
  function_call: {
    enter: (path) => {},
    exit: (path) => {},
  }
}
```

Where every key in the object is a node type, and every value is an object
with optional `enter` and `exit` functions. What's passed to each function
is **not** the AST node itself, instead it's a "path" object, which gives you
information about the node's parents, methods to manipulate the node, and the
node itself. The path object:

```typescript
{
  // Properties:

  // The node itself
  node: AstNode;
  // The parent of this node
  parent: AstNode | null;
  // The parent path of this path
  parentPath: Path | null;
  // The key of this node in the parent object, if node parent is an object
  key: string | null;
  // The index of this node in the parent array, if node parent is an array
  index: number | null;

  // Methods:

  // Don't visit any children of this node
  skip: () => void;
  // Remove this node from the AST
  remove: () => void;
  // Replace this node with another AST node
  replaceWith: (replacer: any) => void;
  // Search for parents of this node's parent using a test function
  findParent: (test: (p: Path) => boolean) => Path | null;
}
```

Visit an AST by calling the visit method with an AST and visitors:

```typescript
import { visit } from '@shaderfrog/glsl-parser/core/ast.js';

visit(ast, visitors);
```

The visit function doesn't return a value. If you want to collect data from the
AST, use a variable in the outer scope to collect data. For example:

```typescript
let numberOfFunctionCalls = 0;
visit(ast, {
  function_call: {
    enter: (path) => {
      numberOfFunctionCalls += 1;
    },
  }
});
console.log('There are ', numberOfFunctionCalls, 'function calls');
```

### Utility Functions

Rename all the variables in a program:

```typescript
const { renameBindings, renameFunctions, renameTypes } = require('@shaderfrog/glsl-parser');

// ... parse an ast...

// Suffix top level variables with _x
renameBindings(ast.scopes[0], (name) => `${name}_x`);
// Suffix function names with _x
renameFunctions(ast.scopes[0], (name) => `${name}_x`);
// Suffix struct names and usages (including constructors) with _x
renameTypes(ast.scopes[0], (name) => `${name}_x`);
```

## What are "parsing" and "preprocessing"?

In general, a parser is a computer program that analyzes source code and turn it
into a data structure called an "abstract syntax tree" (AST). The AST is a tree
representation of the source program, which can be analyzed or manipulated. A
use of this GLSL parser could be to parse a program into an AST, find all
variable names in the AST, rename them, and generate new GLSL source code with
renamed variables.

GLSL supports "preprocessing," a compiler text manipulation step. GLSL's
preprocessor is based on the C++ preprocessor. This library supports limited
preprocessing.

Parsing, preprocesing, and code generation, are all phases of a compiler. This
library is technically a source code > source code compiler, also known as a
"transpiler." The input and output source code are both GLSL.

# State of this library

The Shaderfrog compiler [has tests](parser/parse.test.ts) for the more complex
parts of the GLSL ES 3.00 grammar. There are no known parsing bugs with respect
to the grammar. This library is definitively the most complete GLSL compiler
written in **Javascript.**

This library is used by the experimental [Shaderfrog 2.0 shader
composer](https://twitter.com/andrewray/status/1558307538063437826). The
compiler has wide expoure to different GLSL programs.

This library also exposed:
- [A typo](https://github.com/KhronosGroup/GLSL/issues/161) in the official GLSL grammar specification.
- [A bug](https://bugs.chromium.org/p/angleproject/issues/detail?id=6338#c1) in Chrome's ANGLE compiler.

This library doesn't support full "semantic analysis" required by the Khronos
GLSL specification. For example, some tokens are only valid in GLSL 1.00 vs
3.00, like `texture()` vs `texture2D()`. This parser considers both valid as
they're both part of the grammar. However if you send compiled source code off
to a native compiler like ANGLE with the wrong `texture` function, it will fail
to compile. 

This library is mainly for manipulating ASTs before handing off a generated
program to a downstream compilers like as ANGLE.

The preprocessor supports full macro evaluations and expansions, with the
exceptions of `__LINE__`. Additional control lines like `#error` and `#pragma`
and `#extension` have no effect, and can be fully preserved as part of parsing.

# Limitations of the Parser and Preprocessor

## Known missing semantic analysis compared to the specification

- Compilers are supposed to raise an error if a switch body ends in a case or
  default label.
- Currently no semantic analysis of vertex vs fragment shaders

## Deviations from the Khronos Grammar

- `selection_statement` is renamed to `if_statement`
- The grammar specifies `declaration` itself ends with a semicolon. I moved the
  semicolon into the `declaration_statement` rule.
- The grammar has a left paren "(" in the function_call production. Due to how
  I de-left-recursed the function_call -> postfix_expression loop, I moved the
  left paren into the function_identifier production.
- Function calls in the grammar are TYPE_NAME LEFT_PAREN, in my grammar they're
  IDENTIFIER LEFT_PAREN, because TYPE_NAME is only used for structs, and
  function names are stored in their own separate place in the scope.
