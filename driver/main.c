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

    print_ui("Waiting for a card");

    while (1) {
        if (connect_card()) {
            if (!card_present) {
                if (read_data(card_id, &version)) {
                    card_id[SIZE_CARD_ID] = '\0';

                    print_ui("Checking card status...");

                    // Get card status from API
                    char card_status[64];
                    if (!get_card_status((char *)card_id, card_status, sizeof(card_status))) {
                        char msg[256];
                        sprintf(msg, "Error: Cannot retrieve card status\n(v%d - %s)", version, card_id);
                        print_ui(msg);
                        card_present = 1;
                        continue;
                    }

                    // Handle different card states
                    if (strcmp(card_status, "waiting_activation") == 0) {
                        // Card needs PIN setup
                        char msg[256];
                        sprintf(msg, "Card activation required\nPlease enter a 4-digit PIN:");
                        print_ui(msg);

                        // Get PIN input from user
                        char pin[SIZE_PIN + 1];
                        printf("Enter PIN: ");
                        if (scanf("%4s", pin) != 1 || strlen(pin) != SIZE_PIN) {
                            print_ui("Error: Invalid PIN format");
                            card_present = 1;
                            continue;
                        }

                        // Validate PIN is numeric
                        int valid = 1;
                        for (int i = 0; i < SIZE_PIN; i++) {
                            if (pin[i] < '0' || pin[i] > '9') {
                                valid = 0;
                                break;
                            }
                        }
                        if (!valid) {
                            print_ui("Error: PIN must be 4 digits");
                            card_present = 1;
                            continue;
                        }

                        print_ui("Setting up PIN...");

                        // Write PIN to card EEPROM
                        if (!write_pin_to_card(pin)) {
                            print_ui("Error: Failed to write PIN to card");
                            card_present = 1;
                            continue;
                        }

                        // Send PIN to API for hashing and storage
                        if (setup_pin_api((char *)card_id, pin)) {
                            sprintf(msg, "PIN setup successful!\nCard activated\n(v%d - %s)", version, card_id);
                            print_ui(msg);
                        } else {
                            print_ui("Error: Failed to setup PIN on server");
                        }

                        card_present = 1;

                    } else if (strcmp(card_status, "inactive") == 0) {
                        // Card is not active
                        char msg[256];
                        sprintf(msg, "Error: Card is not yet active\n(v%d - %s)", version, card_id);
                        print_ui(msg);
                        card_present = 1;

                    } else if (strcmp(card_status, "active") == 0) {
                        // Card is active, request PIN
                        print_ui("Enter your PIN:");

                        char pin[SIZE_PIN + 1];
                        printf("PIN: ");
                        if (scanf("%4s", pin) != 1 || strlen(pin) != SIZE_PIN) {
                            print_ui("Error: Invalid PIN format");
                            card_present = 1;
                            continue;
                        }

                        print_ui("Verifying PIN...");

                        // Read PIN from card
                        char card_pin[SIZE_PIN + 1];
                        if (!read_pin_from_card(card_pin)) {
                            print_ui("Error: Failed to read PIN from card");
                            card_present = 1;
                            continue;
                        }

                        // Validate PIN matches card
                        if (strcmp(pin, card_pin) != 0) {
                            print_ui("Error: Invalid PIN (card mismatch)");
                            card_present = 1;
                            continue;
                        }

                        // Verify PIN with API
                        char user_name[256];
                        if (verify_pin_api((char *)card_id, pin, user_name, sizeof(user_name))) {
                            char msg[512];
                            sprintf(msg, "Welcome %s!\n(v%d - %s)", user_name, version, card_id);
                            print_ui(msg);
                        } else {
                            print_ui("Error: Invalid PIN");
                        }

                        card_present = 1;

                    } else {
                        // Unknown status
                        char msg[256];
                        sprintf(msg, "Error: Unknown card status: %s\n(v%d - %s)", card_status, version, card_id);
                        print_ui(msg);
                        card_present = 1;
                    }
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
