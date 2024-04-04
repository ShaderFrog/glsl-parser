import generate from './generator.js';
import {
  preprocessAst,
  preprocessComments,
  PreprocessorOptions,
} from './preprocessor.js';

// This index file is currently only for package publishing, where the whole
// library exists in the dist/ folder, so the below import is relative to dist/
import * as parser from './preprocessor-parser.js';

// Should this be in a separate file? There's no tests for it either
const preprocess = (src: string, options: PreprocessorOptions) =>
  generate(
    preprocessAst(
      parser.parse(options.preserveComments ? src : preprocessComments(src)),
      options
    )
  );

export default preprocess;

export { preprocessAst, preprocessComments, generate, preprocess, parser };
