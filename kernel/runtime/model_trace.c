#include "../include/model_trace.h"
#include "../include/model_registry.h"

void omi_model_trace_emit_qemu(void)
{
    omi_emit_model_registry_witness();
}
