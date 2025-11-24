NOM=atm

SRCS=main.c card.c api.c ui.c config.c
OBJS=$(SRCS:.c=.o)

CPPFLAGS=$(shell pkg-config --cflags libpcsclite libcurl 2>/dev/null || echo "-I/usr/include/PCSC")
LDFLAGS=$(shell pkg-config --libs libpcsclite libcurl 2>/dev/null || echo "-lpcsclite -lcurl")

all: check-deps $(NOM)

check-deps:
	@command -v pkg-config >/dev/null 2>&1 || { echo "Error: pkg-config is required. Install it with: apt install pkg-config"; exit 1; }
	@pkg-config --exists libcurl || { echo "Error: libcurl development headers not found. Install with: apt install libcurl4-openssl-dev"; exit 1; }
	@pkg-config --exists libpcsclite || { echo "Error: libpcsclite development headers not found. Install with: apt install libpcsclite-dev"; exit 1; }

$(NOM): $(OBJS)
	gcc -o $(NOM) $(OBJS) $(LDFLAGS)

%.o: %.c
	gcc -c -Wall -Os $(CPPFLAGS) $< -o $@

clean:
	rm -f $(NOM) $(OBJS)

run: $(NOM)
	./$(NOM) driver.conf
