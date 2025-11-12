#include "api.h"
#include <curl/curl.h>
#include <string.h>
#include <stdlib.h>

struct memory_struct {
    char *memory;
    size_t size;
};

static size_t write_callback(void *contents, size_t size, size_t nmemb, void *userp)
{
    size_t realsize = size * nmemb;
    struct memory_struct *mem = (struct memory_struct *)userp;

    char *ptr = realloc(mem->memory, mem->size + realsize + 1);
    if (!ptr) {
        return 0;
    }

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}

int api_init()
{
    curl_global_init(CURL_GLOBAL_DEFAULT);
    return 1;
}

void api_cleanup()
{
    curl_global_cleanup();
}

int fetch_user_name(const char *user_id, char *name_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/user/%s", API_BASE_URL, user_id);

    curl = curl_easy_init();
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            long response_code;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

            if (response_code == 200) {
                char *name_start = strstr(chunk.memory, "\"name\":\"");
                if (name_start) {
                    name_start += 8;
                    char *name_end = strchr(name_start, '"');
                    if (name_end) {
                        size_t name_len = name_end - name_start;
                        if (name_len < buffer_size) {
                            strncpy(name_buffer, name_start, name_len);
                            name_buffer[name_len] = '\0';
                            success = 1;
                        }
                    }
                }
            }
        }

        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}
