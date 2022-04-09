/* eslint-disable no-template-curly-in-string */
module.exports = {
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/npm",
      {
        npmPublish: false,
      },
    ],
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json", "package-lock.json"],
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: "dist/**/*",
      },
    ],
  ],
  preset: "angular",
  branches: [{ name: "master" }, { name: "dev", prerelease: true }],
};
