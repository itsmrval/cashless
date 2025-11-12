NAME = assign
DRIVER_DIR = ../driver

CC = gcc
CFLAGS = -Wall -I$(DRIVER_DIR)

# Platform-specific settings
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    LDFLAGS = -framework PCSC
else
    LDFLAGS = -lpcsclite
endif

all: $(NAME)

$(NAME): $(NAME).o $(DRIVER_DIR)/card.o
	$(CC) -o $(NAME) $(NAME).o $(DRIVER_DIR)/card.o $(LDFLAGS)

$(NAME).o: $(NAME).c $(DRIVER_DIR)/card.h
	$(CC) $(CFLAGS) -c $(NAME).c

$(DRIVER_DIR)/card.o: $(DRIVER_DIR)/card.c $(DRIVER_DIR)/card.h
	$(MAKE) -C $(DRIVER_DIR) card.o

clean:
	rm -f $(NAME) $(NAME).o

.PHONY: all clean
