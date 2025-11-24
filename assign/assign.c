#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
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

    printf("Generating simple key (4 bytes)...\n");
    unsigned char key_raw[4];

    for (i = 0; i < 4; i++) {
        key_raw[i] = rand() & 0xFF;
    }

    int private_key_len = 4;

    printf("Assigning card ID: %s\n", argv[1]);
    printf("Generated PUK: %s\n", puk);

    if (!reconnect_card()) {
        printf("Error: Failed to reconnect to card\n");
        disconnect_card();
        cleanup_card();
        return 1;
    }

    if (!assign_card(argv[1], puk)) {
        printf("Error: Failed to assign card\n");
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Writing private key to card...\n");
    if (!reconnect_card()) {
        printf("Error: Failed to reconnect to card\n");
        disconnect_card();
        cleanup_card();
        return 1;
    }
    if (!write_private_key(key_raw, private_key_len)) {
        printf("Error: Failed to write key to card\n");
        disconnect_card();
        cleanup_card();
        return 1;
    }

    printf("Card key (hex):\n");
    for (i = 0; i < 4; i++) {
        printf("%02x", key_raw[i]);
    }
    printf("\n");

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
