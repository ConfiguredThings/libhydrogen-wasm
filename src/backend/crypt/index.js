const { readFile } = require('node:fs/promises');
const { WASI } = require('node:wasi');
const { argv, env } = require('node:process');

const wasi = new WASI({
  version: 'preview1',
  args: argv,
  env,
  preopens: {},
});

(async () => {
  const wasm = await WebAssembly.compile(
    await readFile('./build/backend/vendor/libhydrogen/libhydrogen.wasm'),
  );
  const instance = await WebAssembly.instantiate(wasm, wasi.getImportObject());
  
  wasi.start(instance);
  console.dir(instance.exports.hydro_random_uniform(20))
})();