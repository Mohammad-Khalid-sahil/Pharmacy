const fs = require('fs');
const path = require('path');
const asarPath = path.join(__dirname, '..', 'release', 'win-unpacked', 'resources', 'app.asar');
if (!fs.existsSync(asarPath)) { console.error('app.asar not found:', asarPath); process.exit(2); }
const buf = fs.readFileSync(asarPath);
console.log('buf len', buf.length);
console.log('first 16 bytes hex:', buf.slice(0, 16).toString('hex'));
const headerSize = buf.readUInt32LE(0);
console.log('headerSize (LE):', headerSize);
const headerJson = buf.slice(4, 4 + headerSize).toString('utf8');
let header;
try { header = JSON.parse(headerJson); } catch (e) { console.error('Failed parse header', e); process.exit(3); }
const base = 4 + headerSize;
function findFileNode(parts, node = header.files) {
  if (!parts.length) return null;
  const [first, ...rest] = parts;
  const entry = node[first];
  if (!entry) return null;
  if (rest.length === 0) return entry;
  if (!entry.files) return null;
  return findFileNode(rest, entry.files);
}
const targetPath = ['electron','localRepository.js'];
const node = findFileNode(targetPath);
if (!node) { console.error('electron/localRepository.js not found in asar'); process.exit(4); }
if (!node.size || !node.offset) { console.error('node missing offset/size', node); process.exit(5); }
const offset = parseInt(node.offset, 10);
const size = parseInt(node.size, 10);
const content = buf.slice(base + offset, base + offset + size).toString('utf8');
console.log('--- snippet start ---');
console.log(content.slice(0, 4000));
console.log('--- snippet end ---');
const checks = [
  'mkdirSync(this.dbDir, { recursive: true })',
  'userData:',
  "ensureDefaultAdmin started",
  'users.db creation failed',
  'dbDir exists before mkdir',
  'LocalRepository init started'
];
checks.forEach((c)=>{
  console.log(c, '=>', content.includes(c));
});
console.log('search for login logging:', content.includes("Login email:"));
process.exit(0);
