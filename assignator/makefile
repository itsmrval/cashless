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

all: check-deps $(NAME)

check-deps:
	@command -v pkg-config >/dev/null 2>&1 || { echo "Error: pkg-config is required. Install it with: apt install pkg-config"; exit 1; }
	@pkg-config --exists libpcsclite || echo "Warning: libpcsclite not found via pkg-config, using fallback paths"

$(NAME): $(NAME).o card.o
	$(CC) -o $(NAME) $(NAME).o card.o $(LDFLAGS)

$(NAME).o: $(NAME).c card.h
	$(CC) $(CFLAGS) -c $(NAME).c

card.o: card.c card.h
	$(CC) $(CFLAGS) -c card.c

clean:
	rm -f $(NAME) $(NAME).o card.o

.PHONY: all clean check-deps
