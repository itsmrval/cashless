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

int is_card_present()
{
    if (!hCard) {
        return 0;
    }

    LONG rv;
    DWORD dwState, dwProtocol, dwAtrLen = 33;
    BYTE pbAtr[33];
    DWORD dwReaderLen = 256;
    char pbReader[256];

    rv = SCardStatus(hCard, pbReader, &dwReaderLen, &dwState, &dwProtocol, pbAtr, &dwAtrLen);

    return (rv == SCARD_S_SUCCESS && (dwState & SCARD_PRESENT));
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

int write_pin_to_card(const char *pin)
{
    LONG rv;
    BYTE cmd_write_pin[5 + SIZE_PIN] = {0x80, 0x03, 0x00, 0x00, SIZE_PIN};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    for (i = 0; i < SIZE_PIN; i++) {
        cmd_write_pin[5 + i] = pin[i] - '0';
    }

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_write_pin, sizeof(cmd_write_pin),
                      NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS || responseLen < 2) {
        return 0;
    }

    if (response[responseLen - 2] != 0x90 || response[responseLen - 1] != 0x00) {
        return 0;
    }

    return 1;
}

int read_pin_from_card(char *pin)
{
    LONG rv;
    BYTE cmd_read_pin[] = {0x80, 0x04, 0x00, 0x00, SIZE_PIN};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_read_pin, sizeof(cmd_read_pin),
                      NULL, response, &responseLen);
    if (rv != SCARD_S_SUCCESS || responseLen < SIZE_PIN + 2) {
        return 0;
    }
    if (response[responseLen - 2] != 0x90 || response[responseLen - 1] != 0x00) {
        return 0;
    }

    for (i = 0; i < SIZE_PIN; i++) {
        pin[i] = response[i] + '0';
    }
    pin[SIZE_PIN] = '\0';

    return 1;
}

int assign_card_id_to_card(const char *card_id)
{
    LONG rv;
    BYTE cmd_assign[5 + SIZE_CARD_ID] = {0x80, 0x05, 0x00, 0x00, SIZE_CARD_ID};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    // Copy card_id into command
    for (i = 0; i < SIZE_CARD_ID; i++) {
        cmd_assign[5 + i] = card_id[i];
    }

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_assign, sizeof(cmd_assign),
                      NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS || responseLen < 2) {
        return 0;
    }

    // Success if status is 90 00
    if (response[responseLen - 2] == 0x90 && response[responseLen - 1] == 0x00) {
        return 1;
    }

    return 0;
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
