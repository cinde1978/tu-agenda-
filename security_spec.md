# Security Specification: Tu Agenda Lista

## 1. Data Invariants
- Each business belongs to exactly one authenticated owner (`ownerId == request.auth.uid`).
- Only the authenticated owner of the business can read, create, update, or delete records in its subcollections (`clients`, `services`, `staff`, `appointments`, `cashMovements`).
- No anonymous or unauthenticated users can access or tamper with any business data.
- Path IDs must be valid identifiers to prevent path traversal or injection.

## 2. Dirty Dozen Payloads (Negative Tests)
1. **Unauthenticated Read**: Attempting to read `/businesses/{businessId}` without auth credentials -> `PERMISSION_DENIED`.
2. **Cross-Tenant Business Read**: User B attempting to read `/businesses/{businessId}` where `ownerId` is User A -> `PERMISSION_DENIED`.
3. **Cross-Tenant Business Update**: User B attempting to edit business profile belonging to User A -> `PERMISSION_DENIED`.
4. **Owner Spoofing on Create**: User B trying to create a business with `ownerId: "user_a"` -> `PERMISSION_DENIED`.
5. **Cross-Tenant Appointment Creation**: User B writing an appointment into User A's `/businesses/{businessId}/appointments/{appointmentId}` subcollection -> `PERMISSION_DENIED`.
6. **Cross-Tenant Appointment List Query**: User B querying User A's appointments -> `PERMISSION_DENIED`.
7. **Cross-Tenant Client PII Snooping**: User B attempting to fetch phone numbers and emails from User A's client list -> `PERMISSION_DENIED`.
8. **Tampering Cash Movements**: User B posting fake expense or income movements into User A's cash register -> `PERMISSION_DENIED`.
9. **Malformed Document ID Attack**: An attacker sending an invalid 2KB path variable to `/businesses/{evilId}` -> `PERMISSION_DENIED`.
10. **Orphaned Subcollection Write**: Attempting to create an appointment under a non-existent `businessId` -> `PERMISSION_DENIED`.
11. **Immutability Breach**: An owner trying to modify the `ownerId` of an existing business -> `PERMISSION_DENIED`.
12. **Public Wildcard Dump**: Attempting to perform collection group queries or root collection dumps without ownership -> `PERMISSION_DENIED`.
