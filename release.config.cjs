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
    ['@semantic-release/npm', { pkgRoot, npmPublish: true, tarballDir: 'release' }],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'yarn.lock'],
        message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
      },
    ],
    [
      '@semantic-release/github',
      {
        assets: 'release/*.tgz',
      },
    ],
  ],
};
