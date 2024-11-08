# Cryptography

Libhydrogen supports three means of exchanging session keys for the sending and receiving of encrypted data: `n`, `kk` and `xx`.

The below definition text is taken from the [libhydrogen wiki](https://github.com/jedisct1/libhydrogen/wiki).

## N

- What the client needs to know about the server: **the server's public key**
- What the server needs to know about the client: **nothing**

This variant is designed to anonymously send messages to a recipient using its public key.

![n](../../../build/documentation/puml/crypt/kx_n.svg)

## KK

- What the client needs to know about the server: **the server's public key**
- What the server needs to know about the client: **the client's public key**

This variant is designed to exchange messages between two parties that already know each other's public key.

![kk](../../../build/documentation/puml/crypt/kx_kk.svg)

## XX

- What the client needs to know about the server: **nothing**
- What the server needs to know about the client: **nothing**

This is the most versatile variant, but it requires two round trips. In this variant, the client and the server don't need to share any prior data. However, the peers public keys will be exchanged. Discovered public keys can then be discarded, used for authentication, or reused later with the KK variant.

![xx](../../../build/documentation/puml/crypt/kx_xx.svg)