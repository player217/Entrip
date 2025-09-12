import { Prisma } from '@prisma/client';

/**
 * Type guard to check if a JsonValue is a JsonObject
 */
export function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if a JsonValue is a JsonArray
 */
export function isJsonArray(value: Prisma.JsonValue): value is Prisma.JsonArray {
  return Array.isArray(value);
}

/**
 * Safely convert any value to Prisma.InputJsonValue
 */
export function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Convert an array to Prisma.JsonArray safely
 */
export function toJsonArray<T extends Record<string, unknown>>(arr: T[]): Prisma.JsonArray {
  return JSON.parse(JSON.stringify(arr)) as Prisma.JsonArray;
}

/**
 * Type guard with property check
 */
export function hasProperty<K extends string>(
  value: Prisma.JsonValue,
  key: K
): value is Prisma.JsonObject & Record<K, Prisma.JsonValue> {
  return isJsonObject(value) && key in value;
}

/**
 * Safe property access helper
 */
export function getJsonProperty(
  value: Prisma.JsonValue,
  key: string
): Prisma.JsonValue | undefined {
  if (isJsonObject(value)) {
    return value[key];
  }
  return undefined;
}