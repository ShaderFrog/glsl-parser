#!/bin/bash
set -e

# Test that the published package contains all required type declaration files.
# Run this before publishing to catch missing .d.ts files.

PACK_OUTPUT=$(npm pack --dry-run 2>&1)

REQUIRED_FILES=(
  "parser/parser.d.ts"
  "preprocessor/preprocessor-parser.d.ts"
  "index.d.ts"
  "parser/index.d.ts"
  "preprocessor/index.d.ts"
  "ast/index.d.ts"
)

FAILED=0
for FILE in "${REQUIRED_FILES[@]}"; do
  if echo "$PACK_OUTPUT" | grep -q "$FILE"; then
    echo "  ok  $FILE"
  else
    echo "MISSING $FILE"
    FAILED=1
  fi
done

if [ $FAILED -ne 0 ]; then
  echo ""
  echo "Publish type check FAILED — missing .d.ts files in package"
  exit 1
else
  echo ""
  echo "Publish type check passed"
fi
