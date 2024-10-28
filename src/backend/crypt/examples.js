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
  public_key_signing()

})();

function random_uniform() {         
  console.log('random_uniform')                       
  const { hydro_random_uniform } = instance.exports
  console.log(hydro_random_uniform(20));                                                      // Testing a simple case of passing integers and fetching integers
}

function hash() {
  console.log('hash')
  const { hydro_hash_hash } = instance.exports
  const context = 'Examples\0';                                                               // libhydrogen's namespacing concept needs to be null terminated as context arg expected to char[]
  const contextArr = new Uint8Array(dataview.buffer, 0, context.length)
  Buffer.from(context).copy(contextArr)                                                       // Copying context to shared buffer
  const message = 'Arbitrary data to hash';                                                   // Our message to be hashed
  const messageArr = new Uint8Array(dataview.buffer, contextArr.byteOffset +
    contextArr.byteLength, message.length)
  Buffer.from(message).copy(messageArr)                                                       // Copying message to shared buffer
  const hash = new Uint8Array(dataview.buffer, messageArr.byteOffset +                        // Creating a typed array as hydro_hash_hash expects i32s
    messageArr.byteLength, 32)                                         
  hydro_hash_hash(hash.byteOffset, hash.length, messageArr.byteOffset,                        // Call the imported hashing function
    messageArr.byteLength, contextArr.byteOffset, null)
  console.log(`hash - ${Buffer.from(hash).toString('hex')}`);
  contextArr.fill(0);
  messageArr.fill(0)
  hash.fill(0)
}

function keyed_hash() {
  console.log('keyed_hash')
  const context = 'Examples\0';                                                               // libhydrogen's namespacing concept needs to be null terminated as context arg expected to char[]
  const contextArr = new Uint8Array(dataview.buffer, 0, context.length)
  Buffer.from(context).copy(contextArr)
  const message = 'Arbitrary data to hash'
  const messageArr = new Uint8Array(dataview.buffer, contextArr.byteOffset +
    contextArr.byteLength, message.length)
  Buffer.from(message).copy(messageArr)
  const { hydro_hash_keygen, hydro_hash_hash } = instance.exports                             // Importing libhydrogen's hashing keygen and hash functions
  const key = new Uint8Array(dataview.buffer, messageArr.byteOffset +                         // Creating buffer for sharing key
    messageArr.byteLength, 32)                                         
  const keyedhash = new Uint8Array(dataview.buffer, key.byteOffset + key.byteLength, 32)      // Creating buffer for keyed hash
  hydro_hash_keygen(key.byteOffset);                                                          // Generating hashing key
  console.log(`key - ${Buffer.from(key).toString('hex')}`);

  hydro_hash_hash(keyedhash.byteOffset, keyedhash.length, messageArr.byteOffset,              // Hashing message with key
    messageArr.byteLength, contextArr.byteOffset, key.byteOffset);
  const khash1 = Buffer.from(keyedhash).toString('hex')
  console.log(`khash1 - ${khash1}`);
  keyedhash.fill(0);                                                                          // Resetting output buffer (seems to pollute state otherwise)

  hydro_hash_hash(keyedhash.byteOffset, keyedhash.length, messageArr.byteOffset,              // Hashing message with key again
    messageArr.byteLength, contextArr.byteOffset, key.byteOffset);
  const khash2 = Buffer.from(keyedhash).toString('hex')
  console.log(`khash2 - ${khash2}`);
  keyedhash.fill(0);

  if(khash1 == khash2)                                                                        // Checking that the same hash is generated
    console.log('khash1 equals khash2')

  const presetKey = '40b31481206dbf0dd39e89cdf17e0a46ba0d9d9d2d8b51e76fae9788141a6037'        // Testing whether we can load a key and generate a matching hash created previously
  console.log(`presetKey - ${presetKey}`);  
  const historicHash = '464be316ad9980643e0bb34ca56f1bdd5f00a4615ecb23e0d597c89c90d441bb'
  console.log(`historicHash - ${historicHash}`);  

  Buffer.from(presetKey, 'hex').copy(key)                                                     // Copying presetKey into key's buffer

  hydro_hash_hash(keyedhash.byteOffset, keyedhash.length, messageArr.byteOffset,              // Hashing message with presetKey
    messageArr.byteLength, contextArr.byteOffset, key.byteOffset);
  const khash3 = Buffer.from(keyedhash).toString('hex')
  console.log(`khash3 - ${khash3}`);  
  if(khash3 == historicHash)                                                                  // Testing hash matches historicHash
    console.log('khash3 using old key, matches historicHash')
  if(khash1 != khash3)                                                                        // ...and doesn't match the hashes with the latest key
    console.log('khash3 does not equal khash1')
  contextArr.fill(0);
  messageArr.fill(0);
  keyedhash.fill(0);
  key.fill(0);
}

function public_key_signing() {
  console.log('public_key_signing')
  const context = 'Examples\0';                                                               // libhydrogen's namespacing concept needs to be null terminated as context arg expected to char[]
  const contextArr = new Uint8Array(dataview.buffer, 0, context.length)
  Buffer.from(context).copy(contextArr)
  const message = 'Arbitrary data to sign'
  const messageArr = new Uint8Array(dataview.buffer, contextArr.byteOffset +
    contextArr.byteLength, message.length)
  Buffer.from(message).copy(messageArr)
  const hydro_sign_BYTES = 64
  const hydro_sign_PUBLICKEYBYTES = 32
  const hydro_sign_SECRETKEYBYTES = 64

  const { hydro_sign_keygen, hydro_sign_create, hydro_sign_verify } = instance.exports        // Importing libhydrogen's signing keygen and signing and verification functions
  const keypair = new Uint8Array(dataview.buffer, messageArr.byteOffset +                     // Reserving memory for the keypair
    messageArr.byteLength, hydro_sign_PUBLICKEYBYTES + hydro_sign_SECRETKEYBYTES)
  hydro_sign_keygen(keypair.byteOffset)                                                       // Generating keypair

  const signature = new Uint8Array(dataview.buffer, keypair.byteOffset + keypair.byteLength,  // Reserving memory for the signature
    hydro_sign_BYTES)

  hydro_sign_create(signature.byteOffset, messageArr.byteOffset,                              // Creating signature of message with secret key
    messageArr.byteLength, contextArr.byteOffset, keypair.byteOffset +
    hydro_sign_PUBLICKEYBYTES)
  
  console.log(`signature - ${Buffer.from(signature).toString('hex')}`);

  const res = hydro_sign_verify(signature.byteOffset, messageArr.byteOffset,                  // Verifying signature with public key
    messageArr.byteLength, contextArr.byteOffset, keypair.byteOffset)
  
  if(res == 0)
    console.log('Signature is correctly valid')
  signature.set([0])                                                                          // Modifying signature
  console.log(`signature - ${Buffer.from(signature).toString('hex')}`);

  manipulatedRes = hydro_sign_verify(signature.byteOffset, messageArr.byteOffset,             // Reverifying signature
    messageArr.byteLength, contextArr.byteOffset, keypair.byteOffset)
  if(manipulatedRes != 0)
    console.log('Signature is correctly invalid')
  contextArr.fill(0);
  messageArr.fill(0);
  keypair.fill(0);
  signature.fill(0);
}