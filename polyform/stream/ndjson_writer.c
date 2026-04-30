#include <stdio.h>

void omi_ndjson_write_null_node(FILE *out)
{
    fprintf(out, "{\"type\":\"NULL\"}\n");
}
