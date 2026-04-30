#include "../kernel/include/bom.h"
#include <assert.h>

int main(void)
{
    omi_bom_clock_t clock;
    omi_bom_init(&clock);
    assert(clock.tick == 0);
    assert(omi_bom_advance(&clock) == 1);
    return 0;
}
