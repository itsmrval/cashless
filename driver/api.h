#ifndef API_H
#define API_H

#include <stddef.h>

int api_init();
void api_cleanup();
int fetch_user_by_card(const char *card_id, char *name_buffer, size_t buffer_size);

#endif
