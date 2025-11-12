#ifndef API_H
#define API_H

#include <stddef.h>

int api_init();
void api_cleanup();
int fetch_user_by_card(const char *card_id, char *name_buffer, size_t buffer_size);
int get_card_status(const char *card_id, char *status_buffer, size_t buffer_size);
int setup_pin_api(const char *card_id, const char *pin);
int verify_pin_api(const char *card_id, const char *pin, char *name_buffer, size_t buffer_size);

#endif
