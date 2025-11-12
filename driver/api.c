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

int fetch_user_by_card(const char *card_id, char *name_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/user?card_id=%s", API_BASE_URL, card_id);

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

int get_card_status(const char *card_id, char *status_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/card/%s", API_BASE_URL, card_id);

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
                char *status_start = strstr(chunk.memory, "\"status\":\"");
                if (status_start) {
                    status_start += 10;
                    char *status_end = strchr(status_start, '"');
                    if (status_end) {
                        size_t status_len = status_end - status_start;
                        if (status_len < buffer_size) {
                            strncpy(status_buffer, status_start, status_len);
                            status_buffer[status_len] = '\0';
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

int setup_pin_api(const char *card_id, const char *pin)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char postdata[64];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/card/%s/setup-pin", API_BASE_URL, card_id);
    snprintf(postdata, sizeof(postdata), "{\"pin\":\"%s\"}", pin);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postdata);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            long response_code;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

            if (response_code == 200) {
                char *success_start = strstr(chunk.memory, "\"success\":true");
                if (success_start) {
                    success = 1;
                }
            }
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}

int verify_pin_api(const char *card_id, const char *pin, char *name_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char postdata[64];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/card/%s/verify-pin", API_BASE_URL, card_id);
    snprintf(postdata, sizeof(postdata), "{\"pin\":\"%s\"}", pin);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, postdata);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            long response_code;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

            if (response_code == 200) {
                char *success_start = strstr(chunk.memory, "\"success\":true");
                if (success_start) {
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
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}
