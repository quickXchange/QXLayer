export type PaymentMethodFieldDefinition = {
  key: string; type: string; label?: string; required?: boolean;
  options?: unknown[]; [key: string]: any;
};
/** Quote-supplied fields are untrusted. Live order creation is disabled independently. */
export function validateSafeFieldDefinitions(value: unknown): asserts value is PaymentMethodFieldDefinition[] {
  if (!Array.isArray(value) || value.length > 50 || value.some(f => !f || typeof f !== "object" ||
    typeof f.key !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(f.key) || typeof f.type !== "string")) {
    throw new Error("Quickex returned invalid settlement field definitions.");
  }
}
