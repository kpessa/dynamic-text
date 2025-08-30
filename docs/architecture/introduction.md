# Introduction

This document outlines the complete fullstack architecture for the **TPN Dynamic Text Editor**, including both frontend implementation and backend services integration. It serves as the single source of truth for AI-driven development, ensuring consistency across your restoration efforts and future enhancements.

This unified approach combines what would traditionally be separate backend and frontend architecture documents, streamlining the development process for your modern fullstack application where these concerns are increasingly intertwined.

## Starter Template or Existing Project

**Status: Existing Project - Post-Refactoring Restoration**

This is an existing brownfield project that underwent a major refactoring from a monolithic structure to a component-based architecture. The current implementation uses:
- No starter template (custom-built from scratch)
- Mixed component patterns (legacy + Skeleton UI v3)
- Established Firebase integration
- Existing test infrastructure with Playwright and Vitest

Key constraints from existing codebase:
- Must maintain backward compatibility with existing Firebase data structures
- Must preserve the JSON export format for compatibility with downstream systems
- Must work within the secure Web Worker execution model already implemented
- Must reconcile dual component systems (legacy vs Skeleton UI)

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-01-30 | 2.0 | Fullstack architecture for restoration | Winston, Architect |
| 2025-01-29 | 1.1 | Updated for restoration epic | Winston, Architect |
| 2025-01-29 | 1.0 | Initial brownfield analysis | John, PM |
