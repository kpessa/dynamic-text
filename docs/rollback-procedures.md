# Rollback Procedures for P0 Stories

## Overview

This document defines comprehensive rollback procedures for each P0 (Priority 0) story in the TPN Dynamic Text Editor restoration effort. These procedures ensure safe brownfield development with minimal user disruption.

## Rollback Strategy Framework

### General Principles
1. **Feature Flags First** - All changes wrapped in feature flags for instant rollback
2. **Data Versioning** - Maintain backward compatibility for all data structures
3. **Code Isolation** - New code paths separate from existing functionality
4. **Monitoring Triggers** - Automated rollback based on error thresholds
5. **Manual Override** - Always provide manual rollback capability

### Rollback Levels
- **Level 1: Feature Flag** - Instant disable via configuration (< 1 minute)
- **Level 2: Code Revert** - Git revert and redeploy (< 15 minutes)
- **Level 3: Data Migration** - Restore previous data structure (< 1 hour)
- **Level 4: Full Restore** - Complete system restore from backup (< 4 hours)

---

## Story 1: Stabilize Firebase Save/Load Functionality

### Risk Assessment
- **Risk Level:** HIGH
- **User Impact:** Critical - Data loss potential
- **Rollback Complexity:** Medium

### Implementation Safeguards

```typescript
// Feature flag configuration
const FEATURE_FLAGS = {
  useNewFirebaseSave: false,  // Toggle for new save logic
  useNewFirebaseLoad: false,  // Toggle for new load logic
  enableDualWrite: true,      // Write to both old and new structures
  enableSafeMode: true        // Extra validation before operations
};
```

### Rollback Procedures

#### Level 1: Feature Flag Rollback (Immediate)
1. **Detection Triggers:**
   - Save failure rate > 5% in 5-minute window
   - Load corruption detected (checksum mismatch)
   - User reports of missing data

2. **Rollback Steps:**
   ```bash
   # 1. Access Firebase Console or environment config
   firebase functions:config:set features.useNewFirebaseSave=false
   firebase functions:config:set features.useNewFirebaseLoad=false
   
   # 2. Force all active sessions to reload
   firebase database:push /system/forceReload --data '{"timestamp": "{{now}}"}'
   
   # 3. Verify rollback
   curl https://app-url/api/health/feature-status
   ```

3. **Validation:**
   - Confirm old save/load paths active
   - Test with known-good configuration
   - Monitor error rates return to baseline

#### Level 2: Code Revert (15 minutes)
1. **When Triggered:**
   - Feature flag rollback insufficient
   - Code causing crashes or infinite loops
   
2. **Rollback Steps:**
   ```bash
   # 1. Identify problem commit
   git log --oneline -10
   
   # 2. Create revert branch
   git checkout -b hotfix/revert-firebase-save
   git revert <commit-hash>
   
   # 3. Emergency deploy
   npm run test:critical  # Run only critical tests
   git push origin hotfix/revert-firebase-save
   npm run deploy:emergency
   
   # 4. Monitor deployment
   npm run monitor:deployment
   ```

#### Level 3: Data Migration Rollback (1 hour)
1. **When Triggered:**
   - New data structure incompatible
   - Widespread data corruption
   
2. **Data Backup Strategy:**
   ```javascript
   // Before any changes, backup existing data
   async function backupBeforeMigration() {
     const backup = {
       timestamp: Date.now(),
       version: 'pre-story-1',
       data: await firebase.firestore()
         .collection('configurations')
         .get()
     };
     
     await firebase.firestore()
       .collection('backups')
       .doc(`backup-${backup.timestamp}`)
       .set(backup);
   }
   ```

3. **Rollback Script:**
   ```javascript
   // scripts/rollback-firebase-data.js
   async function rollbackToBackup(backupId) {
     const backup = await getBackup(backupId);
     
     // Restore each configuration
     for (const doc of backup.data) {
       await firebase.firestore()
         .collection('configurations')
         .doc(doc.id)
         .set(doc.data, { merge: false });
     }
     
     // Verify restoration
     await validateDataIntegrity();
   }
   ```

### Monitoring & Alerts

```yaml
# monitoring/firebase-save-load.yaml
alerts:
  - name: firebase_save_failure_rate
    condition: rate(firebase_save_errors[5m]) > 0.05
    action: 
      - notify: on-call-engineer
      - auto-rollback: level-1
      
  - name: firebase_load_corruption
    condition: firebase_checksum_mismatch > 0
    action:
      - notify: team-urgent
      - disable: feature-flag
      
  - name: firebase_latency_spike
    condition: p95(firebase_save_duration) > 5000ms
    action:
      - notify: team-warning
      - evaluate: rollback-needed
```

---

## Story 2: Ensure Correct and Secure Dynamic Text Execution

### Risk Assessment
- **Risk Level:** CRITICAL
- **User Impact:** High - Security and functionality
- **Rollback Complexity:** Low

### Implementation Safeguards

```typescript
// Dual execution paths for safety
class CodeExecutionService {
  async execute(code: string, context: any) {
    if (FEATURE_FLAGS.useNewExecutor) {
      return this.executeNew(code, context);
    }
    return this.executeLegacy(code, context);
  }
  
  private async executeWithFallback(code: string, context: any) {
    try {
      const result = await this.executeNew(code, context);
      
      // Validate result sanity
      if (!this.isValidResult(result)) {
        throw new Error('Invalid execution result');
      }
      
      return result;
    } catch (error) {
      // Automatic fallback to legacy
      console.error('New executor failed, falling back', error);
      return this.executeLegacy(code, context);
    }
  }
}
```

### Rollback Procedures

#### Level 1: Feature Flag Rollback (Immediate)
1. **Detection Triggers:**
   - Security violation detected
   - Execution errors > 10% of attempts
   - Performance degradation > 200%

2. **Rollback Steps:**
   ```bash
   # 1. Disable new executor immediately
   echo "VITE_USE_NEW_EXECUTOR=false" >> .env.production
   
   # 2. Clear worker cache
   npm run clear:worker-cache
   
   # 3. Restart workers
   npm run restart:workers
   
   # 4. Verify old executor active
   npm run test:executor-version
   ```

#### Level 2: Worker Rollback (5 minutes)
1. **When Triggered:**
   - Worker crashes or hangs
   - Memory leaks detected
   
2. **Rollback Steps:**
   ```bash
   # 1. Restore previous worker version
   git checkout HEAD~1 -- public/workers/codeExecutor.js
   
   # 2. Rebuild worker bundle
   npm run build:worker
   
   # 3. Deploy worker only
   npm run deploy:worker-only
   
   # 4. Clear all worker instances
   npm run workers:terminate-all
   ```

### Validation Tests

```javascript
// tests/rollback-validation/executor.test.js
describe('Executor Rollback Validation', () => {
  test('Legacy executor still functional', async () => {
    const result = await executeLegacy('return me.getValue("test")', {
      test: 42
    });
    expect(result).toBe(42);
  });
  
  test('Security sandbox maintained', async () => {
    const malicious = 'process.exit(1)';
    await expect(executeLegacy(malicious)).rejects.toThrow();
  });
  
  test('Context isolation verified', async () => {
    const isolated = await executeLegacy('window.location', {});
    expect(isolated).toBeUndefined();
  });
});
```

---

## Story 3: Restore Real-Time Live Preview

### Risk Assessment
- **Risk Level:** MEDIUM
- **User Impact:** Moderate - UX degradation
- **Rollback Complexity:** Low

### Implementation Safeguards

```typescript
// Progressive enhancement approach
class PreviewService {
  private updateStrategy: 'realtime' | 'debounced' | 'manual' = 'debounced';
  
  async updatePreview(content: string) {
    // Start with safe debounced updates
    if (this.updateStrategy === 'realtime' && FEATURE_FLAGS.enableRealtimePreview) {
      return this.updateRealtime(content);
    } else if (this.updateStrategy === 'debounced') {
      return this.updateDebounced(content, 500);
    } else {
      return this.updateManual(content);
    }
  }
  
  // Automatic degradation on performance issues
  private monitorPerformance() {
    if (this.avgUpdateTime > 100) {
      this.updateStrategy = 'debounced';
      console.warn('Preview degraded to debounced mode');
    }
  }
}
```

### Rollback Procedures

#### Level 1: Feature Flag Rollback (Immediate)
1. **Detection Triggers:**
   - Preview update time > 500ms
   - Browser memory usage > 500MB
   - UI thread blocking detected

2. **Rollback Steps:**
   ```javascript
   // 1. Client-side immediate rollback
   localStorage.setItem('preview.realtime.disabled', 'true');
   window.location.reload();
   
   // 2. Server-side configuration
   await updateConfig({
     preview: {
       mode: 'manual',
       debounceMs: 1000
     }
   });
   
   // 3. Notify users
   showNotification('Preview switched to manual mode for stability');
   ```

#### Level 2: Component Rollback (10 minutes)
1. **When Triggered:**
   - Preview component crashes
   - Infinite render loops
   
2. **Rollback Steps:**
   ```bash
   # 1. Restore previous Preview component
   git checkout HEAD~1 -- src/lib/components/Preview.svelte
   git checkout HEAD~1 -- src/lib/components/OutputPanel.svelte
   
   # 2. Rebuild application
   npm run build
   
   # 3. Deploy with preview safety mode
   PREVIEW_SAFE_MODE=true npm run deploy
   ```

### Performance Monitoring

```javascript
// monitoring/preview-performance.js
class PreviewMonitor {
  private metrics = {
    updateTimes: [],
    memoryUsage: [],
    errorCount: 0
  };
  
  checkHealthAndRollback() {
    const avgUpdateTime = average(this.metrics.updateTimes);
    const avgMemory = average(this.metrics.memoryUsage);
    
    if (avgUpdateTime > 200 || avgMemory > 400_000_000) {
      this.initiateRollback('performance');
    }
    
    if (this.metrics.errorCount > 5) {
      this.initiateRollback('errors');
    }
  }
  
  private initiateRollback(reason: string) {
    console.error(`Preview rollback triggered: ${reason}`);
    
    // Level 1: Disable realtime
    localStorage.setItem('preview.mode', 'manual');
    
    // Level 2: Use fallback component
    if (reason === 'errors') {
      this.loadFallbackPreview();
    }
    
    // Notify monitoring
    fetch('/api/monitoring/rollback', {
      method: 'POST',
      body: JSON.stringify({ component: 'preview', reason })
    });
  }
}
```

---

## Rollback Communication Plan

### Stakeholder Notification

1. **Immediate (< 5 minutes):**
   - Dev team via Slack #alerts
   - On-call engineer via PagerDuty
   - System status page update

2. **Short-term (< 30 minutes):**
   - Product owner notification
   - User-facing banner if affecting functionality
   - Support team briefing

3. **Follow-up (< 24 hours):**
   - Root cause analysis
   - Rollback report
   - Prevention plan

### User Communication Templates

```javascript
// Feature Flag Rollback
"We've temporarily disabled real-time preview to ensure stability. Your work is safe and you can continue editing with manual preview updates."

// Save/Load Rollback
"We're reverting to the previous save system for reliability. Your data is secure. Please save your work and refresh the page."

// Code Execution Rollback
"Dynamic code execution has been switched to compatibility mode. All features remain available with slightly reduced performance."
```

---

## Testing Rollback Procedures

### Rollback Drill Schedule
- **Weekly:** Feature flag toggle test
- **Bi-weekly:** Code revert simulation
- **Monthly:** Full rollback drill with timing

### Rollback Verification Checklist
- [ ] Feature flags tested in production-like environment
- [ ] Rollback scripts executable by any team member
- [ ] Monitoring alerts configured and tested
- [ ] Communication channels verified
- [ ] Backup data restoration validated
- [ ] Performance baselines documented
- [ ] User impact assessment completed

---

## Emergency Contacts

### Rollback Authority Chain
1. **Any Developer** - Level 1 (Feature Flags)
2. **Senior Developer** - Level 2 (Code Revert)
3. **Tech Lead** - Level 3 (Data Migration)
4. **CTO/Director** - Level 4 (Full Restore)

### Critical Resources
- Firebase Console: https://console.firebase.google.com/project/[project-id]
- Monitoring Dashboard: [monitoring-url]
- Status Page: [status-page-url]
- Rollback Scripts: `/scripts/rollback/`
- Emergency Runbook: `/docs/emergency-procedures.md`

---

*Document Version: 1.0*
*Last Updated: 2025-01-30*
*Author: Sarah (Product Owner)*
*Next Review: Before Sprint 1 Start*