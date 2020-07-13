module.exports = {
  preset: 'ts-jest',
  verbose: true,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  roots: [
    "packages/",
  ],
};
