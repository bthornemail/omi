#include <stdint.h>

uint32_t omi_eigen_cons_score(uint32_t stable_edges, uint32_t oscillating_edges)
{
    return stable_edges >= oscillating_edges ? stable_edges - oscillating_edges : 0;
}
