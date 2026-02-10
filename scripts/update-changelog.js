#!/usr/bin/env node
// This script updates CHANGELOG.md with a new release section
// Usage: node update-changelog.js <version> <date> <changelog-file>

const fs = require('fs');

const [,, version, releaseDate, changelogFile] = process.argv;

if (!version || !releaseDate || !changelogFile) {
  console.error('Usage: node update-changelog.js <version> <date> <changelog-file>');
  process.exit(1);
}

const changelogContent = fs.readFileSync(changelogFile, 'utf8').trim();
let content = fs.readFileSync('CHANGELOG.md', 'utf8');

const newSection = `## v${version} (${releaseDate})

### Changes

${changelogContent}
`;

// Find the Upcoming section and insert after it
const upcomingMatch = content.match(/## Upcoming[\s\S]*?(?=\n## v|$)/);
if (upcomingMatch) {
  const upcomingEnd = content.indexOf(upcomingMatch[0]) + upcomingMatch[0].length;
  content = content.slice(0, upcomingEnd) + '\n' + newSection + content.slice(upcomingEnd);
} else {
  content = '## Upcoming\n\n' + newSection + content;
}

// Reset the Upcoming section to empty
content = content.replace(/## Upcoming[\s\S]*?(?=\n## v)/, '## Upcoming\n\n### New\n\n### Fixes\n\n');

fs.writeFileSync('CHANGELOG.md', content);
console.log('Updated CHANGELOG.md');
