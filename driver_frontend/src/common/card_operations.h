#ifndef CARD_OPERATIONS_H
#define CARD_OPERATIONS_H

#include <PCSC/winscard.h>
#include <stddef.h>
#include <stdint.h>

int card_get_version(SCARDHANDLE card, char *version, size_t max_len);

#endif
