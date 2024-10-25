# dsbd-sonata

## libhydrogen wasm compilation

>[!TIP]
> This repository utilises submodules, therefore when cloning use the following syntax:
>```
>git clone --recursive
>```

Run the following commands to build and run a container in which the wasm library is built.

1. `cd src/backend/crypt`
2. `npm install`

To run an example program that calls into this wasm library to generate uniformly distributed random numbers, run the following:

1. `npm start`