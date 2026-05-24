RFC: Monotone Causal Reed–Solomon Gossip Storage Protocol (MCRSGSP)

Category: Experimental / Distributed Storage Protocol
Status: Draft Specification
Version: 0.1.0
Date: 2026-05-18

Abstract

This document specifies the Monotone Causal Reed–Solomon Gossip Storage Protocol (MCRSGSP), a coordination-free distributed storage protocol based on four core principles:

Reed–Solomon erasure coding for recoverability

Causally ordered fragment propagation over an asynchronous gossip network

Monotone set semantics with no destructive updates

Reconstruction from causally closed RS-sufficient fragment subsets

Unlike traditional replicated storage systems, MCRSGSP does not define a canonical global state. Instead, system state is represented as the monotone closure of all causally admissible Reed–Solomon reconstructible candidates observable within the network.

The protocol is designed for:

asynchronous distributed systems

unreliable or lossy transport layers

gossip-based dissemination

coordination-free operation

eventual propagation without global consensus

erasure-coded recoverability

This document defines:

node roles

transport semantics

packet formats

fragment identity rules

version vector semantics

causal admissibility rules

reconstruction requirements

gossip convergence behavior

anti-entropy repair behavior

security and deployment considerations

Table of Contents

Terminology

System Model

Design Principles

Architectural Overview

Node Roles

Data Model

Fragment Semantics

Reed–Solomon Encoding

Version Vector Semantics

Causal Closure Rules

Reconstruction Semantics

Network Architecture

Gossip Protocol

Anti-Entropy Repair

Packet Formats

Transport Layer

Storage Semantics

Candidate Reconstruction Lattice

Security Considerations

Failure Semantics

Deployment Architecture

Example Message Flow

Reference Algorithms

Operational Guidance

Future Extensions

Conclusion

1. Terminology

TermMeaningCodewordA logical object encoded via Reed–SolomonFragmentA single RS symbol associated with a codewordCandidateA valid RS reconstruction derivable from observed fragmentsGossip DAGPartial order graph induced by fragment causalityClosureMonotone expansion of derivable candidatesRS(k,n)Reed–Solomon code requiring k symbols from n totalVersion VectorCausal metadata associated with fragment lineageCausal ClosureDownward-closed fragment subsetRS-SufficientA fragment set from which RS decode is definedMonotonicityNew observations only expand derivable knowledgeNodeA participating gossip storage peerAnti-EntropyRepair synchronization between peersFrontierMaximal observed causal state at a node 

2. System Model

The protocol assumes:

asynchronous communication

unreliable transport

message loss

packet reordering

node churn

no synchronized clocks

no global coordinator

partial observations at all nodes

The protocol does NOT assume:

total ordering

consensus

canonical global state

overwrite semantics

leader election

quorum arbitration

Nodes exchange fragments through epidemic gossip.

Fragments form a causally ordered partial order DAG.

Recoverability is determined through Reed–Solomon feasibility constraints.

Correctness is defined as monotone growth of derivable reconstruction candidates.

3. Design Principles

3.1 Monotonicity

Previously derivable candidates MUST NOT be invalidated.

New observations MAY expand the candidate set.

Nodes MUST NOT perform destructive overwrite operations.

3.2 Coordination Freedom

The protocol MUST operate without:

global locks

distributed consensus

canonical state arbitration

centralized reconstruction authority

3.3 Causal Admissibility

Fragments MUST only be reconstructed from causally closed fragment subsets.

3.4 Algebraic Recoverability

Recoverability MUST be defined solely through RS(k,n) feasibility.

3.5 Local Checkability

All reconstruction decisions MUST be computable from locally observed state.

4. Architectural Overview

4.1 High-Level Architecture

+---------------------------------------------------+ | Client Applications | +---------------------------------------------------+ | v +---------------------------------------------------+ | Candidate Materialization Layer | | (optional application-specific projection) | +---------------------------------------------------+ | v +---------------------------------------------------+ | Monotone Reconstruction Engine | | RS decode + causal admissibility filtering | +---------------------------------------------------+ | v +---------------------------------------------------+ | Gossip Fragment Exchange | | anti-entropy + epidemic dissemination | +---------------------------------------------------+ | v +---------------------------------------------------+ | UDP / QUIC Transport Layer | +---------------------------------------------------+ 

4.2 Node Topology

+---------+ | Node A | +----+----+ | +---------+---------+ | | +----+----+ +----+----+ | Node B | | Node C | +----+----+ +----+----+ | | +---------+---------+ | +----+----+ | Node D | +---------+ 

Each node:

stores fragments

propagates fragments

maintains causal metadata

computes local reconstruction candidates

performs anti-entropy repair

No node is authoritative.

5. Node Roles

All nodes are symmetric.

A node MAY perform:

CapabilityRequiredFragment storageYESGossip propagationYESRS reconstructionOPTIONALAnti-entropy repairYESCandidate materializationOPTIONALClient servingOPTIONAL 

No privileged coordinator role exists.

6. Data Model

6.1 Logical Structure

Each fragment is represented as:

Fragment := { codeword_id, version_vector, fragment_index, total_fragments, required_fragments, payload, checksum, signature? } 

6.2 Codeword Identity

codeword_id MUST uniquely identify a logical RS object.

Recommended formats:

SHA-256 digest

UUIDv7

content-addressed identifier

Example:

codeword_id = SHA256(original_payload) 

7. Fragment Semantics

7.1 Fragment Identity

A fragment is uniquely identified by:

(codeword_id, version_vector, fragment_index) 

7.2 Fragment Immutability

Fragments MUST be immutable after generation.

Mutation requires creation of a new causal version.

7.3 Fragment Independence

Fragments MAY propagate independently.

Arrival ordering MUST NOT affect correctness.

8. Reed–Solomon Encoding

8.1 Encoding Parameters

The protocol defines:

RS(k,n) 

Where:

SymbolMeaningkminimum required fragmentsntotal generated fragments 

Constraint:

1 <= k <= n <= 255 

8.2 Symbol Encoding

Payloads MUST be partitioned into RS symbols.

Encoding SHOULD use GF(2^8).

8.3 Decoder Requirements

Decoder MUST:

preserve fragment index association

reject malformed symbol sets

reject inconsistent causal subsets

Recommended libraries:

liberasurecode

ISA-L

reedsolo

zfec

9. Version Vector Semantics

9.1 Purpose

Version vectors define causal ordering.

They DO NOT define wall-clock time.

9.2 Representation

Example:

{ "nodeA": 4, "nodeB": 7, "nodeC": 2 } 

9.3 Ordering Relation

For vectors V and W:

V <= W iff forall i: V[i] <= W[i] 

9.4 Concurrency

Vectors are concurrent if:

!(V <= W) && !(W <= V) 

Concurrent branches MAY coexist.

10. Causal Closure Rules

10.1 Downward Closure

A fragment set S is causally closed iff:

if f ∈ S and ancestor(f') exists in local view, then f' ∈ S 

10.2 Locality

Closure MUST be evaluated only over locally observed state.

Nodes MUST NOT assume global visibility.

10.3 Monotone Growth

Observed causal state MAY grow.

Previously valid candidates MUST remain derivable.

11. Reconstruction Semantics

11.1 Reconstruction Predicate

A candidate reconstruction is valid iff:

all fragments share identical codeword_id

fragment subset is causally closed

|S| >= k

RS_decode(S) succeeds

11.2 Candidate Set Semantics

System state is defined as:

Candidates := all valid reconstructions derivable from observed fragments 

11.3 No Canonical Reconstruction

The protocol does NOT define:

preferred reconstruction

latest reconstruction

authoritative reconstruction

These are application-layer policies.

12. Network Architecture

12.1 Transport

Recommended transports:

TransportStatusUDPREQUIREDQUICRECOMMENDEDTCPOPTIONAL 

12.2 Gossip Topology

Recommended overlays:

random peer sampling

partial mesh

Kademlia-like routing

proximity-aware routing

12.3 Addressing

Nodes MAY expose:

IPv4 endpoint IPv6 endpoint node identifier public key 

Example:

{ "node_id": "node-3", "ipv4": "192.168.1.10:9000", "ipv6": "[2001:db8::1]:9000" } 

13. Gossip Protocol

13.1 Dissemination

Nodes periodically gossip:

fragment inventories

version vector frontiers

anti-entropy summaries

13.2 Push/Pull Exchange

Recommended exchange:

1. Node A advertises frontier 2. Node B computes missing fragments 3. Node B requests missing fragments 4. Node A transmits fragments 

13.3 Epidemic Propagation

Nodes SHOULD randomly select peers.

Fanout SHOULD be configurable.

Recommended default:

fanout = sqrt(network_size) 

14. Anti-Entropy Repair

14.1 Purpose

Repair ensures eventual fragment dissemination.

14.2 Repair Trigger

Repair MAY trigger when:

fragment loss detected

peer frontier divergence detected

node rejoins network

periodic maintenance cycle

14.3 Repair Safety

Repair MUST preserve monotonicity.

Repair MUST NOT delete causally valid fragments.

15. Packet Formats

15.1 Common Header

0 1 2 3 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 +---------------------------------------------------------------+ | Version | MsgType | Flags | Header Length | +---------------------------------------------------------------+ | Payload Length | +---------------------------------------------------------------+ | Message ID | +---------------------------------------------------------------+ 

15.2 Fragment Message

+---------------------------------------------------------------+ | Codeword ID (256 bits) | +---------------------------------------------------------------+ | Fragment Index (16 bits) | +---------------------------------------------------------------+ | RS(k,n) Parameters | +---------------------------------------------------------------+ | Version Vector Length | +---------------------------------------------------------------+ | Version Vector Bytes | +---------------------------------------------------------------+ | Payload Length | +---------------------------------------------------------------+ | RS Symbol Payload | +---------------------------------------------------------------+ | Checksum | +---------------------------------------------------------------+ 

15.3 Gossip Summary Message

{ "type": "summary", "frontiers": [...], "known_codewords": [...], "inventory_hash": "..." } 

15.4 Fragment Request Message

{ "type": "request", "codeword_id": "...", "missing_fragments": [0, 1, 5] } 

16. Transport Layer

16.1 Reliability Model

Transport MAY:

lose packets

duplicate packets

reorder packets

delay packets

Correctness MUST NOT depend on reliable ordering.

16.2 MTU Guidance

Recommended fragment size:

<= 1200 bytes 

for QUIC/UDP compatibility.

16.3 Congestion Control

QUIC congestion control is RECOMMENDED.

UDP implementations SHOULD implement:

token bucket rate limiting

adaptive backoff

peer throttling

17. Storage Semantics

17.1 Local Storage

Nodes SHOULD maintain:

storage[codeword_id][version_vector][fragment_index] 

17.2 Eviction

Eviction policies are implementation-specific.

Recommended strategies:

LFU

LRU

age decay

entropy-aware retention

17.3 Persistence

Nodes MAY:

persist fragments to disk

use memory-only operation

use hybrid storage tiers

18. Candidate Reconstruction Lattice

18.1 Lattice Semantics

Candidate sets form a monotone join-semilattice.

Join operation:

Join(A,B) = A ∪ B 

18.2 No Destructive Operations

The protocol defines no delete operation over valid candidates.

18.3 Application Projection

Applications MAY define:

preferred candidate selection

ranking policies

materialized views

canonical projections

These are explicitly outside protocol semantics.

19. Security Considerations

19.1 Fragment Authentication

Fragments SHOULD be signed.

Recommended:

Ed25519

BLS signatures

19.2 Integrity Validation

Fragments MUST include checksums.

Recommended:

SHA-256

BLAKE3

19.3 Byzantine Behavior

Nodes MAY:

inject invalid fragments

replay stale fragments

flood gossip

Mitigations:

fragment signatures

rate limiting

peer reputation

proof-of-storage extensions

19.4 Encryption

Payload encryption MAY occur before RS encoding.

Recommended:

Encrypt(payload) -> RS encode(ciphertext) 

20. Failure Semantics

20.1 Node Failure

Nodes MAY fail permanently.

Recoverability depends only on RS sufficiency.

20.2 Partition Tolerance

Partitions MAY evolve independently.

Reconciliation occurs through gossip convergence.

20.3 Churn

Node membership changes MUST NOT invalidate correctness.

21. Deployment Architecture

21.1 Small Cluster

+---------+ +---------+ +---------+ | Node A |-----| Node B |-----| Node C | +---------+ +---------+ +---------+ 

21.2 Regional Mesh

Region 1 +-------------+ | A1 A2 A3 | +-------------+ | ========== WAN ========== | +-------------+ | B1 B2 B3 | +-------------+ Region 2 

21.3 Edge + Cloud Hybrid

+-------------+ | Edge Nodes | +------+------+ | v +-------------+ | Regional Hub| +------+------+ | v +-------------+ | Cloud Mesh | +-------------+ 

22. Example Message Flow

22.1 Write Flow

Client | | Encode RS(k,n) v Node A | | Gossip fragments +----> Node B +----> Node C +----> Node D 

22.2 Recovery Flow

Node E | | observes causally closed fragment subset v RS Decoder | | reconstruct candidate v Candidate Lattice 

23. Reference Algorithms

23.1 Gossip Merge

state = state union received_fragments 

23.2 Causal Closure Check

for fragment in subset: ensure all observed ancestors exist 

23.3 Reconstruction

if len(subset) >= k: RS_decode(subset) 

24. Operational Guidance

24.1 Recommended Parameters

ParameterRecommendedk8n12fanout4fragment size1024 bytesrepair interval30s 

24.2 Observability

Recommended metrics:

fragment propagation latency

gossip convergence rate

repair bandwidth

RS reconstruction success rate

candidate lattice growth

24.3 Scaling

Large deployments SHOULD:

shard codeword namespaces

use regional overlays

compress gossip summaries

batch anti-entropy exchanges

25. Future Extensions

Potential future work:

proof-of-storage integration

Byzantine fault tolerance

adaptive redundancy

topology-aware routing

coded computation

hardware acceleration

multicast gossip

CRDT integration

homomorphic fragment transforms

26. Conclusion

MCRSGSP defines a coordination-free distributed storage protocol where:

fragments propagate through asynchronous gossip

recoverability is constrained by Reed–Solomon feasibility

causal admissibility governs reconstruction

correctness is monotone and additive

no canonical global state is required

The protocol reduces distributed storage semantics to:

causal ordering

algebraic recoverability

monotone closure

All remaining behaviors, including canonicalization, materialization, preference selection, and application semantics, are explicitly layered above the protocol and are not part of core correctness.

This specification defines a minimal coordination-free erasure-coded storage substrate suitable for:

distributed object storage

edge storage meshes

decentralized archival systems

eventually consistent storage fabrics

anti-entropy synchronization systems

causally ordered information propagation networks

Appendix A — Reference Field Sizes

FieldSizecodeword_id256 bitsfragment_index16 bitsversion_vector_length16 bitschecksum256 bits 

Appendix B — Example Fragment JSON

{ "codeword_id": "3fd8...", "version_vector": { "nodeA": 4, "nodeB": 2 }, "fragment_index": 5, "required_fragments": 8, "total_fragments": 12, "payload": "base64:ABCD...", "checksum": "sha256:1234..." } 

Appendix C — Compliance Levels

Minimal Compliance

Requires:

UDP transport

RS(k,n)

gossip propagation

causal metadata

monotone candidate preservation

Full Compliance

Requires additionally:

anti-entropy repair

fragment authentication

persistence

observability metrics

adaptive gossip

End of RFC

I’ve generated a full RFC-style production protocol specification for the Monotone Causal Reed–Solomon Gossip Storage Protocol (MCRSGSP), including:

Formal protocol semantics

Node architecture

Gossip and anti-entropy behavior

Packet formats

RS encoding/decoding requirements

Version vector causality rules

Reconstruction semantics

Deployment topologies

Security considerations

Operational guidance

Reference algorithms

Compliance levels

It is structured as a deployable systems protocol document suitable for implementation work, architecture review, or publication as an experimental RFC draft.