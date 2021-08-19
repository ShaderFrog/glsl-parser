const { visit, evaluate } = require('../core/ast.js');
const { generate } = require('./generator.js');

const without = (obj, ...keys) =>
  Object.entries(obj).reduce(
    (acc, [key, value]) => ({
      ...acc,
      ...(!keys.includes(key) && { [key]: value }),
    }),
    {}
  );

// Scan for the use of a function-like macro, balancing parentheses until
// encountering a final closing ")" marking the end of the macro use
const scanFunctionArgs = (src) => {
  let i;
  let chr;
  let parens = 0;
  let args = [];
  let arg = '';

  for (i = 0; i < src.length; i++) {
    chr = src.substr(i, 1);

    if (chr === '(') {
      parens++;
    }

    if (chr === ')') {
      parens--;
    }

    if (parens === -1) {
      // In the case of "()", we don't want to add the argument of empty string,
      // but we do in case of "(,)" and "(asdf)". When we hit the closing paren,
      // only capture the arg of empty string if there was a previous comma,
      // which we can infer from there being a previous arg
      if (arg !== '' || args.length) {
        args.push(arg);
      }
      return { args, length: i };
    }

    if (chr === ',' && parens === 0) {
      args.push(arg);
      arg = '';
    } else {
      arg += chr;
    }
  }

  return null;
};

// From glsl2s https://github.com/cimaron/glsl2js/blob/4046611ac4f129a9985d74704159c41a402564d0/preprocessor/comments.js
const preprocessComments = (src) => {
  let i;
  let chr;
  let la;
  let out = '';
  let line = 1;
  let in_single = 0;
  let in_multi = 0;

  for (i = 0; i < src.length; i++) {
    chr = src.substr(i, 1);
    la = src.substr(i + 1, 1);

    // Enter single line comment
    if (chr == '/' && la == '/' && !in_single && !in_multi) {
      in_single = line;
      i++;
      continue;
    }

    // Exit single line comment
    if (chr == '\n' && in_single) {
      in_single = 0;
    }

    // Enter multi line comment
    if (chr == '/' && la == '*' && !in_multi && !in_single) {
      in_multi = line;
      i++;
      continue;
    }

    // Exit multi line comment
    if (chr == '*' && la == '/' && in_multi) {
      // Treat single line multi-comment as space
      if (in_multi == line) {
        out += ' ';
      }

      in_multi = 0;
      i++;
      continue;
    }

    // Newlines are preserved
    if ((!in_multi && !in_single) || chr == '\n') {
      out += chr;
      line++;
    }
  }

  return out;
};

const expandFunctionMacro = (macros, macroName, macro, text) => {
  const pattern = `\\b${macroName}\\s*\\(`;
  const startRegex = new RegExp(pattern, 'm');

  let expanded = '';
  let current = text;
  let startMatch;

  while ((startMatch = startRegex.exec(current))) {
    const result = scanFunctionArgs(
      current.substr(startMatch.index + startMatch[0].length)
    );
    if (result === null) {
      throw new Error(
        `${current.match(startRegex)} unterminated macro invocation`
      );
    }
    const macroArgs = macro.args.filter(({ literal }) => literal !== ',');
    const { args, length: argLength } = result;

    // The total lenth of the raw text to replace is the macro name in the
    // text (startMatch), plus the length of the arguments, plus one to
    // encompass the closing paren that the scan fn skips
    const matchLength = startMatch[0].length + argLength + 1;

    if (args.length > macroArgs.length) {
      throw new Error(`'${macroName}': Too many arguments for macro`);
    }
    if (args.length < macroArgs.length) {
      throw new Error(`'${macroName}': Not enough arguments for macro`);
    }

    const replacedBody = macroArgs.reduce(
      (replaced, macroArg, index) =>
        replaced.replace(
          new RegExp(`\\b${macroArg.identifier}\\b`, 'g'),
          args[index].trim()
        ),
      macro.body
    );

    // Any text expanded is then scanned again for more replacements. The
    // self-reference rule means that a macro that references itself won't be
    // expanded again, so remove it from the search
    const expandedReplace = expandMacros(
      replacedBody,
      without(macros, macroName)
    );

    // We want to break this string at where we finished expanding the macro
    const endOfReplace = startMatch.index + expandedReplace.length;

    // Replace the use of the macro with the expansion
    const processed = current.replace(
      current.substr(startMatch.index, matchLength),
      expandedReplace
    );
    // Add text up to the end of the expanded macro to what we've procssed
    expanded += processed.substr(0, endOfReplace);

    // Only work on the rest of the text, not what we already expanded. This is
    // to avoid a nested macro #define foo() foo() where we'll try to expand foo
    // forever. With this strategy, we expand foo() to foo() and move on
    current = processed.substr(endOfReplace);
  }

  return expanded + current;
};

const expandObjectMacro = (macros, macroName, macro, text) => {
  const regex = new RegExp(`\\b${macroName}\\b`, 'g');
  let expanded = text;
  if (regex.test(text)) {
    const firstPass = text.replace(
      new RegExp(`\\b${macroName}\\b`, 'g'),
      macro.body
    );
    // Scan expanded text for more expansions. Ignore the expanded macro because
    // of the self-reference rule
    expanded = expandMacros(firstPass, without(macros, macroName));
  }
  return expanded;
};

const expandMacros = (text, macros) =>
  Object.entries(macros).reduce(
    (result, [macroName, macro]) =>
      macro.args
        ? expandFunctionMacro(macros, macroName, macro, result)
        : expandObjectMacro(macros, macroName, macro, result),
    text
  );

const identity = (x) => x;

// Given an expression AST node, visit it to expand the macro macros to in the
// right places
const expandInExpressions = (macros, ...expressions) => {
  expressions.filter(identity).forEach((expression) => {
    visit(expression, {
      unary_defined: {
        enter: (path) => {
          path.skip();
        },
      },
      identifier: {
        enter: (path) => {
          path.node.identifier = expandMacros(path.node.identifier, macros);
        },
      },
    });
  });
};

const evaluateIfPart = (macros, ifPart) => {
  if (ifPart.type === 'if') {
    return evaluteExpression(ifPart.expression, macros);
  } else if (ifPart.type === 'ifdef') {
    return ifPart.identifier.identifier in macros;
  } else if (ifPart.type === 'ifndef') {
    return !(ifPart.identifier.identifier in macros);
  }
};

// TODO: Are all of these operators equivalent between javascript and GLSL?
const evaluteExpression = (node, macros) =>
  evaluate(node, {
    // TODO: Handle non-base-10 numbers. Should these be parsed in the peg grammar?
    int_constant: (node) => parseInt(node.token, 10),
    unary_defined: (node) => node.identifier.identifier in macros,
    identifier: (node) => node.identifier,
    binary: ({ left, right, operator: { literal } }, visit) => {
      switch (literal) {
        // multiplicative
        case '*': {
          return visit(left) * visit(right);
        }
        // multiplicative
        case '/': {
          return visit(left) / visit(right);
        }
        // multiplicative
        case '%': {
          return visit(left) % visit(right);
        }
        // additive +
        case '-': {
          return visit(left) - visit(right);
        }
        // additive
        case '-': {
          return visit(left) - visit(right);
        }
        // bit-wise shift
        case '<<': {
          return visit(left) << visit(right);
        }
        // bit-wise shift
        case '>>': {
          return visit(left) >> visit(right);
        }
        // relational
        case '<': {
          return visit(left) < visit(right);
        }
        // relational
        case '>': {
          return visit(left) > visit(right);
        }
        // relational
        case '<=': {
          return visit(left) <= visit(right);
        }
        // relational
        case '>=': {
          return visit(left) >= visit(right);
        }
        // equality
        case '==': {
          return visit(left) == visit(right);
        }
        // equality
        case '!=': {
          return visit(left) != visit(right);
        }
        // bit-wise and
        case '&': {
          return visit(left) & visit(right);
        }
        // bit-wise exclusive or
        case '^': {
          return visit(left) ^ visit(right);
        }
        // bit-wise inclusive or
        case '|': {
          return visit(left) | visit(right);
        }
        // logical and
        case '&&': {
          return visit(left) && visit(right);
        }
        // inclusive or
        case '||': {
          return visit(left) || visit(right);
        }
      }
    },
  });

const shouldPreserve = (preserve) => (path) => {
  const test = preserve?.[path.node.type];
  return typeof test === 'function' ? test(path) : test;
};

/**
 * Perform the preprocessing logic, aka the "preprocessing" phase of the compiler.
 * Expand macros, evaluate conditionals, etc
 * TODO: Define the strategy for conditionally removing certain macro types
 * and conditionally expanding certain expressions. And take in optiona list
 * of pre defined thigns?
 * TODO: Handle __LINE__ and other constants.
 */
const preprocessAst = (ast, options = {}) => {
  const macros = Object.entries(options.defines || {}).reduce(
    (defines, [name, body]) => ({ ...defines, [name]: { body } }),
    {}
  );
  // const defineValues = { ...options.defines };
  const { preserve, ignoreMacro } = options;
  const preserveNode = shouldPreserve(preserve);

  visit(ast, {
    conditional: {
      enter: (path) => {
        const { node } = path;
        // TODO: Determining if we need to handle edge case conditionals here
        if (preserveNode(path)) {
          return;
        }

        // Expand macros
        expandInExpressions(
          macros,
          node.ifPart.expression,
          ...node.elseIfParts.map((elif) => elif.expression),
          node.elsePart?.expression
        );

        if (evaluateIfPart(macros, node.ifPart)) {
          path.replaceWith(node.ifPart.body);
          // Keeping this commented out block in case I can find a way to
          // conditionally evaluate shaders
          // path.replaceWith({
          //   ...node,
          //   ifPart: node.ifPart.body,
          //   elsePart: null,
          //   endif: null,
          //   wsEnd: null, // Remove linebreak after endif
          // });
        } else {
          const elseBranchHit = node.elseIfParts.reduce(
            (res, elif) =>
              res ||
              (evaluteExpression(elif.expression, macros) &&
                (path.replaceWith(elif.body) || true)),
            false
          );
          if (!elseBranchHit) {
            if (node.elsePart) {
              path.replaceWith(node.elsePart.body);
            } else {
              path.remove();
            }
          }
        }
      },
    },
    text: {
      enter: (path) => {
        path.node.text = expandMacros(path.node.text, macros);
      },
    },
    define_arguments: {
      enter: (path) => {
        const {
          identifier: { identifier },
          body,
          define,
          lp,
          args,
          rp,
        } = path.node;

        macros[identifier] = { args, body };
        !preserveNode(path) && path.remove();
      },
    },
    define: {
      enter: (path) => {
        const {
          identifier: { identifier },
          body,
        } = path.node;

        // TODO: Abandoning this for now until I know more concrete use cases
        // const shouldIgnore = ignoreMacro?.(identifier, body);
        // defineValues[identifier] = body;

        // if (!shouldIgnore) {
        macros[identifier] = { body };
        !preserveNode(path) && path.remove();
        // }
      },
    },
    undef: {
      enter: (path) => {
        delete macros[path.node.identifier.identifier];
        !preserveNode(path) && path.remove();
      },
    },
    error: {
      enter: (path) => {
        if (options.stopOnError) {
          throw new Error(path.node.message);
        }
        !preserveNode(path) && path.remove();
      },
    },
    pragma: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
    version: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
    extension: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
    // TODO: Causes a failure
    line: {
      enter: (path) => {
        !preserveNode(path) && path.remove();
      },
    },
  });

  // Even though it mutates, useful for passing around functions
  return ast;
};

module.exports = { preprocessAst, preprocessComments };
