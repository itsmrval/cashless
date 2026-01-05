#include "hmac_sha256.h"
#include "sha256.h"
#include <string.h>

#define SHA256_INTERNAL_BLOCK_SIZE 64

void hmac_sha256(const uint8_t *key, uint8_t key_len,
                 const uint8_t *msg, uint8_t msg_len,
                 uint8_t *out)
{
    uint8_t i;
    uint8_t key_block[SHA256_INTERNAL_BLOCK_SIZE];
    uint8_t o_key_pad[SHA256_INTERNAL_BLOCK_SIZE];
    uint8_t i_key_pad[SHA256_INTERNAL_BLOCK_SIZE];
    SHA256_CTX ctx;
    uint8_t inner_hash[HMAC_SHA256_DIGEST_SIZE];

    // Prepare key block
    memset(key_block, 0, SHA256_INTERNAL_BLOCK_SIZE);
    if (key_len <= SHA256_INTERNAL_BLOCK_SIZE) {
        memcpy(key_block, key, key_len);
    } else {
        // Hash the key if it's longer than block size
        sha256_init(&ctx);
        sha256_update(&ctx, key, key_len);
        sha256_final(&ctx, key_block);
    }

    // Create padded keys
    for (i = 0; i < SHA256_INTERNAL_BLOCK_SIZE; i++) {
        o_key_pad[i] = key_block[i] ^ 0x5c;
        i_key_pad[i] = key_block[i] ^ 0x36;
    }

    // Inner hash: H((K ⊕ ipad) || message)
    sha256_init(&ctx);
    sha256_update(&ctx, i_key_pad, SHA256_INTERNAL_BLOCK_SIZE);
    sha256_update(&ctx, msg, msg_len);
    sha256_final(&ctx, inner_hash);

    // Outer hash: H((K ⊕ opad) || inner_hash)
    sha256_init(&ctx);
    sha256_update(&ctx, o_key_pad, SHA256_INTERNAL_BLOCK_SIZE);
    sha256_update(&ctx, inner_hash, HMAC_SHA256_DIGEST_SIZE);
    sha256_final(&ctx, out);
}
