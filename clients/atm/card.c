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
    BYTE cmd_write_pin[5 + SIZE_PIN] = {0x80, 0x09, 0x00, 0x00, SIZE_PIN};
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

int write_pin_and_puk_to_card(const char *pin, const char *puk)
{
    LONG rv;
    BYTE cmd_write_pin[5 + SIZE_PIN + SIZE_PUK] = {0x80, 0x03, 0x00, 0x00, SIZE_PIN + SIZE_PUK};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    for (i = 0; i < SIZE_PIN; i++) {
        cmd_write_pin[5 + i] = pin[i] - '0';
    }
    for (i = 0; i < SIZE_PUK; i++) {
        cmd_write_pin[5 + SIZE_PIN + i] = puk[i] - '0';
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

int verify_pin_on_card(const char *pin, BYTE *remaining_attempts)
{
    LONG rv;
    BYTE cmd_verify_pin[5 + SIZE_PIN] = {0x80, 0x06, 0x00, 0x00, SIZE_PIN};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    for (i = 0; i < SIZE_PIN; i++) {
        cmd_verify_pin[5 + i] = pin[i] - '0';
    }

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_verify_pin, sizeof(cmd_verify_pin),
                      NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS || responseLen < 2) {
        return 0;
    }

    if (response[responseLen - 2] == 0x90 && response[responseLen - 1] == 0x00) {
        *remaining_attempts = 3;
        return 1;
    }

    if (response[responseLen - 2] == 0x63 && (response[responseLen - 1] & 0xF0) == 0xC0) {
        *remaining_attempts = response[responseLen - 1] & 0x0F;
        return 0;
    }

    if (response[responseLen - 2] == 0x69 && response[responseLen - 1] == 0x83) {
        *remaining_attempts = 0;
        return 0;
    }

    return 0;
}

int verify_puk_on_card(const char *puk, const char *new_pin, BYTE *remaining_attempts)
{
    LONG rv;
    BYTE cmd_verify_puk[5 + SIZE_PUK + SIZE_PIN] = {0x80, 0x07, 0x00, 0x00, SIZE_PUK + SIZE_PIN};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    for (i = 0; i < SIZE_PUK; i++) {
        cmd_verify_puk[5 + i] = puk[i] - '0';
    }
    for (i = 0; i < SIZE_PIN; i++) {
        cmd_verify_puk[5 + SIZE_PUK + i] = new_pin[i] - '0';
    }

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_verify_puk, sizeof(cmd_verify_puk),
                      NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS || responseLen < 2) {
        return 0;
    }

    if (response[responseLen - 2] == 0x90 && response[responseLen - 1] == 0x00) {
        *remaining_attempts = 3;
        return 1;
    }

    if (response[responseLen - 2] == 0x63 && (response[responseLen - 1] & 0xF0) == 0xC0) {
        *remaining_attempts = response[responseLen - 1] & 0x0F;
        return 0;
    }

    if (response[responseLen - 2] == 0x69 && response[responseLen - 1] == 0x84) {
        *remaining_attempts = 0;
        return 0;
    }

    return 0;
}

int sign_challenge_on_card(const unsigned char *challenge, unsigned char *signature, size_t *signature_len)
{
    LONG rv;
    BYTE cmd_set_challenge[5 + 32] = {0x80, 0x0C, 0x00, 0x00, 0x20};
    BYTE cmd_get_signature[5] = {0x80, 0x0B, 0x00, 0x00, 0x40};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;
    int i;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    for (i = 0; i < 32; i++) {
        cmd_set_challenge[5 + i] = challenge[i];
    }

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_set_challenge, 37,
                      NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS) {
        return 0;
    }

    if (responseLen < 2 || response[responseLen - 2] != 0x90) {
        return 0;
    }

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_get_signature, 5,
                      NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS) {
        return 0;
    }

    if (responseLen < 2) {
        return 0;
    }

    if (response[responseLen - 2] != 0x90) {
        return 0;
    }

    int sig_len = responseLen - 2;
    if (sig_len == 64) {
        memcpy(signature, response, sig_len);
        *signature_len = sig_len;
        return 1;
    }

    return 0;
}

int get_remaining_attempts_from_card(BYTE *pin_attempts, BYTE *puk_attempts)
{
    LONG rv;
    BYTE cmd[] = {0x80, 0x0D, 0x00, 0x00, 0x02};
    BYTE response[258];
    DWORD responseLen = sizeof(response);
    SCARD_IO_REQUEST pioSendPci;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    rv = SCardTransmit(hCard, &pioSendPci, cmd, sizeof(cmd), NULL, response, &responseLen);

    if (rv != SCARD_S_SUCCESS || responseLen < 4) return 0;
    if (response[responseLen - 2] != 0x90) return 0;

    *pin_attempts = response[0];
    *puk_attempts = response[1];
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
