const pkgRoot = 'dist/ngx-feature-proxy';

module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'angular' }],
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    [
      '@semantic-release/exec',
      {
        verifyConditionsCmd: 'yarn build',
        prepareCmd: 'echo "Build completed!"',
      },
    ],
    ['@semantic-release/npm', { pkgRoot, npmPublish: true, tarballDir: 'dist' }],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
    '@semantic-release/github',
  ],
};
