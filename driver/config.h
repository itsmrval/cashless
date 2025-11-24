#ifndef CONFIG_H
#define CONFIG_H

typedef struct {
    char username[128];
    char password[128];
    char api_url[256];
} Config;

int load_config(const char *config_path, Config *config);

#endif
