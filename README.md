Do not use this

# Fixme

- The shape of for/while statements
- Finish all the parsing
- What is leftAssociate doing again? Do I need it?
- A + parses to {type: '+', chidlren: [left, '+', right]} - can I remove that
  middle child and put whitespace as a key of the top level +
- ✅ Renamed "name" to "type"
- Can I move all trailing whitespace into a ws key instead of in children?
- (related to whitespace) Fix the problem with tokens like "+" being both nodes with a left and right, as well as inline nodes in children arrays to support whitespace handling
- Impelement printing
- Implement optional whitespace flag
- glsl version switch to support glsl es 3 vs 1?
- Figure out the preprocessor strategy

# What?

- Making this Babel ESTree compatible to use babel ecosystem
- Shaderfrog engine for switching testing

- Write shader vertex / fragment
- Auto parse constants, variables, uniforms, let them be used
