# Ladder domain

## Purpose and context

The ladder as data: a question, its levels, and each level's panels, where a panel is a typed SLayer query and may
refine a panel of the previous level. Also the invariants every ladder obeys. Everything else in the backend
depends on this element.

## Building blocks

See the `python` view in `views.c4`.

## Principles

1. The ladder domain depends on no other element of the system. [enforced: arch_check:model-truth]
2. The ladder domain does no I/O: no network, database, filesystem or LLM calls. [review]
3. Each level keeps every panel of the level before it, or refines it with a child panel. [enforced: test:tests/test_core_invariants.py]
4. The values of a split panel sum to the value of the panel it refines, within rounding. [target: #3]

## Rationale

A pure, dependency-free domain lets the agent's tool schema, the API's response and the web app's types derive from
one definition, and lets the invariants run in tests and in `submit_level` validation alike.
