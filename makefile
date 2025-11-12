.PHONY: all card driver assign clean clean-card clean-driver clean-assign

all: card driver assign

card:
	$(MAKE) -C card

driver:
	$(MAKE) -C driver

assign:
ifndef CARD_ID
	$(error CARD_ID is not set. Use: make assign CARD_ID=<24_char_id>)
endif
	$(MAKE) -C assign
	cd assign && ./assign $(CARD_ID)

clean: clean-card clean-driver clean-assign

clean-card:
	$(MAKE) -C card clean

clean-driver:
	$(MAKE) -C driver clean

clean-assign:
	$(MAKE) -C assign clean
