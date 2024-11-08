# Cryptography

## LibHydrogen

[LibHydrogen](https://github.com/jedisct1/libhydrogen) is a very lightweight, computationally efficient, cryptographic library written in C. It is designed for applications such as microcontrollers. Therefore it is ideally suited to being ported to CHERIoT. 

Whilst CHERIoT and the library's C implementation addresses the "edge" segment of the network, the "core" network segment utilises the Configured Things Platform, a software framework written in JavaScript and deployed on Nodejs. Therefore WebAssembly and the WebAssembly System Interface is utilised to execute a compiled LibHydrogen WebAssembly from the Nodejs runtime.

### Encryption

LibHydrogen exposes its [`hydro_secretbox`](https://github.com/jedisct1/libhydrogen/wiki/Secret-key-encryption) API for symmetric encryption.

To facilitate the secure exchange of symmetric session keys, LibHydrogen exposes its [`hydro_kx`](https://github.com/jedisct1/libhydrogen/wiki/Key-exchange) API for key exchange. LibHydrogen supports three means of exchanging session keys for the sending and receiving of encrypted data, named `N`, `KK` and `XX`.

> [!TIP]
> These handshake patterns are borrowed from the [Noise Protocol Framework](https://noiseprotocol.org):
>
>> The fundamental interactive patterns are named with two characters, which indicate the status of the initiator and responder’s static keys:
>>
>>The first character refers to the initiator’s static key:
>> - `N` = No static key for initiator
>> - `K` = Static key for initiator Known to responder
>> - `X` = Static key for initiator Xmitted (“transmitted”) to responder
>> - `I` = Static key for initiator Immediately transmitted to responder, despite reduced or absent identity hiding
>>
>> The second character refers to the responder’s static key:
>> - `N` = No static key for responder
>> - `K` = Static key for responder Known to initiator
>> - `X` = Static key for responder Xmitted (“transmitted”) to initiator

#### `N`

This variant is designed to anonymously send messages to a recipient using its public key.[^libhydrogenwiki]

##### Prior knowledge 
| Alice | Bob |
| - | - |
| Nothing | Alice's long-term public key |


![n](../../../build/documentation/puml/crypt/kx_n.svg)

#### `KK`

This variant is designed to exchange messages between two parties that already know each other's public key.[^libhydrogenwiki]

##### Prior knowledge 
| Alice | Bob |
| - | - |
| Bob's long-term public key | Alice's long-term public key |


![kk](../../../build/documentation/puml/crypt/kx_kk.svg)

#### `XX`

This is the most versatile variant, but it requires two round trips. In this variant, the Bob and Alice don't need to share any prior data. However, the peers public keys will be exchanged. Discovered public keys can then be discarded, used for authentication, or reused later with the `KK` variant.[^libhydrogenwiki]

#### Prior knowledge 
| Alice | Bob |
| - | - |
| Nothing | Nothing |


![xx](../../../build/documentation/puml/crypt/kx_xx.svg)

[^libhydrogenwiki]: This text is adapted from the [LibHydrogen wiki](https://github.com/jedisct1/libhydrogen/wiki).

## Configuration broker design considerations

`sfjs-crypto`, Configured Things' first approach to applying cryptographic model protections, was designed to support the following requirements:

- Digital signing
    - models signed as documents by their authors, allowing consumers to authenticate the origin of the model.
    - origin could be to a specific certificate-basd identity, or where a policy specifies a certificate authority, any identity whose X.509 certificate is signed by a given CA.
    - policies are encoded in a simple reverse polish binary logic: 
        ```
        (IDENTITY IDENTITY LOGICALOPERATOR)
        ...
        (ALICE BOB AND)
        ```
- Encryption
    - models encrypted in order to protect any contained secrets between author and target system.
    - the use of Diffie-Hellman Key Exchange to agree session keys between endpoints.

However, in the case of the configuration broker, rather than providing end-to-end trust between the model author and endpoint, we are seeking to provide trust between the configuration platform and endpoints, who are communicated across an untrusted message bus.

In the example use case of the CHERIoT boards being utilised within a smart metering infrastructure, it is desirable that the platform and endpoints can each sign their model updates. The platform signing infrastructure (such as IPs, domain names etc.) and billing (such as tariff, billing period) updates. 

Encryption of both pathways is also desirable, where configuration updates of behind-the-meter systems and the tariff commercials may be considered sensitive confidentially, likewise billing data from the endpoint is likely considered sensitive, and should not be open to analysis by third parties.

Notably, X.509 as defined in [RFC 3279](https://datatracker.ietf.org/doc/html/rfc3279), does not support LibHydrogen's digital signature algorithm, which whilst similar to EdDSA (support added in [RFC8410](https://datatracker.ietf.org/doc/html/rfc8410)), is not compatible[^EdDSA]:

>EdDSA requires SHA-2, and arithmetic over Curve25519 in Edwards form.
>
>We already have a different hash function used everywhere else, and arithmetic over Curve25519 in Montgomery form used for key exchange. So we leverage what we already have. The primitives are different, but we still compute Schnorr signatures, over the same field size.
>
>And although a variant with a randomized nonce has been specified to mitigate this, standard EdDSA is very fragile against side channel attacks. This is especially a concern on embedded systems. Libhydrogen signatures uses the same mechanism as this variant to produce non-deterministic signatures that still resist a weak RNG.

[^EdDSA]: https://github.com/jedisct1/libhydrogen/issues/21#issuecomment-382837226

Therefore we will only be able to support pinning of specific public keys rather than certificates and CAs, otherwise additional cryptographic libraries will need to be supported to parse and validate certificates and trust chains.