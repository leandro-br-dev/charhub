/**
 * System Configuration Seed Script
 *
 * Populates the database with default system configuration parameters.
 * Uses upsert pattern to avoid overwriting existing database values.
 *
 * Format: type:<string|number|boolean|enum>|min:<n>|max:<n>|options:<a,b,c>|<human description>
 */
/**
 * Seed system configuration parameters
 * Uses upsert with empty update to preserve existing database values
 */
export declare function seedSystemConfiguration(options?: {
    verbose?: boolean;
    dryRun?: boolean;
}): Promise<{
    created: number;
    skipped: number;
    errors: string[];
}>;
//# sourceMappingURL=systemConfiguration.d.ts.map