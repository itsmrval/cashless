#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <openssl/rsa.h>
#include <openssl/pem.h>
#include <openssl/evp.h>
#include <openssl/bio.h>
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
    if (!ctx || EVP_PKEY_keygen_init(ctx) <= 0 || EVP_PKEY_CTX_set_rsa_keygen_bits(ctx, 2048) <= 0 || EVP_PKEY_keygen(ctx, &pkey) <= 0) {
        printf("Error: Failed to generate RSA keypair\n");
        if (ctx) EVP_PKEY_CTX_free(ctx);
        if (pkey) EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }
    EVP_PKEY_CTX_free(ctx);

    unsigned char *private_key_der = NULL;
    int private_key_len = i2d_PrivateKey(pkey, &private_key_der);
    if (private_key_len <= 0) {
        printf("Error: Failed to encode private key\n");
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    BIO *bio_pub = BIO_new(BIO_s_mem());
    PEM_write_bio_PUBKEY(bio_pub, pkey);
    char *public_key_pem = NULL;
    long pub_len = BIO_get_mem_data(bio_pub, &public_key_pem);

    printf("Assigning card ID: %s\n", argv[1]);
    printf("Card ID bytes (hex): ");
    for (i = 0; i < SIZE_CARD_ID; i++) {
        printf("%02X ", (unsigned char)argv[1][i]);
    }
    printf("\n");
    printf("Generated PUK: %s\n", puk);

    if (!reconnect_card()) {
        printf("Error: Failed to reconnect to card\n");
        BIO_free(bio_pub);
        OPENSSL_free(private_key_der);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    if (!assign_card(argv[1], puk)) {
        printf("Error: Failed to assign card\n");
        BIO_free(bio_pub);
        OPENSSL_free(private_key_der);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    if (!connect_card()) {
        printf("Error: Failed to reconnect after assignment\n");
        BIO_free(bio_pub);
        OPENSSL_free(private_key_der);
        EVP_PKEY_free(pkey);
        cleanup_card();
        return 1;
    }

    printf("Verifying assignment immediately...\n");
    BYTE verify_card_id[SIZE_CARD_ID];
    BYTE verify_version;
    if (!read_data(verify_card_id, &verify_version)) {
        printf("Error: Failed to read card after assignment\n");
        BIO_free(bio_pub);
        OPENSSL_free(private_key_der);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Immediate verification - card ID bytes (hex): ");
    for (i = 0; i < SIZE_CARD_ID; i++) {
        printf("%02X ", verify_card_id[i]);
    }
    printf("\n");

    usleep(1000000);  // Wait 1 second for EEPROM to fully settle

    if (!reconnect_card()) {
        printf("Error: Failed to reconnect for private key write\n");
        BIO_free(bio_pub);
        OPENSSL_free(private_key_der);
        EVP_PKEY_free(pkey);
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Writing private key to card...\n");
    if (!write_private_key(private_key_der, private_key_len)) {
        printf("Error: Failed to write private key to card\n");
        BIO_free(bio_pub);
        OPENSSL_free(private_key_der);
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
    OPENSSL_free(private_key_der);
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

    printf("New card ID: ");
    for (i = 0; i < SIZE_CARD_ID; i++) {
        printf("%c", current_card_id[i]);
    }
    printf("\n");
    printf("New card ID bytes (hex): ");
    for (i = 0; i < SIZE_CARD_ID; i++) {
        printf("%02X ", current_card_id[i]);
    }
    printf("\n");

    disconnect_card();
    cleanup_card();

    printf("\nCard assignment completed successfully!\n");
    return 0;
}
