#include "pcsc_utils.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void check_status(LONG rv, const char *msg) {
    if (rv != SCARD_S_SUCCESS) {
        printf("Erreur: %s (code %x)\n", msg, rv);
        exit(1);
    }
}


LONG establish_context(SCARDCONTEXT *context) {
    return SCardEstablishContext(SCARD_SCOPE_SYSTEM, NULL, NULL, context);
}

LONG list_readers(SCARDCONTEXT context, char **reader) {
    char readers_buf[256];
    DWORD cch = sizeof(readers_buf);
    LONG rv = SCardListReaders(context, NULL, readers_buf, &cch);
    *reader = (rv == SCARD_S_SUCCESS) ? strdup(readers_buf) : NULL;
    return rv;
}

LONG connect_card(SCARDCONTEXT context, const char *reader, SCARDHANDLE *card, DWORD *active_protocol) {
    return SCardConnect(context, reader, SCARD_SHARE_EXCLUSIVE,
                        SCARD_PROTOCOL_T0 | SCARD_PROTOCOL_T1,
                        card, active_protocol);
}

int wait_for_card(SCARDCONTEXT context, const char *reader) {
    SCARD_READERSTATE state;
    state.szReader = reader;
    state.dwCurrentState = SCARD_STATE_UNAWARE;

    while (1) {
        LONG rv = SCardGetStatusChange(context, 500, &state, 1);

        if (rv == SCARD_S_SUCCESS && (state.dwEventState & SCARD_STATE_PRESENT)) {
            return 1;
        }

        if (rv != SCARD_S_SUCCESS && rv != (LONG)SCARD_E_TIMEOUT) {
            return 0;
        }

        state.dwCurrentState = state.dwEventState;
    }
}

int wait_for_card_removal(SCARDCONTEXT context, const char *reader) {
    SCARD_READERSTATE state;
    state.szReader = reader;
    state.dwCurrentState = SCARD_STATE_UNAWARE;

    while (1) {
        LONG rv = SCardGetStatusChange(context, 500, &state, 1);

        if (rv == SCARD_S_SUCCESS && !(state.dwEventState & SCARD_STATE_PRESENT)) {
            return 1;
        }

        if (rv != SCARD_S_SUCCESS && rv != (LONG)SCARD_E_TIMEOUT) {
            return 0;
        }

        state.dwCurrentState = state.dwEventState;
    }
}