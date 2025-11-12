#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#ifdef __APPLE__
#include <PCSC/winscard.h>
#else
#include <pcsclite.h>
#include <winscard.h>
#endif

#define VERSION "0.0.1"
#define SIZE_USER_ID 24
#define ADDR_VERSION 0x18

SCARDCONTEXT hContext;
SCARDHANDLE hCard;
DWORD dwActiveProtocol;
char readers[256];
DWORD readersLen;

void clear_screen()
{
    printf("\033[2J\033[H");
}

void print_ui(const char *status)
{
    clear_screen();
    printf("cashless - v%s\n\n%s\n", VERSION, status);
    fflush(stdout);
}

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

int read_data(BYTE *user_id, BYTE *version)
{
    LONG rv;
    BYTE cmd_user_id[] = {0x80, 0x01, 0x00, 0x00, SIZE_USER_ID};
    BYTE cmd_version[] = {0x80, 0x02, 0x00, 0x00, 0x01};
    BYTE response[258];
    DWORD responseLen;
    SCARD_IO_REQUEST pioSendPci;

    pioSendPci.dwProtocol = dwActiveProtocol;
    pioSendPci.cbPciLength = sizeof(SCARD_IO_REQUEST);

    responseLen = sizeof(response);
    rv = SCardTransmit(hCard, &pioSendPci, cmd_user_id, sizeof(cmd_user_id),
                      NULL, response, &responseLen);
    if (rv != SCARD_S_SUCCESS || responseLen < SIZE_USER_ID + 2) {
        return 0;
    }
    if (response[responseLen - 2] != 0x90 || response[responseLen - 1] != 0x00) {
        return 0;
    }
    memcpy(user_id, response, SIZE_USER_ID);

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

int main()
{
    BYTE user_id[SIZE_USER_ID + 1];
    BYTE version;
    int card_present = 0;

    if (!init_reader()) {
        printf("Error: No reader detected\n");
        return 1;
    }

    print_ui("Waiting for a card");

    while (1) {
        if (connect_card()) {
            if (!card_present) {
                if (read_data(user_id, &version)) {
                    user_id[SIZE_USER_ID] = '\0';
                    char msg[128];
                    sprintf(msg, "Card readed (v%d): user_id %s", version, user_id);
                    print_ui(msg);
                    card_present = 1;
                } else {
                    disconnect_card();
                }
            }
        } else {
            if (card_present) {
                print_ui("Waiting for a card");
                card_present = 0;
            }
            disconnect_card();
        }

        usleep(500000);
    }

    SCardReleaseContext(hContext);
    return 0;
}
