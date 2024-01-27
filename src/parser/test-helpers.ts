import { execSync } from 'child_process';
import { GrammarError } from 'peggy';
import util from 'util';
import generate from './generator';
import { AstNode, FunctionNode, Program } from '../ast';
import { Parse, ParserOptions } from './parser';
import { FunctionScopeIndex, Scope, ScopeIndex } from './scope';

export const inspect = (arg: any) =>
  console.log(util.inspect(arg, false, null, true));

export const nextWarn = () => {
  console.warn = jest.fn();
  let i = 0;
  // @ts-ignore
  const mock = console.warn.mock;
  return () => mock.calls[i++][0];
};

type Context = {
  parse: Parse;
  parseSrc: ParseSrc;
};

export const buildParser = () => {
  execSync(
    'npx peggy --cache -o src/parser/parser.js src/parser/glsl-grammar.pegjs'
  );
  const parser = require('./parser');
  const parse = parser.parse as Parse;
  const ps = parseSrc(parse);
  const ctx: Context = {
    parse,
    parseSrc: ps,
  };
  return {
    parse,
    parser,
    parseSrc: ps,
    debugSrc: debugSrc(ctx),
    debugStatement: debugStatement(ctx),
    expectParsedStatement: expectParsedStatement(ctx),
    parseStatement: parseStatement(ctx),
    expectParsedProgram: expectParsedProgram(ctx),
  };
};

// Keeping this around in case I need to figure out how to do tracing again
// Most of this ceremony around building a parser is dealing with Peggy's error
// format() function, where the grammarSource has to line up in generate() and
// format() to get nicely formatted errors if there's a syntax error in the
// grammar
// const buildParser = (file: string) => {
//   const grammar = fileContents(file);
//   try {
//     return peggy.generate(grammar, {
//       grammarSource: file,
//       cache: true,
//       trace: false,
//     });
//   } catch (e) {
//     const err = e as SyntaxError;
//     if ('format' in err && typeof err.format === 'function') {
//       console.error(err.format([{ source: file, text: grammar }]));
//     }
//     throw e;
//   }
// };

export const debugEntry = (bindings: ScopeIndex) => {
  return Object.entries(bindings).map(
    ([k, v]) =>
      `${k}: (${v.references.length} references, ${
        v.declaration ? '' : 'un'
      }declared): ${v.references.map((r) => r.type).join(', ')}`
  );
};
export const debugFunctionEntry = (bindings: FunctionScopeIndex) =>
  Object.entries(bindings).flatMap(([name, overloads]) =>
    Object.entries(overloads).map(
      ([signature, overload]) =>
        `${name} (${signature}): (${overload.references.length} references, ${
          overload.declaration ? '' : 'un'
        }declared): ${overload.references.map((r) => r.type).join(', ')}`
    )
  );

export const debugScopes = (astOrScopes: Program | Scope[]) =>
  console.log(
    'Scopes:',
    'scopes' in astOrScopes
      ? astOrScopes.scopes
      : astOrScopes.map((s) => ({
          name: s.name,
          types: debugEntry(s.types),
          bindings: debugEntry(s.bindings),
          functions: debugFunctionEntry(s.functions),
        }))
  );

const middle = /\/\* start \*\/((.|[\r\n])+)(\/\* end \*\/)?/m;

type ParseSrc = (src: string, options?: ParserOptions) => Program;
const parseSrc = (parse: Parse): ParseSrc => (src, options = {}) => {
  const grammarSource = '<anonymous glsl>';
  try {
    return parse(src, {
      ...options,
      grammarSource,
      tracer: {
        trace: (type) => {
          if (
            type.type === 'rule.match' &&
            type.rule !== 'whitespace' &&
            type.rule !== 'single_comment' &&
            type.rule !== 'comment' &&
            type.rule !== 'digit_sequence' &&
            type.rule !== 'digit' &&
            type.rule !== 'fractional_constant' &&
            type.rule !== 'floating_constant' &&
            type.rule !== 'translation_unit' &&
            type.rule !== 'start' &&
            type.rule !== 'external_declaration' &&
            type.rule !== 'SEMICOLON' &&
            type.rule !== 'terminal' &&
            type.rule !== '_'
          ) {
            if (type.rule === 'IDENTIFIER' || type.rule === 'TYPE_NAME') {
              console.log(
                '\x1b[35mMatch literal\x1b[0m',
                type.rule,
                type.result
              );
            } else {
              console.log('\x1b[35mMatch\x1b[0m', type.rule);
            }
          }
          // if (type.type === 'rule.fail') {
          //   console.log('fail', type.rule);
          // }
        },
      },
    });
  } catch (e) {
    const err = e as GrammarError;
    if ('format' in err) {
      console.error(err.format([{ source: grammarSource, text: src }]));
    }
    console.error(`Error parsing lexeme!\n"${src}"`);
    throw err;
  }
};

const debugSrc = ({ parseSrc }: Context) => (src: string) => {
  inspect(parseSrc(src).program);
};

const debugStatement = ({ parseSrc }: Context) => (stmt: AstNode) => {
  const program = `void main() {/* start */${stmt}/* end */}`;
  const ast = parseSrc(program);
  inspect((ast.program[0] as FunctionNode).body.statements[0]);
};

const expectParsedStatement = ({ parseSrc }: Context) => (
  src: string,
  options = {}
) => {
  const program = `void main() {/* start */${src}/* end */}`;
  const ast = parseSrc(program, options);
  const glsl = generate(ast);
  if (glsl !== program) {
    inspect(ast.program[0]);
    // @ts-ignore
    expect(glsl.match(middle)[1]).toBe(src);
  }
};

const parseStatement = ({ parseSrc }: Context) => (
  src: string,
  options: ParserOptions = {}
) => {
  const program = `void main() {${src}}`;
  return parseSrc(program, options);
};

const expectParsedProgram = ({ parseSrc }: Context) => (
  src: string,
  options?: ParserOptions
) => {
  const ast = parseSrc(src, options);
  const glsl = generate(ast);
  if (glsl !== src) {
    inspect(ast);
    expect(glsl).toBe(src);
  }
};
