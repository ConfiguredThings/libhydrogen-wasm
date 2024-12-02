#include "hydrogen.h"

#include "impl/common.h"
#include "impl/hydrogen_p.h"

#include "impl/random.h"

#include "impl/core.h"
#include "impl/gimli-core.h"

#include "impl/hash.h"
#include "impl/kdf.h"
#include "impl/secretbox.h"

#include "impl/x25519.h"

#include "impl/kx.h"
#include "impl/pwhash.h"
#include "impl/sign.h"

#if defined(__wasi__)
int main(int argc, const char* argv[]) {
    if (hydro_init() != 0) {
        abort();
        return -1;
    }
    return 0;
}
#endif