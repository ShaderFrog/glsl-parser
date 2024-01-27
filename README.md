# Shaderfrog GLSL Compiler

The [Shaderfrog](https://shaderfrog.com/app) GLSL compiler is an open source
GLSL 1.00 and 3.00 parser and preprocessor that compiles [back to
GLSL](src/parser/generator.ts). Both the parser and preprocessor can preserve
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
import { parser, generate } from '@shaderfrog/glsl-parser';

// To parse a GLSL program's source code into an AST:
const program = parser.parse('float a = 1.0;');

// To turn a parsed AST back into a source program
const transpiled = generate(program);
```

The parser accepts an optional second `options` argument:
```js
parser.parse('float a = 1.0;', options);
```

Where `options` is:

```typescript
type ParserOptions = {
  // Hide warnings. If set to false or not set, then the parser logs warnings
  // like undefined functions and variables. If `failOnWarn` is set to true,
  // warnings will still cause the parser to raise an error. Defaults to false.
  quiet: boolean;
  // An optional string reprsenting the origin of the GLSL, for debugging and
  // error messages. For example, "main.js". If the parser raises an error, the
  // grammarSource shows up in the error.source field. If you format the error
  // (see the errors section), the grammarSource shows up in the formatted error
  // string. Defaults to undefined.
  grammarSource: string;
  // If true, sets location information on each AST node, in the form of
  // { column: number, line: number, offset: number }. Defaults to false.
  includeLocation: boolean;
  // If true, causes the parser to raise an error instead of log a warning.
  // The parser does limited type checking, and things like undeclared variables
  // are treated as warnings. Defaults to false.
  failOnWarn: boolean;
}
```

## Preprocessing

See the [GLSL Langauge Spec](https://www.khronos.org/registry/OpenGL/specs/gl/GLSLangSpec.4.60.pdf) to learn more about GLSL preprocessing. Some notable 
differences from the C++ parser are no "stringize" operator (`#`), no `#include`
operator, and `#if` expressions can only operate on integer constants, not other
types of data. The Shaderfrog GLSL preprocessor can't be used as a C/C++
preprocessor without modification.

```javascript
import preprocess from '@shaderfrog/glsl-parser/preprocessor';

// Preprocess a program
console.log(preprocess(`
  #define a 1
  float b = a;
`, options));
```

Where `options` is:

```typescript
type PreprocessorOptions = {
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
import {
  preprocessAst,
  preprocessComments,
  generate,
  parser,
} from '@shaderfrog/glsl-parser/preprocessor';

// Remove comments before preprocessing
const commentsRemoved = preprocessComments(`float a = 1.0;`)

// Parse the source text into an AST
const program = parser.parse(commentsRemoved);

// Then preproces it, expanding #defines, evaluating #ifs, etc
preprocessAst(program);

// Then convert it back into a program string, which can be passed to the
// core glsl parser
const preprocessed = preprocessorGenerate(program);
```

## Scope

`parse()` returns a [`Program`], which has a `scopes` array on it. A scope looks
like:
```typescript
type Scope = {
  name: string;
  parent?: Scope;
  bindings: ScopeIndex;
  types: TypeScopeIndex;
  functions: FunctionScopeIndex;
  location?: LocationObject;
}
```

The `name` of a scope is either `"global"`, the name of the function that
introduced the scope, or in anonymous blocks, `"{"`. In each scope, `bindings` represents variables,
`types` represents user-created types (structs in GLSL), and `functions` represents
functions.

For `bindings` and `types`, the scope index looks like:
```typescript
type ScopeIndex = {
  [name: string]: {
    declaration?: AstNode;
    references: AstNode[];
  }
}
```

Where `name` is the name of the variable or type. `declaration` is the AST node
where the variable was declared. In the case the variable is used without being
declared, `declaration` won't be present. If you set the [`failOnWarn` parser
option](#Parsing) to `true`, the parser will throw an error when encountering
an undeclared variable, rather than allow a scope entry without a declaration.

For `functions`, the scope index is slighty different:
```typescript
type FunctionScopeIndex = {
  [name: string]: {
    [signature: string]: {
      returnType: string;
      parameterTypes: string[];
      declaration?: FunctionNode;
      references: AstNode[];
    }
  }
};
```

Where `name` is the name of the function, and `signature` is a string representing
the function's return and parameter types, in the form of `"returnType: paramType1, paramType2, ..."`
or `"returnType: void"` in the case of no arguments. Each `signature` in this
index represents an "overloaded" function in GLSL, as in:

```glsl
void someFunction(int x) {};
void someFunction(int x, int y) {};
```

With this source code, there will be two entries under `name`, one for each
overload signature. The `references` are the uses of that specific overloaded
version of the function. `references` also contains the function prototypes
for the overloaded function, if present.

In the case there is only one declaration for a function, there will still be
a single entry under `name` with the function's `signature`.

⚠️ Caution! This parser does very limited type checking. This leads to a known
case where a function call can match to the wrong overload in scope:

```glsl
void someFunction(float, float);
void someFunction(bool, bool);
someFunction(true, true); // This will be attributed to the wrong scope entry
```

The parser doesn't know the type of the operands in the function call, so it
matches based on the name and arity of the functions.

See also [#Utility-Functions] for renaming scope references.

## Errors

If you have invalid GLSL, the parser throws a `GlslSyntaxError`, which is a type
alias for `peggy.SyntaxError`.

```ts
import { parser, GlslSyntaxError } from '@shaderfrog/glsl-parser';

let error: GlslSyntaxError | undefined;
try {
  // Line without a semicolon
  c.parse(`float a`);
} catch (e) {
  error = e as GlslSyntaxError;
}
```

The error class lives on the parser object itself:
```ts
console.log(error instanceof parser.SyntaxError)
// true
```

The error message is automatically generated by Peggy:
```ts
console.log(error.message)
// 'Expected ",", ";", "=", or array specifier but end of input found'
```

It includes the location of the error. Note `source` is the `grammarSource`
string provided to the parser options, which is `undefined` by default.
```ts
console.log(error.location)
/*
{
  source: undefined,
  start: { offset: 7, line: 1, column: 8 },
  end: { offset: 7, line: 1, column: 8 }
}
*/
```

The standard Peggy error object also has a fairly confusing `format()` method,
which produces an ASCII formatted string with arrows and underlines. The
`source` option passed to `.format()` **must** match your `grammarSource` in
parser options (which is `undefined` by default). This API is awkward and I
might override it in future versions of the parser.

```ts
console.log(error.format([{ text, source: undefined }])
/*
Error: Expected ",", ";", "=", or array specifier but "f" found.
  --> undefined:2:1
  |
2 | float b
  | ^
*/
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
import { visit } from '@shaderfrog/glsl-parser/ast';

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
import { renameBindings, renameFunctions, renameTypes } from '@shaderfrog/glsl-parser/utils';

// ... parse an ast...

// Suffix top level variables with _x
renameBindings(ast.scopes[0], (name, node) => `${name}_x`);
// Suffix function names with _x
renameFunctions(ast.scopes[0], (name, node) => `${name}_x`);
// Suffix struct names and usages (including constructors) with _x
renameTypes(ast.scopes[0], (name, node) => `${name}_x`);
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
parts of the GLSL ES 3.00 grammar. This library is definitively the most
complete GLSL compiler written in **Javascript.**

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

## Known Issues

- There's probably some bugs in the preprocessor logic. I haven't yet verified
  all of the evaluations of "binary" expressions in `preprocessor.ts`
- `preprocessor.ts` has lots of yucky typecasting

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

# Local Development

To work on the tests, run `npx jest --watch`.

The GLSL grammar definition lives in `src/parser/glsl-grammar.pegjs`. Peggyjs
supports inlining Javascript code in the `.pegjs` file to define utility
functions, but that means you have to write in vanilla Javascript, which is
terrible. Instead, I've pulled out utility functions into the `grammar.ts`
entrypoint. Some functions need access to Peggy's local variables, like
`location(s)`, so the `makeLocals()` function uses a closure to provide that
access.

To submit a change, please open a pull request. Tests are appreciated!

See [the Github workflow](.github/workflows/main.yml) for the checks run against
each PR.
