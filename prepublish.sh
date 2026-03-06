#!/bin/bash
set -e

# Copy compiled TypeScript to root level (for npm publishing).
# We use dist/src/* instead of dist/* to avoid polluting ./src/ with compiled JS files,
# which would break tests due to module identity issues (instanceof checks fail when
# the same class is loaded from both .ts and .js paths).
cp -r dist/src/* .

# Copy peggy-generated parsers to their directories (build.sh places these in
# dist/parser/ and dist/preprocessor/, separate from the compiled TypeScript in dist/src/)
cp dist/parser/parser.js parser/
cp dist/preprocessor/preprocessor-parser.js preprocessor/
