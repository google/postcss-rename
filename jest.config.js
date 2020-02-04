module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^com_google_closure_stylesheets/(.*)$': '<rootDir>/$1',
  }
};
