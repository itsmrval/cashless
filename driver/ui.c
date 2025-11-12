#include "ui.h"
#include <stdio.h>
#include <string.h>

#define VERSION "0.0.1"

static void clear_screen()
{
    printf("\033[2J\033[H");
}

void print_ui(const char *status, unsigned char version, const char *card_id)
{
    clear_screen();
    printf("cashless - v%s\n", VERSION);

    if (card_id && strlen(card_id) > 0) {
        printf("version v0.0.%d, id %s\n", version, card_id);
    }

    printf("\n\n%s\n", status);
    fflush(stdout);
}
