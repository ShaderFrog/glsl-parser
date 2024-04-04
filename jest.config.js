export default {
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json', 'pegjs', 'glsl'],
  modulePathIgnorePatterns: ['src/parser/parser.js'],
  testPathIgnorePatterns: ['dist', 'src/parser/parser.js'],
  preset: 'ts-jest',
  resolver: 'ts-jest-resolver',
  // ts-jest is horrifically slow https://github.com/kulshekhar/ts-jest/issues/259#issuecomment-1332269911
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
};
