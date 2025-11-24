#include <avr/io.h>
#include <stdint.h>
#include <avr/eeprom.h>
#include <avr/pgmspace.h>
#include <string.h>

extern void sendbytet0(uint8_t b);
extern uint8_t recbytet0(void);

uint8_t cla, ins, p1, p2, p3;
uint8_t sw1, sw2;

#define SIZE_ATR 8
const char atr_str[SIZE_ATR] PROGMEM = "cashless";

#define CARD_VERSION 1
#define SIZE_CARD_ID 24
#define SIZE_PIN 4
#define SIZE_PUK 4
#define SIZE_PRIVATE_KEY_CHUNK 64
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

uint8_t card_id_buffer[SIZE_CARD_ID];
uint8_t private_key_chunk_buffer[SIZE_PRIVATE_KEY_CHUNK];

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

void sign_challenge()
{
    int i;
    uint8_t challenge[4];
    uint8_t key[4];
    uint8_t signature[4];

    if (p3 != 0) {
        sw1 = 0x6c;
        sw2 = 0;
        return;
    }

    challenge[0] = (cla & 0x0F);
    challenge[1] = (ins & 0x0F);
    challenge[2] = p1;
    challenge[3] = p2;

    sendbytet0(ins);

    uint16_t key_size = ((uint16_t)eeprom_read_byte((uint8_t*)EEPROM_PRIVATE_KEY_SIZE_ADDR) << 8) |
                        (uint16_t)eeprom_read_byte((uint8_t*)(EEPROM_PRIVATE_KEY_SIZE_ADDR + 1));

    if (key_size != 4) {
        sw1 = 0x6a;
        sw2 = 0x88;
        return;
    }

    for (i = 0; i < 4; i++) {
        key[i] = eeprom_read_byte((uint8_t*)(EEPROM_PRIVATE_KEY_DATA_ADDR + i));
    }

    for (i = 0; i < 4; i++) {
        signature[i] = challenge[i] ^ key[i];
    }

    for (i = 0; i < 4; i++) {
        sendbytet0(signature[i]);
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
