Do not use this

# Fixme

- ✅ The shape of for/while statements
- Finish all the parsing
- ✅ What is leftAssociate doing again? Do I need it?
- ✅ A + parses to {type: '+', chidlren: [left, '+', right]} - can I remove that
  middle child and put whitespace as a key of the top level +
- ✅ Renamed "name" to "type"
- ✅ Can I move all trailing whitespace into a ws key instead of in children?
- ✅ (related to whitespace) Fix the problem with tokens like "+" being both
  nodes with a left and right, as well as inline nodes in children arrays to
  support whitespace handling - have a "keyword" node - check what astparser
  does online for keywords
- Impelement printing
- Implement optional whitespace flag
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

# What?

- Making this Babel ESTree compatible to use babel ecosystem
- Shaderfrog engine for switching testing
- I may have to preprocess?

- Write shader vertex / fragment
- Auto parse constants, variables, uniforms, let them be used

# Limitations

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
