#ifndef CARD_H
#define CARD_H

#include <stddef.h>
#include <stdint.h>

#ifdef __APPLE__
#include <PCSC/winscard.h>
#else
#include <pcsclite.h>
#include <winscard.h>
#endif

#define SIZE_CARD_ID 24
#define SIZE_PUK 4
#define SIZE_PRIVATE_KEY_CHUNK 64

int init_reader();
int connect_card();
int reconnect_card();
int read_data(BYTE *card_id, BYTE *version);
int assign_card(const char *card_id, const char *puk);
int write_private_key(const unsigned char *private_key_der, size_t key_len);
void disconnect_card();
void cleanup_card();

#endif
