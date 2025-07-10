
const path = require('path');
const fs = require('fs');
const binaryen = require('binaryen');
// C:\Users\cbxaf\rust\sandspiel\crate\pkg\sandtable_bg.wasm
let fp = path.resolve(__dirname, './crate/pkg/sandtable_bg.wasm');
const originBuffer = fs.readFileSync(fp);

const wasm = binaryen.readBinary(originBuffer);
const wast = wasm.emitText()
    .replace(/\(br_if \$label\$1[\s\n]+?\(i32.eq\n[\s\S\n]+?i32.const -1\)[\s\n]+\)[\s\n]+\)/g, '');
const distBuffer = binaryen.parseText(wast).emitBinary();

fs.writeFileSync(fp, distBuffer);