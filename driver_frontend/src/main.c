#include "common/pcsc_utils.h"
#include "modes/loader/loader.h"
#include "modes/admin/admin.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static void print_usage(const char *prog) {
    printf("Usage: %s <mode>\n", prog);
    printf("Modes:\n");
    printf("  loader - Affichage version carte\n");
    printf("  admin  - Gestion firmware\n");
}

int main(int argc, char **argv) {
    if (argc != 2) {
        print_usage(argv[0]);
        return 1;
    }

    if (strcmp(argv[1], "admin") == 0) {
        admin_mode(0, NULL);
        return 0;
    }

    SCARDCONTEXT context;
    LONG rv = establish_context(&context);
    if (rv != SCARD_S_SUCCESS) {
        printf("Erreur: contact PC/SC non disponible\n");
        return 1;
    }

    char *reader;
    rv = list_readers(context, &reader);
    if (rv != SCARD_S_SUCCESS || reader == NULL || reader[0] == '\0') {
        printf("Erreur: Lecteur PC/SC non disponible\n");
        if (reader) free(reader);
        SCardReleaseContext(context);
        return 1;
    }

    printf("\033[2J\033[H");
    printf("Mode: %s\n", argv[1]);
    printf("Lecteur: %s\n\n", reader);
    sleep(1);

    if (strcmp(argv[1], "loader") == 0) {
        loader_mode(context, reader);
    } else {
        print_usage(argv[0]);
        free(reader);
        SCardReleaseContext(context);
        return 1;
    }

    free(reader);
    SCardReleaseContext(context);
    return 0;
}
