# Shaderfrog GLSL Parser and Preprocessor

The [Shaderfrog](https://shaderfrog.com/app) GLSL parser is an open source GLSL
1.00 and 3.00 parser and preprocessor. Both the parser and preprocessor can
preserve comments and whitespace in the ASTs and generated programs.

This parser is built using a PEG grammar and using the Peggy Javascript library
(formerly Peg.js). The PEG grammars for both the preprocessor and main parser
are in the source code [on Github](https://github.com/ShaderFrog/glsl-parser).

This project is written in Typescript.

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

This library isn't ready for public use. Both the preprocessor and parser can
handle a significant portion of GLSL input. There are still many missing
features of this library to make it fully usable. Additionally, this library
will likely never support the full range of semantic analysis as required by
the Khronos GLSL specification. This library is mainly for manipulating ASTs
before handing off a generated program to a downstream compiler such as Angle.

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

# WIP Notes

## Fixme

Preprocessor 

- Handle backslash newlines in preprocessor (fml)
- Implement optional whitespace flag
- `__LINE__` - others?
- ✅ Token pasting operator ##
- ✅ #version
- ✅ What is #pragma?

Parser

- glsl version switch to support glsl es 3 vs 1?
- Figure out the preprocessor strategy
- Verify every node type has a generator
- "attribute" isn't used in GLSL ES 1.0 version parsing yet
- Cleanup(?) of array_specifier, fully_specified_type, quantified_identifier, to
  see if they need to be their own nodes, or if they can be inserted into parent
  declarations instead.
- "declarator" has three constructors, double check these are ok and shouldnt
  be consolidated
- Declarator also seems a little awkward when parsed, for example parsing a
  uniform statement, it becomes:

      type: 'declaration_statement',
      declaration: {
        type: 'declarator_list',
        declarations: [{
          type: 'declarator',
- Add location information to the output
- Semantic analysis of scope of variables
- Differentiate constructors from function calls?
- This line is valid GLSL ES 1.0 but not 3.0: vec4 buffer	= texture2D(renderbuffer, uv);
- Add preprocessComments to the preprocessor as option
- ✅ Finish all the parsing
- ✅ The shape of for/while statements
- ✅ What is leftAssociate doing again? Do I need it?
- ✅ A + parses to {type: '+', chidlren: [left, '+', right]} - can I remove that
  middle child and put whitespace as a key of the top level +
- ✅ Can I move all trailing whitespace into a ws key instead of in children?
- ✅ (related to whitespace) Fix the problem with tokens like "+" being both
  nodes with a left and right, as well as inline nodes in children arrays to
  support whitespace handling - have a "keyword" node - check what astparser
  does online for keywords

Import from Shadertoy / GLSL Sandbox
- Rename variables to try to use shaderfrog engine
- Change any math in AST that needs to be changed
- Add shaderfrog engine uniforms

If the shader has

uniform vec2 resolution;
#define iResolution resolution
float minres = min(iResolution.x, iResolution.y);

Then if I need to rename resolution to vUv, I need to know that it's aliased in the define statement. For any defines that **aren't numbers** I need to preprocess them. Maybe i need to preprocess everything since numbers can be used in #if statements

#define _ iResolution.x;
vec3 a = _

gl_FragCoord > vUv

This sounds like it requires a full preprocess to handle.

# What?

- Making this Babel ESTree compatible to use babel ecosystem
  - Huh maybe not, since ESTree is JS specific
- Shaderfrog engine for switching testing
- Write shader vertex / fragment
- Auto parse constants, variables, uniforms, let them be used
