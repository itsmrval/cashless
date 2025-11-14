#ifndef HEXDIGIT_TAB_H
#define HEXDIGIT_TAB_H

#include <avr/pgmspace.h>
#include "bigint.h"

const char hexdigit_tab_lc_P[] PROGMEM = "0123456789abcdef";

static inline void bigint_print_hex(const bigint_t *a) { (void)a; }

#endif
