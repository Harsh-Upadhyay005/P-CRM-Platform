-- Add missing CITIZEN role enum value for role seeding/auth flows.
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'CITIZEN';
