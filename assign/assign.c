#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <openssl/rsa.h>
#include <openssl/pem.h>
#include <openssl/evp.h>
#include <openssl/bio.h>
#include <openssl/bn.h>
#include "card.h"

int main(int argc, char *argv[])
{
    BYTE current_card_id[SIZE_CARD_ID];
    BYTE version;
    int i;

    if (argc != 2) {
        printf("Usage: %s <CARD_ID>\n", argv[0]);
        printf("  CARD_ID must be exactly %d characters\n", SIZE_CARD_ID);
        return 1;
    }

    if (strlen(argv[1]) != SIZE_CARD_ID) {
        printf("Error: CARD_ID must be exactly %d characters (got %zu)\n",
               SIZE_CARD_ID, strlen(argv[1]));
        return 1;
    }

    printf("Initializing card reader...\n");
    if (!init_reader()) {
        printf("Error: Failed to initialize reader\n");
        return 1;
    }

    printf("Connecting to card...\n");
    if (!connect_card()) {
        printf("Error: Failed to connect to card\n");
        cleanup_card();
        return 1;
    }

    printf("Reading current card data...\n");
    if (!read_data(current_card_id, &version)) {
        printf("Error: Failed to read card data\n");
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Card version: %d\n", version);
    printf("Current card ID: ");
    for (i = 0; i < SIZE_CARD_ID; i++) {
        printf("%c", current_card_id[i]);
    }
    printf("\n");

    // Check if card is already assigned (not all zeros)
    int is_zero = 1;
    for (i = 0; i < SIZE_CARD_ID; i++) {
        if (current_card_id[i] != 0x00) {
            is_zero = 0;
            break;
        }
    }

    if (!is_zero) {
        printf("Warning: Card appears to already have an ID\n");
        printf("Attempting to assign anyway...\n");
    } else {
        printf("Card is ready (unassigned)\n");
    }

    srand(time(NULL));
    char puk[SIZE_PUK + 1];
    for (i = 0; i < SIZE_PUK; i++) {
        puk[i] = '0' + (rand() % 10);
    }
    puk[SIZE_PUK] = '\0';

    printf("Generating RSA keypair...\n");
    EVP_PKEY *pkey = EVP_PKEY_new();
    EVP_PKEY_CTX *ctx = EVP_PKEY_CTX_new_id(EVP_PKEY_RSA, NULL);
    if (!ctx || EVP_PKEY_keygen_init(ctx) <= 0 || EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, 1024) <= 0 || EVP_PKEY_keygen(ctx, &pkey) <= 0) {
        printf("Error: Failed to generate RSA keypair\n");
        if (ctx) EVP_PKEY_CTX_free(ctx);
        if (pkey) EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }
    EVP_PKEY_CTX_free(ctx);

    RSA *rsa = EVP_PKEY_get1_RSA(pkey);
    if (!rsa) {
        printf("Error: Failed to get RSA key\n");
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    const BIGNUM *n, *e, *d;
    RSA_get0_key(rsa, &n, &e, &d);

    unsigned char modulus[128] = {0};
    unsigned char priv_exp[128] = {0};

    int n_len = BN_num_bytes(n);
    int d_len = BN_num_bytes(d);

    if (n_len > 128 || d_len > 128) {
        printf("Error: Key components too large\n");
        RSA_free(rsa);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    BN_bn2bin(n, modulus + (128 - n_len));
    BN_bn2bin(d, priv_exp + (128 - d_len));

    unsigned char private_key_raw[256];
    memcpy(private_key_raw, modulus, 128);
    memcpy(private_key_raw + 128, priv_exp, 128);
    int private_key_len = 256;

    BIO *bio_pub = BIO_new(BIO_s_mem());
    PEM_write_bio_PUBKEY(bio_pub, pkey);
    char *public_key_pem = NULL;
    long pub_len = BIO_get_mem_data(bio_pub, &public_key_pem);

    printf("Assigning card ID: %s\n", argv[1]);
    printf("Generated PUK: %s\n", puk);

    if (!reconnect_card()) {
        printf("Error: Failed to reconnect to card\n");
        BIO_free(bio_pub);
        RSA_free(rsa);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    if (!assign_card(argv[1], puk)) {
        printf("Error: Failed to assign card\n");
        BIO_free(bio_pub);
        RSA_free(rsa);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Writing private key to card...\n");
    if (!reconnect_card()) {
        printf("Error: Failed to reconnect to card\n");
        BIO_free(bio_pub);
        RSA_free(rsa);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }
    if (!write_private_key(private_key_raw, private_key_len)) {
        printf("Error: Failed to write private key to card\n");
        BIO_free(bio_pub);
        RSA_free(rsa);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Public key (PEM):\n");
    for (long j = 0; j < pub_len; j++) {
        if (public_key_pem[j] != '\0') {
            putchar(public_key_pem[j]);
        }
    }
    if (public_key_pem[pub_len-1] != '\n') {
        putchar('\n');
    }

    BIO_free(bio_pub);
    RSA_free(rsa);
    EVP_PKEY_free(pkey);

    if (!connect_card()) {
        printf("Error: Failed to reconnect after assignment\n");
        cleanup_card();
        return 1;
    }

    printf("Verifying assignment...\n");
    if (!read_data(current_card_id, &version)) {
        printf("Error: Failed to verify assignment\n");
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Card ID verified: ");
    for (i = 0; i < SIZE_CARD_ID; i++) {
        printf("%c", current_card_id[i]);
    }
    printf("\n");

    disconnect_card();
    cleanup_card();

    printf("\nCard assignment completed successfully!\n");
    return 0;
}
