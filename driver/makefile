NOM=driver
API_BASE_URL=http://localhost:3000/v1

SRCS=main.c card.c api.c ui.c
OBJS=$(SRCS:.c=.o)

CPPFLAGS=$(shell pkg-config --cflags libpcsclite 2>/dev/null || echo "-I/usr/include/PCSC") -DAPI_BASE_URL=\"$(API_BASE_URL)\"
LDFLAGS=$(shell pkg-config --libs libpcsclite 2>/dev/null || echo "-lpcsclite") -lcurl

all: $(NOM)

$(NOM): $(OBJS)
	gcc -o $(NOM) $(OBJS) $(LDFLAGS)

%.o: %.c
	gcc -c -Wall -Os $(CPPFLAGS) $< -o $@

clean:
	rm -f $(NOM) $(OBJS)

run: $(NOM)
	./$(NOM)
