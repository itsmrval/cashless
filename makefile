.PHONY: all card driver clean clean-card clean-driver

all: card driver

card:
ifndef CARD_ID
	$(error CARD_ID is not set. Use: make card CARD_ID=<24_char_id>)
endif
	$(MAKE) -C card CARD_ID=$(CARD_ID)

driver:
	$(MAKE) -C driver

clean: clean-card clean-driver

clean-card:
	$(MAKE) -C card clean

clean-driver:
	$(MAKE) -C driver clean
