# LibHydrogen WASM

This module is responsible for packaging up [LibHydrogen](https://github.com/jedisct1/libhydrogen) as a WebAssembly that complies with the Web Assembly System Interface. This is achieved by supplying LibHydrogen with a main function, see [`hydrogen.c`](./hydrogen.c).

## Build and publish instructions

To build the wasm and its attendant package files, within this directory (`dsbd-sonata/src/backend/crypt`), run `npm install`, this will build and execute a Docker image that will be utilised to compile LibHydrogen.

The WASM build artefact will be output to `dsbd-sonata/build/backend/crypt/vendor/libhydrogen`.

To publish this WASM as an npm package to Configured Things' GitHub Packages registry, changing to the directory where the wasm was built. Within this directory, run `npm publish`.