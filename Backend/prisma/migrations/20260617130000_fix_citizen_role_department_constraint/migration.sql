-- Fix invalid data: CITIZEN role should NOT have department or tenant assignments
-- This migration cleans up existing inconsistent data

-- Step 1: Identify and log affected users
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM "User" u
    INNER JOIN "Role" r ON u."roleId" = r.id
    WHERE r.type = 'CITIZEN'
    AND (u."departmentId" IS NOT NULL OR u."tenantId" IS NOT NULL);
    
    RAISE NOTICE 'Found % CITIZEN users with invalid department/tenant assignments', affected_count;
END $$;

-- Step 2: Remove department and tenant assignments from CITIZEN users
UPDATE "User" u
SET 
    "departmentId" = NULL,
    "tenantId" = NULL
FROM "Role" r
WHERE u."roleId" = r.id
AND r.type = 'CITIZEN'
AND (u."departmentId" IS NOT NULL OR u."tenantId" IS NOT NULL);

-- Step 3: Add check constraint to prevent CITIZEN from having departments
-- Note: PostgreSQL doesn't support cross-table CHECK constraints directly,
-- so we'll add this as application-level validation (already done in code)
-- But we can add a comment for documentation
COMMENT ON COLUMN "User"."departmentId" IS 'Department assignment. Must be NULL for CITIZEN role (enforced in application layer).';
COMMENT ON COLUMN "User"."tenantId" IS 'Tenant assignment. Must be NULL for CITIZEN role (enforced in application layer).';

-- Step 4: Verify the fix
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM "User" u
    INNER JOIN "Role" r ON u."roleId" = r.id
    WHERE r.type = 'CITIZEN'
    AND (u."departmentId" IS NOT NULL OR u."tenantId" IS NOT NULL);
    
    IF remaining_count > 0 THEN
        RAISE EXCEPTION 'Data inconsistency: % CITIZEN users still have department/tenant assignments', remaining_count;
    ELSE
        RAISE NOTICE 'Success: All CITIZEN users now have NULL department and tenant';
    END IF;
END $$;
