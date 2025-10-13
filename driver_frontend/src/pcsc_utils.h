#ifndef PCSC_UTILS_H
#define PCSC_UTILS_H

#include <stddef.h>
#include <PCSC/winscard.h>
#include <PCSC/wintypes.h>

LONG establish_context(SCARDCONTEXT *context);
LONG list_readers(SCARDCONTEXT context, char **reader);
LONG connect_card(SCARDCONTEXT context, const char *reader, SCARDHANDLE *card, DWORD *active_protocol);
int wait_for_card(SCARDCONTEXT context, const char *reader);
int wait_for_card_removal(SCARDCONTEXT context, const char *reader);
int is_card_present(SCARDCONTEXT context, const char *reader);

void check_status(LONG rv, const char *msg);

#endif