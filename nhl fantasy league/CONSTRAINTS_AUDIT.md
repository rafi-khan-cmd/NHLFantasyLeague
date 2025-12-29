# NHL Fantasy League Constraints Audit

## ✅ IMPLEMENTED CONSTRAINTS

### 1. Roster Size Constraints
- **Min Roster Size**: 16 players (enforced after roster announcement)
- **Max Roster Size**: 20 players (always enforced)
- **Position Minimums**: 9F, 6D, 2G (enforced after roster announcement)
- **Position Maximums**: Calculated dynamically to ensure minimums can be met

### 2. Active Lineup Requirements
- **Active Lineup**: Exactly 9F, 6D, 2G active (17 total)
- **Enforcement**: Checked when updating lineup status after roster announcement
- **Status**: ✅ Implemented in `updateLineupStatus` method

### 3. Salary Cap
- **Cap Amount**: $95.5M per team (2025-26 season)
- **Enforcement**: Checked when adding players
- **Status**: ✅ Fully enforced

### 4. Weekly Transaction Limits
- **Limit**: Max 3 adds/drops per week (combined, not separate)
- **Enforcement**: Only after roster announcement
- **Tracking**: Uses `RosterTransaction` entity with `weekStartDate`
- **Status**: ✅ Implemented in `checkWeeklyTransactionLimit` method

### 5. IR (Injured Reserve) Spots
- **IR Spots**: 2 spots (configurable in league settings)
- **Enforcement**: Checked when moving player to IR
- **Status**: ✅ Implemented in `updateLineupStatus` method

### 6. Waiver Wire System
- **Waiver Period**: 2 days
- **Auto-add**: TODO - Not automatically triggered when player is dropped
- **Status**: ⚠️ System exists but not fully integrated

### 7. Trade System
- **Trade Proposals**: Can propose trades
- **Trade Acceptance/Rejection**: Fully functional
- **Trade Expiration**: 2 days
- **Status**: ✅ Fully implemented

### 8. Roster Announcement
- **Purpose**: Locks roster, enables transaction limits
- **Requirements**: Must have 16+ players, 9F, 6D, 2G before announcing
- **Status**: ✅ Fully implemented

### 9. One Roster Per User
- **Constraint**: Database unique constraint on `ownerId`
- **Status**: ✅ Enforced at database level

## ❌ MISSING OR NOT FULLY ENFORCED

### 1. Goalie Start Limits
- **Setting**: Max 4 goalie starts per week (in league settings)
- **Tracking**: ❌ Not tracked
- **Enforcement**: ❌ Not enforced
- **Status**: ⚠️ Setting exists but no implementation

### 2. Transaction Deadline Enforcement
- **Setting**: Sunday deadline (in league settings)
- **Enforcement**: ❌ Not enforced
- **Status**: ⚠️ Setting exists but no validation

### 3. Lineup Deadline Enforcement
- **Setting**: Game time deadline (in league settings)
- **Enforcement**: ❌ Not enforced
- **Status**: ⚠️ Setting exists but no validation

### 4. Waiver Wire Auto-Integration
- **Current**: Waiver system exists but players aren't auto-added to waivers when dropped
- **Status**: ⚠️ TODO comment in code: "Add player to waivers when dropped"

## 📋 SUMMARY

**Fully Implemented**: 9/13 constraints
**Partially Implemented**: 4/13 constraints

### Priority Fixes Needed:
1. **Goalie Start Tracking**: Track and enforce max 4 goalie starts per week
2. **Transaction Deadline**: Enforce Sunday deadline for adds/drops
3. **Lineup Deadline**: Enforce game-time deadline for lineup changes
4. **Waiver Auto-Add**: Automatically add dropped players to waivers

