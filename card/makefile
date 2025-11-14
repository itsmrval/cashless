NAME = card
PROGNAME = $(NAME).hex
EENAME = $(NAME).eep

PROC = -mmcu=atmega328p
AVR = avr5

CC = avr-gcc
IDIR = -I/usr/lib/avr/include/avr -I./crypto
LDIR = -L/usr/lib/avr/lib/$(AVR)/

CFLAGS = -Os

CRYPTO_C_OBJS = crypto/bigint.o crypto/bigint_io.o crypto/rsa_basic.o crypto/sha256.o
CRYPTO_ASM_OBJS = crypto/bigint_asm.o crypto/bigint_add_u.o crypto/bigint_adjust.o crypto/sha256-asm.o crypto/avr-asm-macros.o

all: prog

prog: $(NAME).elf
	avr-objcopy -R .eeprom -R .eesafe -R .fuse -R .lock -R .signature -O ihex $(NAME).elf $(PROGNAME)
	avr-objcopy --no-change-warnings -j .eeprom --change-section-lma .eeprom=0 -O ihex $(NAME).elf $(EENAME)
	avrdude -c avrisp -p m328p -P /dev/ttyACM0 -b 19200 -e -U flash:w:"./$(PROGNAME)":a -U eeprom:w:"./$(EENAME)":a

$(NAME).elf: $(NAME).o io.o $(CRYPTO_C_OBJS) $(CRYPTO_ASM_OBJS)
	avr-gcc -o $(NAME).elf $(NAME).o io.o $(CRYPTO_C_OBJS) $(CRYPTO_ASM_OBJS) $(LDIR) $(PROC)

io.o: io.c
	$(CC) -c -Wall io.c $(PROC) $(IDIR)

crypto/%.o: crypto/%.c
	$(CC) -c -Wall $(CFLAGS) $< -o $@ $(PROC) $(IDIR)

crypto/%.o: crypto/%.S
	$(CC) -c -x assembler-with-cpp $< -o $@ $(PROC) $(IDIR)

clean:
	rm -f $(NAME).elf *.o $(NAME).eep $(NAME).hex crypto/*.o

$(NAME).o: $(NAME).c
	$(CC) -c -Wall $(CFLAGS) $(NAME).c $(PROC) $(IDIR)
