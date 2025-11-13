#include <avr/io.h>
#include <stdint.h>
#include <avr/eeprom.h>
#include <avr/pgmspace.h>

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
#define EEPROM_PIN_ADDR 0
#define EEPROM_CARD_ID_ADDR 4
#define EEPROM_ASSIGNED_FLAG_ADDR 28
#define EEPROM_PIN_ATTEMPTS_ADDR 29
#define EEPROM_PUK_ATTEMPTS_ADDR 30
#define EEPROM_PUK_ADDR 31
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

    if (is_assigned == 0x01) {
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
        eeprom_write_byte((uint8_t*)(EEPROM_PIN_ADDR + i), pin_buffer[i]);
    }
    for (i = 0; i < SIZE_PUK; i++) {
        eeprom_write_byte((uint8_t*)(EEPROM_PUK_ADDR + i), puk_buffer[i]);
    }

    eeprom_write_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
    eeprom_write_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, MAX_PUK_ATTEMPTS);

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
        eeprom_write_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
        sw1 = 0x90;
    } else {
        pin_attempts--;
        eeprom_write_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, pin_attempts);
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
            eeprom_write_byte((uint8_t*)(EEPROM_PIN_ADDR + i), pin_buffer[i]);
        }
        eeprom_write_byte((uint8_t*)EEPROM_PIN_ATTEMPTS_ADDR, MAX_PIN_ATTEMPTS);
        eeprom_write_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, MAX_PUK_ATTEMPTS);
        sw1 = 0x90;
    } else {
        puk_attempts--;
        eeprom_write_byte((uint8_t*)EEPROM_PUK_ATTEMPTS_ADDR, puk_attempts);
        sw1 = 0x63;
        sw2 = 0xC0 | puk_attempts;
    }
}

uint8_t card_id_buffer[SIZE_CARD_ID];

void assign_card_id()
{
    int i;
    uint8_t is_assigned;

    if (p3 != SIZE_CARD_ID) {
        sw1 = 0x6c;
        sw2 = SIZE_CARD_ID;
        return;
    }

    is_assigned = eeprom_read_byte((uint8_t*)EEPROM_ASSIGNED_FLAG_ADDR);

    if (is_assigned == 0xFF) {
        sw1 = 0x6a;
        sw2 = 0x81;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_CARD_ID; i++) {
        card_id_buffer[i] = recbytet0();
    }

    for (i = 0; i < SIZE_CARD_ID; i++) {
        eeprom_write_byte((uint8_t*)(EEPROM_CARD_ID_ADDR + i), card_id_buffer[i]);
    }

    eeprom_write_byte((uint8_t*)EEPROM_ASSIGNED_FLAG_ADDR, 0xFF);

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
            case 0x05:
                assign_card_id();
                break;
            case 0x06:
                verify_pin();
                break;
            case 0x07:
                verify_puk();
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
