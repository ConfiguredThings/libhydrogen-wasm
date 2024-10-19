# dsbd-sonata

## libhydrogen wasm compilation

Run the following commands to build a container in which the wasm library can be built, run said container to build the library and have it output to `build/`:

>[!TIP]
> This repository utilises submodules, therefore when cloning use the following syntax:
>```
>git clone --recursive
>```

1. `docker build -t libhydrogen -f src/backend/docker/libhydrogen/Dockerfile src/backend/vendor/libhydrogen`
2. `docker run -v $(pwd)/build/backend/vendor/libhydrogen:/data/build -v $(pwd)/src/backend/vendor/libhydrogen:/data/src:ro -t libhydrogen`