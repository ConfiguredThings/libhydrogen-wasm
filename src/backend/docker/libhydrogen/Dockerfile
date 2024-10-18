FROM alpine:3.20.3

RUN apk update && \
    apk add \
        cmake \
        clang \
        clang-dev \
        llvm \
        lld \
        make \
        wasi-sdk \
        wasi-libcxx

WORKDIR /data/

ENTRYPOINT [ "clang", "-target", "wasm32-wasi", "--sysroot=/usr/share/wasi-sysroot", "-o", "build/libhydrogen.wasm", "src/hydrogen.c" ]
