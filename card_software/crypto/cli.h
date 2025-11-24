#ifndef CLI_H
#define CLI_H

#include <avr/pgmspace.h>

static inline void cli_putstr(const char *str) { (void)str; }
static inline void cli_putc(char c) { (void)c; }
static inline char cli_getc_cecho(void) { return 0; }
static inline void uart0_flush(void) {}

#endif
