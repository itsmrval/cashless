#include "api.h"
#include <curl/curl.h>
#include <string.h>
#include <stdlib.h>

struct memory_struct {
    char *memory;
    size_t size;
};

static char api_base_url[256] = "";

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

static const char base64_chars[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

static void base64_encode(const unsigned char *input, size_t input_len, char *output, size_t output_size)
{
    size_t i = 0, j = 0;
    unsigned char a3[3];
    unsigned char a4[4];
    size_t output_len = ((input_len + 2) / 3) * 4;

    if (output_size < output_len + 1) {
        return;
    }

    while (input_len--) {
        a3[i++] = *(input++);
        if (i == 3) {
            a4[0] = (a3[0] & 0xfc) >> 2;
            a4[1] = ((a3[0] & 0x03) << 4) + ((a3[1] & 0xf0) >> 4);
            a4[2] = ((a3[1] & 0x0f) << 2) + ((a3[2] & 0xc0) >> 6);
            a4[3] = a3[2] & 0x3f;

            for (i = 0; i < 4; i++) {
                output[j++] = base64_chars[a4[i]];
            }
            i = 0;
        }
    }

    if (i) {
        size_t k;
        for (k = i; k < 3; k++) {
            a3[k] = '\0';
        }

        a4[0] = (a3[0] & 0xfc) >> 2;
        a4[1] = ((a3[0] & 0x03) << 4) + ((a3[1] & 0xf0) >> 4);
        a4[2] = ((a3[1] & 0x0f) << 2) + ((a3[2] & 0xc0) >> 6);
        a4[3] = a3[2] & 0x3f;

        for (k = 0; k < i + 1; k++) {
            output[j++] = base64_chars[a4[k]];
        }

        while (i++ < 3) {
            output[j++] = '=';
        }
    }

    output[j] = '\0';
}

int api_init(const char *api_url)
{
    curl_global_init(CURL_GLOBAL_DEFAULT);
    strncpy(api_base_url, api_url, sizeof(api_base_url) - 1);
    api_base_url[sizeof(api_base_url) - 1] = '\0';
    return 1;
}

void api_cleanup()
{
    curl_global_cleanup();
}

int api_login(const char *username, const char *password, char *token_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char postdata[256];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/auth/login", api_base_url);
    snprintf(postdata, sizeof(postdata), "{\"username\":\"%s\",\"password\":\"%s\"}", username, password);

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
                char *token_start = strstr(chunk.memory, "\"token\":\"");
                if (token_start) {
                    token_start += 9;
                    char *token_end = strchr(token_start, '"');
                    if (token_end) {
                        size_t token_len = token_end - token_start;
                        if (token_len < buffer_size) {
                            strncpy(token_buffer, token_start, token_len);
                            token_buffer[token_len] = '\0';
                            success = 1;
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

int api_get_challenge(const char *card_id, char *challenge_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/auth/challenge?card_id=%s", api_base_url, card_id);

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
                char *challenge_start = strstr(chunk.memory, "\"challenge\":\"");
                if (challenge_start) {
                    challenge_start += 13;
                    char *challenge_end = strchr(challenge_start, '"');
                    if (challenge_end) {
                        size_t challenge_len = challenge_end - challenge_start;
                        if (challenge_len < buffer_size) {
                            strncpy(challenge_buffer, challenge_start, challenge_len);
                            challenge_buffer[challenge_len] = '\0';
                            success = 1;
                        }
                    }
                }
            } else {
                fprintf(stderr, "Challenge request failed: GET %s returned HTTP %ld\n", url, response_code);
                fprintf(stderr, "Response: %s\n", chunk.memory);
            }
        } else {
            fprintf(stderr, "Challenge request CURL error: %s\n", curl_easy_strerror(res));
        }

        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}

int api_card_auth_with_signature(const char *card_id, const char *challenge, const unsigned char *signature, size_t signature_len, char *token_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char postdata[2048];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    char signature_b64[512];
    base64_encode(signature, signature_len, signature_b64, sizeof(signature_b64));

    snprintf(url, sizeof(url), "%s/auth/card", api_base_url);
    snprintf(postdata, sizeof(postdata), "{\"card_id\":\"%s\",\"challenge\":\"%s\",\"signature\":\"%s\"}", card_id, challenge, signature_b64);

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
                char *token_start = strstr(chunk.memory, "\"token\":\"");
                if (token_start) {
                    token_start += 9;
                    char *token_end = strchr(token_start, '"');
                    if (token_end) {
                        size_t token_len = token_end - token_start;
                        if (token_len < buffer_size) {
                            strncpy(token_buffer, token_start, token_len);
                            token_buffer[token_len] = '\0';
                            success = 1;
                        }
                    }
                }
            } else {
                fprintf(stderr, "Card auth failed: POST %s returned HTTP %ld\n", url, response_code);
                fprintf(stderr, "Response: %s\n", chunk.memory);
            }
        } else {
            fprintf(stderr, "Card auth CURL error: %s\n", curl_easy_strerror(res));
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}

int api_card_login(const char *card_id, const char *pin, char *token_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char postdata[256];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/auth/card", api_base_url);
    snprintf(postdata, sizeof(postdata), "{\"card_id\":\"%s\",\"pin\":\"%s\"}", card_id, pin);

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
                char *token_start = strstr(chunk.memory, "\"token\":\"");
                if (token_start) {
                    token_start += 9;
                    char *token_end = strchr(token_start, '"');
                    if (token_end) {
                        size_t token_len = token_end - token_start;
                        if (token_len < buffer_size) {
                            strncpy(token_buffer, token_start, token_len);
                            token_buffer[token_len] = '\0';
                            success = 1;
                        }
                    }
                }
            } else {
                fprintf(stderr, "Card login failed: POST %s returned HTTP %ld\n", url, response_code);
                fprintf(stderr, "Response: %s\n", chunk.memory);
            }
        } else {
            fprintf(stderr, "Card login CURL error: %s\n", curl_easy_strerror(res));
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}

int fetch_user_by_card(const char *card_id, const char *driver_token, char *name_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char auth_header[600];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/user?card_id=%s", api_base_url, card_id);
    snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", driver_token);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, auth_header);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
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

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}

int get_card_status(const char *card_id, const char *driver_token, char *status_buffer, size_t buffer_size)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char auth_header[600];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/card/%s", api_base_url, card_id);
    snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", driver_token);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, auth_header);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
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
            } else {
                fprintf(stderr, "API Error: GET %s returned HTTP %ld\n", url, response_code);
                fprintf(stderr, "Response: %s\n", chunk.memory);
            }
        } else {
            fprintf(stderr, "CURL Error: %s\n", curl_easy_strerror(res));
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}

int update_card_status(const char *card_id, const char *admin_token, const char *status)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char postdata[128];
    char auth_header[600];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/card/%s", api_base_url, card_id);
    snprintf(postdata, sizeof(postdata), "{\"status\":\"%s\"}", status);
    snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", admin_token);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: application/json");
        headers = curl_slist_append(headers, auth_header);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PATCH");
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
                success = 1;
            }
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    return success;
}

int fetch_transactions(const char *card_id, const char *card_token, const char *driver_token, int *balance, Transaction *transactions, int max_transactions, int *transaction_count)
{
    CURL *curl;
    CURLcode res;
    char url[512];
    char card_auth_header[512];
    char driver_auth_header[512];
    struct memory_struct chunk;
    int success = 0;

    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/transactions", api_base_url);
    snprintf(card_auth_header, sizeof(card_auth_header), "Authorization: Bearer %s", card_token);
    snprintf(driver_auth_header, sizeof(driver_auth_header), "Authorization: Bearer %s", driver_token);

    fprintf(stderr, "[DEBUG] Fetching transactions from: %s\n", url);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, card_auth_header);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            long response_code;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

            fprintf(stderr, "[DEBUG] Transactions endpoint returned HTTP %ld\n", response_code);

            if (response_code == 200) {
                fprintf(stderr, "[DEBUG] Response: %s\n", chunk.memory);
                *transaction_count = 0;

                // Look for the "transactions" field in the response
                char *trans_array = strstr(chunk.memory, "\"transactions\":");
                if (trans_array) {
                    trans_array += 15; // Skip past "transactions":
                    // Skip whitespace
                    while (*trans_array == ' ' || *trans_array == '\n' || *trans_array == '\r' || *trans_array == '\t') {
                        trans_array++;
                    }

                    if (*trans_array == '[') {
                        char *trans_start = trans_array + 1;

                    while (*transaction_count < max_transactions) {
                        char *obj_start = strchr(trans_start, '{');
                        if (!obj_start) break;

                        // Find matching closing brace by counting nesting level
                        char *obj_end = obj_start + 1;
                        int brace_count = 1;
                        while (*obj_end && brace_count > 0) {
                            if (*obj_end == '{') brace_count++;
                            else if (*obj_end == '}') brace_count--;
                            if (brace_count > 0) obj_end++;
                        }
                        if (brace_count != 0) break;

                        char *operation_str = strstr(obj_start, "\"operation\":");
                        char *source_user_str = strstr(obj_start, "\"source_user\":");
                        char *dest_user_str = strstr(obj_start, "\"destination_user\":");

                        if (operation_str && operation_str < obj_end) {
                            int op = atoi(operation_str + 12);
                            transactions[*transaction_count].operation = op;

                            if (source_user_str && source_user_str < obj_end) {
                                char *name_start = strstr(source_user_str, "\"name\":\"");
                                if (name_start && name_start < obj_end) {
                                    name_start += 8;
                                    char *name_end = strchr(name_start, '"');
                                    if (name_end) {
                                        size_t len = name_end - name_start;
                                        if (len < sizeof(transactions[*transaction_count].source_user_name)) {
                                            strncpy(transactions[*transaction_count].source_user_name, name_start, len);
                                            transactions[*transaction_count].source_user_name[len] = '\0';
                                        }
                                    }
                                }
                            }

                            if (dest_user_str && dest_user_str < obj_end) {
                                char *name_start = strstr(dest_user_str, "\"name\":\"");
                                if (name_start && name_start < obj_end) {
                                    name_start += 8;
                                    char *name_end = strchr(name_start, '"');
                                    if (name_end) {
                                        size_t len = name_end - name_start;
                                        if (len < sizeof(transactions[*transaction_count].destination_user_name)) {
                                            strncpy(transactions[*transaction_count].destination_user_name, name_start, len);
                                            transactions[*transaction_count].destination_user_name[len] = '\0';
                                        }
                                    }
                                }
                            }

                            (*transaction_count)++;
                        }

                        trans_start = obj_end + 1;
                    }

                    fprintf(stderr, "[DEBUG] Successfully parsed %d transactions\n", *transaction_count);
                    success = 1;
                    } else {
                        fprintf(stderr, "[DEBUG] ERROR: Transactions array does not start with '['\n");
                    }
                } else {
                    fprintf(stderr, "[DEBUG] ERROR: Could not find 'transactions' field in response\n");
                }
            } else {
                fprintf(stderr, "[DEBUG] ERROR: Transactions request returned HTTP %ld\n", response_code);
                fprintf(stderr, "[DEBUG] Response: %s\n", chunk.memory);
            }
        } else {
            fprintf(stderr, "[DEBUG] ERROR: Transactions CURL error: %s\n", curl_easy_strerror(res));
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);

    if (!success) {
        fprintf(stderr, "[DEBUG] ERROR: Failed to fetch transactions, returning 0\n");
        return 0;
    }

    // Now fetch balance from /user/:card_id/balance endpoint
    chunk.memory = malloc(1);
    chunk.size = 0;

    char user_id[128] = "";

    // First get the user ID from the card
    snprintf(url, sizeof(url), "%s/user?card_id=%s", api_base_url, card_id);

    fprintf(stderr, "[DEBUG] Fetching user ID from: %s\n", url);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, driver_auth_header);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            long response_code;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

            fprintf(stderr, "[DEBUG] User endpoint returned HTTP %ld\n", response_code);

            if (response_code == 200) {
                fprintf(stderr, "[DEBUG] Response: %s\n", chunk.memory);
                char *id_start = strstr(chunk.memory, "\"_id\":\"");
                if (id_start) {
                    id_start += 7;
                    char *id_end = strchr(id_start, '"');
                    if (id_end) {
                        size_t len = id_end - id_start;
                        if (len < sizeof(user_id)) {
                            strncpy(user_id, id_start, len);
                            user_id[len] = '\0';
                            fprintf(stderr, "[DEBUG] Found user ID: %s\n", user_id);
                        }
                    }
                } else {
                    fprintf(stderr, "[DEBUG] ERROR: Could not find _id in response\n");
                }
            } else {
                fprintf(stderr, "[DEBUG] ERROR: User request returned HTTP %ld\n", response_code);
                fprintf(stderr, "[DEBUG] Response: %s\n", chunk.memory);
            }
        } else {
            fprintf(stderr, "[DEBUG] ERROR: User CURL error: %s\n", curl_easy_strerror(res));
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);

    if (user_id[0] == '\0') {
        fprintf(stderr, "[DEBUG] ERROR: Could not get user ID, setting balance to 0\n");
        *balance = 0;
        return 1;  // Still return success for transactions
    }

    // Now fetch the balance
    chunk.memory = malloc(1);
    chunk.size = 0;

    snprintf(url, sizeof(url), "%s/user/%s/balance", api_base_url, user_id);

    fprintf(stderr, "[DEBUG] Fetching balance from: %s\n", url);

    curl = curl_easy_init();
    if (curl) {
        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, driver_auth_header);

        curl_easy_setopt(curl, CURLOPT_URL, url);
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

        res = curl_easy_perform(curl);

        if (res == CURLE_OK) {
            long response_code;
            curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);

            fprintf(stderr, "[DEBUG] Balance endpoint returned HTTP %ld\n", response_code);

            if (response_code == 200) {
                fprintf(stderr, "[DEBUG] Response: %s\n", chunk.memory);
                char *balance_start = strstr(chunk.memory, "\"balance\":");
                if (balance_start) {
                    *balance = atoi(balance_start + 10);
                    fprintf(stderr, "[DEBUG] Found balance: %d\n", *balance);
                } else {
                    fprintf(stderr, "[DEBUG] ERROR: Could not find balance in response\n");
                    *balance = 0;
                }
            } else {
                fprintf(stderr, "[DEBUG] ERROR: Balance request returned HTTP %ld\n", response_code);
                fprintf(stderr, "[DEBUG] Response: %s\n", chunk.memory);
                *balance = 0;
            }
        } else {
            fprintf(stderr, "[DEBUG] ERROR: Balance CURL error: %s\n", curl_easy_strerror(res));
            *balance = 0;
        }

        curl_slist_free_all(headers);
        curl_easy_cleanup(curl);
    }

    free(chunk.memory);
    fprintf(stderr, "[DEBUG] fetch_transactions completed successfully\n");
    return 1;
}
