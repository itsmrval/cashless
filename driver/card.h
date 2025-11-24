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
#define SIZE_PUK 4

int init_reader();
int connect_card();
int reconnect_card();
int is_card_present();
int read_data(BYTE *card_id, BYTE *version);
int write_pin_to_card(const char *pin);
int write_pin_and_puk_to_card(const char *pin, const char *puk);
int verify_pin_on_card(const char *pin, BYTE *remaining_attempts);
int verify_puk_on_card(const char *puk, const char *new_pin, BYTE *remaining_attempts);
int sign_challenge_on_card(const unsigned char *challenge, unsigned char *signature, size_t *signature_len);
void disconnect_card();
void cleanup_card();

#endif
