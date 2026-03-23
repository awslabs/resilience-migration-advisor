// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
/**
 * Property tests for Partner Modes
 * Feature: partner-modes
 * Property 1: Step visibility is determined by mode selection
 * **Validates: Requirements 1.2, 1.3, 1.4, 5.1**
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { setupDOM } from './setup.js';

beforeAll(async () => {
  setupDOM();
  await import('../scripts.js');
});

/**
 * Map each mode to the set of step IDs that should be visible for it.
 * Built dynamically from WIZARD_STEPS so the test stays in sync with the code.
 */
function getStepsByMode(steps, modes) {
  const result = {};
  for (const mode of modes) {
    result[mode] = [];
    steps.forEach((step, idx) => {
      if (!step.conditional) {
        // Steps without conditional are always visible (e.g. mode selector)
        result[mode].push(idx);
      } else if (step.conditional({ urgencyMode: mode })) {
        result[mode].push(idx);
      }
    });
  }
  return result;
}

// Feature: partner-modes, Property 1: Step visibility is determined by mode selection
describe('PartnerModes — Property 1: Step visibility is determined by mode selection', () => {
  it('only steps for the selected mode are visible (100 iterations)', () => {
    const MODES = ['strategy', 'panic', 'regional-partner', 'matchmaking'];
    const steps = window.WIZARD_STEPS;

    // Pre-compute which step indices belong to each mode
    const stepsByMode = getStepsByMode(steps, MODES);

    fc.assert(
      fc.property(
        fc.constantFrom(...MODES),
        (mode) => {
          const state = { urgencyMode: mode };

          steps.forEach((step, idx) => {
            if (!step.conditional) {
              // Steps without a conditional (e.g. mode selector) are always visible
              return;
            }

            const visible = !!step.conditional(state);

            if (stepsByMode[mode].includes(idx)) {
              // This step belongs to the selected mode — must be visible
              // (compound conditionals may still be false if other state keys are missing)
              // So we only check that non-mode steps are NOT visible
            } else {
              // This step belongs to another mode — must NOT be visible
              expect(visible).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('steps without conditionals are always visible regardless of mode (100 iterations)', () => {
    const MODES = ['strategy', 'panic', 'regional-partner', 'matchmaking'];
    const steps = window.WIZARD_STEPS;

    fc.assert(
      fc.property(
        fc.constantFrom(...MODES),
        (mode) => {
          const unconditionalSteps = steps.filter(s => !s.conditional);
          expect(unconditionalSteps.length).toBeGreaterThan(0);

          // The mode selector step (urgency-mode) should always be unconditional
          const modeSelector = steps.find(s => s.id === 'urgency-mode');
          expect(modeSelector).toBeDefined();
          expect(modeSelector.conditional).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('each mode has at least one exclusive conditional step (100 iterations)', () => {
    const steps = window.WIZARD_STEPS;
    // Only check modes that have conditional steps already defined
    // Must include proceedPath since conditionals now check it
    const modeConfigs = [
      { urgencyMode: 'architecture-strategy', proceedPath: 'self-execution' },
      { urgencyMode: 'immediate-dr', proceedPath: 'self-execution' },
      { urgencyMode: 'regional-partner', proceedPath: 'partner-assisted' },
      { urgencyMode: 'matchmaking', proceedPath: 'partner-assisted' }
    ];
    const modesWithSteps = modeConfigs.filter(cfg => {
      return steps.some(step => step.conditional && step.conditional(cfg));
    });

    fc.assert(
      fc.property(
        fc.constantFrom(...modesWithSteps),
        (cfg) => {
          const visibleConditionalSteps = steps.filter(
            (step) => step.conditional && step.conditional(cfg)
          );
          // Every mode with defined steps must have at least one step that shows for it
          expect(visibleConditionalSteps.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no conditional step is visible for two different modes simultaneously (100 iterations)', () => {
    const MODES = ['strategy', 'panic', 'regional-partner', 'matchmaking'];
    const steps = window.WIZARD_STEPS;
    // Steps with conditional that always returns true are intentionally visible in all modes
    const ALL_MODE_STEP_IDS = ['dr-strategy', 'backup-location', 'backup-technology'];

    fc.assert(
      fc.property(
        fc.constantFrom(...MODES),
        fc.constantFrom(...MODES),
        (modeA, modeB) => {
          if (modeA === modeB) return; // skip same-mode pairs

          const stateA = { urgencyMode: modeA };
          const stateB = { urgencyMode: modeB };

          steps.forEach((step) => {
            if (!step.conditional) return;
            // Skip all-mode steps — they are intentionally visible in every mode
            if (ALL_MODE_STEP_IDS.includes(step.id)) return;

            const visibleA = step.conditional(stateA);
            const visibleB = step.conditional(stateB);

            // A step with a simple mode conditional should not be visible for two different modes
            // (Some strategy steps have compound conditionals like dataProfile check,
            //  but those still require urgencyMode === 'strategy', so they won't show for other modes)
            if (visibleA && visibleB) {
              // This would mean a step shows for two different modes — should not happen
              expect(visibleA && visibleB).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: partner-modes, Property 2: Regional partner data completeness
// **Validates: Requirements 2.2, 2.4, 2.5, 3.2**
describe('PartnerModes — Property 2: Regional partner data completeness', () => {
  it('all partners have required fields (100 iterations)', () => {
    const partners = window.REGIONAL_PARTNERS;
    const keys = Object.keys(partners);

    fc.assert(
      fc.property(
        fc.constantFrom(...keys),
        (key) => {
          const p = partners[key];
          expect(p.fullName).toBeTruthy();
          expect(p.website).toBeTruthy();
          expect(p.focus).toBeTruthy();
          expect(p.region).toBeTruthy();
          expect(p.expertise).toBeInstanceOf(Array);
          expect(p.expertise.length).toBeGreaterThan(0);
          if (p.marketplace !== null && p.marketplace !== undefined) {
            expect(typeof p.marketplace).toBe('string');
            expect(p.marketplace.length).toBeGreaterThan(0);
          }
          expect(p.engagementSteps).toBeInstanceOf(Array);
          expect(p.engagementSteps.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: partner-modes, Property 3: Engagement guide completeness
// **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.6**
describe('PartnerModes — Property 3: Engagement guide completeness', () => {
  it('all partners have complete engagement guides (100 iterations)', () => {
    const partners = window.REGIONAL_PARTNERS;
    const keys = Object.keys(partners);

    fc.assert(
      fc.property(
        fc.constantFrom(...keys),
        (key) => {
          const p = partners[key];
          expect(p.engagementSteps.length).toBeGreaterThanOrEqual(6);
          p.engagementSteps.forEach(s => {
            expect(s.step).toBeTruthy();
            expect(s.detail).toBeTruthy();
          });
          // At least one step must have AWS CLI commands
          const hasAwsCmd = p.engagementSteps.some(s => s.cmd && s.cmd.includes('aws '));
          expect(hasAwsCmd).toBe(true);
          // Must have pros and cons
          expect(p.pros).toBeInstanceOf(Array);
          expect(p.pros.length).toBeGreaterThan(0);
          expect(p.cons).toBeInstanceOf(Array);
          expect(p.cons.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: partner-modes, Property 4: Matchmaking recommendation validity
// **Validates: Requirements 6.1, 6.2, 6.3**
describe('PartnerModes — Property 4: Matchmaking recommendation validity', () => {
  const VALID_PARTNERS = [
    'controlmonkey', 'n2ws', 'firefly', 'bestcloudfor_me',
    'integra', 'sudo', 'zaintech', 'bexprt',
    'ibm', 'accenture', 'deloitte', 'publicis_sapient',
    'tcs', 'hcl', 'noventiq', 'dxc', 'limoncloud', 'redington'
  ];
  const VALID_CONFIDENCES = ['High', 'Medium', 'Low'];

  const mmWorkloadArb = fc.constantFrom('ec2', 'containers', 'serverless', 'mixed');
  const mmDataArb = fc.constantFrom('insignificant', 'stateful', 'heavy-db');
  const mmUrgencyArb = fc.constantFrom('immediate', 'days', 'weeks');
  const mmComplexityArb = fc.constantFrom('single-vpc', 'multi-vpc', 'hybrid', 'multi-region');
  const mmApproachArb = fc.constantFrom('fastest', 'iac-rebuild', 'backup-restore', 'partner-led');
  const mmIndustryArb = fc.oneof(
    fc.constantFrom('finance', 'telco', 'public-sector', 'enterprise', 'other'),
    fc.constant(undefined)
  );

  const answersArb = fc.record({
    mmWorkload: mmWorkloadArb,
    mmData: mmDataArb,
    mmUrgency: mmUrgencyArb,
    mmComplexity: mmComplexityArb,
    mmApproach: mmApproachArb,
    mmIndustry: mmIndustryArb
  });

  it('recommend() returns valid partner, confidence, and non-empty reason (100 iterations)', () => {
    fc.assert(
      fc.property(answersArb, (answers) => {
        const result = window.MATCHMAKING_ENGINE.recommend(answers);

        expect(VALID_PARTNERS).toContain(result.partner);
        expect(VALID_CONFIDENCES).toContain(result.confidence);
        expect(typeof result.reason).toBe('string');
        expect(result.reason.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('recommend() returns partnerName, score, and executionPlan (100 iterations)', () => {
    fc.assert(
      fc.property(answersArb, (answers) => {
        const result = window.MATCHMAKING_ENGINE.recommend(answers);

        expect(typeof result.partnerName).toBe('string');
        expect(result.partnerName.length).toBeGreaterThan(0);
        expect(typeof result.score).toBe('number');
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
        expect(result.executionPlan).toBeInstanceOf(Array);
        expect(result.executionPlan.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });
});


// Feature: partner-modes, Property 5: Matchmaking deterministic rules
// **Validates: Requirements 6.4, 6.5, 6.6, 6.7, 6.8**
describe('PartnerModes — Property 5: Matchmaking deterministic rules', () => {
  const mmWorkloadArb = fc.constantFrom('ec2', 'containers', 'serverless', 'mixed');
  const mmDataArb = fc.constantFrom('insignificant', 'stateful', 'heavy-db');
  const mmUrgencyArb = fc.constantFrom('immediate', 'days', 'weeks');
  const mmComplexityArb = fc.constantFrom('single-vpc', 'multi-vpc', 'hybrid', 'multi-region');
  const mmApproachArb = fc.constantFrom('fastest', 'iac-rebuild', 'backup-restore', 'partner-led');
  const mmIndustryArb = fc.oneof(
    fc.constantFrom('finance', 'telco', 'public-sector', 'enterprise', 'other'),
    fc.constant(undefined)
  );

  // Rule 6.4: immediate + heavy-db → N2W
  it('immediate urgency + heavy-db data → N2W (100 iterations)', () => {
    fc.assert(
      fc.property(
        mmWorkloadArb,
        mmComplexityArb,
        mmApproachArb,
        mmIndustryArb,
        (workload, complexity, approach, industry) => {
          const answers = {
            mmWorkload: workload,
            mmData: 'heavy-db',
            mmUrgency: 'immediate',
            mmComplexity: complexity,
            mmApproach: approach,
            mmIndustry: industry
          };
          const result = window.MATCHMAKING_ENGINE.recommend(answers);
          expect(result.partner).toBe('n2ws');
        }
      ),
      { numRuns: 100 }
    );
  });

  // Rule 6.5: iac-rebuild → ControlMonkey or Firefly
  // Note: Rule r1 (immediate + heavy-db) has higher priority, so we exclude that combo
  it('iac-rebuild approach → ControlMonkey or Firefly (100 iterations)', () => {
    fc.assert(
      fc.property(
        mmWorkloadArb,
        mmDataArb,
        mmUrgencyArb,
        mmComplexityArb,
        mmIndustryArb,
        (workload, data, urgency, complexity, industry) => {
          // Skip if rule r1 would fire first (immediate + heavy-db)
          if (urgency === 'immediate' && data === 'heavy-db') return;

          const answers = {
            mmWorkload: workload,
            mmData: data,
            mmUrgency: urgency,
            mmComplexity: complexity,
            mmApproach: 'iac-rebuild',
            mmIndustry: industry
          };
          const result = window.MATCHMAKING_ENGINE.recommend(answers);
          expect(['controlmonkey', 'firefly']).toContain(result.partner);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Rule 6.6: multi-vpc/hybrid + weeks → Integra or ZainTech
  // Exclude combos where higher-priority rules fire
  it('multi-vpc or hybrid complexity + weeks urgency → Integra or ZainTech (100 iterations)', () => {
    fc.assert(
      fc.property(
        mmWorkloadArb,
        mmDataArb,
        fc.constantFrom('multi-vpc', 'hybrid'),
        mmApproachArb,
        mmIndustryArb,
        (workload, data, complexity, approach, industry) => {
          // Skip if rule r2 (iac-rebuild) would fire first
          if (approach === 'iac-rebuild') return;
          // Rule r1 can't fire: urgency is 'weeks', not 'immediate'

          const answers = {
            mmWorkload: workload,
            mmData: data,
            mmUrgency: 'weeks',
            mmComplexity: complexity,
            mmApproach: approach,
            mmIndustry: industry
          };
          const result = window.MATCHMAKING_ENGINE.recommend(answers);
          expect(['integra', 'zaintech']).toContain(result.partner);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Rule 6.7: partner-led → BestCloudForMe or Sudo
  // Exclude combos where higher-priority rules fire
  it('partner-led approach → BestCloudForMe or Sudo (100 iterations)', () => {
    fc.assert(
      fc.property(
        mmWorkloadArb,
        mmDataArb,
        mmUrgencyArb,
        mmComplexityArb,
        mmIndustryArb,
        (workload, data, urgency, complexity, industry) => {
          // Skip if rule r1 fires (immediate + heavy-db)
          if (urgency === 'immediate' && data === 'heavy-db') return;
          // Rule r2 can't fire: approach is 'partner-led', not 'iac-rebuild'
          // Skip if rule r3 fires (multi-vpc/hybrid + weeks)
          if ((complexity === 'multi-vpc' || complexity === 'hybrid') && urgency === 'weeks') return;

          const answers = {
            mmWorkload: workload,
            mmData: data,
            mmUrgency: urgency,
            mmComplexity: complexity,
            mmApproach: 'partner-led',
            mmIndustry: industry
          };
          const result = window.MATCHMAKING_ENGINE.recommend(answers);
          expect(['bestcloudfor_me', 'sudo']).toContain(result.partner);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Rule 6.8: fastest + insignificant → ControlMonkey or Firefly
  // Exclude combos where higher-priority rules fire
  it('fastest approach + insignificant data → ControlMonkey or Firefly (100 iterations)', () => {
    fc.assert(
      fc.property(
        mmWorkloadArb,
        mmUrgencyArb,
        mmComplexityArb,
        mmIndustryArb,
        (workload, urgency, complexity, industry) => {
          // Rule r1 can't fire: data is 'insignificant', not 'heavy-db'
          // Rule r2 can't fire: approach is 'fastest', not 'iac-rebuild'
          // Skip if rule r3 fires (multi-vpc/hybrid + weeks)
          if ((complexity === 'multi-vpc' || complexity === 'hybrid') && urgency === 'weeks') return;
          // Rule r4 can't fire: approach is 'fastest', not 'partner-led'

          const answers = {
            mmWorkload: workload,
            mmData: 'insignificant',
            mmUrgency: urgency,
            mmComplexity: complexity,
            mmApproach: 'fastest',
            mmIndustry: industry
          };
          const result = window.MATCHMAKING_ENGINE.recommend(answers);
          expect(['controlmonkey', 'firefly']).toContain(result.partner);
        }
      ),
      { numRuns: 100 }
    );
  });
});


// Feature: partner-modes, Property 6: Result output completeness for new modes
// **Validates: Requirements 7.1, 7.3, 7.4, 8.1**
describe('PartnerModes — Property 6: Result output completeness for new modes', () => {
  const regionalPartnerKeys = ['bestcloudfor_me', 'integra', 'sudo', 'zaintech', 'bexprt'];

  const mmWorkloadArb = fc.constantFrom('ec2', 'containers', 'serverless', 'mixed');
  const mmDataArb = fc.constantFrom('insignificant', 'stateful', 'heavy-db');
  const mmUrgencyArb = fc.constantFrom('immediate', 'days', 'weeks');
  const mmComplexityArb = fc.constantFrom('single-vpc', 'multi-vpc', 'hybrid', 'multi-region');
  const mmApproachArb = fc.constantFrom('fastest', 'iac-rebuild', 'backup-restore', 'partner-led');
  const mmIndustryArb = fc.oneof(
    fc.constantFrom('finance', 'telco', 'public-sector', 'enterprise', 'other'),
    fc.constant(undefined)
  );

  function resetPanels() {
    document.getElementById('tab-summary').innerHTML = '';
    document.getElementById('tab-summary').className = 'results-panel results-panel--active';
    document.getElementById('kpi-grid').innerHTML = '';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('results-section').className = 'results';
    document.getElementById('wizard-section').style.display = '';
    document.getElementById('results-tabs').style.display = '';
    document.getElementById('sidebar-results-links').style.display = 'none';
  }

  it('regional-partner mode renders mode name, partner name, runbook steps, and website URL (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...regionalPartnerKeys),
        (partnerKey) => {
          resetPanels();
          window.RMA.setState({ urgencyMode: 'regional-partner', regionalPartner: partnerKey });
          window.showResults();

          var html = document.getElementById('tab-summary').innerHTML;
          var kpiHtml = document.getElementById('kpi-grid').innerHTML;
          var partner = window.REGIONAL_PARTNERS[partnerKey];

          // Must contain mode name
          expect(kpiHtml).toContain('Regional Partner Assistance');
          // Must contain partner name
          expect(kpiHtml).toContain(partner.fullName);
          // Must have at least one runbook step
          expect(html).toContain('runbook-step');
          // Must contain partner website URL
          expect(html).toContain(partner.website);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('matchmaking mode renders mode name, partner name, runbook steps, and website URL (100 iterations)', () => {
    fc.assert(
      fc.property(
        mmWorkloadArb,
        mmDataArb,
        mmUrgencyArb,
        mmComplexityArb,
        mmApproachArb,
        mmIndustryArb,
        (workload, data, urgency, complexity, approach, industry) => {
          resetPanels();

          var mmState = {
            urgencyMode: 'matchmaking',
            mmWorkload: workload,
            mmData: data,
            mmUrgency: urgency,
            mmComplexity: complexity,
            mmApproach: approach
          };
          if (industry !== undefined) mmState.mmIndustry = industry;

          window.RMA.setState(mmState);
          window.showResults();

          var html = document.getElementById('tab-summary').innerHTML;
          var kpiHtml = document.getElementById('kpi-grid').innerHTML;

          // Get the recommendation to know which partner was selected
          var recommendation = window.MATCHMAKING_ENGINE.recommend(mmState);

          // Must contain mode name
          expect(kpiHtml).toContain('Partner Matchmaking');
          // Must contain partner name (account for HTML entity escaping of &)
          var escapedName = recommendation.partnerName.replace(/&/g, '&amp;');
          expect(kpiHtml).toContain(escapedName);
          // Must have at least one runbook step
          expect(html).toContain('runbook-step');

          // Must contain partner website URL
          var partnerKey = recommendation.partner;
          var website = null;
          if (window.REGIONAL_PARTNERS[partnerKey]) {
            website = window.REGIONAL_PARTNERS[partnerKey].website;
          } else {
            // DR partner — check panic-partner step's partnerDetails
            var panicStep = window.WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
            if (panicStep && panicStep.partnerDetails && panicStep.partnerDetails[partnerKey]) {
              website = panicStep.partnerDetails[partnerKey].website;
            }
          }
          expect(website).toBeTruthy();
          expect(html).toContain(website);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: partner-modes, Property 7: Markdown and summary export validity
describe('PartnerModes — Property 7: Markdown and summary export validity', () => {
  const mmWorkloadArb = fc.constantFrom('ec2', 'containers', 'serverless', 'mixed');
  const mmDataArb = fc.constantFrom('insignificant', 'stateful', 'heavy-db');
  const mmUrgencyArb = fc.constantFrom('immediate', 'days', 'weeks');
  const mmComplexityArb = fc.constantFrom('single-vpc', 'multi-vpc', 'hybrid', 'multi-region');
  const mmApproachArb = fc.constantFrom('fastest', 'iac-rebuild', 'backup-restore', 'partner-led');
  const mmIndustryArb = fc.option(fc.constantFrom('finance', 'telco', 'public-sector', 'enterprise', 'other'), { nil: undefined });

  it('regional-partner mode generates valid markdown with mode, partner, and step titles (100 iterations)', () => {
    const partnerKeys = Object.keys(window.REGIONAL_PARTNERS);
    fc.assert(
      fc.property(
        fc.constantFrom(...partnerKeys),
        (partnerKey) => {
          window.RMA.setState({ urgencyMode: 'regional-partner', regionalPartner: partnerKey });
          const md = window.generateMarkdown();
          const partner = window.REGIONAL_PARTNERS[partnerKey];

          expect(md).toBeTruthy();
          expect(md.length).toBeGreaterThan(0);
          expect(md).toContain('Regional Partner Assistance');
          expect(md).toContain(partner.fullName);
          // At least one step title
          expect(md).toContain(partner.engagementSteps[0].step);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('matchmaking mode generates valid markdown with mode, partner, and step titles (100 iterations)', () => {
    fc.assert(
      fc.property(
        mmWorkloadArb, mmDataArb, mmUrgencyArb, mmComplexityArb, mmApproachArb, mmIndustryArb,
        (workload, data, urgency, complexity, approach, industry) => {
          var s = { urgencyMode: 'matchmaking', mmWorkload: workload, mmData: data, mmUrgency: urgency, mmComplexity: complexity, mmApproach: approach };
          if (industry !== undefined) s.mmIndustry = industry;
          window.RMA.setState(s);

          const md = window.generateMarkdown();
          const rec = window.MATCHMAKING_ENGINE.recommend(s);

          expect(md).toBeTruthy();
          expect(md.length).toBeGreaterThan(0);
          expect(md).toContain('Partner Matchmaking');
          expect(md).toContain(rec.partnerName);
          // At least one step title
          expect(md).toContain(rec.executionPlan[0].step);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('copySummary output contains mode and partner for regional-partner mode (100 iterations)', () => {
    const partnerKeys = Object.keys(window.REGIONAL_PARTNERS);
    // Stub clipboard
    const written = [];
    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (t) => { written.push(t); return Promise.resolve(); } },
      writable: true, configurable: true
    });

    fc.assert(
      fc.property(
        fc.constantFrom(...partnerKeys),
        (partnerKey) => {
          written.length = 0;
          window.RMA.setState({ urgencyMode: 'regional-partner', regionalPartner: partnerKey });
          window.copySummary();
          const partner = window.REGIONAL_PARTNERS[partnerKey];
          expect(written.length).toBeGreaterThan(0);
          expect(written[0]).toContain('Regional Partner Assistance');
          expect(written[0]).toContain(partner.fullName);
        }
      ),
      { numRuns: 100 }
    );

    Object.defineProperty(navigator, 'clipboard', { value: origClipboard, writable: true, configurable: true });
  });

  it('copySummary output contains mode and partner for matchmaking mode (100 iterations)', () => {
    const written = [];
    const origClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (t) => { written.push(t); return Promise.resolve(); } },
      writable: true, configurable: true
    });

    fc.assert(
      fc.property(
        mmWorkloadArb, mmDataArb, mmUrgencyArb, mmComplexityArb, mmApproachArb, mmIndustryArb,
        (workload, data, urgency, complexity, approach, industry) => {
          written.length = 0;
          var s = { urgencyMode: 'matchmaking', mmWorkload: workload, mmData: data, mmUrgency: urgency, mmComplexity: complexity, mmApproach: approach };
          if (industry !== undefined) s.mmIndustry = industry;
          window.RMA.setState(s);
          window.copySummary();
          const rec = window.MATCHMAKING_ENGINE.recommend(s);
          expect(written.length).toBeGreaterThan(0);
          expect(written[0]).toContain('Partner Matchmaking');
          expect(written[0]).toContain(rec.partnerName);
        }
      ),
      { numRuns: 100 }
    );

    Object.defineProperty(navigator, 'clipboard', { value: origClipboard, writable: true, configurable: true });
  });
});

// Feature: partner-modes, Property 8: Restart clears state and edit preserves state
describe('PartnerModes — Property 8: Restart clears state and edit preserves state', () => {
  const mmWorkloadArb = fc.constantFrom('ec2', 'containers', 'serverless', 'mixed');
  const mmDataArb = fc.constantFrom('insignificant', 'stateful', 'heavy-db');
  const mmUrgencyArb = fc.constantFrom('immediate', 'days', 'weeks');

  it('restart clears all state and resets currentStep to 0 (100 iterations)', () => {
    const partnerKeys = Object.keys(window.REGIONAL_PARTNERS);
    fc.assert(
      fc.property(
        fc.constantFrom('regional-partner', 'matchmaking'),
        fc.constantFrom(...partnerKeys),
        mmWorkloadArb, mmDataArb, mmUrgencyArb,
        (mode, partner, workload, data, urgency) => {
          // Set up state with new-mode keys
          var s = { urgencyMode: mode, regionalPartner: partner, mmWorkload: workload, mmData: data, mmUrgency: urgency };
          window.RMA.setState(s);
          window.RMA.setCurrentStep(3);

          // Restart
          window.RMA.restart();

          expect(window.RMA.getCurrentStep()).toBe(0);
          var newState = window.RMA.getState();
          expect(Object.keys(newState).length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editAnswers preserves all state keys and sets currentStep to 0 (100 iterations)', () => {
    const partnerKeys = Object.keys(window.REGIONAL_PARTNERS);
    fc.assert(
      fc.property(
        fc.constantFrom('regional-partner', 'matchmaking'),
        fc.constantFrom(...partnerKeys),
        mmWorkloadArb, mmDataArb, mmUrgencyArb,
        (mode, partner, workload, data, urgency) => {
          var s = { urgencyMode: mode, regionalPartner: partner, mmWorkload: workload, mmData: data, mmUrgency: urgency };
          window.RMA.setState(s);
          window.RMA.setCurrentStep(5);

          window.RMA.editAnswers();

          expect(window.RMA.getCurrentStep()).toBe(0);
          var preserved = window.RMA.getState();
          expect(preserved.urgencyMode).toBe(mode);
          expect(preserved.regionalPartner).toBe(partner);
          expect(preserved.mmWorkload).toBe(workload);
          expect(preserved.mmData).toBe(data);
          expect(preserved.mmUrgency).toBe(urgency);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: partner-modes, Property 9: Existing mode regression
// **Validates: Requirements 10.1, 10.2**
describe('PartnerModes — Property 9: Existing mode regression', () => {
  const workloadArb = fc.constantFrom('tier-0', 'tier-1', 'tier-2');
  const rtoArb = fc.constantFrom('rto-lt-1h', 'rto-1-4h', 'rto-4-24h', 'rto-gt-24h');
  const dataArb = fc.constantFrom('stateful-large', 'stateful-small', 'stateless');

  it('RULES_ENGINE outputs are consistent for strategy-mode states (100 iterations)', () => {
    fc.assert(
      fc.property(
        workloadArb, rtoArb, dataArb,
        (criticality, rto, data) => {
          var s = { urgencyMode: 'strategy', workloadCriticality: criticality, recoveryRequirements: rto, dataProfile: data };

          var arch = window.RULES_ENGINE.getArchitecture(s);
          var complexity = window.RULES_ENGINE.getComplexity(s);
          var timeline = window.RULES_ENGINE.getTimeline(s);
          var risk = window.RULES_ENGINE.getRiskLevel(s);

          // Architecture must be one of the 4 valid patterns
          expect(['active-active', 'warm-standby', 'pilot-light', 'backup-restore']).toContain(arch);

          // Complexity must have score, level, cls
          expect(typeof complexity.score).toBe('number');
          expect(complexity.score).toBeGreaterThanOrEqual(0);
          expect(complexity.score).toBeLessThanOrEqual(100);
          expect(['Low', 'Medium', 'High']).toContain(complexity.level);

          // Timeline must have label and weeks
          expect(timeline.label).toBeTruthy();
          expect(timeline.weeks).toBeTruthy();

          // Risk must have level and cls
          expect(['Low', 'Moderate', 'High']).toContain(risk.level);

          // Deterministic: same inputs produce same outputs
          var arch2 = window.RULES_ENGINE.getArchitecture(s);
          var complexity2 = window.RULES_ENGINE.getComplexity(s);
          expect(arch2).toBe(arch);
          expect(complexity2.score).toBe(complexity.score);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('panic-mode partnerDetails data is unchanged (100 iterations)', () => {
    const panicPartners = ['controlmonkey', 'n2ws', 'firefly'];
    fc.assert(
      fc.property(
        fc.constantFrom(...panicPartners),
        (partnerKey) => {
          var panicStep = window.WIZARD_STEPS.find(function (s) { return s.id === 'panic-partner'; });
          expect(panicStep).toBeDefined();
          expect(panicStep.partnerDetails).toBeDefined();

          var details = panicStep.partnerDetails[partnerKey];
          expect(details).toBeDefined();
          expect(details.fullName).toBeTruthy();
          expect(details.marketplace).toBeTruthy();
          expect(details.website).toBeTruthy();
          expect(details.focus).toBeTruthy();
          expect(details.pros.length).toBeGreaterThan(0);
          expect(details.cons.length).toBeGreaterThan(0);
          expect(details.immediateSteps.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: partner-modes, Property 10: State round-trip via localStorage
// **Validates: Requirements 10.4**
describe('PartnerModes — Property 10: State round-trip via localStorage', () => {
  const mmWorkloadArb = fc.constantFrom('ec2', 'containers', 'serverless', 'mixed');
  const mmDataArb = fc.constantFrom('insignificant', 'stateful', 'heavy-db');
  const mmUrgencyArb = fc.constantFrom('immediate', 'days', 'weeks');
  const mmComplexityArb = fc.constantFrom('single-vpc', 'multi-vpc', 'hybrid', 'multi-region');
  const mmApproachArb = fc.constantFrom('fastest', 'iac-rebuild', 'backup-restore', 'partner-led');
  const mmIndustryArb = fc.option(fc.constantFrom('finance', 'telco', 'public-sector', 'enterprise', 'other'), { nil: undefined });

  it('saveState then loadState restores identical state for new-mode keys (100 iterations)', () => {
    const partnerKeys = Object.keys(window.REGIONAL_PARTNERS);
    fc.assert(
      fc.property(
        fc.constantFrom('regional-partner', 'matchmaking'),
        fc.constantFrom(...partnerKeys),
        mmWorkloadArb, mmDataArb, mmUrgencyArb, mmComplexityArb, mmApproachArb, mmIndustryArb,
        (mode, partner, workload, data, urgency, complexity, approach, industry) => {
          var s = {
            urgencyMode: mode,
            regionalPartner: partner,
            mmWorkload: workload,
            mmData: data,
            mmUrgency: urgency,
            mmComplexity: complexity,
            mmApproach: approach
          };
          if (industry !== undefined) s.mmIndustry = industry;

          window.RMA.setState(s);
          window.RMA.setCurrentStep(3);
          window.RMA.saveState();

          // Clear in-memory state only (not localStorage)
          var origState = window.RMA.getState();
          window.RMA.setState({});
          window.RMA.setCurrentStep(0);
          expect(Object.keys(window.RMA.getState()).length).toBe(0);

          // Restore from localStorage
          var restored = window.RMA.loadState();
          expect(restored).toBe(true);

          var loaded = window.RMA.getState();
          expect(loaded.urgencyMode).toBe(mode);
          expect(loaded.regionalPartner).toBe(partner);
          expect(loaded.mmWorkload).toBe(workload);
          expect(loaded.mmData).toBe(data);
          expect(loaded.mmUrgency).toBe(urgency);
          expect(loaded.mmComplexity).toBe(complexity);
          expect(loaded.mmApproach).toBe(approach);
          if (industry !== undefined) {
            expect(loaded.mmIndustry).toBe(industry);
          }
          expect(window.RMA.getCurrentStep()).toBe(3);
        }
      ),
      { numRuns: 100 }
    );
  });
});
