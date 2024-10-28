const { readFile } = require('node:fs/promises');
const { WASI } = require('node:wasi');
const { argv, env } = require('node:process');
const { TextDecoder } = require('node:util');

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
  symmetric_encryption()
  symmetric_encryption_via_asymmetric_key_exchange()
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

function symmetric_encryption() {
  console.log('symmetric_encryption')
  const context = 'Examples\0';                                                               // libhydrogen's namespacing concept needs to be null terminated as context arg expected to char[]
  const contextArr = new Uint8Array(dataview.buffer, 0,
    context.length)
  Buffer.from(context).copy(contextArr)
  const message = 'Arbitrary data to encrypt'
  const messageArr = new Uint8Array(dataview.buffer, contextArr.byteOffset +
    contextArr.byteLength, message.length)
  Buffer.from(message).copy(messageArr)  

  console.log(`message - ${message}`);

  const keyLength = 32
  const nonceLength = 20
  const tagLength = 16
  const hydro_secretbox_HEADERBYTES = nonceLength + tagLength
  const cipherTextLength = hydro_secretbox_HEADERBYTES + Buffer.from(message).length

  const { hydro_secretbox_keygen, hydro_secretbox_encrypt,                                    // Importing libhydrogen's secretbox keygen and encrypt and decrypt functions
    hydro_secretbox_decrypt } = instance.exports
  
  const key = new Uint8Array(dataview.buffer, messageArr.byteOffset + messageArr.byteLength,  // Reserving buffer for the key
    keyLength)                                     
  hydro_secretbox_keygen(key.byteOffset);
  console.log(`key - ${Buffer.from(key).toString('hex')}`);

  const ciphertext = new Uint8Array(dataview.buffer, key.byteOffset + key.byteLength,         // Reserving buffer for the cipher text
    cipherTextLength)

  hydro_secretbox_encrypt(ciphertext.byteOffset, messageArr.byteOffset,                       // Enciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    messageArr.byteLength, 0n, contextArr.byteOffset, key.byteOffset);

  const decryptedPlaintext = new Uint8Array(dataview.buffer, ciphertext.byteOffset +          // Reserving buffer for the decrypted plain text
    ciphertext.byteLength, ciphertext.byteLength - hydro_secretbox_HEADERBYTES)
  
  const res = hydro_secretbox_decrypt(decryptedPlaintext.byteOffset, ciphertext.byteOffset,   // Deciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    ciphertext.byteLength, 0n, contextArr.byteOffset, key.byteOffset)
  if (res == 0) {                                                                             // As secretbox is an authenticated encryption (AEAD) algorithm we check that the ciphertext was authentic
      console.log('cipherText not forged')
      const textDecoder = new TextDecoder()
      console.log(`decryptedPlaintext - ${textDecoder.decode(decryptedPlaintext)}`);          // Decoding Uint8 encoded string
  }
  contextArr.fill(0);
  messageArr.fill(0);
  key.fill(0);
  ciphertext.fill(0);
  decryptedPlaintext.fill(0)
}

function symmetric_encryption_via_asymmetric_key_exchange() {
  console.log('symmetric_encryption_via_asymmetric_key_exchange')
  const hydro_kx_SESSIONKEYBYTES = 32
  const hydro_kx_PUBLICKEYBYTES = 32
  const hydro_kx_SECRETKEYBYTES = 32
  const hydro_kx_KK_PACKET1BYTES = 32 + 16
  const hydro_kx_KK_PACKET2BYTES = 32 + 16
  /*
  typedef struct hydro_kx_keypair {
    uint8_t pk[hydro_kx_PUBLICKEYBYTES];
    uint8_t sk[hydro_kx_SECRETKEYBYTES];
  } hydro_kx_keypair;

  typedef struct hydro_kx_session_keypair {
    uint8_t rx[hydro_kx_SESSIONKEYBYTES];
    uint8_t tx[hydro_kx_SESSIONKEYBYTES];
  } hydro_kx_session_keypair;

  typedef struct hydro_kx_state {
      hydro_kx_keypair eph_kp;
      hydro_hash_state h_st;
  } hydro_kx_state;

  typedef struct hydro_hash_state {
    uint32_t state[12];
    uint8_t  buf_off;
    uint8_t  align[3];
  } hydro_hash_state;
  */

  const hash_state_BYTES = hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES + ((32 / 8) * 12) + 1 + 3

  const { hydro_kx_keygen, hydro_kx_kk_1, hydro_kx_kk_2, hydro_kx_kk_3 } = instance.exports
  console.log(`state byteoffset - ${hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES}`)
  console.log(`session byteoffset - ${2 * (hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES)}`)

  const alice = { 
    static: {
      pk: new Uint8Array(dataview.buffer, 0, hydro_kx_PUBLICKEYBYTES),
      sk: new Uint8Array(dataview.buffer, hydro_kx_PUBLICKEYBYTES, hydro_kx_SECRETKEYBYTES)
    },
    state: new Uint8Array(dataview.buffer, hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES, hash_state_BYTES),
    session: {
      rx: new Uint8Array(dataview.buffer, hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES + hash_state_BYTES, hydro_kx_SESSIONKEYBYTES),
      tx: new Uint8Array(dataview.buffer, hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES + hash_state_BYTES + hydro_kx_SESSIONKEYBYTES, hydro_kx_SESSIONKEYBYTES)
    }
  }
  const bob = {
    static: {
      pk: new Uint8Array(dataview.buffer, alice.session.tx.byteOffset + alice.session.tx.byteLength, hydro_kx_PUBLICKEYBYTES),
      sk: new Uint8Array(dataview.buffer, alice.session.tx.byteOffset + alice.session.tx.byteLength + hydro_kx_PUBLICKEYBYTES, hydro_kx_SECRETKEYBYTES)
    },
    session: {
      rx: new Uint8Array(dataview.buffer, alice.session.tx.byteOffset + alice.session.tx.byteLength + hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES, hydro_kx_SESSIONKEYBYTES),
      tx: new Uint8Array(dataview.buffer, alice.session.tx.byteOffset + alice.session.tx.byteLength + hydro_kx_PUBLICKEYBYTES + hydro_kx_SECRETKEYBYTES + hydro_kx_SESSIONKEYBYTES, hydro_kx_SESSIONKEYBYTES)
    }
  }

  const packets = {
    1: new Uint8Array(dataview.buffer, bob.session.tx.byteOffset + bob.session.tx.byteLength, hydro_kx_KK_PACKET1BYTES),
    2: new Uint8Array(dataview.buffer, bob.session.tx.byteOffset + bob.session.tx.byteLength + hydro_kx_KK_PACKET1BYTES, hydro_kx_KK_PACKET2BYTES)
  }
  console.log('------------ALICEKEYGEN------------')
  hydro_kx_keygen(alice.static.pk.byteOffset)
  console.log('---------------ALICE---------------')
  console.log(alice)

  console.log('-------------BOBKEYGEN-------------')
  hydro_kx_keygen(bob.static.pk.byteOffset)
  console.log('----------------BOB----------------')
  console.log(bob)

  console.log('-----------hydro_kx_kk_1-----------')
  hydro_kx_kk_1(alice.state.byteOffset, packets[1].byteOffset, bob.static.pk.byteOffset, alice.static.pk.byteOffset)
  console.log('---------------ALICE---------------')
  console.dir(alice, {'maxArrayLength': null})
  console.log('--------------packets--------------')
  console.log(packets)

  console.log('-----------hydro_kx_kk_2-----------')
  hydro_kx_kk_2(bob.session.rx.byteOffset, packets[2].byteOffset, packets[1].byteOffset, alice.static.pk.byteOffset, bob.static.pk.byteOffset)
  console.log('----------------BOB----------------')
  console.dir(bob, {'maxArrayLength': null})
  console.log('--------------packets--------------')
  console.log(packets)


  console.log('-----------hydro_kx_kk_3-----------')
  hydro_kx_kk_3(alice.state.byteOffset, alice.session.rx.byteOffset, packets[2].byteOffset, alice.static.pk.byteOffset)
  console.log('---------------ALICE---------------')
  console.dir(alice, {'maxArrayLength': null})

  console.log('-----------KEYS EXCHANGED----------')

  const context = 'Examples\0';                                                               // libhydrogen's namespacing concept needs to be null terminated as context arg expected to char[]
  const contextArr = new Uint8Array(dataview.buffer, packets[2].byteOffset + packets[2].byteLength,
    context.length)
  Buffer.from(context).copy(contextArr)
  const message1 = 'Hello Bob'
  const messageArr1 = new Uint8Array(dataview.buffer, contextArr.byteOffset +
    contextArr.byteLength, message1.length)
  Buffer.from(message1).copy(messageArr1)  

  console.log(`message1 - ${message1}`);

  const nonceLength = 20
  const tagLength = 16
  const hydro_secretbox_HEADERBYTES = nonceLength + tagLength

  const { hydro_secretbox_encrypt, hydro_secretbox_decrypt } = instance.exports                 // Importing libhydrogen's secretbox keygen and encrypt and decrypt functions
                            
  const ciphertext1 = new Uint8Array(dataview.buffer, messageArr1.byteOffset +                  // Reserving buffer for the cipher text
    messageArr1.byteLength, hydro_secretbox_HEADERBYTES + Buffer.from(message1).length)

  hydro_secretbox_encrypt(ciphertext1.byteOffset, messageArr1.byteOffset,                       // Enciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    messageArr1.byteLength, 0n, contextArr.byteOffset, alice.session.tx.byteOffset);

  const decryptedPlaintext1 = new Uint8Array(dataview.buffer, ciphertext1.byteOffset +          // Reserving buffer for the decrypted plain text
    ciphertext1.byteLength, ciphertext1.byteLength - hydro_secretbox_HEADERBYTES)
  
  const res1 = hydro_secretbox_decrypt(decryptedPlaintext1.byteOffset, ciphertext1.byteOffset,   // Deciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    ciphertext1.byteLength, 0n, contextArr.byteOffset, bob.session.rx.byteOffset)

  if (res1 == 0) {                                                                               // As secretbox is an authenticated encryption (AEAD) algorithm we check that the ciphertext was authentic
      console.log('ciphertext1 not forged')
      const textDecoder = new TextDecoder()
      console.log(`decryptedPlaintext1 - ${textDecoder.decode(decryptedPlaintext1)}`);            // Decoding Uint8 encoded string
  }

  const message2 = 'Hello Alice'
  const messageArr2 = new Uint8Array(dataview.buffer, decryptedPlaintext1.byteOffset +
    decryptedPlaintext1.byteLength, message2.length)
  Buffer.from(message2).copy(messageArr2)  

  console.log(`message2 - ${message2}`);
                            
  const ciphertext2 = new Uint8Array(dataview.buffer, messageArr2.byteOffset +                  // Reserving buffer for the cipher text
    messageArr2.byteLength, hydro_secretbox_HEADERBYTES + Buffer.from(message2).length)

  hydro_secretbox_encrypt(ciphertext2.byteOffset, messageArr2.byteOffset,                       // Enciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    messageArr2.byteLength, 0n, contextArr.byteOffset, bob.session.tx.byteOffset);

  const decryptedPlaintext2 = new Uint8Array(dataview.buffer, ciphertext2.byteOffset +          // Reserving buffer for the decrypted plain text
    ciphertext2.byteLength, ciphertext2.byteLength - hydro_secretbox_HEADERBYTES)
  
  const res2 = hydro_secretbox_decrypt(decryptedPlaintext2.byteOffset, ciphertext2.byteOffset,   // Deciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    ciphertext2.byteLength, 0n, contextArr.byteOffset, alice.session.rx.byteOffset)

  if (res2 == 0) {                                                                               // As secretbox is an authenticated encryption (AEAD) algorithm we check that the ciphertext was authentic
      console.log('ciphertext2 not forged')
      const textDecoder = new TextDecoder()
      console.log(`decryptedPlaintext2 - ${textDecoder.decode(decryptedPlaintext2)}`);            // Decoding Uint8 encoded string
  }
}