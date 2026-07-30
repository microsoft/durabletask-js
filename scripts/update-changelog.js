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

// One-time normalization for the legacy azure-functions-durable changelog. It ships as a
// placeholder skeleton ("# Changelog" + "## TBD" + a "Details to be finalized" bullet) instead of
// the "## Upcoming"/"## v*" structure this script expects. Left as-is, the first release would
// prepend new sections and strand that skeleton at the bottom, producing a mixed-format file.
// Match ONLY that exact pristine skeleton (CRLF/LF tolerant) and swap in the standard empty
// Upcoming scaffold; any real curated "## TBD" notes have a different shape and are left untouched.
const nonEmptyLines = content.split('\n').map((line) => line.replace(/\r$/, '').trim()).filter(Boolean);
const isLegacySkeleton =
  nonEmptyLines.length === 3 &&
  nonEmptyLines[0] === '# Changelog' &&
  nonEmptyLines[1] === '## TBD' &&
  nonEmptyLines[2] === '- Details to be finalized at release time.';
if (isLegacySkeleton) {
  content = '## Upcoming\n\n### New\n\n### Fixes\n';
}

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
    if (!heading) {
      // Lead-in body text before the first "### " subsection (e.g. a preview notice). Promote it
      // too, ahead of the subsections; a whitespace-only scaffold gap promotes nothing.
      const lead = part.trim();
      if (lead) kept.push(lead);
      continue;
    }
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
