#ifndef API_H
#define API_H

#include <stddef.h>

typedef struct {
    int operation;
    char source_user_name[128];
    char destination_user_name[128];
    char date[64];
} Transaction;

int api_init(const char *api_url);
void api_cleanup();
int api_login(const char *username, const char *password, char *token_buffer, size_t buffer_size);
int api_get_challenge(const char *card_id, char *challenge_buffer, size_t buffer_size);
int api_card_auth_with_signature(const char *card_id, const char *challenge, const unsigned char *signature, size_t signature_len, char *token_buffer, size_t buffer_size);
int api_card_login(const char *card_id, const char *pin, char *token_buffer, size_t buffer_size);
int fetch_user_by_card(const char *card_id, const char *driver_token, char *name_buffer, size_t buffer_size);
int get_card_status(const char *card_id, const char *driver_token, char *status_buffer, size_t buffer_size);
int update_card_status(const char *card_id, const char *admin_token, const char *status);
int fetch_transactions(const char *card_id, const char *card_token, const char *driver_token, int *balance, Transaction *transactions, int max_transactions, int *transaction_count);

#endif
