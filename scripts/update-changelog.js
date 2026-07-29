#!/usr/bin/env node
// This script updates a changelog file with a new release section.
// Usage: node update-changelog.js <version> <date> <changelog-file> [target-changelog]
//   <changelog-file>    file containing the generated changelog entries to insert
//   [target-changelog]  changelog to update in place (default: CHANGELOG.md)

const fs = require('fs');

const [,, version, releaseDate, changelogFile, targetChangelog = 'CHANGELOG.md'] = process.argv;

if (!version || !releaseDate || !changelogFile) {
  console.error('Usage: node update-changelog.js <version> <date> <changelog-file> [target-changelog]');
  process.exit(1);
}

const changelogContent = fs.readFileSync(changelogFile, 'utf8').trim();
let content = fs.readFileSync(targetChangelog, 'utf8');

// Promote any curated notes from the current "## Upcoming" section into the release section.
// A subsection that is just an empty scaffold heading (e.g. "### New" with nothing under it) is
// dropped, so cutting a release with an untouched Upcoming section promotes nothing and produces
// byte-for-byte the same output as before.
let promoted = '';
const currentUpcoming = content.match(/## Upcoming[\s\S]*?(?=\n## v|$)/);
if (currentUpcoming) {
  const body = currentUpcoming[0].replace(/^## Upcoming[^\n]*\n?/, '');
  const kept = [];
  for (const part of body.split(/(?=^### )/m)) {
    const heading = part.match(/^### [^\n]*/);
    if (!heading) continue; // whitespace before the first subsection heading
    const subContent = part.slice(heading[0].length).trim();
    if (subContent) {
      kept.push(`${heading[0].trim()}\n\n${subContent}`);
    }
  }
  promoted = kept.join('\n\n');
}

const newSection = `## v${version} (${releaseDate})

${promoted ? promoted + '\n\n' : ''}### Changes

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

fs.writeFileSync(targetChangelog, content);
console.log(`Updated ${targetChangelog}`);
