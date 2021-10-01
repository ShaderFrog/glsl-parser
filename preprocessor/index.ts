const generate = require('./generator.ts');
const { preprocessAst, preprocessComments } = require('./preprocessor.ts');
const parser = require('../dist/preprocssorParser.ts');

// Should this be in a separate file? There's no tests for it either
const preprocess = (src, options) =>
  generate(
    preprocessAst(
      parser.parse(options.preserveComments ? src : preprocessComments(src)),
      options
    )
  );

module.exports = preprocess;
preprocess.preprocessAst = preprocessAst;
preprocess.preprocessComments = preprocessComments;
preprocess.generate = generate;
preprocess.preprocess = preprocess;
preprocess.parser = parser;
