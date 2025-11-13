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
int fetch_user_by_card(const char *card_id, char *name_buffer, size_t buffer_size);
int get_card_status(const char *card_id, char *status_buffer, size_t buffer_size);
int update_card_status(const char *card_id, const char *status);
int fetch_transactions(const char *card_id, const char *token, int *balance, Transaction *transactions, int max_transactions, int *transaction_count);

#endif
