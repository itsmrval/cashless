#include <avr/io.h>
#include <stdint.h>
#include <avr/eeprom.h>
#include <avr/pgmspace.h>
#include <string.h>
#include "edsign.h"

extern void sendbytet0(uint8_t b);
extern uint8_t recbytet0(void);

uint8_t cla, ins, p1, p2, p3;
uint8_t sw1, sw2;
uint8_t pin_verified = 0;

#define SIZE_ATR 8
const char atr_str[SIZE_ATR] PROGMEM = "cashless";

#define CARD_VERSION 200
#define SIZE_CARD_ID 24
#define SIZE_PIN 4
#define SIZE_PUK 4
#define SIZE_PRIVATE_KEY_CHUNK 64
#define SIZE_CHALLENGE 32
#define SIZE_ED25519_PRIVATE_KEY 32
#define SIZE_ED25519_PUBLIC_KEY 32
#define SIZE_ED25519_SIGNATURE 64
#define EEPROM_PIN_ADDR 0
#define EEPROM_CARD_ID_ADDR 4
#define EEPROM_ASSIGNED_FLAG_ADDR 28
#define EEPROM_PIN_ATTEMPTS_ADDR 29
#define EEPROM_PUK_ATTEMPTS_ADDR 30
#define EEPROM_PUK_ADDR 31
#define EEPROM_PRIVATE_KEY_SIZE_ADDR 35
#define EEPROM_PRIVATE_KEY_DATA_ADDR 37
#define MAX_PIN_ATTEMPTS 3
#define MAX_PUK_ATTEMPTS 3

void atr()
{
    int i;
    sendbytet0(0x3b);
    uint8_t n = 0xF0 + SIZE_ATR + 1;
    sendbytet0(n);
    sendbytet0(0x01);
    sendbytet0(0x05);
    sendbytet0(0x05);
    sendbytet0(0x00);
    sendbytet0(0x00);
    for (i = 0; i < SIZE_ATR; i++) {
        sendbytet0(pgm_read_byte(atr_str + i));
    }
}

void read_card_id()
{
    int i;
    uint8_t is_assigned;

    if (p3 != SIZE_CARD_ID) {
        sw1 = 0x6c;
        sw2 = SIZE_CARD_ID;
        return;
    }

    sendbytet0(ins);

    is_assigned = eeprom_read_byte((uint8_t*)EEPROM_ASSIGNED_FLAG_ADDR);

    if (is_assigned != 0xFF) {
        for (i = 0; i < SIZE_CARD_ID; i++) {
            uint8_t byte = eeprom_read_byte((uint8_t*)(EEPROM_CARD_ID_ADDR + i));
            sendbytet0(byte);
        }
    } else {
        for (i = 0; i < SIZE_CARD_ID; i++) {
            sendbytet0(0x00);
        }
    }

    sw1 = 0x90;
}

void read_version()
{
    if (p3 != 1) {
        sw1 = 0x6c;
        sw2 = 1;
        return;
    }
    sendbytet0(ins);
    sendbytet0(CARD_VERSION);
    sw1 = 0x90;
}

uint8_t pin_buffer[SIZE_PIN];
uint8_t puk_buffer[SIZE_PUK];
uint8_t challenge_buffer[SIZE_CHALLENGE];
uint8_t sign_work_buffer[SIZE_ED25519_SIGNATURE];
#define sign_private_key sign_work_buffer
#define sign_public_key (sign_work_buffer + SIZE_ED25519_PRIVATE_KEY)
#define sign_signature sign_work_buffer

void write_pin_only()
{
    int i;

    if (p3 != SIZE_PIN) {
        sw1 = 0x6c;
        sw2 = SIZE_PIN;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_PIN; i++) {
        pin_buffer[i] = recbytet0();
    }

    for (i = 0; i < SIZE_PIN; i++) {
        eeprom_update_byte((uint8_t*)(EEPROM_PIN_ADDR + i), pin_buffer[i]);
    }

    eeprom_update_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
    eeprom_update_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, MAX_PUK_ATTEMPTS);

    eeprom_busy_wait();

    sw1 = 0x90;
}

void write_pin()
{
    int i;

    if (p3 != SIZE_PIN + SIZE_PUK) {
        sw1 = 0x6c;
        sw2 = SIZE_PIN + SIZE_PUK;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_PIN; i++) {
        pin_buffer[i] = recbytet0();
    }
    for (i = 0; i < SIZE_PUK; i++) {
        puk_buffer[i] = recbytet0();
    }

    for (i = 0; i < SIZE_PIN; i++) {
        eeprom_update_byte((uint8_t*)(EEPROM_PIN_ADDR + i), pin_buffer[i]);
    }
    for (i = 0; i < SIZE_PUK; i++) {
        eeprom_update_byte((uint8_t*)(EEPROM_PUK_ADDR + i), puk_buffer[i]);
    }

    eeprom_update_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
    eeprom_update_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, MAX_PUK_ATTEMPTS);

    eeprom_busy_wait();

    sw1 = 0x90;
}

void verify_pin()
{
    int i;
    uint8_t pin_attempts;
    uint8_t stored_pin;
    uint8_t match = 1;

    if (p3 != SIZE_PIN) {
        sw1 = 0x6c;
        sw2 = SIZE_PIN;
        return;
    }

    pin_attempts = eeprom_read_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR);

    if (pin_attempts == 0) {
        sw1 = 0x69;
        sw2 = 0x83;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_PIN; i++) {
        pin_buffer[i] = recbytet0();
    }

    for (i = 0; i < SIZE_PIN; i++) {
        stored_pin = eeprom_read_byte((uint8_t*)(EEPROM_PIN_ADDR + i));
        if (pin_buffer[i] != stored_pin) {
            match = 0;
        }
    }

    if (match) {
        pin_verified = 1;
        eeprom_update_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
        eeprom_busy_wait();
        sw1 = 0x90;
    } else {
        pin_attempts--;
        eeprom_update_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, pin_attempts);
        eeprom_busy_wait();
        sw1 = 0x63;
        sw2 = 0xC0 | pin_attempts;
    }
}

void verify_puk()
{
    int i;
    uint8_t puk_attempts;
    uint8_t stored_puk;
    uint8_t match = 1;

    if (p3 != SIZE_PUK + SIZE_PIN) {
        sw1 = 0x6c;
        sw2 = SIZE_PUK + SIZE_PIN;
        return;
    }

    puk_attempts = eeprom_read_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR);

    if (puk_attempts == 0) {
        sw1 = 0x69;
        sw2 = 0x84;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_PUK; i++) {
        puk_buffer[i] = recbytet0();
    }
    for (i = 0; i < SIZE_PIN; i++) {
        pin_buffer[i] = recbytet0();
    }

    for (i = 0; i < SIZE_PUK; i++) {
        stored_puk = eeprom_read_byte((uint8_t*)(EEPROM_PUK_ADDR + i));
        if (puk_buffer[i] != stored_puk) {
            match = 0;
        }
    }

    if (match) {
        pin_verified = 1;
        for (i = 0; i < SIZE_PIN; i++) {
            eeprom_update_byte((uint8_t*)(EEPROM_PIN_ADDR + i), pin_buffer[i]);
        }
        eeprom_update_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
        eeprom_update_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, MAX_PUK_ATTEMPTS);
        eeprom_busy_wait();
        sw1 = 0x90;
    } else {
        puk_attempts--;
        eeprom_update_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, puk_attempts);
        eeprom_busy_wait();
        sw1 = 0x63;
        sw2 = 0xC0 | puk_attempts;
    }
}

void get_remaining_attempts()
{
    if (p3 != 2) {
        sw1 = 0x6c;
        sw2 = 2;
        return;
    }

    sendbytet0(ins);
    sendbytet0(eeprom_read_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR));
    sendbytet0(eeprom_read_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR));
    sw1 = 0x90;
}

void is_pin_defined()
{
    int i;
    uint8_t pin_byte;
    uint8_t all_ff = 1;

    if (p3 != 1) {
        sw1 = 0x6c;
        sw2 = 1;
        return;
    }

    sendbytet0(ins);

    for (i = 0; i < SIZE_PIN; i++) {
        pin_byte = eeprom_read_byte((uint8_t*)(EEPROM_PIN_ADDR + i));

        if (pin_byte != 0xFF) {
            all_ff = 0;
            break;
        }
    }

    if (all_ff) {
        sendbytet0(0x00);
    } else {
        sendbytet0(0x01);
    }

    sw1 = 0x90;
}

uint8_t card_id_buffer[SIZE_CARD_ID];
#define private_key_chunk_buffer sign_signature

void assign_card()
{
    int i;
    uint8_t is_assigned;

    if (p3 != SIZE_CARD_ID + SIZE_PUK) {
        sw1 = 0x6c;
        sw2 = SIZE_CARD_ID + SIZE_PUK;
        return;
    }

    is_assigned = eeprom_read_byte((uint8_t*)EEPROM_ASSIGNED_FLAG_ADDR);

    if (is_assigned != 0xFF) {
        sw1 = 0x6a;
        sw2 = 0x81;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_CARD_ID; i++) {
        card_id_buffer[i] = recbytet0();
    }
    for (i = 0; i < SIZE_PUK; i++) {
        puk_buffer[i] = recbytet0();
    }

    for (i = 0; i < SIZE_CARD_ID; i++) {
        eeprom_update_byte((uint8_t*)(EEPROM_CARD_ID_ADDR + i), card_id_buffer[i]);
    }

    for (i = 0; i < SIZE_PUK; i++) {
        eeprom_update_byte((uint8_t*)(EEPROM_PUK_ADDR + i), puk_buffer[i]);
    }

    eeprom_update_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
    eeprom_update_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, MAX_PUK_ATTEMPTS);
    eeprom_update_byte((uint8_t*)EEPROM_ASSIGNED_FLAG_ADDR, 0x00);

    eeprom_busy_wait();

    sw1 = 0x90;
}

void write_private_key_chunk()
{
    int i;
    uint8_t chunk_index;
    uint16_t offset;

    if (p3 < 1 || p3 > SIZE_PRIVATE_KEY_CHUNK + 1) {
        sw1 = 0x6c;
        sw2 = SIZE_PRIVATE_KEY_CHUNK + 1;
        return;
    }

    sendbytet0(ins);
    chunk_index = recbytet0();

    if (chunk_index > 30) {
        sw1 = 0x6a;
        sw2 = 0x84;
        return;
    }

    for (i = 0; i < p3 - 1; i++) {
        private_key_chunk_buffer[i] = recbytet0();
    }

    offset = EEPROM_PRIVATE_KEY_DATA_ADDR + ((uint16_t)chunk_index * (uint16_t)SIZE_PRIVATE_KEY_CHUNK);

    if (offset < EEPROM_PRIVATE_KEY_DATA_ADDR) {
        sw1 = 0x6a;
        sw2 = 0x82;
        return;
    }

    for (i = 0; i < p3 - 1; i++) {
        eeprom_update_byte((uint8_t*)(offset + i), private_key_chunk_buffer[i]);
    }

    if (chunk_index == 0) {
        uint16_t total_size = (uint16_t)(p3 - 1);
        eeprom_update_byte((uint8_t*)EEPROM_PRIVATE_KEY_SIZE_ADDR, (uint8_t)(total_size >> 8));
        eeprom_update_byte((uint8_t*)(EEPROM_PRIVATE_KEY_SIZE_ADDR + 1), (uint8_t)(total_size & 0xFF));
    }

    eeprom_busy_wait();

    sw1 = 0x90;
}

uint8_t check_pin_verified(void)
{
    if (!pin_verified) {
        sw1 = 0x69;
        sw2 = 0x82;
        return 0;
    }
    return 1;
}

void set_challenge()
{
    int i;

    if (!check_pin_verified()) {
        return;
    }

    if (p3 != SIZE_CHALLENGE) {
        sw1 = 0x6c;
        sw2 = SIZE_CHALLENGE;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_CHALLENGE; i++) {
        challenge_buffer[i] = recbytet0();
    }

    sw1 = 0x90;
}

void sign_challenge()
{
    int i;

    if (!check_pin_verified()) {
        return;
    }

    if (p3 != SIZE_ED25519_SIGNATURE) {
        sw1 = 0x6c;
        sw2 = SIZE_ED25519_SIGNATURE;
        return;
    }

    uint16_t key_size = ((uint16_t)eeprom_read_byte((uint8_t*)EEPROM_PRIVATE_KEY_SIZE_ADDR) << 8) |
                        (uint16_t)eeprom_read_byte((uint8_t*)(EEPROM_PRIVATE_KEY_SIZE_ADDR + 1));

    if (key_size != SIZE_ED25519_PRIVATE_KEY) {
        sw1 = 0x6a;
        sw2 = 0x88;
        return;
    }

    for (i = 0; i < SIZE_ED25519_PRIVATE_KEY; i++) {
        sign_private_key[i] = eeprom_read_byte((uint8_t*)(EEPROM_PRIVATE_KEY_DATA_ADDR + i));
    }

    edsign_sec_to_pub(sign_public_key, sign_private_key);
    edsign_sign(sign_signature, sign_public_key, sign_private_key, challenge_buffer, SIZE_CHALLENGE);

    sendbytet0(ins);
    for (i = 0; i < SIZE_ED25519_SIGNATURE; i++) {
        sendbytet0(sign_signature[i]);
    }

    sw1 = 0x90;
}

int main(void)
{
    ACSR = 0x80;
    PRR = 0x87;
    PORTB = 0xff;
    DDRB = 0xff;
    PORTC = 0xff;
    DDRC = 0xff;
    DDRD = 0x00;
    PORTD = 0xff;
    ASSR = (1 << EXCLK) + (1 << AS2);

    atr();
    sw2 = 0;

    for (;;) {
        cla = recbytet0();
        ins = recbytet0();
        p1 = recbytet0();
        p2 = recbytet0();
        p3 = recbytet0();
        sw2 = 0;

        switch (cla) {
        case 0x80:
            switch (ins) {
            case 0x01:
                read_card_id();
                break;
            case 0x02:
                read_version();
                break;
            case 0x03:
                write_pin();
                break;
            case 0x06:
                verify_pin();
                break;
            case 0x07:
                verify_puk();
                break;
            case 0x08:
                assign_card();
                break;
            case 0x09:
                write_pin_only();
                break;
            case 0x0A:
                write_private_key_chunk();
                break;
            case 0x0B:
                sign_challenge();
                break;
            case 0x0C:
                set_challenge();
                break;
            case 0x0D:
                get_remaining_attempts();
                break;
            case 0x0E:
                is_pin_defined();
                break;
            default:
                sw1 = 0x6d;
            }
            break;
        default:
            sw1 = 0x6e;
        }
        sendbytet0(sw1);
        sendbytet0(sw2);
    }
    return 0;
}
