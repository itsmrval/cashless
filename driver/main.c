#include <stdio.h>
#include <unistd.h>
#include "card.h"
#include "api.h"
#include "ui.h"

int main()
{
    unsigned char card_id[SIZE_CARD_ID + 1];
    unsigned char version;
    int card_present = 0;

    if (!api_init()) {
        printf("Error: Failed to initialize API client\n");
        return 1;
    }

    if (!init_reader()) {
        printf("Error: No reader detected\n");
        api_cleanup();
        return 1;
    }

    print_ui("Waiting for a card");

    while (1) {
        if (connect_card()) {
            if (!card_present) {
                if (read_data(card_id, &version)) {
                    card_id[SIZE_CARD_ID] = '\0';

                    print_ui("Retrieving user informations...");

                    char user_name[256];
                    if (fetch_user_by_card((char *)card_id, user_name, sizeof(user_name))) {
                        char msg[512];
                        sprintf(msg, "Welcome %s!\n(v%d - %s)", user_name, version, card_id);
                        print_ui(msg);
                    } else {
                        char msg[256];
                        sprintf(msg, "Error: Card not assigned\n(v%d - %s)", version, card_id);
                        print_ui(msg);
                    }

                    card_present = 1;
                } else {
                    disconnect_card();
                }
            }
        } else {
            if (card_present) {
                print_ui("Waiting for a card");
                card_present = 0;
            }
            disconnect_card();
        }

        usleep(500000);
    }

    api_cleanup();
    cleanup_card();
    return 0;
}
