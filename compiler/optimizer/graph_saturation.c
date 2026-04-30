#include <stddef.h>

int omi_graph_is_saturated(size_t unresolved_edges)
{
    return unresolved_edges == 0;
}
