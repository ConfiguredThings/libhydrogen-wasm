# Cryptography

## Libhydrogen

Libhydrogen is a very lightweight, computationally efficient, cryptographic library written in C. It is designed for applications such as microcontrollers. Therefore it is ideally suited to being ported to CHERIoT. 

Whilst CHERIoT and the library's C implementation addresses the "edge" segment of the network, the core network relies on the Configured Things Platform, a software framework written in JavaScript and deployed on Nodejs. Therefore WebAssembly and the WebAssembly System Interface is utilised to execute a compiled libhydrogen WebAssembly from the Nodejs runtime.

Libhydrogen supports three means of exchanging session keys for the sending and receiving of encrypted data: `N`, `KK` and `XX`.

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

### `N`

This variant is designed to anonymously send messages to a recipient using its public key.[^libhydrogenwiki]

#### Prior knowledge 
| Alice | Bob |
| - | - |
| Nothing | Alice's long-term public key |


![n](../../../build/documentation/puml/crypt/kx_n.svg)

### `KK`

This variant is designed to exchange messages between two parties that already know each other's public key.[^libhydrogenwiki]

#### Prior knowledge 
| Alice | Bob |
| - | - |
| Bob's long-term public key | Alice's long-term public key |


![kk](../../../build/documentation/puml/crypt/kx_kk.svg)

### `XX`

This is the most versatile variant, but it requires two round trips. In this variant, the Bob and Alice don't need to share any prior data. However, the peers public keys will be exchanged. Discovered public keys can then be discarded, used for authentication, or reused later with the KK variant.[^libhydrogenwiki]

#### Prior knowledge 
| Alice | Bob |
| - | - |
| Nothing | Nothing |


![xx](../../../build/documentation/puml/crypt/kx_xx.svg)

[^libhydrogenwiki]: This text is adapted from the [libhydrogen wiki](https://github.com/jedisct1/libhydrogen/wiki).