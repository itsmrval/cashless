.PHONY: all card driver assign clean clean-card clean-driver clean-assign

all: card driver assign

card:
	$(MAKE) -C card_software

atm:
	$(MAKE) -C clients/atm

assign:
ifndef CARD_ID
	$(error CARD_ID is not set. Use: make assignator CARD_ID=<24_char_id>)
endif
	$(MAKE) -C assign
	cd assignator && ./assignator $(CARD_ID)

clean: clean-card clean-driver clean-assign

clean-card:
	$(MAKE) -C card_software clean

clean-atm:
	$(MAKE) -C clients/atm clean

clean-assign:
	$(MAKE) -C assignator clean
