# ADR 0003: Transparent, versioned scoring policy

- Status: Accepted
- Date: 2026-08-10

## Context

A single rating is useful for triage but can hide subjective weighting and can change independently from financial arithmetic.

## Decision

Keep the score rubric in configuration, expose its component breakdown, apply explicit regulatory caps, and version the score policy independently before any weight or threshold changes. Saved/comparable results must identify the policy version used.

## Consequences

The rating remains explainable and reproducible. A policy change requires calibration evidence, boundary tests, migration/display behavior for older saves, and release notes; it must not rewrite historical interpretations silently.
