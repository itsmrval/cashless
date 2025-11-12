NAME = assign
DRIVER_DIR = ../driver

CC = gcc

# Use pkg-config to find pcsc libraries
CFLAGS = -Wall $(shell pkg-config --cflags libpcsclite 2>/dev/null || echo "-I/usr/include/PCSC")
LDFLAGS = $(shell pkg-config --libs libpcsclite 2>/dev/null || echo "-lpcsclite")

# Platform-specific settings
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    LDFLAGS = -framework PCSC
endif

all: check-deps $(NAME)

check-deps:
	@command -v pkg-config >/dev/null 2>&1 || { echo "Error: pkg-config is required. Install it with: apt install pkg-config"; exit 1; }
	@pkg-config --exists libpcsclite || echo "Warning: libpcsclite not found via pkg-config, using fallback paths"

$(NAME): $(NAME).o $(DRIVER_DIR)/card.o
	$(CC) -o $(NAME) $(NAME).o $(DRIVER_DIR)/card.o $(LDFLAGS)

$(NAME).o: $(NAME).c $(DRIVER_DIR)/card.h
	$(CC) $(CFLAGS) -c $(NAME).c

$(DRIVER_DIR)/card.o: $(DRIVER_DIR)/card.c $(DRIVER_DIR)/card.h
	$(MAKE) -C $(DRIVER_DIR) card.o

clean:
	rm -f $(NAME) $(NAME).o

.PHONY: all clean check-deps
