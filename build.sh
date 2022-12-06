#!/bin/bash
set -e

# Clean the output dir
rm -rf dist/
mkdir -p dist

# Compile the typescript project
npx tsc

# Build the parers with peggy. Requires tsc to run first for the subfolders
npx peggy --cache -o dist/parser/parser.js src/parser/glsl-grammar.pegjs
# Manualy copy in the type definitions
cp src/parser/parser.d.ts dist/parser/parser.d.ts

npx peggy --cache -o dist/preprocessor/preprocessor-parser.js src/preprocessor/preprocessor-grammar.pegjs
cp src/preprocessor/preprocessor-parser.d.ts dist/preprocessor/preprocessor-parser.d.ts
