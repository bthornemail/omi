#ifndef OMI_PAGE_COURT_H
#define OMI_PAGE_COURT_H

typedef struct {
    const char *name;
    const char *authority;
    const char *mutability;
} omi_page_region_t;

unsigned omi_page_court_count(void);
const omi_page_region_t *omi_page_court_get(unsigned index);
void omi_emit_page_court_witness(void);

#endif
