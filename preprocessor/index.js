const generate = require('./generator.js');
const { preprocessAst, preprocessComments } = require('./preprocessor.js');
const parser = require('../dist/preprocssorParser.js');

// Should this be in a separate file? There's no tests for it either
const preprocess = (src, options) =>
  generate(
    preprocessAst(
      parser.parse(options.preserveComments ? src : preprocessComments(src)),
      options
    )
  );

module.exports = {
  default: preprocess,
  preprocessAst,
  preprocessComments,
  generate,
  preprocess,
  parser,
};
