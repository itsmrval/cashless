NAME = assign

CC = gcc

PCSC_CFLAGS = $(shell pkg-config --cflags libpcsclite 2>/dev/null || echo "-I/usr/include/PCSC")
OPENSSL_CFLAGS = $(shell pkg-config --cflags openssl 2>/dev/null)
CFLAGS = -Wall $(PCSC_CFLAGS) $(OPENSSL_CFLAGS)

PCSC_LDFLAGS = $(shell pkg-config --libs libpcsclite 2>/dev/null || echo "-lpcsclite")
OPENSSL_LDFLAGS = $(shell pkg-config --libs openssl 2>/dev/null || echo "-lssl -lcrypto")
LDFLAGS = $(PCSC_LDFLAGS) $(OPENSSL_LDFLAGS)

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    LDFLAGS = -framework PCSC $(OPENSSL_LDFLAGS)
endif

all: check-deps $(NAME)

check-deps:
	@command -v pkg-config >/dev/null 2>&1 || { echo "Error: pkg-config is required. Install it with: apt install pkg-config"; exit 1; }
	@pkg-config --exists libpcsclite || echo "Warning: libpcsclite not found via pkg-config, using fallback paths"
	@pkg-config --exists openssl || { echo "Error: OpenSSL development headers not found. Install with: apt install libssl-dev (Debian/Ubuntu) or yum install openssl-devel (RHEL/CentOS)"; exit 1; }

$(NAME): $(NAME).o card.o
	$(CC) -o $(NAME) $(NAME).o card.o $(LDFLAGS)

$(NAME).o: $(NAME).c card.h
	$(CC) $(CFLAGS) -c $(NAME).c

card.o: card.c card.h
	$(CC) $(CFLAGS) -c card.c

clean:
	rm -f $(NAME) $(NAME).o card.o

.PHONY: all clean check-deps
