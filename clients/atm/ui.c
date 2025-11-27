#include "ui.h"
#include <stdio.h>
#include <string.h>

#define VERSION "1.1.0"

static void clear_screen()
{
    printf("\033[2J\033[H");
}

void print_ui(const char *status, unsigned char version, const char *card_id, const char *user_name)
{
    clear_screen();
    printf("cashless - v%s\n", VERSION);

    if (card_id && strlen(card_id) > 0) {
        if (user_name && strlen(user_name) > 0) {
            printf("\nWelcome, %s\n", user_name);
        } else {
            printf("\n");
        }
        printf("- version v%d.%d.%d, id %s\n", version / 100, (version % 100) / 10, version % 10, card_id);
        printf("\n%s\n", status);
    } else {
        printf("\n%s\n", status);
    }

    fflush(stdout);
}
