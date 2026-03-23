// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Shared DOM setup for all tests.
 * Call setupDOM() in beforeAll (before importing scripts.js) and in beforeEach for clean state.
 */
export function setupDOM() {
  // Stub window.scrollTo (not implemented in jsdom)
  if (!window.scrollTo || window.scrollTo.toString().indexOf('native') >= 0) {
    window.scrollTo = function () {};
  }
  document.body.innerHTML = `
    <header><section id="hero"><div class="hero__content"><button id="start-flow-cta">Start</button></div></section></header>

    <div class="topnav"><span id="topnav-badge" class="topnav__badge topnav__badge--active">Assessment</span></div>

    <!-- Current wizard DOM expected by scripts.js initDom() -->
    <div class="layout">
      <nav class="sidebar" id="sidebar" aria-label="Assessment steps">
        <div class="sidebar__header">RMA</div>
        <div id="sidebar-steps"></div>
        <div class="sidebar__section" id="sidebar-results-section" style="display:none">Results</div>
        <div id="sidebar-results-links" style="display:none"></div>
      </nav>
      <main class="main" id="main-content">
        <div id="resume-banner" class="callout callout--info" style="display:none">
          You have a saved assessment in progress.
          <button class="btn btn--primary" id="resume-btn">Resume</button>
          <button class="btn btn--ghost" id="restart-saved-btn">Start Over</button>
        </div>
        <div id="wizard-section">
          <div class="progress-bar">
            <div class="progress-bar__fill" id="progress-fill" style="width:0%"></div>
          </div>
          <div id="wizard-container"></div>
          <div class="wizard-controls">
            <button class="btn btn--secondary" id="btn-back" disabled>← Back</button>
            <span id="step-indicator" style="font-size:13px">Step 1 of 7</span>
            <button class="btn btn--primary" id="btn-next" disabled>Next →</button>
          </div>
        </div>
        <div id="results-section" class="results" style="display:none">
          <div class="kpi-grid" id="kpi-grid"></div>
          <div class="results-tabs" id="results-tabs" role="tablist">
            <button class="results-tab results-tab--active" role="tab" data-tab="tab-summary" aria-selected="true">Summary</button>
            <button class="results-tab" role="tab" data-tab="tab-runbook">Runbook</button>
            <button class="results-tab" role="tab" data-tab="tab-commands">Commands</button>
            <button class="results-tab" role="tab" data-tab="tab-waves">Wave Plan</button>
            <button class="results-tab" role="tab" data-tab="tab-trace">Decision Trace</button>
            <button class="results-tab" role="tab" data-tab="tab-risks">Risks</button>
            <button class="results-tab" role="tab" data-tab="tab-reference">Reference Library</button>
          </div>
          <div id="tab-summary" class="results-panel results-panel--active" role="tabpanel"></div>
          <div id="tab-runbook" class="results-panel" role="tabpanel"></div>
          <div id="tab-commands" class="results-panel" role="tabpanel"></div>
          <div id="tab-waves" class="results-panel" role="tabpanel"></div>
          <div id="tab-trace" class="results-panel" role="tabpanel"></div>
          <div id="tab-risks" class="results-panel" role="tabpanel"></div>
          <div id="tab-reference" class="results-panel" role="tabpanel"></div>
          <div style="display:flex;gap:12px;margin:24px 0;flex-wrap:wrap">
            <button class="btn btn--primary" id="btn-copy-plan">Copy Full Plan</button>
            <button class="btn btn--secondary" id="btn-copy-summary">Copy Summary</button>
            <button class="btn btn--secondary" id="btn-print">Print</button>
            <button class="btn btn--ghost" id="btn-edit-answers">Edit Answers</button>
            <button class="btn btn--danger" id="btn-restart">Restart</button>
          </div>
        </div>
      </main>
    </div>

    <!-- Legacy flow-engine DOM for older tests -->
    <div id="health-status-panel" class="health-panel">
      <div class="health-panel__icon" id="health-icon"></div>
      <span class="health-panel__timestamp" id="health-timestamp"></span>
      <button class="health-panel__refresh-btn" id="health-refresh-btn"></button>
      <div class="health-panel__summary" id="health-summary"></div>
      <div class="health-panel__rss-status" id="health-rss-status"></div>
      <div class="health-panel__filters" id="health-filters" style="display:none">
        <button class="health-chip health-chip--active" data-filter="all">All</button>
        <button class="health-chip" data-filter="region">By Region</button>
        <button class="health-chip" data-filter="service">By Service</button>
      </div>
      <div class="health-panel__grid" id="health-grid"></div>
    </div>

    <section id="flow-engine" class="flow-engine" hidden>
      <div class="flow-engine__nav glass">
        <div class="flow-breadcrumb" role="navigation" aria-label="Decision breadcrumb"></div>
        <div class="flow-progress" aria-live="polite">Step <span class="flow-progress__current">1</span> of <span class="flow-progress__total">8</span></div>
      </div>
      <div class="flow-engine__viewport"></div>
      <div class="flow-engine__controls">
        <button class="flow-btn flow-btn--back glass" hidden>Back</button>
        <button class="flow-btn flow-btn--continue" disabled>Continue</button>
        <button class="flow-btn flow-btn--restart glass">Restart</button>
      </div>
    </section>
  `;
}

/** The 27 known guide section IDs */
export const KNOWN_SECTION_IDS = [
  'overview', 'region-enablement', 'aws-support', 'pre-migration', 'service-quotas',
  'kms', 'iam-idc', 'iam-sts', 'amazon-ec2', 'amazon-ecs', 'amazon-eks',
  'amazon-rds', 'amazon-aurora', 'amazon-redshift', 'elasticache', 'alb-nlb',
  'site-to-site-vpn', 'direct-connect', 'transit-gateway', 'client-vpn',
  'amazon-s3', 'aws-waf', 'checklist', 'wave-planner', 'decision-matrix',
  'talk-track', 'faq'
];

/** Valid state key values for generating arbitrary states */
export const STATE_VALUES = {
  proceedPath: ['self-execution', 'partner-assisted'],
  urgencyMode: ['architecture-strategy', 'immediate-dr', 'regional-partner', 'matchmaking'],
  workloadCriticality: ['tier-0', 'tier-1', 'tier-2'],
  recoveryRequirements: ['rto-lt-1h', 'rto-1-4h', 'rto-4-24h', 'rto-gt-24h'],
  dataProfile: ['stateful-large', 'stateful-small', 'stateless'],
  networkConnectivity: ['direct-connect', 'transit-gateway', 'vpn', 'vpn-only'],
  complianceConstraints: ['data-residency', 'sovereignty', 'none'],
  recommendedArchitecture: ['active-active', 'warm-standby', 'pilot-light', 'backup-restore'],
  networkSecurity: ['security-groups', 'nacls', 'both'],
  dataHandling: ['move', 'replicate', 'backup-restore'],
  regionDiscovery: ['acknowledged'],
  mmWorkload: ['ec2', 'containers', 'serverless', 'mixed'],
  mmData: ['insignificant', 'stateful', 'heavy-db'],
  mmUrgency: ['immediate', 'days', 'weeks'],
  mmComplexity: ['single-vpc', 'multi-vpc', 'hybrid', 'multi-region'],
  mmApproach: ['fastest', 'iac-rebuild', 'backup-restore', 'partner-led'],
  drStrategy: ['active-active', 'pilot-light', 'warm-standby', 'backup-restore', 'none', 'unknown'],
  backupLocation: ['same-region', 'cross-region', 'cross-account', 'external', 'unknown'],
  backupTechnology: ['aws-backup', 'native-snapshots', 'third-party', 'custom-scripts', 'unknown'],
};

/** fast-check arbitrary for a complete state object */
export function arbitraryCompleteState(fc) {
  return fc.record({
    workloadCriticality: fc.constantFrom(...STATE_VALUES.workloadCriticality),
    recoveryRequirements: fc.constantFrom(...STATE_VALUES.recoveryRequirements),
    dataProfile: fc.constantFrom(...STATE_VALUES.dataProfile),
    networkConnectivity: fc.constantFrom(...STATE_VALUES.networkConnectivity),
    complianceConstraints: fc.constantFrom(...STATE_VALUES.complianceConstraints),
    recommendedArchitecture: fc.constantFrom(...STATE_VALUES.recommendedArchitecture),
  });
}

/** fast-check arbitrary for a partial state object (some keys may be missing) */
export function arbitraryPartialState(fc) {
  return fc.record({
    workloadCriticality: fc.option(fc.constantFrom(...STATE_VALUES.workloadCriticality), { nil: undefined }),
    recoveryRequirements: fc.option(fc.constantFrom(...STATE_VALUES.recoveryRequirements), { nil: undefined }),
    dataProfile: fc.option(fc.constantFrom(...STATE_VALUES.dataProfile), { nil: undefined }),
    networkConnectivity: fc.option(fc.constantFrom(...STATE_VALUES.networkConnectivity), { nil: undefined }),
    complianceConstraints: fc.option(fc.constantFrom(...STATE_VALUES.complianceConstraints), { nil: undefined }),
  }).map(obj => {
    // Remove undefined keys
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) result[k] = v;
    }
    return result;
  });
}

/** V2 partner keys (all 17) */
export const ALL_PARTNER_KEYS = [
  'bestcloudfor_me', 'integra', 'sudo', 'zaintech', 'bexprt',
  'ibm', 'accenture', 'deloitte', 'publicis_sapient', 'tcs',
  'hcl', 'noventiq', 'dxc', 'limoncloud', 'redington',
  'controlmonkey', 'n2ws', 'firefly'
];

/** fast-check arbitrary for a complete v2 state object */
export function arbitraryV2State(fc) {
  return fc.record({
    proceedPath: fc.constantFrom(...STATE_VALUES.proceedPath),
    urgencyMode: fc.constantFrom(...STATE_VALUES.urgencyMode),
    workloadCriticality: fc.constantFrom(...STATE_VALUES.workloadCriticality),
    recoveryRequirements: fc.constantFrom(...STATE_VALUES.recoveryRequirements),
    dataProfile: fc.constantFrom(...STATE_VALUES.dataProfile),
    networkConnectivity: fc.constantFrom(...STATE_VALUES.networkConnectivity),
    complianceConstraints: fc.constantFrom(...STATE_VALUES.complianceConstraints),
    networkSecurity: fc.constantFrom(...STATE_VALUES.networkSecurity),
    dataHandling: fc.constantFrom(...STATE_VALUES.dataHandling),
    drStrategy: fc.constantFrom(...STATE_VALUES.drStrategy),
    backupLocation: fc.constantFrom(...STATE_VALUES.backupLocation),
    backupTechnology: fc.constantFrom(...STATE_VALUES.backupTechnology),
  });
}

/** fast-check arbitrary for matchmaking answers */
export function arbitraryMatchmakingAnswers(fc) {
  return fc.record({
    mmWorkload: fc.constantFrom(...STATE_VALUES.mmWorkload),
    mmData: fc.constantFrom(...STATE_VALUES.mmData),
    mmUrgency: fc.constantFrom(...STATE_VALUES.mmUrgency),
    mmComplexity: fc.constantFrom(...STATE_VALUES.mmComplexity),
    mmApproach: fc.constantFrom(...STATE_VALUES.mmApproach),
  });
}

/** fast-check arbitrary for a random partner key from the 17-partner pool */
export function arbitraryPartnerKey(fc) {
  return fc.constantFrom(...ALL_PARTNER_KEYS);
}

/** fast-check arbitrary for a v2 state with optional DR/backup keys (to test Immediate DR skip scenario) */
export function arbitraryV2StateWithDiscovery(fc) {
  return fc.record({
    proceedPath: fc.constantFrom(...STATE_VALUES.proceedPath),
    urgencyMode: fc.constantFrom(...STATE_VALUES.urgencyMode),
    workloadCriticality: fc.constantFrom(...STATE_VALUES.workloadCriticality),
    recoveryRequirements: fc.constantFrom(...STATE_VALUES.recoveryRequirements),
    dataProfile: fc.constantFrom(...STATE_VALUES.dataProfile),
    networkConnectivity: fc.constantFrom(...STATE_VALUES.networkConnectivity),
    complianceConstraints: fc.constantFrom(...STATE_VALUES.complianceConstraints),
    networkSecurity: fc.constantFrom(...STATE_VALUES.networkSecurity),
    dataHandling: fc.constantFrom(...STATE_VALUES.dataHandling),
    drStrategy: fc.option(fc.constantFrom(...STATE_VALUES.drStrategy), { nil: undefined }),
    backupLocation: fc.option(fc.constantFrom(...STATE_VALUES.backupLocation), { nil: undefined }),
    backupTechnology: fc.option(fc.constantFrom(...STATE_VALUES.backupTechnology), { nil: undefined }),
  }).map(obj => {
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) result[k] = v;
    }
    return result;
  });
}
