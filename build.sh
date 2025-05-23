#!/bin/bash
set -e

# Clean the output dir
rm -rf dist/
mkdir -p dist

# Compile the typescript project
npx tsc

npx peggy --cache --format es -o dist/parser/parser.js src/parser/glsl-grammar.pegjs
# Manualy copy in the type definitions
cp src/parser/parser.d.ts dist/parser/

npx peggy --cache --format es -o dist/preprocessor/preprocessor-parser.js src/preprocessor/preprocessor-grammar.pegjs
cp src/preprocessor/preprocessor-parser.d.ts dist/preprocessor/preprocessor-parser.d.ts
