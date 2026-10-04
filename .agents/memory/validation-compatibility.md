---
name: Validation namespace compatibility
description: Type inference and runtime error handling must use the same Zod namespace as the schema.
---

Match inferred types and caught validation errors to the namespace that created each schema. The root Zod entry point and zod/v4 are not interchangeable.

**Why:** The generated OpenAPI validators and Drizzle validation can coexist using different namespaces. Inferring a generated validator with the other namespace yielded unknown input types; catching the other namespace's ZodError would also miss actual request-validation errors.

**How to apply:** Inspect the generated validator's import before choosing inference/error imports. Preserve the separate database validator convention rather than changing every schema to force a single namespace.