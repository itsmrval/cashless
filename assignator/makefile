NAME = assignator

CC = gcc

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    CFLAGS = -Wall
    LDFLAGS = -framework PCSC
else
    PCSC_CFLAGS = $(shell pkg-config --cflags libpcsclite 2>/dev/null || echo "-I/usr/include/PCSC")
    CFLAGS = -Wall $(PCSC_CFLAGS)
    PCSC_LDFLAGS = $(shell pkg-config --libs libpcsclite 2>/dev/null || echo "-lpcsclite")
    LDFLAGS = $(PCSC_LDFLAGS)
endif

C25519_DIR = c25519/src
C25519_SRC = $(C25519_DIR)/c25519.c $(C25519_DIR)/edsign.c \
             $(C25519_DIR)/f25519.c $(C25519_DIR)/morph25519.c \
             $(C25519_DIR)/sha512.c $(C25519_DIR)/fprime.c \
             $(C25519_DIR)/ed25519.c
C25519_OBJ = $(C25519_SRC:.c=.o)

all: check-deps $(NAME)

check-deps:
	@command -v pkg-config >/dev/null 2>&1 || { echo "Error: pkg-config is required. Install it with: apt install pkg-config"; exit 1; }
	@pkg-config --exists libpcsclite || echo "Warning: libpcsclite not found via pkg-config, using fallback paths"

$(NAME): $(NAME).o card.o $(C25519_OBJ)
	$(CC) -o $(NAME) $(NAME).o card.o $(C25519_OBJ) $(LDFLAGS)

$(NAME).o: $(NAME).c card.h
	$(CC) $(CFLAGS) -I$(C25519_DIR) -c $(NAME).c

card.o: card.c card.h
	$(CC) $(CFLAGS) -c card.c

%.o: %.c
	$(CC) $(CFLAGS) -I$(C25519_DIR) -c $< -o $@

clean:
	rm -f $(NAME) $(NAME).o card.o $(C25519_DIR)/*.o

.PHONY: all clean check-deps
