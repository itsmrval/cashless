#include "card.h"
#include <string.h>
#include <stdio.h>

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

int reconnect_card()
{
    LONG rv;
    DWORD dwState, dwProtocol, dwAtrLen = 33;
    BYTE pbAtr[33];
    DWORD dwReaderLen = 256;
    char pbReader[256];

    rv = SCardStatus(hCard, pbReader, &dwReaderLen, &dwState, &dwProtocol, pbAtr, &dwAtrLen);

    if (rv == SCARD_S_SUCCESS && (dwState & SCARD_PRESENT)) {
        return 1;
    }

    disconnect_card();

    rv = SCardConnect(hContext, readers, SCARD_SHARE_EXCLUSIVE,
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

int assign_card(const char *card_id, const char *puk)
{
    LONG rv;
    BYTE cmd_assign[5 + SIZE_CARD_ID + SIZE_PUK] = {0x80, 0x08, 0x00, 0x00, SIZE_CARD_ID + SIZE_PUK};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    for (i = 0; i < SIZE_CARD_ID; i++) {
        cmd_assign[5 + i] = card_id[i];
    }
    for (i = 0; i < SIZE_PUK; i++) {
        cmd_assign[5 + SIZE_CARD_ID + i] = puk[i] - '0';
    }

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_assign, sizeof(cmd_assign),
                      NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS || responseLen < 2) {
        return 0;
    }

    if (response[responseLen - 2] == 0x90 && response[responseLen - 1] == 0x00) {
        return 1;
    }

    return 0;
}

int write_private_key(const unsigned char *private_key_der, size_t key_len)
{
    LONG rv;
    SCARD_IO_REQUEST pioSendPci;
    BYTE response[258];
    DWORD responseLen;
    size_t offset = 0;
    uint8_t chunk_index = 0;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    while (offset < key_len) {
        size_t chunk_size = (key_len - offset) > SIZE_PRIVATE_KEY_CHUNK ? SIZE_PRIVATE_KEY_CHUNK : (key_len - offset);
        BYTE cmd[5 + 1 + SIZE_PRIVATE_KEY_CHUNK];
        size_t cmd_len = 5 + 1 + chunk_size;

        cmd[0] = 0x80;
        cmd[1] = 0x0A;
        cmd[2] = 0x00;
        cmd[3] = 0x00;
        cmd[4] = 1 + chunk_size;
        cmd[5] = chunk_index;

        memcpy(cmd + 6, private_key_der + offset, chunk_size);

        responseLen = sizeof(response);
        rv = SCardTransmit(hCard, &pioSendPci, cmd, cmd_len, NULL, response, &responseLen);

        if (rv != SCARD_S_SUCCESS || responseLen < 2) {
            return 0;
        }

        if (response[responseLen - 2] != 0x90 || response[responseLen - 1] != 0x00) {
            return 0;
        }

        offset += chunk_size;
        chunk_index++;
    }

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
