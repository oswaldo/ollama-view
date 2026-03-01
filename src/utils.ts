/**
 * Utility to enforce exhaustiveness checks in switch statements at compile time.
 * If you see a compilation error here, it means you missed a case in a switch
 * statement handling a discriminated union.
 */
export function assertNever(x: never): never {
    throw new Error(`Unexpected object: ${x}`);
}
