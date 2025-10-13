#include "card_operations.h"
#include <stdio.h>
#include <string.h>
#include <PCSC/wintypes.h>

int card_get_version(SCARDHANDLE card, char *version, size_t max_len) {
    BYTE apdu[] = {0x81, 0x00, 0x00, 0x00, 0x04};
    BYTE response[256];
    DWORD response_len = sizeof(response);

    LONG rv = SCardTransmit(card, SCARD_PCI_T1, apdu, sizeof(apdu),
                            NULL, response, &response_len);

    if (rv != SCARD_S_SUCCESS) return -1;
    if (response_len < 2) return -1;

    int sw1 = response[response_len - 2];
    int sw2 = response[response_len - 1];

    if (sw1 != 0x90 || sw2 != 0x00) return -1;

    size_t data_len = response_len - 2;
    if (data_len >= max_len) data_len = max_len - 1;

    memcpy(version, response, data_len);
    version[data_len] = '\0';

    return 0;
}
