'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {formatRateLimits, mergeRateLimitsResponse, unavailableValue, CdpSession, resolveCodexBin} = require('../agent.cjs');
const {StartupController} = require('../macos/startup/controller.cjs');
const {expectedUiVersion, inspectUsageBadge, agentConfig, startupConfig} = require('../manage.cjs');
const {rejectAutomaticUpdate} = require('../updater/core.cjs');
const window = (usedPercent, windowDurationMins=10080) => ({usedPercent,windowDurationMins,resetsAt:1793577600});
const quota = (planType,primary,secondary=null) => ({rateLimitsByLimitId:{codex:{limitId:'codex',planType,primary,secondary}}});

test('Pro 只有周额度时只显示一个真实圆环，重置时间固定北京时间',()=>{
  const value = formatRateLimits(quota('pro', window(52)));
  assert.equal(value.percent,48);
  assert.equal(value.meterLabel,'周额度');
  assert.equal(value.mode,'single');
  assert.equal(value.rings,null);
  assert.match(value.title,/11\/2 08:00 重置/);
  assert.match(value.title,/北京时间/);
  assert.doesNotMatch(value.title,/5h|5小时/);
});

test('按实际窗口选择双环，Pro 和 Plus 都支持',()=>{
  for(const plan of ['pro','plus']) {
    const value=formatRateLimits(quota(plan, window(25,300),window(60)));
    assert.equal(value.mode,'dual');
    assert.deepEqual(value.rings.map(r=>r.percent),[75,40]);
  }
  const single=formatRateLimits(quota('plus',window(25,300)));
  assert.equal(single.mode,'single');
  assert.equal(single.percent,75);
});

test('未知套餐、反向窗口顺序和其他额度桶不会误导显示',()=>{
  const response=quota('future',window(60),window(25,300));
  response.rateLimits={limitId:'other',primary:window(99)};
  assert.deepEqual(formatRateLimits(response).rings.map(r=>r.percent),[75,40]);
  const other=formatRateLimits({rateLimits:{limitId:'other',primary:window(1)}});
  assert.equal(other.percent,null);
  assert.equal(formatRateLimits(quota('future',window(10,1440))).meterLabel,'1天额度');
});

test('无数据和错误数字不会显示健康的旧额度',()=>{
  for(const value of [undefined,null,{},quota('pro',{usedPercent:'52'}),quota('pro',window(NaN))]) {
    assert.equal(formatRateLimits(value).percent,null);
  }
  assert.equal(formatRateLimits(quota('pro',window(120))).percent,0);
  const expired=unavailableValue(formatRateLimits(quota('pro',window(20,300),window(50))));
  assert.equal(expired.percent,null);
  assert.ok(expired.rings.every(r=>r.percent===null));
});

test('增量通知保留同窗口重置时间，账号切换和空值清除旧数据',()=>{
  const original={accountId:'fixture-a',...quota('pro',window(52))};
  const partial=mergeRateLimitsResponse(original,{rateLimitsByLimitId:{codex:{primary:{usedPercent:53}}}});
  assert.equal(partial.rateLimitsByLimitId.codex.primary.resetsAt,1793577600);
  assert.equal(formatRateLimits(partial).percent,47);
  const changed=mergeRateLimitsResponse(partial,{accountId:'fixture-b',rateLimits:null,rateLimitResetCredits:null});
  assert.equal(formatRateLimits(changed).percent,null);
  assert.equal(changed.rateLimitsByLimitId,undefined);
  const cleared=mergeRateLimitsResponse(original,{rateLimitsByLimitId:{codex:null}});
  assert.equal(formatRateLimits(cleared).percent,null);
});

test('拒绝远端、其他端口和带凭据的调试连接',async()=>{
  for(const address of ['ws://example.com:39222/devtools/page/test','ws://127.0.0.1:1234/devtools/page/test','ws://user:secret@127.0.0.1:39222/devtools/page/test']) {
    await assert.rejects(new CdpSession({webSocketDebuggerUrl:address}).connect(),/configured loopback port/);
  }
});

test('当前客户端 CLI 可找到，安装隔离且自动更新永久禁用',()=>{
  assert.match(resolveCodexBin(),/ChatGPT\.app\/Contents\/Resources\/codex-cli/);
  assert.equal(agentConfig().Label,'com.dongv.codexmeter.agent');
  assert.equal(startupConfig().Label,'com.dongv.codexmeter.startup');
  assert.ok(agentConfig().ProgramArguments[1].endsWith('CodexMeter/agent.cjs'));
  assert.throws(rejectAutomaticUpdate,{code:'ERR_PRIVATE_UPDATES_DISABLED'});
  const version=expectedUiVersion();
  assert.equal(version,54);
  assert.equal(inspectUsageBadge({placed:true,badgeCount:1,version,percent:48,updatedAt:Date.now(),stale:false},version).usageState,'ready');
});

test('安装时已运行的 Codex 不会被重启',async()=>{
  const events=[];
  const snapshot={apps:[{key:'existing'}]};
  const controller=new StartupController({snapshot:async()=>snapshot,record:async event=>events.push(event),quit:async()=>assert.fail('不能关闭正在工作的客户端')});
  await controller.tick();
  await controller.tick();
  assert.deepEqual(events,['watching']);
});

test('观察模式连新启动的窗口也不操作',async()=>{
  const events=[];
  const controller=new StartupController({snapshot:async()=>({apps:[{key:'fresh'}]}),record:async event=>events.push(event),quit:async()=>assert.fail('观察模式不能关闭客户端')},{allowClientRestart:false});
  await controller.tick();
  assert.deepEqual(events,['observing']);
});
