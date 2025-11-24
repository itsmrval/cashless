#include "config.h"
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static void trim_whitespace(char *str) {
    char *start = str;
    char *end;

    while (*start == ' ' || *start == '\t') start++;

    if (*start == 0) {
        *str = 0;
        return;
    }

    end = start + strlen(start) - 1;
    while (end > start && (*end == ' ' || *end == '\t' || *end == '\n' || *end == '\r')) end--;

    *(end + 1) = 0;

    if (start != str) {
        memmove(str, start, strlen(start) + 1);
    }
}

int load_config(const char *config_path, Config *config) {
    FILE *file;
    char line[512];

    config->username[0] = '\0';
    config->password[0] = '\0';
    strncpy(config->api_url, "http://localhost:3002/v1", sizeof(config->api_url) - 1);
    config->api_url[sizeof(config->api_url) - 1] = '\0';

    file = fopen(config_path, "r");
    if (!file) {
        return 0;
    }

    while (fgets(line, sizeof(line), file)) {
        char *key, *value, *equals;

        if (line[0] == '#' || line[0] == '\n' || line[0] == '\r') {
            continue;
        }

        equals = strchr(line, '=');
        if (!equals) {
            continue;
        }

        *equals = '\0';
        key = line;
        value = equals + 1;

        trim_whitespace(key);
        trim_whitespace(value);

        if (strcmp(key, "username") == 0) {
            strncpy(config->username, value, sizeof(config->username) - 1);
            config->username[sizeof(config->username) - 1] = '\0';
        } else if (strcmp(key, "password") == 0) {
            strncpy(config->password, value, sizeof(config->password) - 1);
            config->password[sizeof(config->password) - 1] = '\0';
        } else if (strcmp(key, "api_url") == 0) {
            strncpy(config->api_url, value, sizeof(config->api_url) - 1);
            config->api_url[sizeof(config->api_url) - 1] = '\0';
        }
    }

    fclose(file);

    if (config->username[0] == '\0' || config->password[0] == '\0') {
        return 0;
    }

    return 1;
}
