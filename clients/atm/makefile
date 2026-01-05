NOM=atm

SRCS=main.c card.c api.c ui.c config.c
OBJS=$(SRCS:.c=.o)

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    CPPFLAGS=$(shell pkg-config --cflags libcurl 2>/dev/null || echo "")
    LDFLAGS=$(shell pkg-config --libs libcurl 2>/dev/null || echo "-lcurl") -framework PCSC
else
    CPPFLAGS=$(shell pkg-config --cflags libpcsclite libcurl 2>/dev/null || echo "-I/usr/include/PCSC")
    LDFLAGS=$(shell pkg-config --libs libpcsclite libcurl 2>/dev/null || echo "-lpcsclite -lcurl")
endif

all: check-deps $(NOM)

check-deps:
	@command -v pkg-config >/dev/null 2>&1 || { echo "Error: pkg-config is required. Install it with: apt install pkg-config"; exit 1; }
ifeq ($(UNAME_S),Darwin)
	@pkg-config --exists libcurl || echo "Warning: libcurl not found via pkg-config, using system default"
else
	@pkg-config --exists libcurl || { echo "Error: libcurl development headers not found. Install with: apt install libcurl4-openssl-dev"; exit 1; }
	@pkg-config --exists libpcsclite || { echo "Error: libpcsclite development headers not found. Install with: apt install libpcsclite-dev"; exit 1; }
endif

$(NOM): $(OBJS)
	gcc -o $(NOM) $(OBJS) $(LDFLAGS)

%.o: %.c
	gcc -c -Wall -Os $(CPPFLAGS) $< -o $@

clean:
	rm -f $(NOM) $(OBJS)

run: $(NOM)
	./$(NOM) driver.conf
