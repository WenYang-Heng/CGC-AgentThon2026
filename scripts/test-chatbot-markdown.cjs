const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

test('assistant Markdown renders structure and safe citations without raw HTML', async () => {
  const ast = ts.createSourceFile('Chatbot.tsx', fs.readFileSync('components/chatbot/Chatbot.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const renderer = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'AssistantMessage');
  const context = vm.createContext({
    exports: {},
    ReactMarkdown: (await import('react-markdown')).default,
    remarkGfm: (await import('remark-gfm')).default,
    styles: { markdown: 'markdown', markdownTable: 'markdown-table' }, require,
  });
  vm.runInContext(ts.transpileModule(renderer.getText(ast), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 } }).outputText, context);
  const html = renderToStaticMarkup(React.createElement(context.AssistantMessage, { text: '## January consumption\n\n- **F06:** 4,073 kWh\n- Baseline comparison\n\n[Source](https://example.com/source)\n\n[1]\n\n[1]: cite:1 "Citation-1"\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n| Year | kWh |\n| --- | --- |\n| 2026 | 4073 |' }));
  assert.ok(html.includes('<h2>January consumption</h2>'));
  assert.ok(html.includes('<ul>')); assert.ok(html.includes('<strong>F06:</strong>'));
  assert.ok(html.includes('href="https://example.com/source"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('<table>'));
  assert.ok(!html.includes('<script')); assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="cite:')); assert.ok(html.includes('<span>1</span>'));
});
