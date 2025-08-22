#!/bin/bash
set -e

# Clean the output dir
rm -rf dist/
mkdir -p dist
mkdir -p dist/parser
mkdir -p dist/preprocessor
# Compile the typescript project
npx tsc

npx peggy --cache --format es -o dist/parser/parser.js src/parser/glsl-grammar.pegjs

# Manualy copy in the type definitions
cp src/parser/parser.d.ts dist/parser/

npx peggy --cache --format es --allowed-start-rules program,constant_expression -o dist/preprocessor/preprocessor-parser.js src/preprocessor/preprocessor-grammar.pegjs
cp src/preprocessor/preprocessor-parser.d.ts dist/preprocessor/preprocessor-parser.d.ts
