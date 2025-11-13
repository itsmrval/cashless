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
int read_digits(char *buffer, int size)
{
    struct termios old_tio, new_tio;
    fd_set readfds;
    struct timeval tv;
    int pos = 0;

    tcgetattr(STDIN_FILENO, &old_tio);
    new_tio = old_tio;
    new_tio.c_lflag &= ~(ICANON | ECHO);
    tcsetattr(STDIN_FILENO, TCSANOW, &new_tio);

    while (pos < size) {
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
                    buffer[pos++] = c;
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

    buffer[size] = '\0';
    printf("\n");
    tcsetattr(STDIN_FILENO, TCSANOW, &old_tio);
    return 1;
}

int read_pin(char *pin)
{
    return read_digits(pin, SIZE_PIN);
}

int read_puk(char *puk)
{
    return read_digits(puk, SIZE_PUK);
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
                        print_ui("Error: An error occured while reading your card.\n\nPlease remove your card.", version, "not found", NULL);
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

                        print_ui("Please enter a 4-digit PUK\n(PIN Unblocking Key):", version, (char *)card_id, user_name);

                        char puk[SIZE_PUK + 1];
                        printf("Enter PUK: ");
                        fflush(stdout);

                        if (!read_puk(puk)) {
                            disconnect_card();
                            card_present = 0;
                            print_ui("Waiting for a card", 0, NULL, NULL);
                            continue;
                        }

                        print_ui("Setting up PIN and PUK...", version, (char *)card_id, user_name);

                        if (!reconnect_card()) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Failed to reconnect to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            card_present = 1;
                            continue;
                        }

                        if (!write_pin_and_puk_to_card(pin, puk)) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                            print_ui("Error: Failed to write PIN and PUK to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
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

                        for (int countdown = 3; countdown >= 1; countdown--) {
                            char redirect_msg[64];
                            sprintf(redirect_msg, "PIN setup successful!\nRedirecting... (%d seconds..)", countdown);
                            print_ui(redirect_msg, version, (char *)card_id, user_name);

                            sleep(1);
                            if (!connect_card()) {
                                card_present = 0;
                                break;
                            }
                        }

                        card_present = 0;

                    } else if (strcmp(card_status, "inactive") == 0) {
                        print_ui("Unable to authenticate your card.\nPlease remove it.", version, (char *)card_id, user_name);
                        card_present = 1;

                    } else if (strcmp(card_status, "active") == 0) {
                        if (!reconnect_card()) {
                            if (!connect_card()) {
                                card_present = 0;
                                continue;
                            }
                        }

check_blocked:
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

                        BYTE remaining_attempts;
                        int verify_result = verify_pin_on_card(pin, &remaining_attempts);

                        if (!connect_card()) {
                            card_present = 0;
                            continue;
                        }

                        if (remaining_attempts == 0 && !verify_result) {
                            print_ui("Card is blocked!\n\nEnter PUK to unblock:", version, (char *)card_id, user_name);

                            char puk[SIZE_PUK + 1];
                            printf("PUK: ");
                            fflush(stdout);

                            if (!read_puk(puk)) {
                                disconnect_card();
                                card_present = 0;
                                print_ui("Waiting for a card", 0, NULL, NULL);
                                continue;
                            }

                            print_ui("Enter new PIN:", version, (char *)card_id, user_name);

                            char new_pin[SIZE_PIN + 1];
                            printf("New PIN: ");
                            fflush(stdout);

                            if (!read_pin(new_pin)) {
                                disconnect_card();
                                card_present = 0;
                                print_ui("Waiting for a card", 0, NULL, NULL);
                                continue;
                            }

                            print_ui("Verifying PUK...", version, (char *)card_id, user_name);

                            if (!reconnect_card()) {
                                if (!connect_card()) {
                                    card_present = 0;
                                    continue;
                                }
                                print_ui("Error: Failed to reconnect to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                                card_present = 1;
                                continue;
                            }

                            BYTE puk_remaining;
                            if (verify_puk_on_card(puk, new_pin, &puk_remaining)) {
                                if (!connect_card()) {
                                    card_present = 0;
                                    continue;
                                }
                                print_ui("Card unblocked! PIN reset successful.\n\nPlease remove your card.", version, (char *)card_id, user_name);
                                card_present = 1;
                                continue;
                            } else {
                                if (!connect_card()) {
                                    card_present = 0;
                                    continue;
                                }
                                if (puk_remaining == 0) {
                                    print_ui("Card permanently locked!\n\nPUK attempts exhausted. Reflash required.\n\nPlease remove your card.", version, (char *)card_id, user_name);
                                } else {
                                    char error_msg[128];
                                    sprintf(error_msg, "Invalid PUK!\n\n%d attempts remaining.\n\nPlease remove your card.", puk_remaining);
                                    print_ui(error_msg, version, (char *)card_id, user_name);
                                }
                                card_present = 1;
                                continue;
                            }
                        } else if (verify_result) {
                            print_ui("Authentication successful!", version, (char *)card_id, user_name);
                            card_present = 1;
                        } else {
                            char error_msg[128];
                            sprintf(error_msg, "Invalid PIN!\n\n%d attempts remaining.\n\nPlease remove your card.", remaining_attempts);
                            print_ui(error_msg, version, (char *)card_id, user_name);
                            card_present = 1;
                        }

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
