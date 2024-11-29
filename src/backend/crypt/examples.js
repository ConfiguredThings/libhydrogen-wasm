const { readFile } = require('node:fs/promises');
const { WASI } = require('node:wasi');
const { argv, env } = require('node:process');
const { TextDecoder } = require('node:util');

let hydro = require('./libHydrogen.js');

const wasi = new WASI({
    version: 'preview1',
    args: argv,
    env,
    preopens: {},
});

const imports = wasi.getImportObject();
var instance, dataview;

//
// Helper function to reserve space in the buffer used
// as a stack between Node and the wasm.
//
// Offset must be an an object so we can update it's value
//   {value: n}
//
// Designed to allow a sequence of reservations such as
//
//  let offset = {value: 0};
//  buf1 = reserve (offset, 100);
//  buf2 = reserve (offset, 590);
//  ...
//
function reserve(offset, length) {
    let a = new Uint8Array(dataview.buffer, offset.value, length);
    let newOffset = a.byteOffset + a.byteLength;
    offset.value = newOffset;
    return a;
}

//
// Helper function to clear the buffer upto the offset
//
function clear(offset) {
    dataview.buffer.fill(0, offset.value);
    offset.value = 0;
}

//
// Main function
//

(async () => {
    const wasm = await WebAssembly.compile(
        // Fetch our wasm built during npm install
        await readFile('../../../build/backend/vendor/libhydrogen/libhydrogen.wasm'),
    );
    instance = await WebAssembly.instantiate(wasm, imports);

    // We must call a start method per WASI specification
    // Libhydrogen's main method is one we have patched to initialise it
    wasi.start(instance);

    // Get the memory are used as a stack when calling into the WASI
    const memory = instance.exports.memory;

    // DataView takes care of our platform specific endian conversions
    dataview = new DataView(memory.buffer);

    // Run the various examples
    random_uniform();
    hash();
    keyed_hash();
    public_key_signing();
    symmetric_encryption();
    symmetric_encryption_via_asymmetric_key_exchange();
})();

//
// Generate a series of random numbers
//
function random_uniform() {
    console.log('\n=== random_uniform ===\n');
    const { hydro_random_uniform } = instance.exports;
    // Testing a simple case of passing integers and fetching integers
    console.log(`generated random - ${hydro_random_uniform(20)}`);
    console.log(`generated random - ${hydro_random_uniform(20)}`);
    console.log(`generated random - ${hydro_random_uniform(20)}`);
    console.log(`generated random - ${hydro_random_uniform(20)}`);
    console.log(`generated random - ${hydro_random_uniform(20)}`);
}

//
// Hash Generation
//
function hash() {
    console.log('\n=== hash ===\n');
    const { hydro_hash_hash } = instance.exports;

    // We have to create the stack frame to pass to libHydrogen
    // in the dataview Buffer, and then pass in pointers to
    // that buffer

    let offset = { value: 0 };
    let context = reserve(offset, hydro.hash_CONTEXTBYTES);
    Buffer.from('Examples').copy(context, 0, 0, 0, hydro.hash_CONTEXTBYTES);

    // Our message to be hashed
    const message = 'Arbitrary data to hash';
    const messageArr = reserve(offset, message.length);
    Buffer.from(message).copy(messageArr);

    // Buffer for libHydrogen to write the hash into
    const hash = reserve(offset, hydro.hash_BYTES);

    // Call the imported function
    hydro_hash_hash(
        hash.byteOffset,
        hash.length,
        messageArr.byteOffset,
        messageArr.byteLength,
        context.byteOffset,
        null,
    );
    console.log(`generated hash - ${Buffer.from(hash).toString('hex')}`);

    // Clear the data buffer for the next example
    context.fill(0);
    messageArr.fill(0);
    hash.fill(0);
}

//
// Hash generation with a key
//
function keyed_hash() {
    console.log('\n=== keyed_hash ===\n');

    // Importing libhydrogen's hashing keygen and hash functions
    const { hydro_hash_keygen, hydro_hash_hash } = instance.exports;

    // We have to create the stack frame to pass to libHydrogen
    // in the dataview Buffer, and then pass in pointers to
    // that buffer
    let offset = { value: 0 };
    let context = reserve(offset, hydro.hash_CONTEXTBYTES);
    Buffer.from('Examples').copy(context, 0, 0, 0, hydro.hash_CONTEXTBYTES);

    const message = 'Arbitrary data to hash';
    const messageArr = reserve(offset, message.length);
    Buffer.from(message).copy(messageArr);

    // Reserve buffer space for the returned key
    const key = reserve(offset, hydro.hash_KEYBYTES);

    // Reserve space for the hash result
    const keyedhash = reserve(offset, hydro.hash_BYTES);

    // Generate hashing key
    hydro_hash_keygen(key.byteOffset);
    console.log(`generated hash key - ${Buffer.from(key).toString('hex')}`);

    // Create a hash with the key
    hydro_hash_hash(
        keyedhash.byteOffset,
        keyedhash.length,
        messageArr.byteOffset,
        messageArr.byteLength,
        context.byteOffset,
        key.byteOffset,
    );
    const khash1 = Buffer.from(keyedhash).toString('hex');
    console.log(`khash1 - ${khash1}`);

    keyedhash.fill(0); // Resetting output buffer (seems to pollute state otherwise)

    // Hashing message with key again
    hydro_hash_hash(
        keyedhash.byteOffset,
        keyedhash.length,
        messageArr.byteOffset,
        messageArr.byteLength,
        context.byteOffset,
        key.byteOffset,
    );
    const khash2 = Buffer.from(keyedhash).toString('hex');
    console.log(`khash2 - ${khash2}`);
    keyedhash.fill(0);

    // Check that the same hash is generated
    if (khash1 == khash2) console.log('khash1 equals khash2');

    // Testing whether we can load a key and generate a matching hash created previously
    const presetKey = '40b31481206dbf0dd39e89cdf17e0a46ba0d9d9d2d8b51e76fae9788141a6037';
    console.log(`presetKey - ${presetKey}`);
    const historicHash = '464be316ad9980643e0bb34ca56f1bdd5f00a4615ecb23e0d597c89c90d441bb';
    console.log(`historicHash - ${historicHash}`);

    Buffer.from(presetKey, 'hex').copy(key); // Copying presetKey into key's buffer

    // Hashing message with presetKey
    hydro_hash_hash(
        keyedhash.byteOffset,
        keyedhash.length,
        messageArr.byteOffset,
        messageArr.byteLength,
        context.byteOffset,
        key.byteOffset,
    );
    const khash3 = Buffer.from(keyedhash).toString('hex');
    console.log(`khash3 - ${khash3}`);

    // Testing hash matches historicHash
    if (khash3 == historicHash) console.log('khash3 using old key, matches historicHash');

    // ...and doesn't match the hashes with the latest key
    if (khash1 != khash3) console.log('khash3 does not equal khash1');

    // clear the buffer for the next example
    context.fill(0);
    messageArr.fill(0);
    keyedhash.fill(0);
    key.fill(0);
}

//
// Public key signing
//
function public_key_signing() {
    console.log('\n=== public_key_signing ===\n');

    // Importing libhydrogen's signing keygen and signing and verification functions
    const { hydro_sign_keygen, hydro_sign_create, hydro_sign_verify } = instance.exports;

    // We have to create the stack frame to pass to libHydrogen
    // in the dataview Buffer, and then pass in pointers to
    // that buffer
    let offset = { value: 0 };
    let context = reserve(offset, hydro.hash_CONTEXTBYTES);
    Buffer.from('Examples').copy(context, 0, 0, 0, hydro.hash_CONTEXTBYTES);

    const message = 'Arbitrary data to sign';
    const messageArr = reserve(offset, message.length);
    Buffer.from(message).copy(messageArr);

    // Generate a key pair
    const keypair = reserve(offset, hydro.sign_PUBLICKEYBYTES + hydro.sign_SECRETKEYBYTES);
    const publicKeyOffset = keypair.byteOffset;
    const privateKeyOffset = keypair.byteOffset + hydro.sign_PUBLICKEYBYTES;
    hydro_sign_keygen(keypair.byteOffset);

    // Reserving memory for the signature
    const signature = reserve(offset, hydro.sign_BYTES);

    // Creating signature of message with secret key
    hydro_sign_create(
        signature.byteOffset,
        messageArr.byteOffset,
        messageArr.byteLength,
        context.byteOffset,
        privateKeyOffset,
    );

    console.log(`generated signature - ${Buffer.from(signature).toString('hex')}`);

    // Verifying signature with public key
    const res = hydro_sign_verify(
        signature.byteOffset,
        messageArr.byteOffset,
        messageArr.byteLength,
        context.byteOffset,
        publicKeyOffset,
    );

    if (res == 0) console.log('Signature is correctly valid');
    signature.set([0]); // Modifying signature
    console.log(`modified signature - ${Buffer.from(signature).toString('hex')}`);

    manipulatedRes = hydro_sign_verify(
        signature.byteOffset,
        messageArr.byteOffset, // Reverifying signature
        messageArr.byteLength,
        context.byteOffset,
        publicKeyOffset,
    );
    if (manipulatedRes != 0) console.log('Signature is correctly invalid');

    messageArr.fill(0);
    keypair.fill(0);
    signature.fill(0);
}

//
// Secret Key Encryption
//
function symmetric_encryption() {
    console.log('\n=== symmetric_encryption ===\n');

    // Importing libhydrogen's secretbox keygen and encrypt and decrypt functions
    const { hydro_secretbox_keygen, hydro_secretbox_encrypt, hydro_secretbox_decrypt } =
        instance.exports;

    // We have to create the stack frame to pass to libHydrogen
    // in the dataview Buffer, and then pass in pointers to
    // that buffer
    let offset = { value: 0 };
    let context = reserve(offset, hydro.hash_CONTEXTBYTES);
    Buffer.from('Examples').copy(context, 0, 0, 0, hydro.hash_CONTEXTBYTES);

    // Reserving buffer for the message
    const message = 'Arbitrary data to encrypt';
    const messageArr = reserve(offset, message.length);
    Buffer.from(message).copy(messageArr);
    console.log(`message - ${message}`);

    // Reserving buffer for the key
    const key = reserve(offset, hydro.secretbox_KEYBYTES);
    hydro_secretbox_keygen(key.byteOffset);
    console.log(`generated key - ${Buffer.from(key).toString('hex')}`);

    // Reserving buffer for the cipher text
    const cipherTextLength = hydro.secretbox_HEADERBYTES + Buffer.from(message).length;
    const ciphertext = reserve(offset, cipherTextLength);

    // Enciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    hydro_secretbox_encrypt(
        ciphertext.byteOffset,
        messageArr.byteOffset,
        messageArr.byteLength,
        0n,
        context.byteOffset,
        key.byteOffset,
    );

    // Reserving buffer for the decrypted plain text
    const decryptedPlaintextLength = ciphertext.byteLength - hydro.secretbox_HEADERBYTES;
    const decryptedPlaintext = reserve(offset, decryptedPlaintextLength);

    // Deciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    const res = hydro_secretbox_decrypt(
        decryptedPlaintext.byteOffset,
        ciphertext.byteOffset,
        ciphertext.byteLength,
        0n,
        context.byteOffset,
        key.byteOffset,
    );
    if (res == 0) {
        // As secretbox is an authenticated encryption (AEAD) algorithm
        // we check that the ciphertext was authentic
        console.log('cipherText not forged');
        // Decoding Uint8 encoded string
        const textDecoder = new TextDecoder();
        console.log(`decryptedPlaintext - ${textDecoder.decode(decryptedPlaintext)}`);
    }

    messageArr.fill(0);
    key.fill(0);
    ciphertext.fill(0);
    decryptedPlaintext.fill(0);
}

//
// Symmetric Encryption using a Key Generated
// via Asymmetric key exchange
//
function symmetric_encryption_via_asymmetric_key_exchange() {
    console.log('\n=== symmetric_encryption_via_asymmetric_key_exchange ===\n');

    const { hydro_kx_keygen, hydro_kx_kk_1, hydro_kx_kk_2, hydro_kx_kk_3 } = instance.exports;

    //
    // Reserve space in the buffer for the keypair exchange
    //
    // Both Alice and Bob need a keypair
    //
    // Both Alice and bob need a pair of session keys
    //    tx to encrpyt
    //    rx to decrypt
    //
    // Alice initiates the key exchange, so she also needs a kx state
    // buffer
    //

    let offset = { value: 0 };
    let alice = {
        static: {
            pk: reserve(offset, hydro.kx_PUBLICKEYBYTES),
            sk: reserve(offset, hydro.kx_SECRETKEYBYTES),
        },
        session: {
            rx: reserve(offset, hydro.kx_SESSIONKEYBYTES),
            tx: reserve(offset, hydro.kx_SESSIONKEYBYTES),
        },
    };

    let bob = {
        static: {
            pk: reserve(offset, hydro.kx_PUBLICKEYBYTES),
            sk: reserve(offset, hydro.kx_SECRETKEYBYTES),
        },
        session: {
            rx: reserve(offset, hydro.kx_SESSIONKEYBYTES),
            tx: reserve(offset, hydro.kx_SESSIONKEYBYTES),
        },
    };

    const keysOffset = offset.value;
    alice.state = reserve(offset, hydro.kx_SESSIONKEYBYTES);

    // We need two "packets" for the messages exchanged between
    // Alice and Bob during the key exchange
    const packets = {
        1: reserve(hydro.kx_KK_PACKET1BYTES),
        2: reserve(hydro.kx_KK_PACKET2BYTES),
    };

    //
    // Generate the static keys
    //
    console.log('------------ALICEKEYGEN------------');
    hydro_kx_keygen(alice.static.pk.byteOffset);
    console.log('---------------ALICE---------------');
    console.log(alice);

    console.log('-------------BOBKEYGEN-------------');
    hydro_kx_keygen(bob.static.pk.byteOffset);
    console.log('----------------BOB----------------');
    console.log(bob);

    //
    // Key exchange
    //

    // Performing kk_1 (Generating alice's ephemeral keypair and packet 1)
    console.log('-----------hydro_kx_kk_1-----------');
    hydro_kx_kk_1(
        alice.state.byteOffset,
        packets[1].byteOffset,
        bob.static.pk.byteOffset,
        alice.static.pk.byteOffset,
    );
    console.log('---------------ALICE---------------');
    console.dir(alice, { maxArrayLength: null });
    console.log('--------------packets--------------');
    console.log(packets);

    // Performing kk_2 (Generating bob's response packet 2 and his copy of session keys)
    console.log('-----------hydro_kx_kk_2-----------');
    hydro_kx_kk_2(
        bob.session.rx.byteOffset,
        packets[2].byteOffset,
        packets[1].byteOffset,
        alice.static.pk.byteOffset,
        bob.static.pk.byteOffset,
    );
    console.log('----------------BOB----------------');
    console.dir(bob, { maxArrayLength: null });
    console.log('--------------packets--------------');
    console.log(packets);

    // Performing kk_3 (Generating Alice's copy of session keys)
    console.log('-----------hydro_kx_kk_3-----------');
    hydro_kx_kk_3(
        alice.state.byteOffset,
        alice.session.rx.byteOffset,
        packets[2].byteOffset,
        alice.static.pk.byteOffset,
    );
    console.log('---------------ALICE---------------');
    console.dir(alice, { maxArrayLength: null });

    console.log('-----------KEYS EXCHANGED----------');

    // Tidy up the buffer space used in the key exchange
    alice.state.fill(0);
    packets[1].fill(0);
    packets[2].fill(0);
    offset.value = keysOffset;

    //
    // Use the session keys to exchange messages
    //
    const { hydro_secretbox_encrypt, hydro_secretbox_decrypt } = instance.exports;

    const context = reserve(offset, hydro.secretbox_CONTEXTBYTES);
    Buffer.from('Examples').copy(context, hydro.secretbox_CONTEXTBYTES);

    const message1 = 'Hello Bob';
    const messageArr1 = reserve(offset, message1.length);
    Buffer.from(message1).copy(messageArr1);
    console.log(`message1 - ${message1}`);

    const ciphertext1Length = hydro.secretbox_HEADERBYTES + Buffer.from(message1).length;
    const ciphertext1 = reserve(offset, ciphertext1Length);

    //
    // Alice Encypts the message with her session tx key
    //
    // Enciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    //
    hydro_secretbox_encrypt(
        ciphertext1.byteOffset,
        messageArr1.byteOffset,
        messageArr1.byteLength,
        0n,
        context.byteOffset,
        alice.session.tx.byteOffset,
    );

    //
    // Bob Decrypts the mesaage with his session rx key
    //
    // Deciphering single message (thus use of msg_id 0n -- 'n' as libhydrogen expects i64)
    //
    const decryptedPlaintext1Length = ciphertext1.byteLength - hydro.secretbox_HEADERBYTES;
    const decryptedPlaintext1 = reserve(offset, decryptedPlaintext1Length);

    const res1 = hydro_secretbox_decrypt(
        decryptedPlaintext1.byteOffset,
        ciphertext1.byteOffset,
        ciphertext1.byteLength,
        0n,
        context.byteOffset,
        bob.session.rx.byteOffset,
    );

    // As secretbox is an authenticated encryption (AEAD) algorithm
    // we check that the ciphertext was authentic
    if (res1 == 0) {
        console.log('ciphertext1 not forged');
        // Decoding Uint8 encoded string
        const textDecoder = new TextDecoder();
        console.log(`decryptedPlaintext1 - ${textDecoder.decode(decryptedPlaintext1)}`);
    }

    //
    // Bob sends a reply to Alice
    //
    const message2 = 'Hello Alice';
    const messageArr2 = reserve(offset, message2.length);
    Buffer.from(message2).copy(messageArr2);
    console.log(`message2 - ${message2}`);

    const ciphertext2Length = hydro.secretbox_HEADERBYTES + Buffer.from(message2).length;
    const ciphertext2 = reserve(offset, ciphertext2Length);

    //
    // Bob encrypts the message with his session tx key
    //
    hydro_secretbox_encrypt(
        ciphertext2.byteOffset,
        messageArr2.byteOffset,
        messageArr2.byteLength,
        0n,
        context.byteOffset,
        bob.session.tx.byteOffset,
    );

    //
    // Alice decrypts the message with her session rx key
    //
    const decryptedPlaintext2Length = ciphertext2.byteLength - hydro.secretbox_HEADERBYTES;
    const decryptedPlaintext2 = reserve(offset, decryptedPlaintext2Length);

    const res2 = hydro_secretbox_decrypt(
        decryptedPlaintext2.byteOffset,
        ciphertext2.byteOffset,
        ciphertext2.byteLength,
        0n,
        context.byteOffset,
        alice.session.rx.byteOffset,
    );

    // As secretbox is an authenticated encryption (AEAD) algorithm
    // we check that the ciphertext was authentic
    if (res2 == 0) {
        console.log('ciphertext2 not forged');
        const textDecoder = new TextDecoder();
        // Decoding Uint8 encoded string
        console.log(`decryptedPlaintext2 - ${textDecoder.decode(decryptedPlaintext2)}`);
    }
}
