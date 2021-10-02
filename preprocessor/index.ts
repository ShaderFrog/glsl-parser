import generate from './generator';
import { preprocessAst, preprocessComments } from './preprocessor';
import parser from '../dist/preprocssorParser';

// Should this be in a separate file? There's no tests for it either
const preprocess = (src, options) =>
  generate(
    preprocessAst(
      parser.parse(options.preserveComments ? src : preprocessComments(src)),
      options
    )
  );

export default preprocess;

export { preprocessAst, preprocessComments, generate, preprocess, parser };
