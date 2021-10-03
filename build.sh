#!/bin/bash
mkdir -p dist
npx peggy -o dist/parser/parser.js parser/glsl-grammar.pegjs
npx peggy -o dist/preprocessor/preprocessor-parser.js preprocessor/preprocessor-grammar.pegjs
npx tsc
