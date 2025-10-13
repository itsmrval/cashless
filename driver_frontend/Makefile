CC = gcc
CFLAGS = -Wall -Wextra -Isrc -I/usr/include/PCSC
LDFLAGS = -framework PCSC

SRC = src/main.c \
      src/common/pcsc_utils.c \
      src/common/card_operations.c \
      src/modes/loader/loader.c \
      src/modes/admin/admin.c

OBJ = $(SRC:.c=.o)
EXEC = smartcard_test

all: $(EXEC)

$(EXEC): $(OBJ)
	$(CC) $(OBJ) -o $@ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

clean:
	rm -f $(OBJ) $(EXEC)
	cd card_firmware && make -f Makefile.card clean

.PHONY: all clean
