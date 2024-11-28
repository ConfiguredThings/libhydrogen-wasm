const { readFile } = require('node:fs/promises');
const { WASI } = require('node:wasi');
const { argv, env } = require('node:process');
const { TextDecoder } = require('node:util');

const fs = require('fs');

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

  hash();
  test();
  
})();

////////////////////////////////////////////////////////////
//
// hash
//
///////////////////////////////////////////////////////////

function hash() {

    const hydro_hash_BYTES = 32;

    console.log('hash')

    let wasmBuffer = dataview.buffer;
    const { hydro_hash_hash } = instance.exports;

    const context = 'Examples';
    const contextOffset = 0;
    const contextArr = new Uint8Array(wasmBuffer, contextOffset, context.length)
    Buffer.from(context).copy(contextArr)
    
    const message = 'Arbitrary data to hash';
    const messageOffset = contextArr.byteOffset + contextArr.byteLength;
    const messageArr = new Uint8Array(wasmBuffer, messageOffset, message.length)
    Buffer.from(message).copy(messageArr)
    
    const hashOffset = messageArr.byteOffset + messageArr.byteLength;
    const hash = new Uint8Array(wasmBuffer, hashOffset, hydro_hash_BYTES);                                         
    
    const hashKey  = Buffer.from("1876bc54ddeeee715f9a191ec676fd45af4f008a05c21cc7cd67ecbceadb6c1f", "hex");
    const keyOffset = hash.byteOffset + hash.byteLength;
    const keyArr = new Uint8Array(wasmBuffer, keyOffset, hashKey.length)
    hashKey.copy(keyArr)
      
    console.log(`hash of ${message} with context ${context}`)
    // Hash without a key
    hydro_hash_hash(
      hash.byteOffset, 
      hash.length, 
      messageArr.byteOffset,
      messageArr.byteLength, 
      contextArr.byteOffset, 
      null)
    console.log(`hash - ${Buffer.from(hash).toString('hex')}`);


    // Hash with a key
    hydro_hash_hash(
      hash.byteOffset, 
      hash.length, 
      messageArr.byteOffset,
      messageArr.byteLength, 
      contextArr.byteOffset, 
      keyArr.byteOffset)
    console.log(`key - ${Buffer.from(keyArr).toString('hex')}`);  
    console.log(`hash - ${Buffer.from(hash).toString('hex')}`);

}

///////////////////////////////////////////////
//
// Pub key signature verify
//
///////////////////////////////////////////////

const pubKey  = Buffer.from("f0560a5b53ce2028f0cbe7cd197d3bae2cc03b354cdc55d912ca7a02074e9626", "hex");
const privKey = Buffer.from("d9293348c2abd81c3f52c827640860f10faaf9a9304dce71dde2f5f10fec502cf0560a5b53ce2028f0cbe7cd197d3bae2cc03b354cdc55d912ca7a02074e9626", "hex");
const message = Buffer.from("7b22537461747573223a224f6e222c227377697463686573223a205b302c20302c20302c20312c20302c20312c20302c20305d7d", "hex");
const context = Buffer.from("5374617475734358", "hex");

const sig     = Buffer.from("96598902309b0eb0d828510038b60736a19f7100c0480ab26916920048db0c2e5c6503830847fdc7bc181285a7c079638b970670a13aa05a837903b8bcbae72c", "hex");

function test() {
        
  const hydro_sign_BYTES = 64

  let wasmBuffer = dataview.buffer;
  const { hydro_sign_verify } = instance.exports;

  //
  // Marshal the parameter for the libHydrogen wasm into
  // the interface buffer.
  //

  const privKeyOffset = 0;
  const privKeyArr = new Uint8Array(wasmBuffer, privKeyOffset, privKey.length);
  privKey.copy(privKeyArr);

  const contextOffset = privKeyArr.byteOffset + privKeyArr.byteLength;
  const contextArr = new Uint8Array(wasmBuffer, contextOffset, context.length)
  context.copy(contextArr);
  
  const sigOffset = contextArr.byteOffset + contextArr.byteLength;
  const sigArr = new Uint8Array(wasmBuffer, sigOffset, hydro_sign_BYTES);
  sig.copy(sigArr);

  const messageOffset = sigArr.byteOffset + sigArr.byteLength;
  const messageArr = new Uint8Array(wasmBuffer, messageOffset, message.length)
  Buffer.from(message).copy(messageArr);

  const pubKeyOffset = messageArr.byteOffset + messageArr.byteLength;
  const pubKeyArr = new Uint8Array(wasmBuffer, pubKeyOffset, pubKey.length);
  pubKey.copy(pubKeyArr); 
  
  //console.log(`Crypto: privKey: ${Buffer.from(privKeyArr).toString('hex')}`);
  console.log(`Crypto: sig    : ${Buffer.from(sigArr).toString('hex')}`);  
  console.log(`Crypto: message: ${Buffer.from(messageArr).toString('hex')}`);
  console.log(`Crypto: length : ${messageArr.byteLength}`);
  console.log(`Crypto: context: ${Buffer.from(contextArr).toString('hex')}`);
  console.log(`Crypto: pubKey : ${Buffer.from(pubKeyArr).toString('hex')}`);

  let res = hydro_sign_verify(
      sigArr.byteOffset, 
      messageArr.byteOffset,
      messageArr.byteLength, 
      contextArr.byteOffset, 
      pubKeyArr.byteOffset)
  console.log(`Crypto: Verify gives ${res}`);    

  console.log(`Crypto: Message ++${Buffer.from(messageArr).toString()}++`);
  console.log(`Crypto: Context ++${Buffer.from(contextArr).toString()}++`);
  

  wasmArr = new Uint8Array(wasmBuffer, 0, pubKeyOffset + pubKey.length);
  console.log(`\nWASM Buffer`);
  console.log(`${Buffer.from(wasmArr).toString('hex')}`);    

}