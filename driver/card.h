#ifndef CARD_H
#define CARD_H

#ifdef __APPLE__
#include <PCSC/winscard.h>
#else
#include <pcsclite.h>
#include <winscard.h>
#endif

#define SIZE_USER_ID 24

int init_reader();
int connect_card();
int read_data(BYTE *user_id, BYTE *version);
void disconnect_card();
void cleanup_card();

#endif
