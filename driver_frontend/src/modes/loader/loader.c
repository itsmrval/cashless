#include "loader.h"
#include "../../common/pcsc_utils.h"
#include "../../common/card_operations.h"
#include <stdio.h>
#include <unistd.h>

void loader_mode(SCARDCONTEXT context, char *reader) {
    while (1) {
        printf("\033[2J\033[H");
        printf("En attente d'une carte...\n");

        wait_for_card(context, reader);
        usleep(200000);

        SCARDHANDLE card;
        DWORD protocol;
        LONG rv = connect_card(context, reader, &card, &protocol);

        if (rv != SCARD_S_SUCCESS) {
            printf("Erreur: impossible de lire la carte\n");
            printf("Retirez la carte...\n");
            wait_for_card_removal(context, reader);
            continue;
        }

        char version[16];
        card_get_version(card, version, sizeof(version));

        printf("\033[2J\033[H");
        printf("Carte détectée\n");
        printf("Version: %s\n", version);

        printf("\nRetirez la carte...\n");
        SCardDisconnect(card, SCARD_RESET_CARD);
        wait_for_card_removal(context, reader);
    }
}
