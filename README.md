# dsbd-sonata

> [!TIP]
> Documentation imagery can be rebuilt using docker compose:
> ```bash
> docker compose -f src/documentation/documentation.yaml up
> ```

## libHydrogen wasm compilation

>[!TIP]
> This repository utilises submodules, therefore when cloning use the following syntax:
>```
>git clone --recursive  git@github.com:ConfiguredThings/dsbd-sonata.git
>```
>
> After checking out a branch with different submodule uses: 
>```
>git submodule update --init --recursive
>```

Run the following from the top level directory to setup husky for linting

1. `npm install`

Run the following commands to build and run a container in which the wasm library is built.

1. `cd src/backend/crypt`
2. `npm install`

To run a set of examples that call into the wasm library demonstrating its functionality, run the following:

1. `cd src/backend/crypt`
2. `npm run examples`
   
To generate a set of signing key files that can be used in JS and C, run the following:

1. `cd src/backend/crypt`
2. `npm run gen_signing_keys -- config`

will generate files
```
build/
└── keys/
    ├── config.pri
    ├── config_pri_key.h
    ├── config.pub
    └── config_pub_key.h
```

