#include "card.h"
#include <string.h>

static SCARDCONTEXT hContext;
static SCARDHANDLE hCard;
static DWORD dwActiveProtocol;
static char readers[256];
static DWORD readersLen;

int init_reader()
{
    LONG rv;

    rv = SCardEstablishContext(SCARD_SCOPE_SYSTEM, NULL, NULL, &hContext);
    if (rv != SCARD_S_SUCCESS) {
        return 0;
    }

    readersLen = sizeof(readers);
    rv = SCardListReaders(hContext, NULL, readers, &readersLen);
    if (rv != SCARD_S_SUCCESS) {
        SCardReleaseContext(hContext);
        return 0;
    }

    return 1;
}

int connect_card()
{
    LONG rv;

    rv = SCardConnect(hContext, readers, SCARD_SHARE_SHARED,
                     SCARD_PROTOCOL_T0 | SCARD_PROTOCOL_T1,
                     &hCard, &dwActiveProtocol);

    return (rv == SCARD_S_SUCCESS);
}

int read_data(BYTE *card_id, BYTE *version)
{
    LONG rv;
    BYTE cmd_card_id[] = {0x80, 0x01, 0x00, 0x00, SIZE_CARD_ID};
    BYTE cmd_version[] = {0x80, 0x02, 0x00, 0x00, 0x01};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_card_id, sizeof(cmd_card_id),
                      NULL, response, &responseLen);
    if (rv != SCARD_S_SUCCESS || responseLen < SIZE_CARD_ID + 2) {
        return 0;
    }
    if (response[responseLen - 2] != 0x90 || response[responseLen - 1] != 0x00) {
        return 0;
    }
    memcpy(card_id, response, SIZE_CARD_ID);

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_version, sizeof(cmd_version),
                      NULL, response, &responseLen);
    if (rv != SCARD_S_SUCCESS || responseLen < 3) {
        return 0;
    }
    if (response[responseLen - 2] != 0x90 || response[responseLen - 1] != 0x00) {
        return 0;
    }
    *version = response[0];

    return 1;
}

void disconnect_card()
{
    if (hCard) {
        SCardDisconnect(hCard, SCARD_LEAVE_CARD);
        hCard = 0;
    }
}

void cleanup_card()
{
    SCardReleaseContext(hContext);
}
