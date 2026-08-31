'use strict';

const fs = require('fs');
const path = require('path');
const { Prism } = require('../scripts/prism-custom');

const postsDir = path.resolve(__dirname, '../source/_posts');
const allowed = new Set([
  '', 'text', 'plaintext', 'none',
  'c', 'cpp', 'rust', 'js', 'javascript', 'html', 'markup', 'css',
  'bash', 'shell', 'yaml', 'json',
  'nasm', 'arm-gas', 'riscv', 'devicetree', 'kconfig',
  'cmake', 'makefile', 'ld', 'linker-script', 'tcl'
]);
const forbidden = new Set(['asm', 'dts', 'cmakelist']);
const errors = [];
const seen = new Map();

function inspectFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let fence = null;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const match = line.match(/^\s*(`{3,}|~{3,})([^\s`]*)\s*$/);
    if (!match) continue;

    const marker = match[1];
    const language = match[2];
    if (!fence) {
      fence = { marker: marker[0], length: marker.length, line: index + 1, language };
      const normalized = language.toLowerCase();
      seen.set(normalized, (seen.get(normalized) || 0) + 1);
      if (language && language !== normalized && !['C++'].includes(language)) {
        errors.push(`${path.basename(file)}:${index + 1}: language identifiers must be lowercase: ${language}`);
      }
      if (forbidden.has(normalized)) {
        errors.push(`${path.basename(file)}:${index + 1}: unsupported legacy language: ${language}`);
      } else if (!allowed.has(normalized)) {
        errors.push(`${path.basename(file)}:${index + 1}: unsupported language: ${language || '(plain)'}`);
      }
    } else if (marker[0] === fence.marker && marker.length >= fence.length && !language) {
      fence = null;
    }
  }

  if (fence) errors.push(`${path.basename(file)}:${fence.line}: unclosed code fence`);
}

for (const name of fs.readdirSync(postsDir).filter(name => name.endsWith('.md')).sort()) {
  inspectFile(path.join(postsDir, name));
}

const grammarSamples = {
  'arm-gas': '.syntax unified\n_start:\n  mov r0, #1 @ load value',
  riscv: '.section .text\n_start:\n  li a0, 1 # load value',
  devicetree: '/dts-v1/;\n&uart1 { status = "okay"; };',
  kconfig: 'config GPIO\n  bool "GPIO support"\n  default y'
};

for (const [language, sample] of Object.entries(grammarSamples)) {
  const grammar = Prism.languages[language];
  if (!grammar) {
    errors.push(`custom grammar is not registered: ${language}`);
    continue;
  }
  const rendered = Prism.highlight(sample, grammar, language);
  if (!rendered.includes('<span class="token ')) {
    errors.push(`custom grammar produced no token markup: ${language}`);
  }
}

for (const alias of ['armgas', 'riscv-asm', 'dts']) {
  if (!Prism.languages[alias]) errors.push(`custom alias is not registered: ${alias}`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

const summary = [...seen.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([language, count]) => `${language || 'plain'}=${count}`)
  .join(', ');
console.log(`Code-block validation passed: ${summary}`);
