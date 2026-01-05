#ifndef HMAC_SHA256_H
#define HMAC_SHA256_H

#include <stdint.h>

#define HMAC_SHA256_DIGEST_SIZE 32

void hmac_sha256(const uint8_t *key, uint8_t key_len,
                 const uint8_t *msg, uint8_t msg_len,
                 uint8_t *out);

#endif
