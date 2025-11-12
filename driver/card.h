#ifndef CARD_H
#define CARD_H

#ifdef __APPLE__
#include <PCSC/winscard.h>
#else
#include <pcsclite.h>
#include <winscard.h>
#endif

#define SIZE_CARD_ID 24
#define SIZE_PIN 4

int init_reader();
int connect_card();
int reconnect_card();
int is_card_present();
int read_data(BYTE *card_id, BYTE *version);
int write_pin_to_card(const char *pin);
int read_pin_from_card(char *pin);
void disconnect_card();
void cleanup_card();

#endif
