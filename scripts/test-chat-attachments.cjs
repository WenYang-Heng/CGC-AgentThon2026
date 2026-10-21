const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');
class FileReader {
  readAsDataURL(file) {
    if (file.fail) { this.onerror(); return; }
    this.result = `data:application/octet-stream;base64,${Buffer.from(file.bytes ?? 'test').toString('base64')}`;
    this.onload();
  }
}
const context = vm.createContext({ exports: {}, FileReader });
vm.runInContext(ts.transpileModule(fs.readFileSync('lib/chat-attachments.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const { validateChatFiles, prepareChatAttachments } = context.exports;
test('file validation rejects unsupported, empty, oversized, excessive and combined oversized selections', () => {
  assert.doesNotThrow(() => validateChatFiles([{ name: 'Bill.PDF', size: 100 }, { name: 'notes.txt', size: 5 }]));
  assert.throws(() => validateChatFiles([{ name: 'script.exe', size: 20 }]), /use PDF/);
  assert.throws(() => validateChatFiles([{ name: 'empty.pdf', size: 0 }]), /empty/);
  assert.throws(() => validateChatFiles([{ name: 'big.pdf', size: 16 * 1024 * 1024 }]), /15 MB/);
  assert.throws(() => validateChatFiles(Array(6).fill({ name: 'bill.pdf', size: 1 })), /up to 5/);
  assert.throws(() => validateChatFiles(Array(2).fill({ name: 'bill.pdf', size: 11 * 1024 * 1024 })), /total 20 MB/);
});
test('multiple attachments preserve bytes, names and canonical MIME without local blob URLs', async () => {
  const attachments = await prepareChatAttachments([{ name: 'Bill.PDF', size: 4, bytes: 'bill' }, { name: 'notes.txt', size: 5, bytes: 'notes' }]);
  assert.equal(attachments.length, 2);
  assert.equal(attachments[0].contentUrl, 'data:application/pdf;base64,YmlsbA==');
  assert.equal(attachments[1].contentType, 'text/plain');
  assert.equal(attachments[1].name, 'notes.txt');
  await assert.rejects(prepareChatAttachments([{ name: 'bad.pdf', size: 1, fail: true }]), /Could not read bad.pdf/);
});
