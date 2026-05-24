# OMI Distributed Consistency Model - Deployment Specification

Version 1.0

## Purpose

This document specifies a deployable OMI distributed storage substrate based on
one core rule:

```text
correctness = causal closure + RS sufficiency + monotone candidate growth
```

The system does not use epochs, physical-time validity windows, overlap
intervals, drift correction, or "latest value" overwrite semantics for
correctness. Time is removed from the correctness model. Causality is carried
per codeword with version vectors.

The resulting system is a coordination-free, causally ordered, erasure-coded
knowledge lattice over an asynchronous gossip network.

## Fixed Point

The consistency layer is:

```text
a causally indexed monotone closure system
over RS-constrained finite fragment sets
in a partially ordered message DAG
```

System state is not one canonical value. System state is the monotone set of all
RS-reconstructible candidates that are derivable from the locally observed
causal fragment DAG.

The application layer may choose, display, cache, or materialize one candidate,
but that is policy. It is not consistency semantics.

## System Stack

```text
+--------------------------------------------------------------------------+
| Application Policy Layer                                                 |
|                                                                          |
| - read preference                                                        |
| - candidate selection                                                    |
| - UI projection                                                          |
| - materialized views                                                     |
|                                                                          |
| This layer may choose. It does not define correctness.                   |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
| OMI Consistency Layer                                                    |
|                                                                          |
| - version-vector causal DAG                                              |
| - RS(k,n) erasure coding                                                 |
| - causally closed reconstruction candidates                              |
| - monotone inclusion-only candidate set                                  |
| - no overwrite, canonicalization, epoch, interval, or consensus rule      |
+------------------------------------+-------------------------------------+
                                     |
                                     v
+--------------------------------------------------------------------------+
| Transport Layer                                                          |
|                                                                          |
| - UDP fragment propagation                                               |
| - lossy, unordered, duplicate-tolerant messages                           |
| - optional authenticated channel                                         |
| - no correctness dependency on delivery order                            |
+--------------------------------------------------------------------------+
```

## Node Architecture

```text
+--------------------------------------------------------------------------+
| Node                                                                     |
|                                                                          |
|  +--------------------+        +--------------------+                     |
|  | Fragment Store     |<------>| Gossip Engine      |                     |
|  |                    |        |                    |                     |
|  | key:               |        | - hello            |                     |
|  | (cw, vv, i, hash)  |        | - inventory        |                     |
|  |                    |        | - request          |                     |
|  | append only under  |        | - fragment push    |                     |
|  | retention policy   |        |                    |                     |
|  +---------+----------+        +---------+----------+                     |
|            |                             |                                |
|            v                             v                                |
|  +--------------------+        +--------------------+                     |
|  | Causal DAG Index   |        | Peer Table         |                     |
|  |                    |        |                    |                     |
|  | - vv <= vv         |        | - static peers     |                     |
|  | - ancestry edges   |        | - optional mDNS    |                     |
|  | - observed closure |        | - optional DNS     |                     |
|  +---------+----------+        +--------------------+                     |
|            |                                                              |
|            v                                                              |
|  +--------------------+        +--------------------+                     |
|  | Reconstruction     |------->| Client API         |                     |
|  | Engine             |        |                    |                     |
|  |                    |        | - query(cw)        |                     |
|  | - causal closure   |        | - return lattice   |                     |
|  | - RS sufficiency   |        | - policy external  |                     |
|  | - candidate set    |        |                    |                     |
|  +--------------------+        +--------------------+                     |
|                                                                          |
+--------------------------------------------------------------------------+
```

No component deletes or overwrites a valid reconstruction as part of the
consistency semantics. Retention may evict stored material under policy, but
eviction is outside the monotone correctness model.

## Core Objects

### Codeword

A codeword is the identity scope for an RS(k,n) encoded object.

```text
cw: 128-bit codeword identifier
k:  minimum number of distinct RS symbols required for decode
n:  total number of RS symbols emitted for the codeword
```

Independent codewords never participate in the same reconstruction candidate.

### Version Vector

A version vector is a finite map:

```text
node_id -> counter
```

It is logical causal metadata, not physical time. A single `uint64_t` can be a
Lamport timestamp or an HLC field, but it is not a version vector. The wire
format below therefore encodes a variable-length vector.

Comparison:

```text
vv_a <= vv_b iff for every node id x:
  counter(vv_a, x) <= counter(vv_b, x)
```

Missing entries are interpreted as zero.

Merge:

```text
merge(vv_a, vv_b)[x] = max(vv_a[x], vv_b[x])
```

Observed ancestry:

```text
fragment a is an observed ancestor of fragment b iff
  a.cw == b.cw and a.vv <= b.vv and a.vv != b.vv
```

### Fragment

A fragment is the unit of storage and gossip:

```text
(cw, vv, i, symbol)
```

Where:

- `cw` is the codeword id.
- `vv` is the version vector.
- `i` is the RS fragment index.
- `symbol` is the RS symbol payload for index `i`.

The store key should include a symbol hash:

```text
(cw, vv_digest, i, symbol_hash)
```

This permits conflicting symbols to coexist without overwrite.

### Reconstruction Candidate

A reconstruction candidate is an RS-decoded value derived from a causally closed
subset of locally observed fragments.

Candidates are accumulated in an inclusion-only set:

```text
candidate_set(cw) = { all locally derivable valid candidates for cw }
```

New information may add candidates. It does not replace existing candidates.

## Wire Protocol

All multibyte integer fields are little-endian. Encoders and decoders must
serialize fields explicitly; C struct layout must not be treated as the wire
ABI.

### Message Types

| Type | Name | Purpose |
| --- | --- | --- |
| `0x01` | `FRAGMENT` | Carries one fragment. |
| `0x02` | `INVENTORY` | Announces known fragment digests. |
| `0x03` | `REQUEST` | Requests one or more fragment digests. |
| `0x04` | `RESPONSE` | Carries requested fragments. |
| `0x05` | `HELLO` | Announces node id and protocol version. |

### Common Header

```text
+--------+--------+------------+-------------------------------------------+
| Offset | Size   | Field      | Meaning                                   |
+--------+--------+------------+-------------------------------------------+
| 0      | 1      | magic[0]   | 'O'                                       |
| 1      | 1      | magic[1]   | 'M'                                       |
| 2      | 1      | magic[2]   | 'I'                                       |
| 3      | 1      | version    | protocol version, currently 0x01          |
| 4      | 1      | type       | message type                              |
| 5      | 1      | flags      | message flags                             |
| 6      | 2      | header_len | bytes from offset 0 through fixed header  |
| 8      | 16     | sender_id  | 128-bit node id                           |
| 24     | 8      | seq        | sender-local monotone message sequence    |
+--------+--------+------------+-------------------------------------------+
```

The common header is 32 bytes.

### Fragment Message

```text
+--------+--------+----------------+--------------------------------------+
| Offset | Size   | Field          | Meaning                              |
+--------+--------+----------------+--------------------------------------+
| 0      | 32     | common header  | type = 0x01 or 0x04                  |
| 32     | 16     | codeword_id    | cw                                   |
| 48     | 2      | fragment_index | i                                    |
| 50     | 2      | total_n        | RS n                                 |
| 52     | 2      | threshold_k    | RS k                                 |
| 54     | 2      | symbol_len     | bytes in RS symbol                   |
| 56     | 2      | vv_count       | number of version-vector entries     |
| 58     | 2      | reserved       | must be zero                         |
| 60     | 8      | symbol_hash    | FNV-1a64 or stronger configured hash |
| 68     | 8      | fragment_hash  | hash over canonical fragment fields  |
| 76     | 24*m   | vv_entries     | repeated version vector entries      |
| 76+24m | s      | rs_symbol      | symbol bytes                         |
+--------+--------+----------------+--------------------------------------+
```

Each version-vector entry is:

```text
+--------+--------+----------+------------------------+
| Offset | Size   | Field    | Meaning                |
+--------+--------+----------+------------------------+
| 0      | 16     | node_id  | vector component id    |
| 16     | 8      | counter  | component counter      |
+--------+--------+----------+------------------------+
```

`m = vv_count`, `s = symbol_len`.

Validation:

- `threshold_k <= total_n`
- `fragment_index < total_n`
- `symbol_len > 0`
- `vv_count > 0`
- `reserved == 0`
- `symbol_hash == hash(rs_symbol)`
- `fragment_hash` matches canonical fields

Structural validation rejects malformed packets. It does not decide semantic
"latest" state.

### Inventory Message

Inventory reduces blind retransmission. It announces fragment hashes, not
candidate choices.

```text
+--------+--------+---------------+---------------------------------------+
| Offset | Size   | Field         | Meaning                               |
+--------+--------+---------------+---------------------------------------+
| 0      | 32     | common header | type = 0x02                           |
| 32     | 2      | item_count    | number of fragment hashes             |
| 34     | 2      | reserved      | must be zero                          |
| 36     | 8*q    | hashes        | fragment_hash values                  |
+--------+--------+---------------+---------------------------------------+
```

### Request Message

```text
+--------+--------+---------------+---------------------------------------+
| Offset | Size   | Field         | Meaning                               |
+--------+--------+---------------+---------------------------------------+
| 0      | 32     | common header | type = 0x03                           |
| 32     | 2      | item_count    | number of requested hashes            |
| 34     | 2      | reserved      | must be zero                          |
| 36     | 8*q    | hashes        | fragment_hash values                  |
+--------+--------+---------------+---------------------------------------+
```

## Storage Model

The fragment store is append-only at the consistency layer.

```text
fragments:
  key   = (codeword_id, vv_digest, fragment_index, symbol_hash)
  value = canonical fragment bytes

dag_index:
  key   = (codeword_id, vv_digest)
  value = version vector, ancestor links, descendant links

candidates:
  key   = (codeword_id, candidate_hash)
  value = decoded bytes, source fragment hashes, proof metadata
```

Rules:

| Operation | Rule |
| --- | --- |
| Insert fragment | Add if structurally valid and not already present. |
| Duplicate fragment | Idempotent no-op. |
| Same `(cw, vv, i)` with different symbol | Store as a distinct fragment by `symbol_hash`. |
| Overwrite | Not permitted by consistency semantics. |
| Candidate creation | Add to candidate set. |
| Candidate replacement | Not permitted. |
| Candidate preference | Application policy only. |
| Eviction | Retention policy only; not part of correctness. |

## Causal Operations

### Version Vector Comparison

```c
typedef enum {
    OMI_VV_BEFORE = -1,
    OMI_VV_EQUAL = 0,
    OMI_VV_AFTER = 1,
    OMI_VV_CONCURRENT = 2
} omi_vv_order_t;
```

Comparison rule:

```text
a_before_b = exists x: a[x] < b[x], and for all y: a[y] <= b[y]
b_before_a = exists x: b[x] < a[x], and for all y: b[y] <= a[y]
equal      = for all x: a[x] == b[x]
otherwise concurrent
```

Concurrent vectors are allowed to coexist. They are not automatically conflicts
to resolve.

### Downward Closure

A fragment set `S` is closed under locally observed ancestry iff:

```text
for every fragment f in S:
  for every observed fragment a:
    if a.cw == f.cw and a.vv <= f.vv:
      a must also be in S
```

This is local closure over the observed DAG. It does not quantify over unknown
future fragments.

## Reconstruction Semantics

### Candidate Validity

A candidate for codeword `cw` is valid iff there exists a fragment subset `S`
such that:

1. Every fragment in `S` has `codeword_id == cw`.
2. `S` is downward-closed in the locally observed DAG.
3. `S` contains at least `k` distinct RS indices.
4. `RS_decode(S)` succeeds.
5. The decoded bytes are recorded as a candidate, not as a replacement.

The candidate set is monotone:

```text
candidate_set_next(cw) = candidate_set_current(cw) union new_candidates(cw)
```

There is no semantic overwrite operation.

### Query API

`query(cw)` returns the full local candidate set:

```json
{
  "codeword_id": "hex128",
  "candidates": [
    {
      "candidate_hash": "hex",
      "decoded_hash": "hex",
      "source_fragments": ["hex", "hex", "hex", "hex"],
      "causal_frontier": ["vv_digest"],
      "bytes": "base64-or-omitted"
    }
  ]
}
```

The client may apply policy:

- prefer a candidate whose frontier dominates another frontier
- prefer authenticated candidates
- return all candidates
- materialize a view
- ask multiple nodes and merge candidate sets

These policies do not alter the consistency model.

## Gossip Protocol

### Peer Discovery

Deployment may use:

- static peer lists
- DNS records
- mDNS on local networks
- manually configured bootstrap peers

There is no leader election and no membership consensus. Peer knowledge is
advisory transport state, not correctness state.

### Gossip Loop

```text
forever:
  wait(interval_ms + random_jitter)
  peers = select_random_peers(fanout)
  for peer in peers:
    send HELLO if peer is new
    send INVENTORY with sampled fragment_hash values
    respond to REQUEST messages with FRAGMENT/RESPONSE packets
```

On receive:

```text
if packet is malformed:
  reject
if packet is duplicate:
  ignore
if packet is structurally valid:
  store fragment or inventory
  merge version-vector knowledge
  update observed DAG index
  attempt local candidate derivation for affected codeword
```

The receive path performs structural validation and monotone storage. It does
not choose a canonical value.

## Write Path

```text
Client                  Node A                  Node B                  Node C
  |                       |                       |                       |
  | push fragments        |                       |                       |
  | (cw, vv, i, symbol)   |                       |                       |
  |---------------------->|                       |                       |
  |                       | validate + store      |                       |
  |                       | update DAG            |                       |
  |                       | derive candidates     |                       |
  |                       |                       |                       |
  |                       | INVENTORY             |                       |
  |                       |---------------------->|                       |
  |                       |                       | REQUEST missing       |
  |                       |<----------------------|                       |
  |                       | RESPONSE fragment     |                       |
  |                       |---------------------->|                       |
  |                       |                       | validate + store      |
  |                       |                       | update DAG            |
  |                       |                       |                       |
  |                       |                       | INVENTORY             |
  |                       |                       |---------------------->|
  |                       |                       |                       | validate + store
```

No acknowledgment is required for correctness. Delivery affects availability
and latency, not the validity rule.

## Read Path

```text
Client                       Node
  |                            |
  | query(cw)                  |
  |--------------------------->|
  |                            | collect local fragments for cw
  |                            | traverse observed DAG
  |                            | enumerate causally closed subsets
  |                            | check RS sufficiency
  |                            | decode valid candidates
  |                            | add candidates to candidate_set(cw)
  |                            |
  | candidate lattice          |
  |<---------------------------|
  |                            |
  | apply application policy   |
```

## Deployment Configuration

```yaml
node:
  node_id: "2f3d7c7c8cdb4a6493ad9f5f5de30001"

transport:
  udp_listen: "0.0.0.0:10000"
  max_datagram_bytes: 1200

peers:
  static:
    - "192.168.1.101:10000"
    - "192.168.1.102:10000"
    - "192.168.1.103:10000"

rs:
  n: 6
  k: 4
  symbol_bytes: 256
  field: "GF(2^8)"

gossip:
  interval_ms: 500
  jitter_ms: 200
  fanout: 3
  inventory_items: 64

storage:
  max_fragments: 1000000
  max_candidates_per_codeword: 1024
  retention_policy: "policy-layer"

client_api:
  listen: "127.0.0.1:11000"
  protocol: "http-json"

security:
  authenticated_peers: false
  fragment_signatures: optional
  rate_limit_packets_per_peer_per_sec: 500
```

## Operational Topology

```text
                         +----------+
                         | Client 1 |
                         +----+-----+
                              |
                              | query/push
                              v
+----------+           +----------+           +----------+
| Node A   |<--------->| Node B   |<--------->| Node C   |
+----+-----+ gossip    +----+-----+ gossip    +----+-----+
     |                      |                      |
     | gossip               | gossip               | gossip
     v                      v                      v
+----------+           +----------+           +----------+
| Node D   |<--------->| Node E   |<--------->| Node F   |
+----------+           +----------+           +----------+
```

Properties:

- no root node
- no leader
- no quorum coordinator
- no partition oracle
- no global wall clock
- correctness depends only on local observed causal closure and RS sufficiency

## Security and Fault Handling

| Threat | Required handling |
| --- | --- |
| Malformed packet | Reject before storage. |
| Duplicate packet | Idempotent ignore. |
| Packet loss | Gossip eventually repairs if peers retain fragments. |
| Conflicting symbols | Store as distinct fragments; do not overwrite. |
| Forged codeword id | Use authenticated envelopes when adversarial peers are possible. |
| Version-vector tampering | Requires signatures or authenticated causal authority if hostile writers exist. |
| Byzantine RS symbols | Detect by decode failure or authenticated symbol commitments. |
| Flooding | Rate limit, peer scoring, storage quotas. |
| Storage exhaustion | Retention policy may evict, but eviction is outside consistency semantics. |

Integrity hashes detect accidental corruption. They do not provide Byzantine
authenticity by themselves. Public deployments should add signatures or an
authenticated transport envelope when peers are not trusted.

## Implementation Checklist

- Explicit packet encode/decode for every field.
- Version-vector parser, comparator, digest, and merge.
- Fragment hash and symbol hash.
- Append-only fragment store keyed by `(cw, vv_digest, i, symbol_hash)`.
- Observed DAG index per codeword.
- Inventory/request/response gossip loop over UDP.
- Causal closure checker over the local DAG.
- RS(k,n) decode adapter.
- Candidate store keyed by `(cw, candidate_hash)`.
- Client query API that returns candidate sets, not a single value.
- Optional application policy module for selection/materialization.
- Retention policy that is clearly outside the consistency semantics.
- Authentication/signature layer for hostile networks.

## Non-Goals

- Consensus.
- Leader election.
- Global convergence to one value.
- Wall-clock ordering.
- Epoch windows.
- Interval overlap reconstruction.
- Canonical "latest" semantics.
- Semantic overwrite.

## Final Invariant

For each codeword `cw`, a node's valid knowledge is:

```text
the inclusion-monotone set of all RS-sufficient reconstruction candidates
derivable from causally closed subsets of the locally observed fragment DAG
```

New observations may expand this set. They never replace it.

