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

  random_uniform()
  hash()
  keyed_hash()

})();

function random_uniform() {         
  console.log('random_uniform')                       
  const { hydro_random_uniform } = instance.exports
  console.log(hydro_random_uniform(20));                                                      // Testing a simple case of passing integers and fetching integers
}

function hash() {
  console.log('hash')
  const { hydro_hash_hash } = instance.exports
  const hash = new Uint8Array(dataview.buffer, 0, 32)                                         // Creating a typed array as hydro_hash_hash expects i32s
  const context = 'Examples';                                                                 // libhydrogen's namespacing concept
  const message = 'Arbitrary data to hash';                                                   // Our message to be hashed
  hydro_hash_hash(hash.byteOffset, hash.length, Buffer.from(message),                         // Call the imported hashing function
    Buffer.from(message).length, Buffer.from(context), null)
  console.log(`hash - ${Buffer.from(hash).toString('hex')}`);
  hash.fill(0, 0, 32);
}

function keyed_hash() {
  console.log('keyed_hash')
  const context = "Examples"
  const message = "Arbitrary data to hash"

  const { hydro_hash_keygen, hydro_hash_hash } = instance.exports                             // Importing libhydrogen's hashing keygen and hash functions
  const keyedhash = new Uint8Array(dataview.buffer, 0, 32)                                    // Using first 128bits of memory to store hash
  const key = new Uint8Array(dataview.buffer, 32, 32)                                         // Using second 128bits of memory to store key

  hydro_hash_keygen(key.byteOffset);                                                          // Generating hashing key
  console.log(`key - ${Buffer.from(key).toString('hex')}`);

  hydro_hash_hash(keyedhash.byteOffset, keyedhash.length, Buffer.from(message),               // Hashing message with key
    Buffer.from(message).length, Buffer.from(context), key.byteOffset);
  const khash1 = Buffer.from(keyedhash).toString('hex')
  console.log(`khash1 - ${khash1}`);
  keyedhash.fill(0, 0, 32);                                                                   // Resetting output buffer (seems to pollute state otherwise)

  hydro_hash_hash(keyedhash.byteOffset, keyedhash.length, Buffer.from(message),               // Hashing message with key again
    Buffer.from(message).length, Buffer.from(context), key.byteOffset);
  const khash2 = Buffer.from(keyedhash).toString('hex')
  console.log(`khash2 - ${khash2}`);
  keyedhash.fill(0, 0, 32);

  if(khash1 == khash2)                                                                        // Checking that the same hash is generated
    console.log('khash1 equals khash2')

  const presetKey = '40b31481206dbf0dd39e89cdf17e0a46ba0d9d9d2d8b51e76fae9788141a6037'        // Testing whether we can load a key and generate a matching hash created previously
  console.log(`presetKey - ${presetKey}`);  
  const historicHash = '68cf508b03c92aff20d75816b233b4a755247045e326bd5dad4f6572ddbf9f98'
  console.log(`historicHash - ${historicHash}`);  

  Buffer.from(presetKey, 'hex').copy(key, 0, 0, 32)                                           // Copying presetKey into key's buffer

  hydro_hash_hash(keyedhash.byteOffset, keyedhash.length, Buffer.from(message),               // Hashing message with presetKey
    Buffer.from(message).length, Buffer.from(context), key.byteOffset);
  const khash3 = Buffer.from(keyedhash).toString('hex')
  console.log(`khash3 - ${khash3}`);  
  if(khash3 == historicHash)                                                                  // Testing hash matches historicHash
    console.log('khash3 using old key, matches historicHash')
  if(khash1 != khash3)                                                                        // ...and doesn't match the hashes with the latest key
    console.log('khash3 does not equal khash1')
}