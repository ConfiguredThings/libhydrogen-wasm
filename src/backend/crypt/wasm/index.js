const { readFile } = require('node:fs/promises');
const { WASI } = require('node:wasi');
const { argv, env } = require('node:process');

const wasi = new WASI({
  version: 'preview1',
  args: argv,
  env,
  preopens: {},
});

const imports = wasi.getImportObject();

(async () => {
  const wasm = await WebAssembly.compile(
    await readFile('../../../../build/backend/vendor/libhydrogen/libhydrogen.wasm')           // Fetching our wasm built during npm install
  );
  const instance = await WebAssembly.instantiate(wasm, imports);

  wasi.start(instance);                                                                       // We must call a start method per WASI specification
                                                                                              // Libhydrogen's main method is one we have patched to initialise it
  const { hydro_random_uniform, hydro_hash_hash, memory } = instance.exports                  // Importing memory object and functions exported by the wasm
  
  console.dir(hydro_random_uniform(20));                                                      // Testing a simple case of passing integers and fetching integers
  
  const dv = new DataView(memory.buffer);                                                     // DataView takes care of our platform specific endian conversions
  console.log(dv)                                                                             // Visually checking the underlying arraybuffer is zero'd

  const array = new Int32Array(dv.buffer, 0, 32)                                              // Creating a typed array as hydro_hash_hash expects i32s
  const CONTEXT = "Examples";                                                                 // libhydrogen's namespacing concept
  const MESSAGE = "Arbitrary data to hash";                                                   // Our message to be hashed

  hydro_hash_hash(array.byteOffset, array.length, Buffer.from(MESSAGE),                       // Call the imported hashing function
    Buffer.from(MESSAGE).length, Buffer.from(CONTEXT), null)
  console.log(dv)                                                                             // Visually checking the underlying arraybuffer contains the hash

})();