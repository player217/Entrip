import { Prisma } from '@prisma/client';

/**
 * Type guard to check if a JsonValue is a JsonObject
 */
export function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard to check if a JsonValue is a JsonArray (array of JsonValue)
 */
export function isJsonArray(value: Prisma.JsonValue): value is Prisma.JsonValue[] {
  return Array.isArray(value);
}

/**
 * Safely convert any value to Prisma.JsonValue for input
 */
export function toInputJsonValue(value: unknown): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Convert an array to JsonValue array safely
 */
export function toJsonArray<T extends Record<string, unknown>>(arr: T[]): Prisma.JsonValue[] {
  return JSON.parse(JSON.stringify(arr)) as Prisma.JsonValue[];
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