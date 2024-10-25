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
var instance, dataview;

(async () => {
  const wasm = await WebAssembly.compile(
    await readFile('../../../build/backend/vendor/libhydrogen/libhydrogen.wasm')              // Fetching our wasm built during npm install
  );
  instance = await WebAssembly.instantiate(wasm, imports);
  wasi.start(instance);                                                                       // We must call a start method per WASI specification
                                                                                              // Libhydrogen's main method is one we have patched to initialise it
  const memory = instance.exports.memory                                                      // Importing memory object
  dataview = new DataView(memory.buffer);                                                     // DataView takes care of our platform specific endian conversions
  console.log(dataview)                                                                       // Visually checking the underlying arraybuffer is zero'd

  random_uniform()
  hash()

})();

function random_uniform() {                                
  const { hydro_random_uniform } = instance.exports
  console.log(hydro_random_uniform(20));                                                      // Testing a simple case of passing integers and fetching integers
}

function hash() {
  const { hydro_hash_hash } = instance.exports
  const array = new Uint8Array(dataview.buffer, 0, 32)                                        // Creating a typed array as hydro_hash_hash expects i32s
  const context = 'Examples';                                                                 // libhydrogen's namespacing concept
  const message = 'Arbitrary data to hash';                                                   // Our message to be hashed
  hydro_hash_hash(array.byteOffset, array.length, Buffer.from(message),                       // Call the imported hashing function
    Buffer.from(message).length, Buffer.from(context), null)
  const hash = Buffer.from(array).toString('hex')                                             // Outputting hash as string
  console.log(hash);
}