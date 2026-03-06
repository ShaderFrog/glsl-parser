import { execSync } from 'child_process';

export const setup = () => {
  execSync(
    'npx peggy --cache --format es --allowed-start-rules program,constant_expression -o src/preprocessor/preprocessor-parser.js src/preprocessor/preprocessor-grammar.pegjs'
  );
};
