#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <sys/select.h>
#include <termios.h>
#include "card.h"
#include "api.h"
#include "ui.h"

// Read PIN with card presence checking
// Returns: 1 if PIN read successfully, 0 if card removed
int read_pin(char *pin)
{
    struct termios old_tio, new_tio;
    fd_set readfds;
    struct timeval tv;
    int pos = 0;

    tcgetattr(STDIN_FILENO, &old_tio);
    new_tio = old_tio;
    new_tio.c_lflag &= ~(ICANON | ECHO);
    tcsetattr(STDIN_FILENO, TCSANOW, &new_tio);

    while (pos < SIZE_PIN) {
        if (!is_card_present()) {
            printf("\n");
            tcsetattr(STDIN_FILENO, TCSANOW, &old_tio);
            return 0;
        }

        FD_ZERO(&readfds);
        FD_SET(STDIN_FILENO, &readfds);
        tv.tv_sec = 0;
        tv.tv_usec = 500000;

        if (select(STDIN_FILENO + 1, &readfds, NULL, NULL, &tv) > 0) {
            char c;
            if (read(STDIN_FILENO, &c, 1) == 1) {
                if (c >= '0' && c <= '9') {
                    pin[pos++] = c;
                    printf("*");
                    fflush(stdout);
                } else if ((c == 127 || c == 8) && pos > 0) {
                    pos--;
                    printf("\b \b");
                    fflush(stdout);
                }
            }
        }
    }

    pin[SIZE_PIN] = '\0';
    printf("\n");
    tcsetattr(STDIN_FILENO, TCSANOW, &old_tio);
    return 1;
}

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

                    int is_zero = 1;
                    for (int i = 0; i < SIZE_CARD_ID; i++) {
                        if (card_id[i] != 0x00) {
                            is_zero = 0;
                            break;
                        }
                    }

                    if (is_zero) {
                        print_ui("Error: An error occured while reading your card.\n\nPlease remove your card.", version, "?", NULL);
                        card_present = 1;
                        continue;
                    }

                    char card_status[64];
                    if (!get_card_status((char *)card_id, card_status, sizeof(card_status))) {
                        print_ui("Error: Cannot retrieve card status\n\nPlease remove your card.", version, (char *)card_id, NULL);
                        card_present = 1;
                        continue;
                    }

                    char user_name[256];
                    int has_user = fetch_user_by_card((char *)card_id, user_name, sizeof(user_name));

                    if (!has_user) {
                        print_ui("Unable to authenticate your card.\nPlease remove it.", version, (char *)card_id, NULL);
                        card_present = 1;
                        continue;
                    }

                    if (strcmp(card_status, "waiting_activation") == 0) {
                        print_ui("Card activation required\n\nPlease enter a 4-digit PIN:", version, (char *)card_id, user_name);

                        char pin[SIZE_PIN + 1];
                        printf("Enter PIN: ");
                        fflush(stdout);

                        if (!read_pin(pin)) {
                            disconnect_card();
                            card_present = 0;
                            print_ui("Waiting for a card", 0, NULL, NULL);
                            continue;
                        }

                        print_ui("Setting up PIN...", version, (char *)card_id, user_name);

                        if (!reconnect_card()) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Failed to reconnect to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (!write_pin_to_card(pin)) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Failed to write PIN to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (!update_card_status((char *)card_id, "active")) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Failed to activate card in system\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        print_ui("PIN setup successful!", version, (char *)card_id, user_name);

                        for (int countdown = 4; countdown >= 1; countdown--) {
                            sleep(1);
                            if (!connect_card()) {
                                card_present = 0;
                                break;
                            }
                            char redirect_msg[64];
                            sprintf(redirect_msg, "PIN setup successful!\nRedirecting... (%d seconds..)", countdown);
                            print_ui(redirect_msg, version, (char *)card_id, user_name);
                        }

                        card_present = 0;

                    } else if (strcmp(card_status, "inactive") == 0) {
                        print_ui("Unable to authenticate your card.\nPlease remove it.", version, (char *)card_id, user_name);
                        card_present = 1;

                    } else if (strcmp(card_status, "active") == 0) {
                        print_ui("Enter your PIN:", version, (char *)card_id, user_name);

                        char pin[SIZE_PIN + 1];
                        printf("PIN: ");
                        fflush(stdout);

                        if (!read_pin(pin)) {
                            disconnect_card();
                            card_present = 0;
                            print_ui("Waiting for a card", 0, NULL, NULL);
                            continue;
                        }

                        print_ui("Verifying PIN...", version, (char *)card_id, user_name);

                        if (!reconnect_card()) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Failed to reconnect to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        char card_pin[SIZE_PIN + 1];
                        if (!read_pin_from_card(card_pin)) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Failed to read PIN from card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (strcmp(pin, card_pin) != 0) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Invalid PIN\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (!connect_card()) {
                            card_present = 0;
                            continue;
                        }
                        print_ui("Authentication successful!", version, (char *)card_id, user_name);

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
