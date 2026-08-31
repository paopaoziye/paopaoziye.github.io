'use strict';

const fs = require('fs');
const path = require('path');

const publicDir = path.resolve(__dirname, '../public');
const errors = [];
const htmlFiles = [];

function addError(file, message) {
  errors.push(`${path.relative(publicDir, file)}: ${message}`);
}

function resolveLocalReference(file, value) {
  if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(value)) return null;
  const clean = decodeURIComponent(value.split(/[?#]/, 1)[0]);
  if (!clean.startsWith('/')) return null;
  const relative = clean.replace(/^\/+/, '');
  const candidates = [
    path.join(publicDir, relative),
    path.join(publicDir, relative, 'index.html')
  ];
  if (relative.endsWith('/')) candidates.push(path.join(publicDir, relative, 'index.html'));
  return candidates;
}

function inspectHtml(file) {
  const source = fs.readFileSync(file, 'utf8');
  const ids = new Set();
  const idPattern = /\bid=["']([^"']+)["']/gi;
  let match;
  while ((match = idPattern.exec(source))) {
    if (ids.has(match[1])) addError(file, `duplicate id: ${match[1]}`);
    ids.add(match[1]);
  }

  const imagePattern = /<img\b[^>]*>/gi;
  while ((match = imagePattern.exec(source))) {
    const tag = match[0];
    const alt = tag.match(/\balt=["']([^"']*)["']/i);
    if (!alt || !alt[1].trim()) addError(file, 'image is missing a non-empty alt attribute');
    for (const attribute of ['src', 'data-original']) {
      const reference = tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, 'i'));
      if (!reference) continue;
      const candidates = resolveLocalReference(file, reference[1]);
      if (candidates && !candidates.some(candidate => fs.existsSync(candidate))) {
        addError(file, `${attribute} does not resolve: ${reference[1]}`);
      }
    }
  }

  const referencePattern = /\b(?:href|src|data-original)=["']([^"']+)["']/gi;
  while ((match = referencePattern.exec(source))) {
    const value = match[1];
    if (/^http:/i.test(value)) addError(file, `insecure HTTP resource: ${value}`);
    const candidates = resolveLocalReference(file, value);
    if (candidates && !candidates.some(candidate => fs.existsSync(candidate))) {
      addError(file, `local reference does not resolve: ${value}`);
    }
  }

  const scripts = [...source.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map(item => item[1].split(/[?#]/, 1)[0]);
  const seenScripts = new Set();
  for (const script of scripts) {
    if (seenScripts.has(script)) addError(file, `duplicate script: ${script}`);
    seenScripts.add(script);
  }

  for (const required of ['rel="canonical"', 'property="og:title"', 'name="twitter:card"']) {
    if (!source.includes(required)) addError(file, `missing ${required}`);
  }
  htmlFiles.push(file);
}

function walk(directory) {
  if (!fs.existsSync(directory)) {
    console.error('Generated site not found. Run npm run build first.');
    process.exit(1);
  }
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.html')) inspectHtml(target);
  }
}

walk(publicDir);
if (!htmlFiles.length) errors.push('no generated HTML files found');
if (!fs.existsSync(path.join(publicDir, 'search.xml'))) errors.push('missing generated search.xml');

const siteUrl = 'https://paopaoziye.github.io';
const atomPath = path.join(publicDir, 'atom.xml');
const sitemapPath = path.join(publicDir, 'sitemap.xml');
for (const [file, root, item, label] of [
  [atomPath, /<feed\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2005\/Atom["']/i, /<entry\b/i, 'Atom feed'],
  [sitemapPath, /<urlset\b[^>]*xmlns=["']http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9["']/i, /<url\b/i, 'sitemap']
]) {
  if (!fs.existsSync(file)) {
    errors.push(`missing generated ${label}: ${path.basename(file)}`);
    continue;
  }
  const xml = fs.readFileSync(file, 'utf8');
  if (!root.test(xml)) errors.push(`${label} has an unexpected root element`);
  if (!item.test(xml)) errors.push(`${label} contains no entries`);
  if (!xml.includes(siteUrl)) errors.push(`${label} contains no production site URL`);
  if (/https?:\/\//i.test(xml.replace(new RegExp(siteUrl, 'g'), '')) && /<(?:id|link|loc|uri)\b[^>]*>\s*http:\/\//i.test(xml)) {
    errors.push(`${label} contains an insecure HTTP URL`);
  }
}

if (!errors.length && htmlFiles.length) {
  const atomAlternate = /<link\b[^>]*rel=["']alternate["'][^>]*type=["']application\/atom\+xml["'][^>]*href=["'][^"']*atom\.xml["'][^>]*>/i;
  for (const file of htmlFiles) {
    if (!atomAlternate.test(fs.readFileSync(file, 'utf8'))) addError(file, 'missing Atom feed alternate link');
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Generated-site validation passed: ${htmlFiles.length} HTML files checked`);
