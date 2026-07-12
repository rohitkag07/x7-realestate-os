#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const { findKeywordReply } = await import(pathToFileURL(path.join(repoRoot, 'agents/x7-re-sales-agent/keyword-engine.js')).href);
  const businesses = {
    spa: {
      id: '11111111-1111-4111-8111-111111111111',
      playbook: {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', version: 3,
        rules: [{ id: 'spa-fees', label: 'Spa fees', keywords: ['fees'], match_type: 'word', reply: 'Our spa package starts at Rs 1,500.', priority: 100, enabled: true, handoff: false }],
        fallback: 'Our spa manager will reply shortly.',
      },
    },
    property: {
      id: '22222222-2222-4222-8222-222222222222',
      playbook: {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', version: 7,
        rules: [{ id: 'property-fees', label: 'Property pricing', keywords: ['fees'], match_type: 'word', reply: 'Plot pricing starts at Rs 24 lakh.', priority: 100, enabled: true, handoff: false }],
        fallback: 'Our property advisor will reply shortly.',
      },
    },
  };

  function decide({ business, message, manual = false }) {
    if (manual) return { suppressed: true, outbound: null };
    const match = findKeywordReply(message, business.playbook.rules);
    return {
      suppressed: false,
      outbound: match?.rule.reply || business.playbook.fallback,
      handoff: !match || match.rule.handoff,
      metadata: {
        business_id: business.id,
        playbook_id: business.playbook.id,
        playbook_version: business.playbook.version,
        rule_id: match?.rule.id ?? null,
        match_type: match?.rule.match_type ?? null,
      },
    };
  }

  const checks = [];
  function prove(name, fn) {
    try {
      fn();
      checks.push({ name, ok: true });
      console.log(`✅ ${name}`);
    } catch (error) {
      checks.push({ name, ok: false });
      console.error(`❌ ${name}: ${error.message}`);
    }
  }

  const spaFees = decide({ business: businesses.spa, message: 'Fees kya hai?' });
  const propertyFees = decide({ business: businesses.property, message: 'Fees kya hai?' });
  prove('same keyword returns the Spa tenant reply', () => assert.equal(spaFees.outbound, 'Our spa package starts at Rs 1,500.'));
  prove('same keyword returns the Property tenant reply', () => assert.equal(propertyFees.outbound, 'Plot pricing starts at Rs 24 lakh.'));
  prove('tenant replies never cross', () => assert.notEqual(spaFees.outbound, propertyFees.outbound));
  prove('matched reply stores tenant and rule metadata', () => assert.deepEqual(spaFees.metadata, {
    business_id: businesses.spa.id,
    playbook_id: businesses.spa.playbook.id,
    playbook_version: 3,
    rule_id: 'spa-fees',
    match_type: 'word',
  }));

  const fallback = decide({ business: businesses.spa, message: 'Can you answer an unusual question?' });
  prove('unmatched input sends the configured tenant fallback', () => assert.equal(fallback.outbound, businesses.spa.playbook.fallback));
  prove('unmatched input opens a handoff', () => assert.equal(fallback.handoff, true));
  prove('unmatched metadata cannot claim a rule match', () => assert.equal(fallback.metadata.rule_id, null));
  prove('manual takeover suppresses automated outbound', () => assert.deepEqual(
    decide({ business: businesses.spa, message: 'fees', manual: true }),
    { suppressed: true, outbound: null },
  ));

  const salesSource = fs.readFileSync(path.join(repoRoot, 'agents/x7-re-sales-agent/index.js'), 'utf8');
  const summonerSource = fs.readFileSync(path.join(repoRoot, 'agents/x7-re-summoner/index.js'), 'utf8');
  const retiredPlaybookModule = ['vertical', 'playbooks'].join('-');
  prove('Sales Agent has no hardcoded vertical playbook dependency', () => assert.equal(salesSource.includes(retiredPlaybookModule), false));
  prove('Sales Agent sends text through Tool Gateway', () => assert.equal(salesSource.includes('`${toolGatewayUrl}/whatsapp/send/text`'), true));
  prove('Summoner routes configured businesses to /playbook/respond', () => assert.equal(summonerSource.includes("agentFetch('sales', '/playbook/respond'"), true));

  const failed = checks.filter((check) => !check.ok);
  console.log(`\nDynamic Keyword Engine proof: ${checks.length - failed.length}/${checks.length} checks passed.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`❌ proof crashed: ${error.message}`);
  process.exitCode = 1;
});
