#ifndef API_H
#define API_H

#include <stddef.h>

int api_init();
void api_cleanup();
int fetch_user_name(const char *user_id, char *name_buffer, size_t buffer_size);

#endif
