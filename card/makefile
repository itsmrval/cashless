NAME = card
PROGNAME = $(NAME).hex
EENAME = $(NAME).eep

PROC = -mmcu=atmega328p
AVR = avr5

CC = avr-gcc
IDIR = -I/usr/lib/avr/include/avr
LDIR = -L/usr/lib/avr/lib/$(AVR)/

CARD_ID ?=
CFLAGS = -DCARD_ID=\"$(CARD_ID)\"

all: prog

prog: check_card_id $(NAME).elf

check_card_id:
ifndef CARD_ID
	$(error CARD_ID is not set. Use: make CARD_ID=<24_char_id>)
endif
	avr-objcopy -R .eeprom -R .eesafe -R .fuse -R .lock -R .signature -O ihex $(NAME).elf $(PROGNAME)
	avr-objcopy --no-change-warnings -j .eeprom --change-section-lma .eeprom=0 -O ihex $(NAME).elf $(EENAME)
	avrdude -c avrisp -p m328p -P /dev/ttyACM0 -b 19200 -U flash:w:"./$(PROGNAME)":a -U eeprom:w:"./$(EENAME)":a

$(NAME).elf: $(NAME).o io.o
	avr-gcc -o $(NAME).elf $(NAME).o io.o $(LDIR) $(PROC)

io.o: io.c
	$(CC) -c -Wall io.c $(PROC) $(IDIR)

clean:
	rm -f $(NAME).elf *.o $(NAME).eep $(NAME).hex

$(NAME).o: $(NAME).c
	$(CC) -c -Wall -Ofast $(CFLAGS) $(NAME).c $(PROC) $(IDIR)
