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
#define EEPROM_PIN_ADDR 0

#ifndef CARD_ID
#error "CARD_ID must be defined at compile time"
#endif

const char card_id[SIZE_CARD_ID] PROGMEM = CARD_ID;

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

    if (p3 != SIZE_CARD_ID) {
        sw1 = 0x6c;
        sw2 = SIZE_CARD_ID;
        return;
    }
    sendbytet0(ins);
    for (i = 0; i < SIZE_CARD_ID; i++) {
        sendbytet0(pgm_read_byte(card_id + i));
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

void write_pin()
{
    int i;

    if (p3 != SIZE_PIN) {
        sw1 = 0x6c;
        sw2 = SIZE_PIN;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_PIN; i++) {
        uint8_t digit = recbytet0();
        eeprom_write_byte((uint8_t*)(EEPROM_PIN_ADDR + i), digit);
    }
    sw1 = 0x90;
}

void read_pin()
{
    int i;

    if (p3 != SIZE_PIN) {
        sw1 = 0x6c;
        sw2 = SIZE_PIN;
        return;
    }

    sendbytet0(ins);
    for (i = 0; i < SIZE_PIN; i++) {
        uint8_t digit = eeprom_read_byte((uint8_t*)(EEPROM_PIN_ADDR + i));
        sendbytet0(digit);
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
            case 0x04:
                read_pin();
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
