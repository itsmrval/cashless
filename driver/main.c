#include <stdio.h>
#include <unistd.h>
#include <string.h>
#include <sys/select.h>
#include <termios.h>
#include "card.h"
#include "api.h"
#include "ui.h"
#include "config.h"

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

int main(int argc, char *argv[])
{
    unsigned char card_id[SIZE_CARD_ID + 1];
    unsigned char version;
    int card_present = 0;
    Config config;
    char auth_token[512];
    const char *config_path;

    if (argc != 2) {
        printf("Usage: %s <config_file>\n", argv[0]);
        printf("Example: %s driver.conf\n", argv[0]);
        return 1;
    }

    config_path = argv[1];

    if (!load_config(config_path, &config)) {
        printf("Error: Failed to load %s\n", config_path);
        printf("Please create config file with username and password\n");
        return 1;
    }

    if (!api_init(config.api_url)) {
        printf("Error: Failed to initialize API client\n");
        return 1;
    }

    printf("Authenticating...\n");
    if (!api_login(config.username, config.password, auth_token, sizeof(auth_token))) {
        printf("Error: Authentication failed\n");
        printf("Please check your username and password in driver.conf\n");
        api_cleanup();
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
                    if (!get_card_status((char *)card_id, auth_token, card_status, sizeof(card_status))) {
                        print_ui("Error: Cannot retrieve card status\n\nPlease remove your card.", version, (char *)card_id, NULL);
                        card_present = 1;
                        continue;
                    }

                    char user_name[256];
                    int has_user = fetch_user_by_card((char *)card_id, auth_token, user_name, sizeof(user_name));

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

                        if (!update_card_status((char *)card_id, auth_token, "active")) {
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

                        char dummy_pin[SIZE_PIN + 1] = "0000";
                        BYTE check_attempts;
                        verify_pin_on_card(dummy_pin, &check_attempts);

                        if (!connect_card()) {
                            card_present = 0;
                            continue;
                        }

                        if (check_attempts == 0) {
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
                        }

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

                        if (verify_result) {
                            print_ui("Authentication successful!\n\nFetching transactions...", version, (char *)card_id, user_name);

                            char user_token[512];
                            char challenge[128];

                            if (!api_get_challenge((char *)card_id, challenge, sizeof(challenge))) {
                                print_ui("Error: Failed to get challenge from API\n\nPlease remove your card.", version, (char *)card_id, user_name);
                                card_present = 1;
                                continue;
                            }

                            unsigned char challenge_bytes[64];
                            size_t challenge_len = strlen(challenge) / 2;
                            for (size_t i = 0; i < challenge_len; i++) {
                                sscanf(challenge + 2*i, "%2hhx", &challenge_bytes[i]);
                            }

                            unsigned char signature[256];
                            size_t signature_len = 0;
                            if (!sign_challenge_on_card(challenge_bytes, signature, &signature_len)) {
                                print_ui("Error: Failed to sign challenge on card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                                card_present = 1;
                                continue;
                            }

                            if (!reconnect_card()) {
                                if (!connect_card()) {
                                    card_present = 0;
                                    continue;
                                }
                                print_ui("Error: Failed to reconnect to card\n\nPlease remove your card.", version, (char *)card_id, user_name);
                                card_present = 1;
                                continue;
                            }

                            if (!api_card_auth_with_signature((char *)card_id, challenge, signature, signature_len, user_token, sizeof(user_token))) {
                                print_ui("Error: Failed to authenticate with API\n\nPlease remove your card.", version, (char *)card_id, user_name);
                                card_present = 1;
                                continue;
                            }

                            int balance = 0;
                            Transaction transactions[10];
                            int transaction_count = 0;

                            if (fetch_transactions((char *)card_id, user_token, &balance, transactions, 10, &transaction_count)) {
                                char display[1024];
                                sprintf(display, "Balance: %.2f€\n\n", balance / 100.0);

                                if (transaction_count > 0) {
                                    strcat(display, "Recent transactions:\n");
                                    for (int i = 0; i < transaction_count; i++) {
                                        char trans_line[256];
                                        sprintf(trans_line, "%.2f€: %s -> %s\n",
                                            transactions[i].operation / 100.0,
                                            transactions[i].source_user_name,
                                            transactions[i].destination_user_name);
                                        strcat(display, trans_line);
                                    }
                                } else {
                                    strcat(display, "No transactions yet.\n");
                                }

                                strcat(display, "\nPlease remove your card.");
                                print_ui(display, version, (char *)card_id, user_name);
                            } else {
                                print_ui("Error: Failed to fetch account data\n\nPlease remove your card.", version, (char *)card_id, user_name);
                            }

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
