.PHONY: all card driver clean clean-card clean-driver

all: card driver

card:
	$(MAKE) -C card

driver:
	$(MAKE) -C driver

clean: clean-card clean-driver

clean-card:
	$(MAKE) -C card clean

clean-driver:
	$(MAKE) -C driver clean
