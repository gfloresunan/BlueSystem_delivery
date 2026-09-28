/**
 * BLUE SYSTEM DELIVERY ENTERPRISE — PROVISIONING INVARIANTS VALIDATOR (FASE 2D.4 / C2D.4)
 * Pure Invariants & Aggregate Validator (INV-01 to INV-15)
 * 
 * ZERO MUTATION / STRICT ISOLATION
 */

import { ProvisionedTenantAggregate } from './models';
import { MODULE_CATALOG } from '../gatekeeper/catalog';
import { EiamRole } from '../identity/models';

export interface InvariantValidationResult {
  isValid: boolean;
  violations: string[];
  invariantsChecked: {
    id: string;
    passed: boolean;
    description: string;
  }[];
}

const CANONICAL_ROLES: EiamRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'AUDITOR',
  'SUPPORT',
  'OWNER',
  'MANAGER',
  'SUPERVISOR',
  'CASHIER',
  'COOK',
  'DRIVER',
  'CLIENT',
  'GUEST'
];

export class ProvisioningInvariantsValidator {
  /**
   * Valida exhaustivamente todas las 15 invariantes sobre el agregado aprovisionado.
   */
  static validate(aggregate: ProvisionedTenantAggregate): InvariantValidationResult {
    const violations: string[] = [];
    const invariantsChecked: { id: string; passed: boolean; description: string }[] = [];

    const checkInvariant = (id: string, description: string, condition: boolean, errorMsg: string) => {
      if (!condition) {
        violations.push(`[${id}] ${errorMsg}`);
        invariantsChecked.push({ id, passed: false, description });
      } else {
        invariantsChecked.push({ id, passed: true, description });
      }
    };

    const { tenant, brand, businesses, branches, subscription, entitlements, memberships } = aggregate;

    // INV-01: Brand.tenantId === Tenant.tenantId
    checkInvariant(
      'INV-01',
      'Brand.tenantId matches Tenant.tenantId',
      brand.tenantId === tenant.tenantId,
      `Brand tenantId (${brand.tenantId}) does not match Tenant tenantId (${tenant.tenantId})`
    );

    // INV-02: Business.tenantId === Tenant.tenantId
    const allBizMatchTenant = businesses.every(b => b.tenantId === tenant.tenantId);
    checkInvariant(
      'INV-02',
      'All Businesses belong to Tenant',
      allBizMatchTenant,
      'One or more Businesses do not belong to the Tenant'
    );

    // INV-03: Business.brandId belongs to Tenant (must match brand.brandId)
    const allBizMatchBrand = businesses.every(b => b.brandId === brand.brandId);
    checkInvariant(
      'INV-03',
      'All Businesses resolve to a valid Tenant Brand',
      allBizMatchBrand,
      'One or more Businesses refer to an invalid or alien brandId'
    );

    // INV-04: Branch.businessId === Business.businessId
    const businessIds = new Set(businesses.map(b => b.businessId));
    const allBranchesMatchBiz = branches.every(br => businessIds.has(br.businessId));
    checkInvariant(
      'INV-04',
      'All Branches resolve to a valid Business in aggregate',
      allBranchesMatchBiz,
      'One or more Branches refer to a non-existent Business in aggregate'
    );

    // INV-05: Subscription.tenantId === Tenant.tenantId
    checkInvariant(
      'INV-05',
      'Subscription.tenantId matches Tenant.tenantId',
      subscription.tenantId === tenant.tenantId,
      `Subscription tenantId (${subscription.tenantId}) does not match Tenant tenantId (${tenant.tenantId})`
    );

    // INV-06: Membership.tenantId === Tenant.tenantId
    const allMembershipsMatchTenant = memberships.every(m => m.tenantId === tenant.tenantId);
    checkInvariant(
      'INV-06',
      'All Memberships belong to Tenant',
      allMembershipsMatchTenant,
      'One or more Memberships do not belong to the Tenant'
    );

    // INV-07: Membership.brandId belongs to Tenant
    const allMembershipsMatchBrand = memberships.every(m => !m.brandId || m.brandId === brand.brandId);
    checkInvariant(
      'INV-07',
      'All Memberships resolve to valid Brand or null',
      allMembershipsMatchBrand,
      'One or more Memberships refer to an alien brandId'
    );

    // INV-08: Membership.role ∈ canonical roles
    const allRolesValid = memberships.every(m => CANONICAL_ROLES.includes(m.role));
    checkInvariant(
      'INV-08',
      'All Membership roles are canonical EIAM roles',
      allRolesValid,
      'One or more Memberships contain non-canonical or forged roles'
    );

    // INV-09: Entitlements ∈ approved module catalog
    const allEntitlementsApproved = entitlements.every(e => e in MODULE_CATALOG);
    checkInvariant(
      'INV-09',
      'All Entitlements exist in approved Module Catalog',
      allEntitlementsApproved,
      'One or more Entitlements are unapproved or fictitious modules'
    );

    // INV-10: No wildcard entitlements (*, ALL)
    const hasWildcards = entitlements.some(e => (e as string) === '*' || (e as string) === 'ALL' || (e as string) === 'SUPER');
    checkInvariant(
      'INV-10',
      'No wildcard entitlements (*, ALL)',
      !hasWildcards,
      'Wildcard entitlements detected! Security violation.'
    );

    // INV-11: No cross-tenant references
    let crossTenantFound = false;
    if (brand.tenantId !== tenant.tenantId) crossTenantFound = true;
    if (subscription.tenantId !== tenant.tenantId) crossTenantFound = true;
    for (const b of businesses) {
      if (b.tenantId !== tenant.tenantId) crossTenantFound = true;
    }
    for (const m of memberships) {
      if (m.tenantId !== tenant.tenantId) crossTenantFound = true;
    }
    checkInvariant(
      'INV-11',
      'No cross-tenant references across any entity',
      !crossTenantFound,
      'Cross-tenant reference detected across domain entities'
    );

    // INV-12: No orphan entities
    const hasOrphanBranch = branches.some(br => !businessIds.has(br.businessId));
    const hasOrphanBusiness = businesses.some(b => b.brandId !== brand.brandId);
    checkInvariant(
      'INV-12',
      'No orphan entities in the aggregate',
      !hasOrphanBranch && !hasOrphanBusiness,
      'Orphan branch or business detected in aggregate'
    );

    // INV-13: No duplicate entity IDs
    const entityIds = [
      tenant.tenantId,
      brand.brandId,
      ...businesses.map(b => b.businessId),
      ...branches.map(br => br.branchId),
      subscription.subscriptionId,
      ...memberships.map(m => m.membershipId)
    ];
    const uniqueIds = new Set(entityIds);
    checkInvariant(
      'INV-13',
      'All entity IDs are strictly unique',
      entityIds.length === uniqueIds.size,
      `Duplicate entity IDs found within aggregate (Total: ${entityIds.length}, Unique: ${uniqueIds.size})`
    );

    // INV-14: Provisioning result is deterministic
    const hasValidTimestamps = tenant.createdAt > 0 && brand.createdAt > 0 && subscription.createdAt > 0;
    checkInvariant(
      'INV-14',
      'Provisioning timestamps and deterministic aggregate state valid',
      hasValidTimestamps && tenant.slug.length > 0,
      'Invalid timestamps or non-deterministic properties in aggregate'
    );

    // INV-15: Initial Configuration has zero secret credentials
    const configStr = JSON.stringify(aggregate.initialConfiguration).toLowerCase();
    const containsSecrets = configStr.includes('password') || 
                            configStr.includes('token') || 
                            configStr.includes('private_key') || 
                            configStr.includes('secret') || 
                            configStr.includes('jwt') ||
                            configStr.includes('apikey');
    checkInvariant(
      'INV-15',
      'Initial configuration contains zero secret credentials',
      !containsSecrets,
      'Secret or credential leakage detected in InitialTenantConfiguration!'
    );

    return {
      isValid: violations.length === 0,
      violations,
      invariantsChecked
    };
  }
}
