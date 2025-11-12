#include <stdio.h>
#include <unistd.h>
#include <string.h>
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

    print_ui("Waiting for a card", 0, NULL, NULL);

    while (1) {
        if (connect_card()) {
            if (!card_present) {
                if (read_data(card_id, &version)) {
                    card_id[SIZE_CARD_ID] = '\0';

                    char card_status[64];
                    if (!get_card_status((char *)card_id, card_status, sizeof(card_status))) {
                        print_ui("Error: Cannot retrieve card status\n\nPlease remove your card.", version, (char *)card_id, NULL);
                        card_present = 1;
                        continue;
                    }

                    char user_name[256];
                    int has_user = fetch_user_by_card((char *)card_id, user_name, sizeof(user_name));

                    if (!has_user) {
                        print_ui("Unable to authenticate your card.", version, (char *)card_id, NULL);
                        card_present = 1;
                        continue;
                    }

                    if (strcmp(card_status, "waiting_activation") == 0) {
                        print_ui("Card activation required\n\nPlease enter a 4-digit PIN:", version, (char *)card_id, user_name);

                        char pin[SIZE_PIN + 1];
                        printf("Enter PIN: ");
                        if (scanf("%4s", pin) != 1 || strlen(pin) != SIZE_PIN) {
                            print_ui("Error: Invalid PIN format\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        int valid = 1;
                        for (int i = 0; i < SIZE_PIN; i++) {
                            if (pin[i] < '0' || pin[i] > '9') {
                                valid = 0;
                                break;
                            }
                        }
                        if (!valid) {
                            print_ui("Error: PIN must be 4 digits\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        print_ui("Setting up PIN...", version, (char *)card_id, user_name);

                        if (!reconnect_card()) {
                            print_ui("Error: Failed to reconnect to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (!write_pin_to_card(pin)) {
                            print_ui("Error: Failed to write PIN to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (setup_pin_api((char *)card_id, pin)) {
                            print_ui("PIN setup successful!\n\nCard activated", version, (char *)card_id, user_name);
                        } else {
                            print_ui("Error: Failed to setup PIN on server\n\nPlease remove your card.", version, (char *)card_id, user_name);
                        }

                        card_present = 1;

                    } else if (strcmp(card_status, "inactive") == 0) {
                        print_ui("Please remove your card.", version, (char *)card_id, user_name);
                        card_present = 1;

                    } else if (strcmp(card_status, "active") == 0) {
                        print_ui("Enter your PIN:", version, (char *)card_id, user_name);

                        char pin[SIZE_PIN + 1];
                        printf("PIN: ");
                        if (scanf("%4s", pin) != 1 || strlen(pin) != SIZE_PIN) {
                            print_ui("Error: Invalid PIN format\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        print_ui("Verifying PIN...", version, (char *)card_id, user_name);

                        if (!reconnect_card()) {
                            print_ui("Error: Failed to reconnect to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        char card_pin[SIZE_PIN + 1];
                        if (!read_pin_from_card(card_pin)) {
                            print_ui("Error: Failed to read PIN from card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (strcmp(pin, card_pin) != 0) {
                            print_ui("Error: Invalid PIN\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        char verified_user_name[256];
                        if (verify_pin_api((char *)card_id, pin, verified_user_name, sizeof(verified_user_name))) {
                            print_ui("Authentication successful!", version, (char *)card_id, verified_user_name);
                        } else {
                            print_ui("Error: Invalid PIN\n\nPlease remove your card.", version, (char *)card_id, user_name);
                        }

                        card_present = 1;

                    } else {
                        char msg[512];
                        sprintf(msg, "Error: Unknown card status: %s\n\nPlease remove your card.", card_status);
                        print_ui(msg, version, (char *)card_id, user_name);
                        card_present = 1;
                    }
                } else {
                    disconnect_card();
                }
            }
        } else {
            if (card_present) {
                print_ui("Waiting for a card", 0, NULL, NULL);
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
