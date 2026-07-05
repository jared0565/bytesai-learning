const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

if (!isGitHubActions) {
  console.error([
    'Production deploys must run from GitHub Actions.',
    '',
    'Safe path:',
    '  1. Commit locally.',
    '  2. Push to the deployment branch.',
    '  3. Run or let the GitHub Actions deploy workflow deploy that exact commit.',
    '',
    'This prevents dirty local files, platform-specific node_modules, and temporary worktrees from being deployed.',
  ].join('\n'));
  process.exit(1);
}

console.error('Use npm run deploy:ci inside GitHub Actions.');
process.exit(1);
