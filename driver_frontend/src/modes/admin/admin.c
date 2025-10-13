#include "admin.h"
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

static char detected_port[64] = "";


void admin_mode(SCARDCONTEXT context, char *reader) {
    (void)context;
    (void)reader;

    printf("\033[2J\033[H");
    printf("=== Administration ===\n\n");
    printf("Chargement...\n");

    while (1) {
        printf("\033[2J\033[H");
        printf("=== Administration ===\n\n");
        printf("Programmeur détecté: %s\n\n", detected_port);
        printf("1. Reprogrammer la carte\n");

        int choice;
        if (scanf("%d", &choice) != 1) {
            while(getchar() != '\n');
            continue;
        }

        if (choice == 1) {
            printf("Reprogrammation... TODO\n");
        } 
    }
}
