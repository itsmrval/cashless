#include "ui.h"
#include <stdio.h>

#define VERSION "0.0.1"

static void clear_screen()
{
    printf("\033[2J\033[H");
}

void print_ui(const char *status)
{
    clear_screen();
    printf("cashless - v%s\n\n%s\n", VERSION, status);
    fflush(stdout);
}
