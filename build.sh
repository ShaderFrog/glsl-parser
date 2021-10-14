#!/bin/bash
set -e

# Clean the output dir
rm -rf dist/
mkdir -p dist

# Compile the typescript project
npx tsc

# Build the parers with peggy. Requires tsc to run first for the subfolders
npx peggy --cache -o dist/parser/parser.js parser/glsl-grammar.pegjs
# Manualy copy in the type definitions
cp parser/parser.d.ts dist/parser/parser.d.ts

npx peggy --cache -o dist/preprocessor/preprocessor-parser.js preprocessor/preprocessor-grammar.pegjs
cp preprocessor/preprocessor-parser.d.ts dist/preprocessor/preprocessor-parser.d.ts
