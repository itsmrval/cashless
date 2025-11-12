NOM=driver

CPPFLAGS=$(shell pkg-config --cflags libpcsclite 2>/dev/null || echo "-I/usr/include/PCSC")
LDFLAGS=$(shell pkg-config --libs libpcsclite 2>/dev/null || echo "-lpcsclite")

all: $(NOM).o
	gcc -o $(NOM) $(NOM).o $(LDFLAGS)

$(NOM).o: $(NOM).c
	gcc -c -Wall -Os $(CPPFLAGS) $(NOM).c

clean:
	rm -f $(NOM) $(NOM).o

run: $(NOM)
	./$(NOM)
