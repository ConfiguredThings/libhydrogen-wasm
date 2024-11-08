# dsbd-sonata

## libhydrogen wasm compilation

>[!TIP]
> This repository utilises submodules, therefore when cloning use the following syntax:
>```
>git submodule update --init --recursive
>```

Run the following commands to build and run a container in which the wasm library is built.

1. `cd src/backend/crypt`
2. `npm install`

To run a set of examples that call into the wasm library demonstrating its functionality, run the following:

1. `npm run examples`