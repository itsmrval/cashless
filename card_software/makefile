NAME = card
PROGNAME = $(NAME).hex
EENAME = $(NAME).eep

PROC = -mmcu=atmega328p
AVR = avr5

CC = avr-gcc
IDIR = -I/usr/lib/avr/include/avr
LDIR = -L/usr/lib/avr/lib/$(AVR)/

CFLAGS = -Os

CRYPTO_SRC = sha256.c hmac_sha256.c
CRYPTO_OBJ = $(CRYPTO_SRC:.c=.o)

all: prog

prog: $(NAME).elf
	avr-objcopy -R .eeprom -R .eesafe -R .fuse -R .lock -R .signature -O ihex $(NAME).elf $(PROGNAME)
	avr-objcopy --no-change-warnings -j .eeprom --change-section-lma .eeprom=0 -O ihex $(NAME).elf $(EENAME)
	avrdude -c avrisp -p m328p -P /dev/ttyACM0 -b 19200 -e -U flash:w:"./$(PROGNAME)":a -U eeprom:w:"./$(EENAME)":a

$(NAME).elf: $(NAME).o io.o $(CRYPTO_OBJ)
	avr-gcc -o $(NAME).elf $(NAME).o io.o $(CRYPTO_OBJ) $(LDIR) $(PROC)

io.o: io.c
	$(CC) -c -Wall io.c $(PROC) $(IDIR)

%.o: %.c
	$(CC) -c -Wall $(CFLAGS) $< -o $@ $(PROC) $(IDIR)

clean:
	rm -f $(NAME).elf *.o $(NAME).eep $(NAME).hex

$(NAME).o: $(NAME).c
	$(CC) -c -Wall $(CFLAGS) $(NAME).c $(PROC) $(IDIR)
