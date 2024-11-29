// Define constants used in libHydrogen
//
// include with
//    let hydro = require('./libHydrogen.js');
//
// reference as
//    hydro.hash_BTYES

'use strict';

let constants = {
    // Random Numbers
    random_SEEDBYTES: 32,

    // Generic Hashing
    hash_BYTES: 32,
    hash_BYTES_MAX: 65535,
    hash_BYTES_MIN: 16,
    hash_CONTEXTBYTES: 8,
    hash_KEYBYTES: 32,

    //  typedef struct hydro_hash_state {
    //    uint32_t state[12];
    //    uint8_t  buf_off;
    //    uint8_t  align[3];
    //  } hydro_hash_state;
    //
    hash_STATEBYTES: 12 * (32 / 8) + 1 + 3,

    // Secret key authenticated encryption
    secretbox_CONTEXTBYTES: 8,
    secretbox_HEADERBYTES: 20 + 16,
    secretbox_KEYBYTES: 32,
    secretbox_PROBEBYTES: 16,

    // Key Derivation
    kdf_CONTEXTBYTES: 8,
    kdf_KEYBYTES: 32,
    kdf_BYTES_MAX: 65535,
    kdf_BYTES_MIN: 16,

    // Public Key Signing
    sign_BYTES: 64,
    sign_CONTEXTBYTES: 8,
    sign_PUBLICKEYBYTES: 32,
    sign_SECRETKEYBYTES: 64,
    sign_SEEDBYTES: 32,

    //
    // Key Exchange
    //
    kx_SESSIONKEYBYTES: 32,
    kx_PUBLICKEYBYTES: 32,
    kx_SECRETKEYBYTES: 32,
    kx_PSKBYTES: 32,
    kx_SEEDBYTES: 32,

    // N key exchange variant
    kx_N_PACKET1BYTES: 32 + 16,

    // KK key exchange variant
    kx_KK_PACKET1BYTES: 32 + 16,
    kx_KK_PACKET2BYTES: 32 + 16,

    // XX key exchange variant
    kx_XX_PACKET1BYTES: 32 + 16,
    kx_XX_PACKET2BYTES: 32 + 32 + 16 + 16,
    kx_XX_PACKET3BYTES: 32 + 16 + 16,

    // NK key exchange variant
    kx_NK_PACKET1BYTES: 32 + 16,
    kx_NK_PACKET2BYTES: 32 + 16,

    // Password Hash
    pwhash_CONTEXTBYTES: 8,
    pwhash_MASTERKEYBYTES: 32,
    pwhash_STOREDBYTES: 128,
};

//  typedef struct hydro_kx_state {
//    hydro_kx_keypair eph_kp;
//    hydro_hash_state h_st;
//  } hydro_kx_state;
//
constants.kx_STATEBYTES =
    constants.kx_PUBLICKEYBYTES + constants.kx_PRIVATEKEYBYTES + constants.hash_STATEBYTES;

module.exports = Object.freeze(constants); // freeze prevents changes by users
