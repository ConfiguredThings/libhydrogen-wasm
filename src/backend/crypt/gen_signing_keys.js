//
// Helper to generate ane write signing keys into files
// that can then be used by backend (JS) and  Sonata (C) 
//

const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');
const { WASI } = require('node:wasi');
const { argv, env } = require('node:process');

const wasi = new WASI({
  version: 'preview1',
  args: argv,
  env,
  preopens: {},
});

// Globals for interacting with the WASI
const imports = wasi.getImportObject();
var instance, dataview;

var dir;

(async () => {

  if (argv.length < 3) {
    console.log(`usage: ${argv[1]} <dir>`);
    process.exit(-1);
  }

  if (!('WASM' in env)) {
    console.log(`$WASM not defined`);
    process.exit(-1);
  }

  try {
    mkdirSync(argv[2], {recursive: true});
  } catch (e) {
    console.log(`failed to create dir ${argv[2]}: ${e}`);
    process.exit(-1);  
  }

  // Load the Wasm
  const wasm = await WebAssembly.compile(
    readFileSync(env['WASM'])
  );
  instance = await WebAssembly.instantiate(wasm, imports);
  wasi.start(instance);
  
  // Importing the buffer which provides the interface to the WASM
  const memory = instance.exports.memory;
  dataview = new DataView(memory.buffer);

  // Create the signing keys
  gen_signing_keys(argv[2]);

})();

//
// Write a section of a buffer as a C style .h file
//
function dot_h(filename, name, buffer, offset, length) {
  let n=0;
  let o=offset;
  file = `static uint8_t ${name}[] = {\n`;
  for (i=0; i< length; i++) {
    let v = new Uint8Array(buffer, o, 1);
    file += `0x${Buffer.from(v).toString('hex')}, `
    o++;
    n++;
    if (n >= 16) {
      file += `\n`;
      n = 0;
    }
  }
  file += `};\n`
  try {
    writeFileSync(filename, file);
    console.log(`Created ${filename}`);
  } catch (e) {
    console.log(`Failed to write ${filename}: ${e}`);
  }
}

// Write a section of a buffer as hex string 
function dot_hex(filename, buffer, offset, length) {
  let v = new Uint8Array(buffer, offset, length);
  try {
    writeFileSync(filename, Buffer.from(v).toString('hex'))
    console.log(`Created ${filename}`);
  } catch (e) {
    console.log(`Failed to write ${filename}: ${e}`);
  }
}


//
// Generate a pair of signing keys
//
function gen_signing_keys(dir) {

  // Import libhydrogen's signing keygen
  const { hydro_sign_keygen } = instance.exports
  
  const hydro_sign_PUBLICKEYBYTES = 32;
  const hydro_sign_SECRETKEYBYTES = 64;
  const keyPairArr = new Uint8Array(dataview.buffer, 0, hydro_sign_PUBLICKEYBYTES + hydro_sign_SECRETKEYBYTES);
  
  const pubKeyOffset = keyPairArr.byteOffset;
  const privKeyOffset = keyPairArr.byteOffset + hydro_sign_PUBLICKEYBYTES;

  hydro_sign_keygen(pubKeyOffset)

  dot_h(join(dir, "pubKey.h"),  "pub_key", dataview.buffer,  pubKeyOffset,  hydro_sign_PUBLICKEYBYTES)  
  dot_h(join(dir, "privKey.h"), "priv_key", dataview.buffer, privKeyOffset, hydro_sign_SECRETKEYBYTES)  

  dot_hex(join(dir, "pubKey.hex"),  dataview.buffer, pubKeyOffset,  hydro_sign_PUBLICKEYBYTES)  
  dot_hex(join(dir, "privKey.hex"), dataview.buffer, privKeyOffset, hydro_sign_SECRETKEYBYTES)  

}

