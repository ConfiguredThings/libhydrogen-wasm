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
        wasi-libcxx \
        zig

WORKDIR /data/

ADD . .

ENTRYPOINT [ "zig", "build", "-Dtarget=wasm32-wasi" ]
