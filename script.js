let SESSION={t1:null,t2:null,done:false,day:null};

/* â”€â”€ HOISTED DECLARATIONS (TDZ fix) â”€â”€ */
let ACTIVE_PAGE='home';
let JOURNAL_PERIOD='month';
let ANALYTICS_PERIOD='month';
let HOME_PERIOD='month';
let _undoStack=null;
let _undoTimer=null;
let ENG = (function(){ try{ return JSON.parse(localStorage.getItem('tios_eng')||'null')||{xp:0,level:1,discipline_streak:0,best_streak:0,last_journal_date:null,challenges:[],completed_challenges:[],badges_earned:[],badges_new:[],weekly_xp:{}}; }catch(e){ return {xp:0,level:1,discipline_streak:0,best_streak:0,last_journal_date:null,challenges:[],completed_challenges:[],badges_earned:[],badges_new:[],weekly_xp:{}}; } })();
let _syncInProgress = false;
let _syncQueue = [];
let _lastSyncTime = localStorage.getItem('tios_last_sync') || null;
let _pendingSync = parseInt(localStorage.getItem('tios_pending_sync')||'0');
let _importTrades = [];


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONSTANTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
const QUOTES=[
  {t:"The market is a device for transferring money from the impatient to the patient.",a:"Warren Buffett"},
  {t:"Risk comes from not knowing what you are doing.",a:"Warren Buffett"},
  {t:"Cut losses short. Let profits run. Simple, not easy.",a:"Trading Maxim"},
  {t:"The goal of a successful trader is to make the best trades. Money is secondary.",a:"Alexander Elder"},
  {t:"Discipline is the bridge between your trading plan and your results.",a:"Mark Douglas"},
  {t:"Every loss is tuition. Every win is proof the edge exists.",a:"Trading Wisdom"},
  {t:"It's not whether you're right or wrong â€” it's how much you make when right.",a:"George Soros"},
  {t:"The elements of good trading: cutting losses, cutting losses, cutting losses.",a:"Ed Seykota"},
  {t:"Markets are never wrong. Opinions often are.",a:"Jesse Livermore"},
  {t:"Trade what you see, not what you think.",a:"Trading Wisdom"},
  {t:"Your job is not to predict the market. Your job is to manage risk.",a:"Van K. Tharp"},
  {t:"A peak performance trader is totally committed to being the best and doing whatever it takes.",a:"Van K. Tharp"},
];
const PAGE_TITLES={home:'Home',playbook:'Playbook',challenges:'Challenges',trophies:'Trophy Room',journal:'Journal',ritual:'Daily Ritual',calendar:'Calendar',analytics:'Analytics',strategies:'Strategies',psychology:'Psychology',rules:'Rules',summary:'AI Summary',dream:'Dream Challenge',path:'Path to Pro',capital:'Capital',settings:'Settings'};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STATE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
// â”€â”€ SHEETS URL: Set this once and bake into HTML â”€â”€
// Change SHEETS_URL below after deploying your Apps Script
const SHEETS_URL = '';  // <-- paste your Apps Script URL here after first setup
let WS = SHEETS_URL || localStorage.getItem('tios_ws') || '';

// â”€â”€ FIREBASE: cross-device real-time sync â”€â”€
let _fbApp = null;
let _fbDB = null;
let _fbRef = null;
let _fbListener = null;
let _fbConfig = (function(){ try { return JSON.parse(localStorage.getItem('tios_fb_config')||'null'); } catch(e){ return null; } })();

// Supabase configuration
let _supabaseUrl = localStorage.getItem('tios_supabase_url') || 'https://pcatdynchoqiwrsdxemt.supabase.co';
let _supabaseKey = localStorage.getItem('tios_supabase_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYXRkeW5jaG9xaXdyc2R4ZW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NjQ2MTIsImV4cCI6MjA5MTI0MDYxMn0.atrgEP8-e_NdxruBeWSuhdhEVNWjsYvfiWziztGs3gI';
let _supabase = null;
let _appBooted = false;
let _loadTimeout = null;

let THEME=localStorage.getItem('tios_theme')||'dark';
let APERIOD='month';
let ASTART=null,AEND=null;
let JP=1;
let CY,CM;
let charts={};
let D=ld();
let CFG=lcfg();

function ld(){try{return JSON.parse(localStorage.getItem('tios_data')||'null')||fd();}catch{return fd();}}
function lcfg(){try{return JSON.parse(localStorage.getItem('tios_cfg')||'null')||defCfg();}catch{return defCfg();}}
function defCfg(){return{cap:1000000,maxl:5000,risk:1,maxt:3,tdays:2,czero:30,dream:null,savings:[],wsUrl:''};}
function fd(){return{trades:[],capital:[],rules:[],strategies:[],mistakes:[],checklist:[],notes:{},emotion:{},ruleChecks:{}};}
function sv(){localStorage.setItem('tios_data',JSON.stringify(D));fbSave();}
function scfg(){localStorage.setItem('tios_cfg',JSON.stringify(CFG));fbSave();}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   BOOT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
document.addEventListener('DOMContentLoaded', async ()=>{
  const supabaseConfigured = _supabaseUrl && _supabaseKey && _supabaseUrl !== 'YOUR_SUPABASE_URL' && _supabaseKey !== 'YOUR_SUPABASE_ANON_KEY';
  if (!supabaseConfigured) {
    hideLoader();
    goPage('settings');
    const connectionTab = E('stab-connection-btn');
    if (connectionTab) switchSettingsTab('connection', connectionTab);
    return;
  }

  // Auto-init Supabase if config was previously saved
  if (supabaseConfigured) {
    initSupabase();
    E('supabaseStatus').textContent = 'ðŸŸ¢ Connected';
    E('supabaseStatus').style.color = 'var(--emerald)';
    E('supabaseConfigArea').style.display = 'none';
    E('supabaseDisconnectBtn').style.display = 'inline-flex';
  }

  // Auto-init Firebase if config was previously saved
  if (_fbConfig) { try { initFirebase(_fbConfig); } catch(e){} }

  // Apply theme immediately
  applyTheme(THEME, false);
  const now = new Date();
  CY = now.getFullYear(); CM = now.getMonth();
  setGreeting();
  const q = QUOTES[Math.floor(Math.random()*QUOTES.length)];
  E('heroQuote').textContent = '"'+q.t+'" â€” '+q.a;
  const td = now.toISOString().slice(0,10);
  ['t-dt','dep-dt','wd-dt','sv-dt','chal-start','dr-start'].forEach(id=>{const el=E(id);if(el)el.value=td;});
  E('noteDate').textContent = now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  if(E('wsUrl') && WS) E('wsUrl').value = WS;
  document.querySelectorAll('.ni[data-page]').forEach(el=>el.addEventListener('click',()=>goPage(el.dataset.page)));

  // Load data from Sheets or local
  await loadFromSheetsOrLocal();
});

function setGreeting(){
  const h=new Date().getHours();
  E('timePart').textContent=h<12?'morning':h<17?'afternoon':'evening';
  E('heroDate').textContent=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PERIOD BAR BUILDER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function buildPeriodBars(){
  const html=()=>`
    <div class="period-bar" style="margin-bottom:14px;">
      <div class="period-chip on" onclick="setP('week',this)">This Week</div>
      <div class="period-chip" onclick="setP('month',this)">This Month</div>
      <div class="period-chip" onclick="setP('quarter',this)">Quarter</div>
      <div class="period-chip" onclick="setP('fy',this)">FY (Aprâ€“Mar)</div>
      <div class="period-chip" onclick="setP('year',this)">Calendar Year</div>
      <div class="period-chip" onclick="setP('all',this)">All Time</div>
      <div class="period-chip" onclick="setP('custom',this)">Customâ€¦</div>
      <div class="date-range-inputs" id="customDates" style="display:none;">
        <input type="date" id="pStart" onchange="applyCustom()">
        <span style="color:var(--text3);font-size:12px;">â†’</span>
        <input type="date" id="pEnd" onchange="applyCustom()">
      </div>
    </div>`;
  ['journalPeriodBar','analyticsPBar','summaryPBar'].forEach(id=>{
    const el=E(id);if(el)el.innerHTML=html();
  });
}

function setP(p,el){
  APERIOD=p;ASTART=null;AEND=null;
  el.closest('.period-bar').querySelectorAll('.period-chip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  const cd=el.closest('.period-bar').querySelector('#customDates');
  if(cd)cd.style.display=p==='custom'?'flex':'none';
  if(p!=='custom'){rjnl();renderAnalytics(flt(),mtx(flt()));genSummary(true);}
}
function applyCustom(){
  const s=document.querySelector('#pStart'),e=document.querySelector('#pEnd');
  if(s&&e&&s.value&&e.value){ASTART=new Date(s.value);AEND=new Date(e.value);AEND.setHours(23,59,59);rjnl();renderAnalytics(flt(),mtx(flt()));genSummary(true);}
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SEED
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function seedD(){
  if(!D.rules.length)D.rules=[
    // â”€â”€ TRADING DAYS â”€â”€
    {id:'R001',desc:'Tuesday & Thursday â€” mandatory trading days',cat:'Timing',priority:'Critical',weight:3,why:'Focused days produce better setups and discipline',violations:0},
    {id:'R002',desc:'Other days â€” optional, genuine setup only',cat:'Timing',priority:'High',weight:2,why:'Trading every day dilutes edge and increases noise',violations:0},
    {id:'R003',desc:'Busy days â€” 1 trade only, 9:15â€“10:30 AM window',cat:'Timing',priority:'High',weight:2,why:'Partial attention = partial results. Limit exposure.',violations:0},
    // â”€â”€ ENTRY RULES â”€â”€
    {id:'R004',desc:'Pre-plan before session starts â€” levels identified',cat:'Entry',priority:'Critical',weight:3,why:'Reacting without a plan is gambling, not trading',violations:0},
    {id:'R005',desc:'CPR above = buy only Â· CPR below = sell only',cat:'Entry',priority:'Critical',weight:3,why:'Trading against CPR direction destroys win rate',violations:0},
    {id:'R006',desc:'Entry only after 12:30 PM (except busy days)',cat:'Entry',priority:'High',weight:2,why:'Morning noise clears after 12:30 â€” cleaner setups',violations:0},
    {id:'R007',desc:'Wait for swing formation â€” SL is the swing',cat:'Entry',priority:'Critical',weight:3,why:'Premature entries without swing = no logical SL',violations:0},
    {id:'R008',desc:'Wait for support / resistance confirmation',cat:'Entry',priority:'High',weight:2,why:'Confluence at S/R dramatically improves probability',violations:0},
    {id:'R009',desc:'Focus on setup â€” not on profit',cat:'Mindset',priority:'Critical',weight:3,why:'Profit focus creates FOMO and premature exits',violations:0},
    // â”€â”€ CIRCUIT BREAKERS â”€â”€
    {id:'R010',desc:'2 profitable trades = session over immediately',cat:'Risk',priority:'Critical',weight:3,why:'Greed after 2 wins has cost you the most. Walk away.',violations:0},
    {id:'R011',desc:'3 trades = session over. No exceptions.',cat:'Risk',priority:'Critical',weight:3,why:'Trade 4 is always a trap. You proved it on 24th March.',violations:0},
    {id:'R012',desc:'â‚¹50K profit = close terminal immediately',cat:'Risk',priority:'Critical',weight:3,why:'You were at â‚¹87,282 on 24th March. You stayed. You gave it back.',violations:0},
    {id:'R013',desc:'â‚¹50K loss = stop, no reload',cat:'Risk',priority:'Critical',weight:3,why:'Chasing losses compounds the damage. Stop.',violations:0},
    {id:'R014',desc:'â‚¹1L P&L day = next trading day off',cat:'Risk',priority:'High',weight:2,why:'Big days (win or lose) cause emotional distortion',violations:0},
    // â”€â”€ CAPITAL RULES â”€â”€
    {id:'R015',desc:'50% of capital per trade maximum',cat:'Risk',priority:'Critical',weight:3,why:'Concentration risk â€” never go all-in on one trade',violations:0},
    {id:'R016',desc:'Max â‚¹50K reload/day â€” wife\'s account only',cat:'Risk',priority:'Critical',weight:3,why:'Hard reload limit prevents spiralling losses',violations:0},
    {id:'R017',desc:'Withdraw profits until capital = â‚¹10L baseline',cat:'Risk',priority:'High',weight:2,why:'Protecting base capital is the primary objective',violations:0},
    {id:'R018',desc:'Trail setup on winners â€” no fixed target',cat:'Exit',priority:'High',weight:2,why:'Fixed targets cut winners short. Let the trade run.',violations:0},
    // â”€â”€ MINDSET ANCHOR â”€â”€
    {id:'R019',desc:'Process is the rule. Not the outcome.',cat:'Mindset',priority:'Critical',weight:3,why:'A bad process with a good outcome is still a bad trade',violations:0},
    {id:'R020',desc:'Trade 3 is the last. Because I said so.',cat:'Mindset',priority:'Critical',weight:3,why:'Self-agreement is the only discipline that works',violations:0},
    {id:'R021',desc:'Market always gives a reason for trade 4. It is a trap.',cat:'Mindset',priority:'Critical',weight:3,why:'The market is designed to make you overtrade',violations:0},
  ];
  if(!D.strategies.length)D.strategies=[
    {id:'S001',nm:'CPR Trend',ico:'ðŸ“ˆ',tp:'Intraday',tf:'15 min',setup:'Trade in direction of CPR. Confirm with swing high/low.',exit:'SL below CPR, target 2R'},
    {id:'S002',nm:'Reversal',ico:'ðŸ”„',tp:'Intraday',tf:'5 min',setup:'Price reaches key S/R, reversal candle pattern.',exit:'SL beyond swing, 1.5R target'},
    {id:'S003',nm:'Swing Breakout',ico:'âš¡',tp:'Intraday',tf:'15 min',setup:'Breakout of swing high with volume confirmation.',exit:'Retest entry or TSL'},
    {id:'S004',nm:'Opening Range',ico:'ðŸ•',tp:'Intraday',tf:'5 min',setup:'ORB â€” first 15-min range break with volume.',exit:'Opposite range boundary'},
  ];
  if(!D.checklist.length)D.checklist=[
    // PRE-TRADE â€” exact from Trading Rules v7
    {id:'p1',type:'pre',text:'Day pre-planned â€” levels identified',done:false},
    {id:'p2',type:'pre',text:'CPR direction confirmed â€” above (buy) / below (sell)',done:false},
    {id:'p3',type:'pre',text:'Support & Resistance levels marked',done:false},
    {id:'p4',type:'pre',text:'Entry time window confirmed',done:false},
    {id:'p5',type:'pre',text:'50% capital limit set for today',done:false},
    // POST-TRADE
    {id:'q1',type:'post',text:'Journal all executed trades with honest notes',done:false},
    {id:'q2',type:'post',text:'Review rule adherence â€” brutally honest',done:false},
    {id:'q3',type:'post',text:'Calculate net P&L including all charges',done:false},
    {id:'q4',type:'post',text:'Name one mistake to fix tomorrow',done:false},
    {id:'q5',type:'post',text:'Name one thing I executed well today',done:false},
    {id:'q6',type:'post',text:'Score today\'s discipline (auto-calculated)',done:false},
    {id:'q7',type:'post',text:'Update tomorrow\'s watchlist',done:false},
  ];
  if(!D.trades.length){
    const now=new Date(),y=now.getFullYear(),m=now.getMonth();
    const dd=(day,mo=0)=>new Date(y,m-mo,day).toISOString().slice(0,10);
    D.trades=[
      {id:'T001',source:'seed',dt:dd(7),tm:'10:15',sym:'NIFTY',dir:'Long',strat:'CPR Trend',en:120,ex:195,qt:75,bk:42,sl:100,tg:200,rr:2.5,rp:0.9,sq:'A+',pl:'Yes',rl:'Yes',em:'Calm ðŸ˜Œ',nt:'Perfect CPR entry. Held conviction.'},
      {id:'T002',source:'seed',dt:dd(9),tm:'11:30',sym:'BANKNIFTY',dir:'Long',strat:'Reversal',en:85,ex:62,qt:25,bk:28,sl:75,tg:115,rr:2.0,rp:0.6,sq:'A',pl:'Yes',rl:'Yes',em:'Calm ðŸ˜Œ',nt:'Good setup, news reversal.'},
      {id:'T003',source:'seed',dt:dd(14),tm:'09:45',sym:'NIFTY',dir:'Long',strat:'CPR Trend',en:95,ex:175,qt:75,bk:42,sl:80,tg:175,rr:2.0,rp:0.95,sq:'A+',pl:'Yes',rl:'Yes',em:'Confident ðŸ’ª',nt:'Strong trend.'},
      {id:'T004',source:'seed',dt:dd(16),tm:'10:00',sym:'NIFTY',dir:'Long',strat:'Swing Breakout',en:140,ex:230,qt:75,bk:42,sl:120,tg:240,rr:2.5,rp:1.0,sq:'A+',pl:'Yes',rl:'Yes',em:'Calm ðŸ˜Œ',nt:'Textbook breakout.'},
      {id:'T005',source:'seed',dt:dd(21),tm:'11:00',sym:'NIFTY',dir:'Long',strat:'CPR Trend',en:70,ex:48,qt:75,bk:42,sl:58,tg:100,rr:2.0,rp:0.7,sq:'B',pl:'Yes',rl:'Yes',em:'Neutral ðŸ˜',nt:'CPR not clear.'},
      {id:'T006',source:'seed',dt:dd(23),tm:'10:30',sym:'BANKNIFTY',dir:'Long',strat:'Opening Range',en:180,ex:310,qt:25,bk:28,sl:155,tg:310,rr:2.0,rp:0.9,sq:'A',pl:'Yes',rl:'Yes',em:'Confident ðŸ’ª',nt:'Clean ORB.'},
      {id:'T007',source:'seed',dt:dd(4,1),tm:'10:00',sym:'NIFTY',dir:'Long',strat:'CPR Trend',en:115,ex:205,qt:75,bk:42,sl:95,tg:210,rr:2.5,rp:0.95,sq:'A+',pl:'Yes',rl:'Yes',em:'Calm ðŸ˜Œ',nt:''},
      {id:'T008',source:'seed',dt:dd(11,1),tm:'11:15',sym:'NIFTY',dir:'Long',strat:'CPR Trend',en:55,ex:35,qt:75,bk:42,sl:44,tg:90,rr:2.0,rp:0.55,sq:'C',pl:'No',rl:'No',em:'FOMO ðŸ˜±',nt:'FOMO entry. Violated rules. Lesson: always wait.'},
      {id:'T009',source:'seed',dt:dd(13,1),tm:'10:15',sym:'BANKNIFTY',dir:'Long',strat:'Reversal',en:210,ex:370,qt:25,bk:28,sl:180,tg:380,rr:2.0,rp:0.9,sq:'A',pl:'Yes',rl:'Yes',em:'Calm ðŸ˜Œ',nt:''},
    ];
  }
  sv();
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   COMPUTE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function pnl(t){const g=(parseFloat(t.ex)-parseFloat(t.en))*parseFloat(t.qt)*(t.dir==='Short'?-1:1);return{gross:g,net:g-(parseFloat(t.bk)||0)};}

function flt(){
  const all=D.trades||[];
  if(APERIOD==='custom'&&ASTART&&AEND)return all.filter(t=>{const d=new Date(t.dt);return d>=ASTART&&d<=AEND;});
  if(APERIOD==='all')return all;
  const now=new Date();let s;
  if(APERIOD==='week')s=new Date(now.getFullYear(),now.getMonth(),now.getDate()-7);
  else if(APERIOD==='month')s=new Date(now.getFullYear(),now.getMonth()-1,now.getDate());
  else if(APERIOD==='quarter'){const qm=Math.floor(now.getMonth()/3)*3;s=new Date(now.getFullYear(),qm,1);}
  else if(APERIOD==='fy'){// Indian FY: Apr 1 to Mar 31
    const fy=now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;
    s=new Date(fy,3,1);
  }
  else if(APERIOD==='year')s=new Date(now.getFullYear(),0,1);
  else return all;
  return all.filter(t=>new Date(t.dt)>=s);
}

function fltPeriod(p){
  const all=D.trades||[];
  if(p==='all')return all;
  const now=new Date();let s;
  if(p==='week')s=new Date(now.getFullYear(),now.getMonth(),now.getDate()-7);
  else if(p==='month')s=new Date(now.getFullYear(),now.getMonth()-1,now.getDate());
  else if(p==='quarter'){s=new Date(now.getFullYear(),Math.floor(now.getMonth()/3)*3,1);}
  return all.filter(t=>new Date(t.dt)>=s);
}

function mtx(trades){
  if(!trades.length)return{tot:0,w:0,l:0,wr:'0.0',np:0,gp:0,bk:0,aw:0,al:0,pf:'â€”',exp:0,hp:0,dd:0,ws:0,ls:0,rr:'0.00',maxrr:0,disc:0,plan:0,rlFol:0};
  const W=[],L=[];let np=0,gp=0,bk=0,pk=0,rp=0,dd=0,ws=0,ls=0,mws=0,mls=0,rrs=0,rrc=0,ds=0,ps=0,rs=0,mxr=0;
  trades.forEach(t=>{
    const p=pnl(t);np+=p.net;gp+=p.gross;bk+=parseFloat(t.bk||0);
    if(p.net>0){W.push(p.net);ws++;ls=0;}else{L.push(p.net);ls++;ws=0;}
    mws=Math.max(mws,ws);mls=Math.max(mls,ls);
    rp+=p.net;if(rp>pk)pk=rp;dd=Math.max(dd,pk-rp);
    // Calculate actual R:R for wins
    if(p.net > 0){
      const risk = t.dir === 'Long' ? t.en - t.sl : t.sl - t.en;
      if(risk > 0){
        const actualRR = p.net / risk;
        rrs += actualRR;
        rrc++;
        mxr = Math.max(mxr, actualRR);
      }
    }
    // Auto discipline from rules
    const autoDisc=calcAutoDisc(t);
    ds+=autoDisc;
    if(t.pl==='Yes')ps++;
    if(t.rl==='Yes')rs++;
  });
  const wr=W.length/trades.length;
  const aw=W.length?W.reduce((a,b)=>a+b,0)/W.length:0;
  const al=L.length?Math.abs(L.reduce((a,b)=>a+b,0)/L.length):0;
  const pf=al>0?(W.reduce((a,b)=>a+b,0)/Math.abs(L.reduce((a,b)=>a+b,0))).toFixed(2):'â€”';
  return{tot:trades.length,w:W.length,l:L.length,wr:(wr*100).toFixed(1),np,gp,bk,aw,al,pf,exp:wr*aw-(1-wr)*al,hp:W.length?Math.max(...W):0,dd,ws:mws,ls:mls,rr:rrc?(rrs/rrc).toFixed(2):'0.00',maxrr:mxr,disc:trades.length?(ds/trades.length).toFixed(1):0,plan:trades.length?Math.round(ps/trades.length*100):0,rlFol:trades.length?Math.round(rs/trades.length*100):0};
}

// AUTO DISCIPLINE SCORE â€” based on rules followed, plan, setup quality
function calcAutoDisc(t){
  let score=10;
  // -3 if rules not followed
  if(t.rl==='No')score-=3;
  else if(t.rl==='Partial')score-=1;
  // -2 if plan not followed
  if(t.pl==='No')score-=2;
  else if(t.pl==='Partial')score-=1;
  // -1 if bad emotion
  if(['FOMO ðŸ˜±','Revenge ðŸ˜¤','Greedy ðŸ¤‘','Anxious ðŸ˜°'].includes(t.em))score-=1;
  // -1 if poor setup quality
  if(t.sq==='C'||t.sq==='D')score-=1;
  // -1 if rr below 1
  if(parseFloat(t.rr||0)<1.5)score-=0.5;
  return Math.max(1,Math.min(10,Math.round(score*2)/2));
}

// RITUAL DISCIPLINE â€” based on checklist + rule checks
function calcRitualDisc(){
  const pre=D.checklist.filter(c=>c.type==='pre');
  const post=D.checklist.filter(c=>c.type==='post');
  const preDone=pre.filter(c=>c.done).length;
  const postDone=post.filter(c=>c.done).length;
  const today=new Date().toISOString().slice(0,10);
  const ruleChecks=D.ruleChecks[today]||{};
  const rules=D.rules||[];
  let ruleScore=0,ruleMax=0;
  rules.forEach(r=>{const w=parseInt(r.weight||2);ruleMax+=w;if(ruleChecks[r.id]==='followed')ruleScore+=w;else if(ruleChecks[r.id]==='partial')ruleScore+=w*0.5;});
  const preScore=pre.length?preDone/pre.length:0;
  const postScore=post.length?postDone/post.length:0;
  const ruleRatio=ruleMax>0?ruleScore/ruleMax:0;
  const total=(preScore*0.2+postScore*0.3+ruleRatio*0.5)*10;
  return Math.max(1,Math.min(10,Math.round(total*2)/2));
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RENDER ALL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderAll(){
  const tr=fltPeriod('month'),m=mtx(tr);
  renderHomeKPIs(m,tr);
  renderHomeExtras(m,tr);
  renderHeatmap();
  renderPlaybook();
  renderTopTrades(tr);
  renderEQ(tr);
  renderWL(m);
  renderMonth();
  renderAnalytics(flt(),mtx(flt()));
  renderStrategies();
  renderPsychology(tr,m);
  renderRules();
  renderChecklist();
  renderCapital();
  renderCalendar();
  renderDream();
  renderPath(m);
  renderSummaryPage(true);
  updateDreamWidget();
  updateHeroLevel(m);
}

function updateHeroLevel(m){
  const all=D.trades||[];
  const wr=parseFloat(m.wr||0),pf=parseFloat(m.pf||0),disc=parseFloat(m.disc||0);
  const levels=[{n:'Learner',s:'Building habits',min:0},{n:'Student',s:'Edge forming',min:1},{n:'Developing',s:'Consistency growing',min:2},{n:'Skilled',s:'Managing risk well',min:4},{n:'Advanced',s:'Strong disciplined edge',min:5},{n:'Professional',s:'Trading is your craft',min:6},{n:'Elite Pro â­',s:'Peak performance',min:7}];
  const achieved=[all.length>=10,all.length>=50,wr>=50&&all.length>=30,pf>=1.5&&all.length>=50,disc>=8,parseFloat(consScore())>=70,wr>=60&&pf>=2&&disc>=8].filter(Boolean).length;
  const lv=levels.slice().reverse().find(l=>achieved>=l.min)||levels[0];
  T('heroStage',lv.n);T('heroStageSub',lv.s);T('heroLevel','TRADER LEVEL');
}

function consScore(){
  const bw={};(D.trades||[]).forEach(t=>{const d=new Date(t.dt);d.setDate(d.getDate()-d.getDay());const k=d.toISOString().slice(0,10);if(!bw[k])bw[k]=0;bw[k]+=pnl(t).net;});
  const wks=Object.values(bw),pw=wks.filter(v=>v>0).length;
  return wks.length?Math.round(pw/wks.length*100):0;
}

function renderHomeKPIs(m,tr){
  const np=m.np;
  E('h-pnl').textContent=(np>=0?'+':'')+'â‚¹'+F(Math.abs(np));
  E('h-pnl').className='kv '+(np>=0?'am':'rb');
  T('h-pnl-s',m.tot+' trades');
  E('h-pnl-b').style.width=Math.min(100,Math.abs(np)/100000*100)+'%';
  T('h-wr',m.wr+'%');E('h-wr-b').style.width=m.wr+'%';
  const pf=parseFloat(m.pf)||0;
  E('h-pf').textContent=m.pf;E('h-pf').className='kv '+(pf>=1.5?'em':pf>=1?'am':'rb');
  E('h-pf-b').style.width=Math.min(100,pf/3*100)+'%';
  const disc=parseFloat(m.disc)||0;
  T('h-disc',disc?disc+'/10':'â€”');E('h-disc-b').style.width=(disc*10)+'%';
  T('hw-w',m.w);T('hw-l',m.l);T('hw-t',m.tot);
  // Today
  const tod=new Date().toISOString().slice(0,10);
  const tt=D.trades.filter(t=>t.dt===tod);
  const tp=tt.reduce((s,t)=>s+pnl(t).net,0);
  const tpEl=E('td-pnl');tpEl.textContent=(tp>=0?'+':'')+'â‚¹'+F(Math.abs(tp));tpEl.style.color=tp>=0?'var(--emerald)':'var(--ruby)';
  T('td-tc',tt.length);
  T('td-streak',m.ws>0?'ðŸ”¥ '+m.ws+' wins':m.ls>1?'âš ï¸ '+m.ls+' losses':'â€”');
  const cl=D.checklist||[];T('td-cl',cl.filter(c=>c.done).length+'/'+cl.length);
  // Capital safety
  const cap=currentCap();const start=parseFloat(CFG.cap||1000000);
  const pctLeft=cap/start*100;
  const safe=pctLeft>parseFloat(CFG.czero||30);
  E('td-capsafe').textContent=safe?'âœ… Safe':'ðŸš¨ WARNING';
  E('td-capsafe').style.color=safe?'var(--emerald)':'var(--ruby)';
  // Confidence
  const ci=Math.min(100,parseFloat(m.wr)*0.4+(pf>0?Math.min(pf*15,35):0)+parseFloat(m.disc||0)*4+m.plan*0.2);
  E('ciKnob').style.left=Math.max(3,Math.min(97,ci))+'%';
  T('ci-score',ci.toFixed(0)+'/100');
  T('ciLabel',m.tot>0?`Based on ${m.tot} trades this month Â· WR ${m.wr}% Â· PF ${m.pf} Â· Disc ${m.disc}/10`:'Add trades to see your confidence index');
}

function renderTopTrades(tr){
  const top=tr.slice().sort((a,b)=>pnl(b).net-pnl(a).net).slice(0,5);
  const el=E('topTrades');
  if(!top.length){el.innerHTML='<div class="empty" style="padding:16px;"><div class="eico">ðŸ†</div><div class="esub">No trades yet</div></div>';return;}
  el.innerHTML=top.map((t,i)=>{const p=pnl(t),pos=p.net>=0;return`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--rim);"><span style="width:18px;height:18px;border-radius:4px;background:var(--panel2);display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:var(--text3);flex-shrink:0;">${i+1}</span><div style="flex:1;"><div style="font-size:12px;font-weight:700;">${t.sym}</div><div style="font-size:10px;color:var(--text3);">${t.dt}Â·${t.strat}</div></div><div style="font-family:var(--mono);font-weight:800;font-size:12px;color:${pos?'var(--emerald)':'var(--ruby)'};">${pos?'+':''}â‚¹${F(Math.abs(p.net))}</div></div>`;}).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CHARTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function mk(id,cfg){if(charts[id]){charts[id].destroy();delete charts[id];}const el=E(id);if(!el)return;charts[id]=new Chart(el.getContext('2d'),cfg);}
function tc(){const l=THEME==='light';return{g:l?'rgba(0,0,0,.05)':'rgba(255,255,255,.04)',t:l?'#6b7f99':'#2e3d52',bg:l?'#fff':'#0f1520',bd:l?'#0b1525':'#dce8f5',br:l?'rgba(0,0,0,.08)':'rgba(255,255,255,.05)'};}
function bo(){const c=tc();return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:c.bg,bodyColor:c.bd,borderColor:c.br,borderWidth:1,padding:9}},scales:{x:{grid:{color:c.g},ticks:{color:c.t,font:{size:10}}},y:{grid:{color:c.g},ticks:{color:c.t,font:{size:10}}}}};}
function renderEQ(tr,id='eqChart'){
  const s=tr.slice().sort((a,b)=>new Date(a.dt)-new Date(b.dt));let cum=0;const lb=[],da=[];
  s.forEach(t=>{cum+=pnl(t).net;lb.push(t.dt.slice(5));da.push(+cum.toFixed(0));});
  const l=THEME==='light';
  mk(id,{type:'line',data:{labels:lb,datasets:[{data:da,borderColor:'#10c97a',backgroundColor:ctx=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,200);g.addColorStop(0,l?'rgba(16,201,122,.2)':'rgba(16,201,122,.28)');g.addColorStop(1,'rgba(16,201,122,0)');return g;},fill:true,tension:0.4,pointRadius:da.map((_,i)=>i===da.length-1?4:0),pointBackgroundColor:'#10c97a',borderWidth:2.5}]},options:bo()});
}
function renderWL(m){const c=tc();mk('wlChart',{type:'doughnut',data:{labels:['W','L'],datasets:[{data:[m.w||0,m.l||0],backgroundColor:['rgba(16,201,122,.85)','rgba(240,64,96,.8)'],borderColor:['#10c97a','#f04060'],borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{display:false},tooltip:{backgroundColor:c.bg,bodyColor:c.bd,borderColor:c.br,borderWidth:1}}}});}
function renderMonth(id='monthChart'){
  const bm={};(D.trades||[]).forEach(t=>{const k=t.dt.slice(0,7);if(!bm[k])bm[k]=0;bm[k]+=pnl(t).net;});
  const ks=Object.keys(bm).sort().slice(-6),vs=ks.map(k=>+bm[k].toFixed(0));
  mk(id,{type:'bar',data:{labels:ks.map(k=>k.slice(5)),datasets:[{data:vs,backgroundColor:vs.map(v=>v>=0?'rgba(16,201,122,.7)':'rgba(240,64,96,.65)'),borderRadius:5,borderWidth:0}]},options:{...bo(),plugins:{legend:{display:false}}}});
}

function renderAnalytics(tr,m){
  renderExtraAnalytics(tr);
  renderEQ(tr,'a-eq');renderMonth('a-month');
  const dm={Mon:0,Tue:0,Wed:0,Thu:0,Fri:0};const dn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  tr.forEach(t=>{const d=dn[new Date(t.dt).getDay()];if(dm[d]!==undefined)dm[d]+=pnl(t).net;});
  const dv=Object.values(dm).map(v=>+v.toFixed(0));
  mk('a-day',{type:'bar',data:{labels:Object.keys(dm),datasets:[{data:dv,backgroundColor:dv.map(v=>v>=0?'rgba(74,144,245,.7)':'rgba(240,64,96,.6)'),borderRadius:5,borderWidth:0}]},options:{...bo(),plugins:{legend:{display:false}}}});
  mk('a-rr',{type:'bar',data:{labels:tr.map((_,i)=>i+1),datasets:[{data:tr.map(t=>parseFloat(t.rr||0)),backgroundColor:'rgba(240,165,0,.55)',borderRadius:4,borderWidth:0}]},options:{...bo(),plugins:{legend:{display:false}}}});
  const sp={};tr.forEach(t=>{if(!sp[t.strat])sp[t.strat]=0;sp[t.strat]+=pnl(t).net;});
  const sk=Object.keys(sp),sv=sk.map(k=>+sp[k].toFixed(0));
  mk('a-strat',{type:'bar',data:{labels:sk,datasets:[{data:sv,backgroundColor:sv.map(v=>v>=0?'rgba(16,201,122,.65)':'rgba(240,64,96,.6)'),borderRadius:5}]},options:{...bo(),plugins:{legend:{display:false}},scales:{x:{...bo().scales.x,ticks:{...bo().scales.x.ticks,maxRotation:35}},y:bo().scales.y}}});
  const np=m.np;E('a-pnl').textContent=(np>=0?'+':'')+'â‚¹'+F(Math.abs(np));E('a-pnl').className='kv '+(np>=0?'am':'rb');
  T('a-pnl-s','Gross â‚¹'+F(Math.abs(m.gp))+' | Brok â‚¹'+F(Math.abs(m.bk)));
  T('a-wr',m.wr+'%');E('a-wr-b').style.width=m.wr+'%';
  const pf=parseFloat(m.pf)||0;E('a-pf').textContent=m.pf;E('a-pf').className='kv '+(pf>=1.5?'em':pf>=1?'am':'rb');
  const exp=m.exp;E('a-exp').textContent=(exp>=0?'+':'')+'â‚¹'+F(Math.abs(exp));E('a-exp').className='kv '+(exp>=0?'em':'rb');
  // Key stats
  E('aKeyStats').innerHTML=[['Avg Win','â‚¹'+F(m.aw),'tg'],['Avg Loss','â‚¹'+F(m.al),'tr2'],['Win Streak',m.ws,''],['Loss Streak',m.ls,''],['Max Drawdown','â‚¹'+F(m.dd),'tr2'],['Brokerage','â‚¹'+F(m.bk),''],['Total Trades',m.tot,'']].map(([l,v,cls])=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--rim);font-size:12px;"><span style="color:var(--text2);">${l}</span><span class="tm ${cls}">${v}</span></div>`).join('');
  // Strategy breakdown
  E('aStratBd').innerHTML=sk.length?sk.map(s=>{const np2=sp[s];const ts=tr.filter(t=>t.strat===s),ws=ts.filter(t=>pnl(t).net>0).length;return`<div style="display:flex;align-items:center;gap:9px;padding:7px 0;border-bottom:1px solid var(--rim);"><div style="flex:1;"><div style="font-size:12px;font-weight:600;">${s}</div><div style="font-size:10px;color:var(--text3);">${ts.length} trades Â· ${ts.length?Math.round(ws/ts.length*100):0}% WR</div></div><div style="font-family:var(--mono);font-size:12px;font-weight:800;color:${np2>=0?'var(--emerald)':'var(--ruby)'};">${np2>=0?'+':''}â‚¹${F(Math.abs(np2))}</div></div>`;}).join(''):'<div class="empty" style="padding:16px;"><div class="esub">No data</div></div>';
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STRATEGIES PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderStrategies(){
  const all=D.trades||[];
  const sp={};
  D.strategies.forEach(s=>{
    const ts=all.filter(t=>t.strat===s.nm);
    const ms=mtx(ts);
    sp[s.nm]={...ms,trades:ts};
  });
  // Performance table
  const strats=D.strategies;
  E('stratPerfTable').innerHTML=strats.length?`<table><thead><tr><th>STRATEGY</th><th>TRADES</th><th>WIN RATE</th><th>NET P&L</th><th>AVG R:R</th><th>PROFIT FACTOR</th></tr></thead><tbody>${strats.map(s=>{const ms=sp[s.nm]||{tot:0,wr:'0.0',np:0,rr:'â€”',pf:'â€”'};const pos=(ms.np||0)>=0;return`<tr><td style="font-weight:700;">${s.ico||'ðŸ“ˆ'} ${s.nm}</td><td class="tm">${ms.tot||0}</td><td><div style="display:flex;align-items:center;gap:8px;"><div class="pbar" style="width:80px;"><div class="pbf" style="background:var(--sapphire);width:${ms.wr||0}%"></div></div><span class="tm">${ms.wr||0}%</span></div></td><td class="${pos?'tg':'tr2'}">${pos?'+':''}â‚¹${F(Math.abs(ms.np||0))}</td><td class="tm">1:${ms.rr||'â€”'}</td><td class="tm" style="color:${parseFloat(ms.pf||0)>=1.5?'var(--emerald)':parseFloat(ms.pf||0)>=1?'var(--amber)':'var(--ruby)'};">${ms.pf||'â€”'}</td></tr>`;}).join('')}</tbody></table>`:'<div class="empty" style="padding:20px;"><div class="esub">No strategies yet</div></div>';
  // Cards
  E('stratCards').innerHTML=strats.map(s=>{const ms=sp[s.nm]||{tot:0,wr:'0.0',np:0};return`<div class="strat-card"><div class="strat-icon" style="background:var(--panel3);">${s.ico||'ðŸ“ˆ'}</div><div class="strat-body"><div class="strat-name">${s.nm} <span class="tag tsa">${s.tp}</span> <span class="tag" style="background:var(--panel3);color:var(--text3);">${s.tf}</span></div><div class="strat-desc"><strong>Setup:</strong> ${s.setup||'â€”'}<br><strong>Exit:</strong> ${s.exit||'â€”'}</div><div class="strat-stats"><div class="ss-item"><div class="ss-val">${ms.tot||0}</div><div class="ss-lbl">Trades</div></div><div class="ss-item"><div class="ss-val" style="color:${parseFloat(ms.wr||0)>=50?'var(--emerald)':'var(--ruby)'};">${ms.wr||0}%</div><div class="ss-lbl">Win Rate</div></div><div class="ss-item"><div class="ss-val" style="color:${(ms.np||0)>=0?'var(--emerald)':'var(--ruby)'};">${(ms.np||0)>=0?'+':''}â‚¹${F(Math.abs(ms.np||0))}</div><div class="ss-lbl">Net P&L</div></div></div></div><button onclick="delStrat('${s.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:4px;" title="Delete">âœ•</button></div>`;}).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PSYCHOLOGY
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderPsychology(tr,m){
  const disc=parseFloat(m.disc)||0;
  T('ps-d',disc?disc+'/10':'â€”');E('ps-d-b').style.width=(disc*10)+'%';
  T('ps-p',m.plan+'%');E('ps-p-b').style.width=m.plan+'%';
  T('ps-r',m.rlFol+'%');E('ps-r-b').style.width=m.rlFol+'%';
  const tod=new Date().toISOString().slice(0,10);
  T('emoToday',D.emotion[tod]||'Not set');
  // Emotion chart
  const em2={};tr.forEach(t=>{const e=t.em||'Unknown';if(!em2[e])em2[e]=0;em2[e]+=pnl(t).net;});
  const ek=Object.keys(em2),ev=ek.map(k=>+em2[k].toFixed(0));
  mk('ps-emo',{type:'bar',data:{labels:ek,datasets:[{data:ev,backgroundColor:ev.map(v=>v>=0?'rgba(16,201,122,.7)':'rgba(240,64,96,.65)'),borderRadius:5}]},options:{...bo(),plugins:{legend:{display:false}}}});
  // Disc trend
  const s2=tr.slice().sort((a,b)=>new Date(a.dt)-new Date(b.dt)).slice(-20);
  mk('ps-disc',{type:'line',data:{labels:s2.map(t=>t.dt.slice(5)),datasets:[{data:s2.map(t=>calcAutoDisc(t)),borderColor:'#9d7ff5',backgroundColor:'rgba(157,127,245,.1)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'#9d7ff5'}]},options:{...bo(),scales:{x:bo().scales.x,y:{...bo().scales.y,min:0,max:10}}}});
  // Mistakes
  const ml=E('mList'),mks=D.mistakes||[];
  if(!mks.length){ml.innerHTML='<div class="empty"><div class="eico">âœ…</div><div class="etxt">No mistakes logged</div><div class="esub">Great discipline!</div></div>';return;}
  ml.innerHTML=mks.slice().reverse().slice(0,8).map(mk2=>`<div style="display:flex;gap:9px;padding:9px 0;border-bottom:1px solid var(--rim);"><div style="width:26px;height:26px;border-radius:7px;background:rgba(240,64,96,.1);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;">âš ï¸</div><div style="flex:1;"><div style="font-size:12px;font-weight:600;margin-bottom:2px;">${mk2.desc}</div><div style="font-size:11px;color:var(--text3);margin-bottom:4px;">${mk2.fix}</div><div style="display:flex;gap:7px;flex-wrap:wrap;"><span class="tag trb">${mk2.cat}</span>${mk2.cost?`<span style="font-size:10px;color:var(--ruby);">-â‚¹${F(parseFloat(mk2.cost))}</span>`:''}<span style="font-size:10px;color:var(--text3);">${mk2.date}</span></div></div></div>`).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   RULES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderRules(){
  const cc={Entry:'#4a90f5',Exit:'#0ea5c9',Risk:'#f04060',Mindset:'#9d7ff5',Timing:'#f0a500'};
  const rules=D.rules||[];
  T('r-act',rules.length);
  T('r-viol',rules.reduce((s,r)=>s+(r.violations||0),0));
  const mv=rules.slice().sort((a,b)=>(b.violations||0)-(a.violations||0))[0];
  T('r-worst',mv&&mv.violations>0?mv.desc.slice(0,35)+'â€¦':'All clear âœ…');
  E('rulesList').innerHTML=rules.map(r=>`<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--panel);border:1px solid var(--rim);border-radius:var(--r);margin-bottom:7px;transition:border-color .14s;" onmouseover="this.style.borderColor='var(--rim2)'" onmouseout="this.style.borderColor='var(--rim)'">
    <div style="width:9px;height:9px;border-radius:50%;background:${cc[r.cat]||'#4a90f5'};flex-shrink:0;margin-top:5px;"></div>
    <div style="flex:1;">
      <div style="font-size:13px;font-weight:600;margin-bottom:4px;">${r.desc}</div>
      ${r.why?`<div style="font-size:11px;color:var(--text3);margin-bottom:5px;font-style:italic;">"${r.why}"</div>`:''}
      <div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;">
        <span class="tag" style="background:rgba(74,144,245,.08);color:${cc[r.cat]||'#4a90f5'};">${r.cat}</span>
        <span style="font-size:10px;font-weight:700;color:${r.priority==='Critical'?'var(--ruby)':r.priority==='High'?'var(--amber)':'var(--sapphire)'};">${r.priority}</span>
        <span style="font-size:10px;color:var(--text3);">Weight: ${r.weight||2} Â· Violations: <span style="color:${(r.violations||0)===0?'var(--emerald)':(r.violations||0)<=2?'var(--amber)':'var(--ruby)'};">${r.violations||0}</span></span>
      </div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;">
      <div style="font-size:18px;">${(r.violations||0)===0?'âœ…':(r.violations||0)<=2?'âš ï¸':'ðŸš¨'}</div>
      <button onclick="delRule('${r.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:3px;">âœ•</button>
    </div>
  </div>`).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CHECKLIST + RULE CHECKS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderChecklist(){
  const pre=D.checklist.filter(c=>c.type==='pre');
  const post=D.checklist.filter(c=>c.type==='post');
  const pd=pre.filter(c=>c.done).length,ppd=post.filter(c=>c.done).length;
  T('preSc',`${pd}/${pre.length}`);T('postSc',`${ppd}/${post.length}`);
  const pp=pre.length?Math.round(pd/pre.length*100):0;
  const psp=post.length?Math.round(ppd/post.length*100):0;
  T('prePct',pp+'%');E('preBar').style.width=pp+'%';
  T('postPct',psp+'%');E('postBar').style.width=psp+'%';
  const ri=(list,id)=>E(id).innerHTML=list.map(c=>`<div class="ci ${c.done?'done':''}" onclick="togCI('${c.id}')"><div class="cbox ${c.done?'on':''}"></div><span class="ctxt">${c.text}</span></div>`).join('');
  ri(pre,'preList');ri(post,'postList');
  // Rule check list
  const today=new Date().toISOString().slice(0,10);
  const rc=D.ruleChecks[today]||{};
  E('ruleCheckList').innerHTML=(D.rules||[]).map(r=>{
    const st=rc[r.id]||'unchecked';
    return `<div class="rc ${st==='followed'?'checked':st==='violated'?'violated':''}" onclick="cycleRuleCheck('${r.id}')">
      <div class="rc-box"></div>
      <div style="flex:1;"><div class="rc-text">${r.desc}</div><div class="rc-cat">${r.cat} Â· ${r.priority} Â· Weight ${r.weight||2}</div></div>
      <div style="font-size:11px;color:var(--text3);">${st==='followed'?'âœ… Followed':st==='violated'?'âŒ Violated':st==='partial'?'âš¡ Partial':'Tap to mark'}</div>
    </div>`;
  }).join('');
  // Auto discipline score
  const ritual=calcRitualDisc();
  const discEl=E('discBadge');
  discEl.textContent=ritual+'/10';
  discEl.className='disc-badge '+( ritual>=9?'disc-10':ritual>=7?'disc-8':ritual>=5?'disc-6':'disc-4');
  T('discExplain',`Pre: ${pp}% Â· Post: ${psp}% Â· Rules: ${countRuleScore()}% â€” Composite score`);
  // Update home
  T('td-cl',D.checklist.filter(c=>c.done).length+'/'+D.checklist.length);
  // Restore notes
  E('dailyNotes').value=D.notes[today]||'';
  const d=new Date();
  E('noteDate').textContent=d.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'});
}

function countRuleScore(){
  const today=new Date().toISOString().slice(0,10);
  const rc=D.ruleChecks[today]||{};
  const rules=D.rules||[];let s=0,max=0;
  rules.forEach(r=>{const w=parseInt(r.weight||2);max+=w;if(rc[r.id]==='followed')s+=w;else if(rc[r.id]==='partial')s+=w*0.5;});
  return max>0?Math.round(s/max*100):0;
}

function togCI(id){const c=D.checklist.find(x=>x.id===id);if(c){c.done=!c.done;sv();renderChecklist();T('h-disc',calcRitualDisc()+'/10');}}
function resetCL(type){D.checklist.filter(c=>c.type===type).forEach(c=>c.done=false);sv();renderChecklist();}
function cycleRuleCheck(id){
  const today=new Date().toISOString().slice(0,10);
  if(!D.ruleChecks[today])D.ruleChecks[today]={};
  const cur=D.ruleChecks[today][id]||'unchecked';
  const next={unchecked:'followed',followed:'partial',partial:'violated',violated:'unchecked'}[cur];
  D.ruleChecks[today][id]=next;
  if(next==='violated'){const r=D.rules.find(x=>x.id===id);if(r)r.violations=(r.violations||0)+1;}
  sv();renderChecklist();
}
function saveNotes(){D.notes[new Date().toISOString().slice(0,10)]=E('dailyNotes').value;sv();toast('Notes saved','ok');}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CALENDAR â€” Google-calendar style
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderCalendar(){
  const now=new Date();
  E('calLbl').textContent=new Date(CY,CM,1).toLocaleString('default',{month:'long',year:'numeric'});
  // Build pnl map
  const dp={};
  D.trades.forEach(t=>{const d=new Date(t.dt);if(d.getFullYear()===CY&&d.getMonth()===CM){const k=d.getDate();if(!dp[k])dp[k]={pnl:0,trades:0};dp[k].pnl+=pnl(t).net;dp[k].trades++;}});
  // Calendar grid â€” include prev/next month days to fill 6 weeks
  const firstDay=new Date(CY,CM,1).getDay();
  const daysInMonth=new Date(CY,CM+1,0).getDate();
  const prevDays=new Date(CY,CM,0).getDate();
  let html='';
  // Previous month tail
  for(let i=firstDay-1;i>=0;i--)html+=`<div class="cc other-month empty"><div class="cc-n">${prevDays-i}</div></div>`;
  // Current month
  for(let d=1;d<=daysInMonth;d++){
    const dd=dp[d];const isT=now.getDate()===d&&now.getMonth()===CM&&now.getFullYear()===CY;
    const cls=dd===undefined?'':(dd.pnl>0?'profit':'loss');
    html+=`<div class="cc ${cls} ${isT?'today':''}" title="${dd?'P&L: â‚¹'+dd.pnl.toFixed(0)+' ('+dd.trades+' trades)':'No trades'}">
      <div class="cc-n">${d}</div>
      ${dd?`<div class="cc-pnl" style="color:${dd.pnl>0?'var(--emerald)':'var(--ruby)'};">${dd.pnl>0?'+':''}â‚¹${F(Math.abs(dd.pnl))}</div><div class="cc-trades">${dd.trades} trade${dd.trades>1?'s':''}</div>`:''}
    </div>`;
  }
  // Next month head
  const remaining=(7-((firstDay+daysInMonth)%7))%7;
  for(let i=1;i<=remaining;i++)html+=`<div class="cc other-month empty"><div class="cc-n">${i}</div></div>`;
  E('calGrid').innerHTML=html;
  // KPIs
  const vals=Object.values(dp);const mp=vals.reduce((a,b)=>a+b.pnl,0);
  E('cal-pnl').textContent=(mp>=0?'+':'')+'â‚¹'+F(Math.abs(mp));E('cal-pnl').className='kv '+(mp>=0?'am':'rb');
  T('cal-days',vals.length);
  T('cal-best','â‚¹'+F(vals.length?Math.max(...vals.map(v=>v.pnl)):0));
  T('cal-worst',vals.length&&Math.min(...vals.map(v=>v.pnl))<0?'-â‚¹'+F(Math.abs(Math.min(...vals.map(v=>v.pnl)))):'â‚¹0');
}
function calMov(d){CM+=d;if(CM>11){CM=0;CY++;}if(CM<0){CM=11;CY--;}renderCalendar();}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DREAM
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderDream(){
  const dr=CFG.dream;
  if(!dr){
    E('dreamHero').innerHTML=`<div class="card" style="text-align:center;padding:44px;"><div style="font-size:44px;margin-bottom:14px;">ðŸŽ¯</div><div style="font-size:18px;font-weight:800;margin-bottom:8px;">No Challenge Set Yet</div><div style="font-size:13px;color:var(--text3);margin-bottom:18px;">Create a personal challenge â€” car, house, freedom fund, any financial goal. It becomes your daily motivation to stay disciplined.</div><button class="btn bam" onclick="openDreamModal()">Create My Challenge â†’</button></div>`;
    E('dreamStats').style.display='none';return;
  }
  const savings=CFG.savings||[];
  const manualSaved = parseFloat(dr.sv||0) + savings.reduce((s,sv)=>s+(parseFloat(sv.am)||0),0);
  // Include actual trading profits as progress toward dream goal
  // Exclude seed sample trades (T001-T009) from dream progress
  const SEED_IDS = ['T001','T002','T003','T004','T005','T006','T007','T008','T009'];
  const realTrades = (D.trades||[]).filter(t => {
    if(SEED_IDS.includes(t.id) || t.source === 'seed') return false;
    if(dr.startDate && t.dt < dr.startDate) return false;
    return true;
  });
  const tradePnl = realTrades.reduce((s,t)=>s+pnl(t).net, 0);
  const saved = manualSaved + tradePnl;  // count all real P&L from startDate onward
  const target=parseFloat(dr.tgt||1);
  const pct=Math.min(100,(saved/target*100));
  // Daily target calc â€” auto
  const deadlineDays=dr.dt?Math.max(0,Math.ceil((new Date(dr.dt)-new Date())/(86400000))):null;
  const tradingDaysPerWeek=parseFloat(CFG.tdays||2);
  const tradingDaysLeft=deadlineDays?Math.round(deadlineDays/7*tradingDaysPerWeek):null;
  const needed=target-saved;
  const dailyTarget=tradingDaysLeft>0?Math.ceil(needed/tradingDaysLeft):null;
  E('dreamHero').innerHTML=`<div class="dream-hero" data-emoji="${dr.ico||'ðŸŽ¯'}">
    <div style="font-size:24px;font-weight:900;color:var(--amber);margin-bottom:3px;letter-spacing:-.4px;">${dr.ico||'ðŸŽ¯'} ${dr.nm||'My Dream'}</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:6px;">${dr.why||'My personal goal'}</div>
    ${dr.startDate?`<div style="display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;color:var(--amber);background:var(--amber3);border:1px solid rgba(240,165,0,.2);border-radius:99px;padding:2px 10px;margin-bottom:14px;">ðŸ“… Tracking trades from ${dr.startDate}</div>`:'<div style="margin-bottom:14px;"></div>'}
    <div style="display:flex;align-items:center;gap:28px;">
      <div style="position:relative;width:110px;height:110px;flex-shrink:0;">
        <svg viewBox="0 0 110 110" width="110" height="110" style="transform:rotate(-90deg)">
          <circle cx="55" cy="55" r="46" fill="none" stroke="rgba(240,165,0,.15)" stroke-width="9"/>
          <circle cx="55" cy="55" r="46" fill="none" stroke="url(#dg)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${pct/100*289} 289"/>
          <defs><linearGradient id="dg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#f0a500"/><stop offset="100%" stop-color="#ffbe3c"/></linearGradient></defs>
        </svg>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;"><div style="font-size:18px;font-weight:900;font-family:var(--mono);color:var(--amber);">${pct.toFixed(1)}%</div><div style="font-size:9px;color:var(--text3);">progress</div></div>
      </div>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;margin-bottom:7px;"><span style="font-size:12px;color:var(--text3);">Saved</span><span style="font-family:var(--mono);font-weight:800;color:var(--emerald);">â‚¹${F(saved)}</span></div>
        <div style="height:6px;background:var(--rim);border-radius:99px;overflow:hidden;margin-bottom:7px;"><div style="height:100%;background:linear-gradient(90deg,var(--amber),var(--amber2));border-radius:99px;width:${pct}%;transition:width .8s;"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text3);margin-bottom:12px;"><span>Target <b style="color:var(--text);">â‚¹${F(target)}</b></span><span>Need <b style="color:var(--text);">â‚¹${F(needed)}</b></span></div>
        ${dailyTarget?`<div style="background:var(--amber3);border:1px solid rgba(240,165,0,.2);border-radius:8px;padding:8px 12px;font-size:12px;"><strong style="color:var(--amber);">Auto Daily Target: â‚¹${F(dailyTarget)}/trading day</strong><div style="color:var(--text3);margin-top:2px;font-size:11px;">${tradingDaysLeft} trading days left Â· ${deadlineDays} calendar days</div></div>`:''}
      </div>
    </div>
  </div>`;
  E('dreamStats').style.display='block';
  T('dr-pct',pct.toFixed(1)+'%');E('dr-pct-b').style.width=pct+'%';
  T('dr-saved','â‚¹'+F(saved));T('dr-needed','â‚¹'+F(needed));
  T('dr-daily',dailyTarget?'â‚¹'+F(dailyTarget)+'/day':'Not set');
  T('dr-days-lbl',tradingDaysLeft?tradingDaysLeft+' trading days left':(deadlineDays!==null?deadlineDays+' days left':''));
  // Savings log
  const sl=E('savingsLog');
  sl.innerHTML=savings.length?`<div class="tw"><table><thead><tr><th>DATE</th><th>AMOUNT</th><th>SOURCE</th></tr></thead><tbody>${savings.slice().reverse().slice(0,8).map(sv=>`<tr><td class="tm">${sv.dt}</td><td class="tg">+â‚¹${F(parseFloat(sv.am))}</td><td style="color:var(--text3);font-size:11px;">${sv.src||'â€”'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty" style="padding:14px;"><div class="esub">No savings logged yet</div></div>';
  // Milestones
  E('dreamMiles').innerHTML=[25,50,75,90,100].map(p=>({p,done:pct>=p,lbl:`${p}% â€” â‚¹${F(target*p/100)}`})).map(ms=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--rim);"><div style="font-size:15px;">${ms.done?'âœ…':'â¬œ'}</div><div style="font-size:12px;color:${ms.done?'var(--emerald)':'var(--text3)'};">${ms.lbl}</div></div>`).join('');
  // Chart
  let cumSv=parseFloat(dr.sv||0);
  mk('dr-chart',{type:'line',data:{labels:savings.map(sv=>sv.dt.slice(5)),datasets:[{data:savings.map(sv=>{cumSv+=parseFloat(sv.am||0);return+cumSv.toFixed(0);}),borderColor:'#f0a500',backgroundColor:'rgba(240,165,0,.12)',fill:true,tension:0.3,pointRadius:4,pointBackgroundColor:'#f0a500'},{data:savings.map(()=>target),borderColor:'rgba(240,165,0,.2)',borderDash:[6,4],pointRadius:0}]},options:{...bo(),plugins:{legend:{display:false}}}});
}

function updateDreamWidget(){
  const dr=CFG.dream;
  T('dwName',dr?`${dr.ico||'ðŸŽ¯'} ${dr.nm||'My Dream'}`:'No Goal Set');
  if(!dr){E('dwBody').innerHTML='<div style="font-size:10px;color:var(--text3);text-align:center;">Tap to set your dream â†’</div>';return;}
  const savings=CFG.savings||[];
  const manualSaved = parseFloat(dr.sv||0) + savings.reduce((s,sv)=>s+(parseFloat(sv.am)||0),0);
  // Include actual trading profits as progress toward dream goal
  // Exclude seed sample trades (T001-T009) from dream progress
  const SEED_IDS = ['T001','T002','T003','T004','T005','T006','T007','T008','T009'];
  const realTrades = (D.trades||[]).filter(t => {
    if(SEED_IDS.includes(t.id) || t.source === 'seed') return false;
    if(dr.startDate && t.dt < dr.startDate) return false;
    return true;
  });
  const tradePnl = realTrades.reduce((s,t)=>s+pnl(t).net, 0);
  const saved = manualSaved + tradePnl;  // count all real P&L from startDate onward
  const target=parseFloat(dr.tgt||1);
  const pct=Math.min(100,(saved/target*100));
  const c=132;
  E('dwBody').innerHTML=`<div style="display:flex;align-items:center;gap:9px;"><div class="dw-ring"><svg viewBox="0 0 44 44" width="44" height="44"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(240,165,0,.15)" stroke-width="5"/><circle cx="22" cy="22" r="18" fill="none" stroke="var(--amber)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${pct/100*c} ${c}"/></svg><div class="dw-rpct">${pct.toFixed(0)}%</div></div><div style="flex:1;min-width:0;"><div style="font-size:10px;color:var(--text3);">â‚¹${F(saved)} of â‚¹${F(target)}</div>${dr.dt?'<div style="font-size:9px;color:var(--text3);margin-top:2px;">'+Math.max(0,Math.ceil((new Date(dr.dt)-new Date())/86400000))+' days left</div>':''}</div></div><div class="dw-bar"><div class="dw-bf" style="width:${pct}%"></div></div>`;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PATH
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderPath(m){
  const all=D.trades||[];const wr=parseFloat(m.wr||0),pf=parseFloat(m.pf||0),disc=parseFloat(m.disc||0);
  const bw={};all.forEach(t=>{const d=new Date(t.dt);d.setDate(d.getDate()-d.getDay());const k=d.toISOString().slice(0,10);if(!bw[k])bw[k]=0;bw[k]+=pnl(t).net;});
  const wks=Object.values(bw),pw=wks.filter(v=>v>0).length;
  const cons=wks.length?Math.round(pw/wks.length*100):0;
  const steps=[
    {ico:'ðŸ“š',t:'Foundation â€” 10 Trades',s:'10 journaled trades completed',done:all.length>=10},
    {ico:'ðŸ““',t:'Habit â€” 50 Trades',s:'50 trades with notes and discipline scores',done:all.length>=50},
    {ico:'ðŸŽ¯',t:'Edge Found â€” 50%+ Win Rate',s:'Win rate â‰¥ 50% over 30+ trades',done:wr>=50&&all.length>=30},
    {ico:'âš¡',t:'Edge Proven â€” PF 1.5+',s:'Profit Factor â‰¥ 1.5 over 50 trades',done:pf>=1.5&&all.length>=50},
    {ico:'ðŸ§ ',t:'Mind Mastered',s:'Avg discipline score â‰¥ 8',done:disc>=8},
    {ico:'ðŸ“ˆ',t:'Consistent â€” 70% Weeks',s:'70%+ profitable weeks over 3 months',done:cons>=70},
    {ico:'ðŸ’Ž',t:'Professional Trader',s:'WR 60%+ Â· PF 2+ Â· Disc 8+ Â· 75% weeks',done:wr>=60&&pf>=2&&disc>=8&&cons>=75},
  ];
  const achieved=steps.filter(s=>s.done).length;
  const curIdx=steps.findIndex(s=>!s.done);
  E('pathSteps').innerHTML=steps.map((s,i)=>`<div class="jstep"><div class="jdot ${s.done?'done':i===curIdx?'cur':'lock'}">${s.ico}</div><div class="jb"><div class="jt">${s.t}${s.done?' <span class="tag tem" style="font-size:9px;">âœ“ DONE</span>':''}</div><div class="js">${s.s}</div></div></div>`).join('');
  const levels=[{n:'Learner',s:'Building habits',min:0},{n:'Student',s:'Edge forming',min:1},{n:'Developing',s:'Consistency growing',min:2},{n:'Skilled',s:'Risk managed well',min:4},{n:'Advanced',s:'Strong disciplined edge',min:5},{n:'Professional',s:'Trading is your craft',min:6},{n:'Elite Pro â­',s:'Peak performance',min:7}];
  const lv=levels.slice().reverse().find(l=>achieved>=l.min)||levels[0];
  T('lvlName',lv.n);T('lvlSub',lv.s);T('pathLevel',lv.n);
  const nl=levels.find(l=>l.min>achieved);
  const lp=nl?Math.round((achieved-lv.min)/(nl.min-lv.min)*100):100;
  T('lvlPct',lp+'%');E('lvlBar').style.width=lp+'%';
  T('pt-c',cons+'%');E('pt-c-b').style.width=cons+'%';
  T('pt-p',m.plan+'%');E('pt-p-b').style.width=m.plan+'%';
  T('pt-r',m.rlFol+'%');E('pt-r-b').style.width=m.rlFol+'%';
  let cum=parseFloat(CFG.cap||1000000);
  const s3=all.slice().sort((a,b)=>new Date(a.dt)-new Date(b.dt));
  mk('pt-growth',{type:'line',data:{labels:s3.map(t=>t.dt.slice(5)),datasets:[{data:s3.map(t=>{cum+=pnl(t).net;return+cum.toFixed(0);}),borderColor:'#f0a500',backgroundColor:ctx=>{const g=ctx.chart.ctx.createLinearGradient(0,0,0,180);g.addColorStop(0,'rgba(240,165,0,.2)');g.addColorStop(1,'rgba(240,165,0,0)');return g;},fill:true,tension:0.4,pointRadius:0,borderWidth:2.5}]},options:bo()});
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CAPITAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function currentCap(){
  const ev=D.capital||[];
  if(ev.length)return parseFloat(ev[ev.length-1].run||0);
  return parseFloat(CFG.cap||1000000);
}
function renderCapital(){
  const ev=D.capital||[];
  const dep=ev.filter(e=>e.tp==='Deposit'||e.tp==='Initial').reduce((s,e)=>s+(parseFloat(e.am)||0),0);
  const wd=ev.filter(e=>e.tp==='Withdrawal').reduce((s,e)=>s+(parseFloat(e.am)||0),0);
  const cur=currentCap();
  const start=parseFloat(CFG.cap||1000000);
  const peak=ev.reduce((mx,e)=>Math.max(mx,parseFloat(e.run||0)),start);
  const maxDD=peak-cur;
  const roc=start>0?((cur-start)/start*100).toFixed(2):0;
  const czeroThresh=parseFloat(CFG.czero||30)/100;
  const warn=cur<start*czeroThresh;
  E('zeroAlert').style.display=warn?'flex':'none';
  if(warn)T('zeroAlertTxt',`Capital at â‚¹${F(cur)} â€” ${((cur/start)*100).toFixed(0)}% of starting. Protect your base.`);
  T('cap-cur','â‚¹'+F(cur));E('cap-cur').className='kv '+(cur>=start?'am':'rb');
  T('cap-dep','â‚¹'+F(dep));T('cap-wd','â‚¹'+F(wd));
  T('cap-roc',(roc>=0?'+':'')+roc+'%');E('cap-roc').className='kv '+(parseFloat(roc)>=0?'em':'rb');
  T('cap-start','â‚¹'+F(start));T('cap-peak','â‚¹'+F(peak));T('cap-dd','â‚¹'+F(maxDD));
  const safeRatio=Math.min(100,(cur/start*100)).toFixed(0);
  T('cap-safe-pct',safeRatio+'%');E('cap-safe-pct').style.color=parseFloat(safeRatio)>parseFloat(CFG.czero||30)?'var(--emerald)':'var(--ruby)';
  T('cap-vs-start',safeRatio+'%');E('cap-safety-bar').style.width=safeRatio+'%';
  // Table
  const ct=E('capTable');
  ct.innerHTML=ev.length?`<div class="tw ts" style="max-height:300px;"><table><thead><tr><th>DATE</th><th>TYPE</th><th>AMOUNT</th><th>RUNNING</th><th>NOTES</th></tr></thead><tbody>${ev.slice().reverse().map(e=>`<tr><td class="tm">${e.dt}</td><td><span class="tag ${e.tp==='Withdrawal'?'trb':'tem'}">${e.tp}</span></td><td class="${e.tp==='Withdrawal'?'tr2':'tg'}">â‚¹${F(parseFloat(e.am||0))}</td><td class="tm" style="font-weight:800;color:var(--amber);">â‚¹${F(parseFloat(e.run||0))}</td><td style="font-size:11px;color:var(--text3);">${e.nt||'â€”'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty"><div class="esub">No events. Add via Deposit / Withdraw buttons.</div></div>';
  // Chart
  let c2=start;
  mk('cap-chart',{type:'line',data:{labels:ev.map(e=>e.dt.slice(5)),datasets:[{data:ev.map(e=>{if(e.tp==='Deposit')c2+=parseFloat(e.am||0);else if(e.tp==='Withdrawal')c2-=parseFloat(e.am||0);return+c2.toFixed(0);}),borderColor:'#f0a500',backgroundColor:'rgba(240,165,0,.1)',fill:true,tension:0.3,pointRadius:3,pointBackgroundColor:'#f0a500'},{data:ev.map(()=>start),borderColor:'rgba(240,64,96,.3)',borderDash:[5,4],pointRadius:0}]},options:{...bo(),plugins:{legend:{display:false}}}});
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   AI SUMMARY
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderSummaryPage(silent){if(!silent)genSummary();}
function genSummary(silent){
  const tr=flt(),m=mtx(tr);
  if(!tr.length&&!silent){toast('No trades in selected period','err');return;}
  const wr=parseFloat(m.wr),pf=parseFloat(m.pf)||0,disc=parseFloat(m.disc||0);
  let txt='';
  if(!tr.length){T('sumText','No trades in this period. Log trades to generate analysis.');return;}
  txt+=`ðŸ“Š ${tr.length} trades analyzed.\n\n`;
  if(pf>=1.5&&wr>=50)txt+=`âœ… Strong edge: PF ${m.pf}x Â· ${wr}% win rate. Professional-grade numbers. `;
  else if(pf<1)txt+=`âš ï¸ Profit Factor ${m.pf} is below 1.0 â€” losses exceed gains. Exit discipline needs urgent review. `;
  else txt+=`ðŸ“ˆ PF ${m.pf} Â· ${wr}% WR. Edge exists but not fully optimized. Focus on holding winners longer. `;
  if(disc>=8)txt+=`Discipline avg ${disc}/10 is strong. `;
  else txt+=`Discipline avg ${disc}/10 needs work â€” rule violations are costing you measurable P&L. `;
  const fomo=tr.filter(t=>t.em==='FOMO ðŸ˜±'||t.em==='Revenge ðŸ˜¤').length;
  if(fomo>0)txt+=`âš ï¸ ${fomo} FOMO/Revenge trades â€” statistically your worst performers. `;
  txt+=`Avg R:R ${m.rr} Â· Expectancy â‚¹${F(Math.abs(m.exp))} per trade Â· Brokerage drain â‚¹${F(m.bk)}.`;
  T('sumText',txt);
  // Behavioral patterns
  const em2={};tr.forEach(t=>{const e=t.em||'â€”';if(!em2[e])em2[e]={n:0,pnl:0};em2[e].n++;em2[e].pnl+=pnl(t).net;});
  E('sumBehavior').innerHTML=Object.entries(em2).map(([e,d])=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--rim);font-size:12px;"><span>${e} <span style="color:var(--text3);">(${d.n})</span></span><span style="font-family:var(--mono);color:${d.pnl>=0?'var(--emerald)':'var(--ruby)'};">${d.pnl>=0?'+':''}â‚¹${F(Math.abs(d.pnl))}</span></div>`).join('');
  // Actions
  const acts=[];
  if(pf<1.5)acts.push({i:'ðŸŽ¯',t:'Raise minimum R:R to 1:2.5 â€” holds winners longer'});
  if(wr<50)acts.push({i:'ðŸ“Š',t:'Trade only A/A+ setups â€” tighten your entry criteria'});
  if(fomo>0)acts.push({i:'ðŸ§ ',t:'Mandatory 15-min pause after any loss before next trade'});
  if(disc<7)acts.push({i:'ðŸ“‹',t:'Complete daily ritual before every trading session'});
  acts.push({i:'ðŸ’°',t:`Brokerage â‚¹${F(m.bk)} paid â€” optimize lot sizes to reduce friction`});
  acts.push({i:'ðŸ“…',t:'Review this week: which day was most profitable?'});
  E('sumActions').innerHTML=acts.map(a=>`<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--rim);"><span style="font-size:14px;flex-shrink:0;">${a.i}</span><span style="font-size:12px;color:var(--text2);line-height:1.5;">${a.t}</span></div>`).join('');
  // Period stats
  E('sumStats').innerHTML=[['Total Trades',m.tot],['Wins',m.w],['Losses',m.l],['Win Rate',m.wr+'%'],['Profit Factor',m.pf],['Max Drawdown','â‚¹'+F(m.dd)],['Win Streak',m.ws],['Loss Streak',m.ls],['Avg Discipline',m.disc+'/10']].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--rim);font-size:12px;"><span style="color:var(--text2);">${l}</span><span class="tm">${v}</span></div>`).join('');
  if(!silent)toast('Analysis generated','ok');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FORMS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function subTrade(){
  const t={id:'T'+Date.now(),dt:v('t-dt'),tm:v('t-tm'),sym:v('t-sym'),dir:v('t-dir'),strat:v('t-strat'),en:parseFloat(v('t-en'))||0,ex:parseFloat(v('t-ex'))||0,qt:parseFloat(v('t-qt'))||1,bk:parseFloat(v('t-bk'))||0,sl:parseFloat(v('t-sl'))||0,tg:parseFloat(v('t-tg'))||0,rr:parseFloat(v('t-rr'))||0,rp:parseFloat(v('t-rp'))||0,sq:v('t-sq'),pl:v('t-pl'),rl:v('t-rl'),em:v('t-em'),nt:v('t-nt')};
  if(!t.sym||!t.en||!t.ex){toast('Fill symbol, entry & exit','err');return;}
  D.trades.push(t);sv();cm('tradeModal');
  const p=pnl(t);toast(`Logged! Disc: ${calcAutoDisc(t)}/10 Â· P&L: ${p.net>=0?'+':''}â‚¹${F(Math.abs(p.net))}`,'ok');
  renderAll();if(WS)push('addTrade',{trade:t});
}
function subStrat(){
  const s={id:'S'+Date.now(),nm:v('st-nm'),ico:v('st-ico')||'ðŸ“ˆ',tp:v('st-tp'),tf:v('st-tf'),setup:v('st-setup'),exit:v('st-exit')};
  if(!s.nm){toast('Name required','err');return;}
  D.strategies.push(s);sv();cm('stratModal');toast('Strategy added','ok');renderStrategies();
  // Sync trade modal strategy options
  updateStratOpts();
}
function updateStratOpts(){
  const sel=E('t-strat');if(!sel)return;
  const cur=sel.value;
  sel.innerHTML=D.strategies.map(s=>`<option value="${s.nm}">${s.nm}</option>`).join('')+'<option value="Other">Other</option>';
  sel.value=cur||D.strategies[0]?.nm;
}
/* subRule replaced by v5 version */function subMistake(){
  const m={id:'M'+Date.now(),desc:v('m-desc'),cat:v('m-cat'),cost:v('m-cost'),fix:v('m-fix'),date:new Date().toISOString().slice(0,10)};
  D.mistakes.push(m);sv();cm('mistakeModal');toast('Logged','ok');
  renderPsychology(flt(),mtx(flt()));
}
function saveDream(){
  CFG.dream={nm:v('dr-nm'),ico:v('dr-ico')||'ðŸŽ¯',tgt:parseFloat(v('dr-tgt'))||1,sv:parseFloat(v('dr-sv'))||0,dt:v('dr-dt'),startDate:v('dr-start')||null,why:v('dr-why')};
  scfg();cm('dreamModal');toast('Dream set! ðŸŽ¯ Let\'s get it!','ok');renderDream();updateDreamWidget();
}
function openDreamModal(){
  const dr=CFG.dream||{};
  const todayStr=new Date().toISOString().slice(0,10);
  const nm=E('dr-nm');if(nm)nm.value=dr.nm||'';
  const ico=E('dr-ico');if(ico)ico.value=dr.ico||'';
  const tgt=E('dr-tgt');if(tgt)tgt.value=dr.tgt||'';
  const sv=E('dr-sv');if(sv)sv.value=dr.sv||0;
  const dt=E('dr-dt');if(dt)dt.value=dr.dt||'';
  const start=E('dr-start');if(start)start.value=dr.startDate||todayStr;
  const why=E('dr-why');if(why)why.value=dr.why||'';
  om('dreamModal');
}
function addSaving(){
  if(!CFG.savings)CFG.savings=[];
  CFG.savings.push({id:'SV'+Date.now(),dt:v('sv-dt'),am:parseFloat(v('sv-am'))||0,src:v('sv-src')});
  scfg();cm('saveModal');toast('Saving added!','ok');renderDream();updateDreamWidget();
}
function addCapEv(type){
  const am=parseFloat(type==='Deposit'?v('dep-am'):v('wd-am'))||0;
  const dt=type==='Deposit'?v('dep-dt'):v('wd-dt');
  const nt=type==='Deposit'?v('dep-nt'):v('wd-nt');
  if(!am){toast('Enter amount','err');return;}
  const prev=currentCap();
  const run=type==='Withdrawal'?prev-am:prev+am;
  D.capital.push({id:'C'+Date.now(),dt,tp:type,am,run,nt});
  sv();cm(type==='Deposit'?'depositModal':'withdrawModal');
  toast(`${type} â‚¹${F(am)} recorded. Capital: â‚¹${F(run)}`,'ok');
  renderCapital();renderAll();
}
function saveAndConn(){
  const url=E('wsUrl').value.trim();
  if(url){WS=url;localStorage.setItem('tios_ws',url);tryConn();}
  saveProfile();toast('Settings saved','ok');
}
function saveProfile(){
  CFG.cap=parseFloat(E('s-cap').value)||1000000;
  if(E('calc-cap'))E('calc-cap').value=CFG.cap;
  if(E('calc-risk'))E('calc-risk').value=CFG.risk||1;CFG.maxl=parseFloat(E('s-maxl').value)||5000;
  CFG.risk=parseFloat(E('s-risk').value)||1;CFG.maxt=parseInt(E('s-maxt').value)||3;
  CFG.tdays=parseFloat(E('s-tdays').value)||2;CFG.czero=parseFloat(E('s-czero').value)||30;
  scfg();
}
function expData(){const b=new Blob([JSON.stringify({D,CFG},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='praveen_tios_backup.json';a.click();}
function clearAll(){if(!confirm('Clear ALL data?'))return;D=fd();sv();seedD();renderAll();toast('Cleared','err');}
function delRule(id){D.rules=D.rules.filter(r=>r.id!==id);sv();renderRules();renderChecklist();}
function delStrat(id){D.strategies=D.strategies.filter(s=>s.id!==id);sv();renderStrategies();}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   JOURNAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* old rjnl */
/* old delTrade removed */
/* push() replaced by full sync engine below */
function setConn(st,lb){E('cDot').className='cd'+(st?' '+st:'');E('cLbl').textContent=lb;const sd=E('sDot'),sl=E('sLbl');if(sd){sd.className='cd'+(st?' '+st:'');}if(sl)sl.textContent=lb;}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   NAV
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* old goPage removed â€” using v3 version below */

function setEqTab(p,el){document.querySelectorAll('#eqTabs .period-chip').forEach(c=>c.classList.remove('on'));el.classList.add('on');renderEQ(fltPeriod(p));}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   THEME
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function applyTheme(t,redraw=true){THEME=t;document.documentElement.setAttribute('data-theme',t);document.querySelectorAll('.tknob').forEach(k=>k.textContent=t==='light'?'â˜€ï¸':'ðŸŒ™');T('thLabel',t==='dark'?'Dark':'Light');localStorage.setItem('tios_theme',t);if(redraw)setTimeout(()=>renderAll(),60);}
function toggleTheme(){applyTheme(THEME==='dark'?'light':'dark');}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EMOTION
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function setEmo(e,el){document.querySelectorAll('.ec').forEach(c=>c.classList.remove('sel'));el.classList.add('sel');D.emotion[new Date().toISOString().slice(0,10)]=e;sv();T('emoToday',e);T('td-emo',e);toast('Emotion set: '+e,'ok');}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   P&L PREVIEW in trade modal (with auto disc)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function pvw(){
  const e=parseFloat(v('t-en'))||0,x=parseFloat(v('t-ex'))||0,q=parseFloat(v('t-qt'))||1,bk=parseFloat(v('t-bk'))||0;
  const n=(x-e)*q-bk;
  const el=E('pvwVal');if(el){el.textContent=(n>=0?'+':'')+'â‚¹'+F(Math.abs(n));el.style.color=n>=0?'var(--emerald)':'var(--ruby)';}
  // Estimate disc from current form values
  const pl=v('t-pl'),rl=v('t-rl'),em=v('t-em'),sq=v('t-sq'),rr=parseFloat(v('t-rr'))||0;
  const fakeT={pl,rl,em,sq,rr};const disc=calcAutoDisc(fakeT);
  const discEl=E('pvwDisc');
  if(discEl){discEl.textContent=`Auto Disc: ${disc}/10`;discEl.style.color=disc>=8?'var(--emerald)':disc>=6?'var(--amber)':'var(--ruby)';}
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   UTILS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function v(id){const el=E(id);return el?el.value:'';}
function E(id){return document.getElementById(id);}
function T(id,val){const el=E(id);if(el)el.textContent=val;}
function F(n){return Math.round(parseFloat(n)||0).toLocaleString('en-IN');}
function om(id){E(id).classList.add('on');}
function cm(id){E(id).classList.remove('on');}
document.querySelectorAll('.ov').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('on');}));
function toast(msg,type=''){const t=E('toast');t.textContent=msg;t.className='toast on'+(type?' '+type:'');setTimeout(()=>t.className='toast',3500);}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SESSION TRACKER (from Trading Rules v7)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
/* SESSION moved to top */

function setSessionDay(type){
  SESSION.day=type;
  ['sd-m','sd-o','sd-b'].forEach(id=>{const el=E(id);if(el)el.className='session-chip';});
  const map={m:'sd-m',o:'sd-o',b:'sd-b'};
  const el=E(map[type]);if(el)el.classList.add(map[type]);
  if(type==='b'){if(E('tr2'))E('tr2').style.display='none';if(E('tr3'))E('tr3').style.display='none';}
  toast(type==='m'?'Tue/Thu â€” max 3 trades':type==='o'?'Optional day â€” genuine setup only':'Busy day â€” 1 trade, 9:15â€“10:30','ok');
}

function logSession(num,result){
  if(SESSION.done)return;
  const slot=E('tr'+num);
  const btns=E('tr'+num+'-btns');
  const badge=E('tr'+num+'-badge');
  const subs=slot?slot.querySelectorAll('div'):[];
  // Style slot
  if(slot){slot.style.borderColor=result==='profit'?'rgba(16,201,122,.35)':'rgba(240,64,96,.35)';slot.style.background=result==='profit'?'rgba(16,201,122,.05)':'rgba(240,64,96,.05)';}
  if(btns)btns.style.display='none';
  if(badge){badge.style.display='inline-flex';badge.textContent=result==='profit'?'PROFIT':'LOSS';badge.className='tag '+(result==='profit'?'tem':'trb');}
  // Sub text
  const subEl=E('tr'+num+'-sub');if(subEl)subEl.textContent=result==='profit'?'PROFIT LOGGED âœ…':'LOSS LOGGED âŒ';
  if(num===1){SESSION.t1=result;
    if(SESSION.day==='b'){SESSION.done=true;if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';showSessionBanner(result==='profit'?'em':'rb',result==='profit'?'BUSY DAY COMPLETE':'LOSS ON BUSY DAY',result==='profit'?'One trade. Disciplined. Good.':'Tough day. Come back stronger.');}
    else setTimeout(()=>{const s=E('tr2');if(s){s.style.display='flex';}},300);
  }
  if(num===2){SESSION.t2=result;
    if(SESSION.t1==='profit'&&SESSION.t2==='profit'){SESSION.done=true;if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';showSessionBanner('em','TWO PROFITABLE TRADES âœ…','Session over. Walk away. You earned it. Every session you close right is one step closer to the goal.');}
    else setTimeout(()=>{const s=E('tr3');if(s){s.style.display='flex';}},300);
  }
  if(num===3){SESSION.done=true;if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';showSessionBanner('rb','SESSION COMPLETE â€” 3 TRADES DONE','Close the terminal. Your next trade is your next trading day.');}
}

function showSessionBanner(type,title,sub){
  const b=E('sessionBanner');if(!b)return;
  b.style.display='block';
  const colors={em:'rgba(16,201,122,.08)',rb:'rgba(240,64,96,.08)',am:'rgba(240,165,0,.08)'};
  const borders={em:'rgba(16,201,122,.3)',rb:'rgba(240,64,96,.3)',am:'rgba(240,165,0,.3)'};
  const text={em:'var(--emerald)',rb:'var(--ruby)',am:'var(--amber)'};
  b.style.background=colors[type]||colors.am;b.style.border='1px solid '+(borders[type]||borders.am);
  const t=text[type]||text.am;
  const te=E('sbnr-title');const se=E('sbnr-sub');
  if(te){te.textContent=title;te.style.color=t;}
  if(se){se.textContent=sub;se.style.color=t;}
}

function doneForDay(){
  if(SESSION.done)return;
  SESSION.done=true;
  if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';
  showSessionBanner('em','GOOD DISCIPLINE ðŸŽ¯','Session closed by choice. That is the hardest and best trade you made today.');
}

function resetSession(){
  SESSION={t1:null,t2:null,done:false,day:SESSION.day};
  [1,2,3].forEach(n=>{
    const sl=E('tr'+n);if(!sl)return;
    sl.style.borderColor='';sl.style.background='';
    const btns=E('tr'+n+'-btns');if(btns)btns.style.display='flex';
    const badge=E('tr'+n+'-badge');if(badge)badge.style.display='none';
    const sub=E('tr'+n+'-sub');if(sub)sub.textContent=n===3?'THE LAST TRADE. No exceptions.':'Log your outcome';
  });
  if(E('tr2'))E('tr2').style.display='none';
  if(E('tr3'))E('tr3').style.display='none';
  if(E('sessionBanner'))E('sessionBanner').style.display='none';
  if(E('doneForDayBtn'))E('doneForDayBtn').style.display='block';
  toast('Session reset','ok');
}


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE NAV HELPERS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function setMobNav(el){
  document.querySelectorAll('.mob-ni').forEach(n=>n.classList.remove('on'));
  el.classList.add('on');
}
function openMobDrawer(){
  E('mobDrawer').classList.add('open');
  E('mobOverlay').classList.add('on');
}
function closeMobDrawer(){
  E('mobDrawer').classList.remove('open');
  E('mobOverlay').classList.remove('on');
  document.querySelectorAll('.mob-drawer-item').forEach(i=>i.classList.remove('on'));
}
function goPageFromDrawer(p){
  closeMobDrawer();
  goPage(p);
  // Sync mob nav if it's a primary nav item
  document.querySelectorAll('.mob-ni[data-mob-page]').forEach(n=>{
    n.classList.toggle('on', n.dataset.mobPage===p);
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ACTIVITY HEATMAP
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderHeatmap(){
  const wrap=E('heatmapWrap');if(!wrap)return;
  const dp={};
  (D.trades||[]).forEach(t=>{if(!dp[t.dt])dp[t.dt]=0;dp[t.dt]+=pnl(t).net;});
  const today=new Date();
  const startDate=new Date(today);startDate.setDate(startDate.getDate()-83);
  const days=[];let cur=new Date(startDate);
  while(cur<=today){days.push(cur.toISOString().slice(0,10));cur=new Date(cur);cur.setDate(cur.getDate()+1);}
  const startDay=startDate.getDay();
  let html='<div style="display:inline-flex;gap:2px;align-items:flex-start;">';
  let week='<div class="heat-week">';
  for(let i=0;i<startDay;i++)week+='<div class="heat-day heat-0"></div>';
  days.forEach(d=>{
    const p=dp[d];
    let cls='heat-0';
    if(p!==undefined){cls=p<0?'heat-loss':p>50000?'heat-3':p>15000?'heat-2':'heat-1';}
    week+=`<div class="heat-day ${cls}" title="${d}: ${p!==undefined?(p>=0?'+':'')+'â‚¹'+F(Math.abs(p)):'No trades'}"></div>`;
    if(new Date(d).getDay()===6){html+=week+'</div>';week='<div class="heat-week">';}
  });
  html+=week+'</div></div>';
  wrap.innerHTML=html;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PLAYBOOK RENDER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderPlaybook(){
  const all=D.trades||[];
  const m=mtx(all);
  // Report card
  const wr=parseFloat(m.wr||0),pf=parseFloat(m.pf)||0,disc=parseFloat(m.disc||0);
  const score=Math.min(100,wr*0.35+(pf/3*35)+(disc/10*30));
  const grade=score>=85?'A+':score>=70?'A':score>=55?'B':score>=40?'C':'D';
  const grEl=E('pb-grade');
  if(grEl){grEl.textContent=grade;grEl.className='rc-grade '+grade[0];}
  T('pb-grade-txt',`Score ${score.toFixed(0)}/100 Â· WR ${m.wr}% Â· PF ${m.pf} Â· Disc ${m.disc}/10`);
  const sb=E('pb-score-bar');if(sb)sb.style.width=score+'%';
  T('pb-score-lbl',grade==='A+'?'Exceptional edge â€” keep executing':grade==='A'?'Strong performance':grade==='B'?'Good trader â€” keep refining':grade==='C'?'Edge developing â€” trust the process':'Focus on discipline first');
  // Setup quality breakdown
  const sq={};all.forEach(t=>{const q=t.sq||'B';if(!sq[q])sq[q]={n:0,pnl:0,w:0};sq[q].n++;sq[q].pnl+=pnl(t).net;if(pnl(t).net>0)sq[q].w++;});
  const sqEl=E('pb-sq-breakdown');
  if(sqEl)sqEl.innerHTML=['A+','A','B','C'].map(q=>{const d=sq[q]||{n:0,pnl:0,w:0};const wr2=d.n?Math.round(d.w/d.n*100):0;const colors={'A+':'var(--emerald)','A':'var(--sapphire)','B':'var(--amber)','C':'var(--ruby)'};return`<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--rim);font-size:12px;"><span style="font-size:13px;font-weight:900;color:${colors[q]};width:22px;">${q}</span><span style="flex:1;color:var(--text2);">${d.n} trades Â· ${wr2}% WR</span><span style="font-family:var(--mono);font-weight:700;color:${d.pnl>=0?'var(--emerald)':'var(--ruby)'};">${d.pnl>=0?'+':''}â‚¹${F(Math.abs(d.pnl))}</span></div>`;}).join('');
  // SQ Heatmap
  const hmEl=E('sq-heatmap');
  if(hmEl){
    const sorted=all.slice().sort((a,b)=>new Date(a.dt)-new Date(b.dt));
    const sqC={'A+':'sq-ap','A':'sq-a','B':'sq-b','C':'sq-c'};
    hmEl.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:3px;">'+sorted.map(t=>{const p=pnl(t);return`<div class="sq-cell ${sqC[t.sq]||'sq-b'}" title="${t.dt} ${t.sym}: ${p.net>=0?'+':''}â‚¹${F(Math.abs(p.net))} (${t.sq||'B'})" style="border:1px solid ${p.net>=0?'rgba(16,201,122,.3)':'rgba(240,64,96,.3)'};"></div>`;}).join('')+'</div>';
    const leg=E('sq-legend');
    if(leg)leg.innerHTML=['A+ Perfect','A Good','B Average','C Weak'].map((l,i)=>`<div style="display:flex;align-items:center;gap:5px;font-size:10px;color:var(--text3);"><div class="sq-cell ${'sq-ap sq-a sq-b sq-c'.split(' ')[i]}" style="width:12px;height:12px;flex-shrink:0;"></div>${l}</div>`).join('');
  }
  // Playbook cards
  const pcEl=E('playbookCards');
  if(pcEl){
    if(!D.strategies.length){pcEl.innerHTML='<div class="empty"><div class="esub">Add strategies to see playbook cards</div></div>';return;}
    pcEl.innerHTML=D.strategies.map(s=>{
      const ts=all.filter(t=>t.strat===s.nm);const ms=mtx(ts);const pos=(ms.np||0)>=0;
      return`<div class="playbook-card"><div class="pb-header"><div class="pb-icon" style="background:var(--panel3);">${s.ico||'ðŸ“ˆ'}</div><div><div class="pb-title">${s.nm}</div><div class="pb-sub">${s.tp} Â· ${s.tf}</div></div></div><div class="pb-stats"><div class="pb-stat"><div class="pb-sv">${ms.tot}</div><div class="pb-sl">Trades</div></div><div class="pb-stat"><div class="pb-sv" style="color:${parseFloat(ms.wr||0)>=50?'var(--emerald)':'var(--ruby)'};">${ms.wr||0}%</div><div class="pb-sl">Win Rate</div></div><div class="pb-stat"><div class="pb-sv" style="color:${pos?'var(--emerald)':'var(--ruby)'};">${pos?'+':''}â‚¹${F(Math.abs(ms.np||0))}</div><div class="pb-sl">Net P&L</div></div><div class="pb-stat"><div class="pb-sv">1:${ms.rr||'â€”'}</div><div class="pb-sl">Avg R:R</div></div><div class="pb-stat"><div class="pb-sv" style="color:${parseFloat(ms.pf||0)>=1.5?'var(--emerald)':parseFloat(ms.pf||0)>=1?'var(--amber)':'var(--ruby)'};">${ms.pf||'â€”'}</div><div class="pb-sl">Prof.Factor</div></div></div></div>`;
    }).join('');
  }
  // Patterns
  const lossTrades=all.filter(t=>pnl(t).net<0),winTrades=all.filter(t=>pnl(t).net>0);
  const lpEl=E('pb-loss-patterns');
  if(lpEl){
    const fomoL=lossTrades.filter(t=>t.em==='FOMO ðŸ˜±'||t.em==='Revenge ðŸ˜¤').length;
    const planL=lossTrades.filter(t=>t.pl==='No').length;
    const cL=lossTrades.filter(t=>t.sq==='C').length;
    lpEl.innerHTML=`<div style="font-size:12px;color:var(--text2);line-height:2.2;">${fomoL?`<div>ðŸ˜± FOMO/Revenge: <b style="color:var(--ruby);">${fomoL} trades</b></div>`:''}${planL?`<div>âŒ Plan broken: <b style="color:var(--ruby);">${planL} trades</b></div>`:''}${cL?`<div>âš ï¸ C-grade entry: <b style="color:var(--ruby);">${cL} trades</b></div>`:''}${!fomoL&&!planL&&!cL?'<div style="color:var(--emerald);">âœ… No major loss patterns</div>':''}</div>`;
  }
  const wpEl=E('pb-win-patterns');
  if(wpEl){
    const calmW=winTrades.filter(t=>t.em==='Calm ðŸ˜Œ'||t.em==='Focused ðŸŽ¯').length;
    const apW=winTrades.filter(t=>t.sq==='A+'||t.sq==='A').length;
    const planW=winTrades.filter(t=>t.pl==='Yes').length;
    wpEl.innerHTML=`<div style="font-size:12px;color:var(--text2);line-height:2.2;">${calmW?`<div>ðŸ˜Œ Calm/Focused: <b style="color:var(--emerald);">${calmW} trades</b></div>`:''}${apW?`<div>â­ A/A+ setups: <b style="color:var(--emerald);">${apW} trades</b></div>`:''}${planW?`<div>ðŸ“‹ Plan followed: <b style="color:var(--emerald);">${planW} trades</b></div>`:''}${!calmW&&!apW&&!planW?'<div style="color:var(--text3);">Log more trades to see patterns</div>':''}</div>`;
  }
  // Time chart
  const th={};all.forEach(t=>{const h=(t.tm||'09:30').split(':')[0];if(!th[h])th[h]=0;th[h]+=pnl(t).net;});
  const tk=Object.keys(th).sort(),tv=tk.map(k=>+th[k].toFixed(0));
  mk('pb-time-chart',{type:'bar',data:{labels:tk.map(h=>h+':00'),datasets:[{data:tv,backgroundColor:tv.map(v=>v>=0?'rgba(16,201,122,.65)':'rgba(240,64,96,.55)'),borderRadius:4,borderWidth:0}]},options:{...bo(),plugins:{legend:{display:false}}}});
  // Position calc prefill
  if(E('calc-cap'))E('calc-cap').value=CFG.cap||1000000;
  if(E('calc-risk'))E('calc-risk').value=CFG.risk||1;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   POSITION CALCULATOR
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function calcPos(){
  const cap=parseFloat(v('calc-cap'))||0,risk=parseFloat(v('calc-risk'))||0,sl=parseFloat(v('calc-sl'))||0;
  if(!cap||!risk||!sl){T('calc-result','â€”');T('calc-sub','Fill all fields');return;}
  const riskAmt=cap*(risk/100);
  const qty=Math.floor(riskAmt/sl);
  T('calc-result',qty+' units');
  T('calc-sub','Risk Amount: â‚¹'+F(riskAmt)+' Â· Per unit SL: â‚¹'+sl+' Â· Max risk: '+risk+'%');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MOBILE JOURNAL CARDS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderMobJournal(trades){
  const wrap=E('jMobWrap');if(!wrap)return;
  if(!trades.length){wrap.innerHTML='<div class="empty"><div class="eico">ðŸ““</div><div class="etxt">No trades found</div><div class="esub">Log your first trade</div></div>';return;}
  wrap.innerHTML=trades.slice(0,30).map(t=>{
    const p=pnl(t),pos=p.net>=0,disc=calcAutoDisc(t);
    return`<div class="trade-card-mob" onclick="">
      <div class="tcm-top">
        <div><span class="tcm-sym">${t.sym}</span> <span class="tag ${t.dir==='Long'?'tem':'trb'}" style="font-size:9px;">${t.dir}</span></div>
        <div class="tcm-pnl" style="color:${pos?'var(--emerald)':'var(--ruby)'};">${pos?'+':''}â‚¹${F(Math.abs(p.net))}</div>
      </div>
      <div class="tcm-meta">
        <span class="tag" style="background:var(--panel3);color:var(--text3);">${t.dt}</span>
        <span class="tag tam">${t.strat}</span>
        <span class="tag ${t.sq==='A+'||t.sq==='A'?'tem':t.sq==='B'?'tam':'trb'}">${t.sq}</span>
        <span class="disc-badge disc-${disc>=9?'10':disc>=7?'8':disc>=5?'6':'4'}">${disc}/10</span>
        <span style="font-size:10px;color:var(--text3);">${t.em}</span>
      </div>
      ${t.nt?`<div style="font-size:11px;color:var(--text3);margin-top:6px;border-top:1px solid var(--rim);padding-top:5px;">${t.nt.slice(0,80)}${t.nt.length>80?'â€¦':''}</div>`:''}
    </div>`;
  }).join('');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EXTRA ANALYTICS CHARTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderExtraAnalytics(tr){
  // Entry time
  const th={};tr.forEach(t=>{const h=(t.tm||'09:30').split(':')[0];if(!th[h])th[h]=0;th[h]+=pnl(t).net;});
  const tk=Object.keys(th).sort(),tv=tk.map(k=>+th[k].toFixed(0));
  mk('a-time',{type:'bar',data:{labels:tk.map(h=>h+':00'),datasets:[{data:tv,backgroundColor:tv.map(v=>v>=0?'rgba(74,144,245,.65)':'rgba(240,64,96,.55)'),borderRadius:4,borderWidth:0}]},options:{...bo(),plugins:{legend:{display:false}}}});
  // Symbol
  const syp={};tr.forEach(t=>{if(!syp[t.sym])syp[t.sym]=0;syp[t.sym]+=pnl(t).net;});
  const syk=Object.keys(syp),syv=syk.map(k=>+syp[k].toFixed(0));
  mk('a-sym',{type:'bar',data:{labels:syk,datasets:[{data:syv,backgroundColor:syv.map(v=>v>=0?'rgba(157,127,245,.65)':'rgba(240,64,96,.55)'),borderRadius:5}]},options:{...bo(),plugins:{legend:{display:false}}}});
  // R:R trend
  const s2=tr.slice().sort((a,b)=>new Date(a.dt)-new Date(b.dt)).slice(-20);
  mk('a-rr2',{type:'line',data:{labels:s2.map(t=>t.dt.slice(5)),datasets:[{data:s2.map(t=>parseFloat(t.rr||0)),borderColor:'var(--amber)',backgroundColor:'rgba(240,165,0,.1)',fill:true,tension:0.4,pointRadius:3,pointBackgroundColor:'var(--amber)',borderWidth:2}]},options:{...bo(),plugins:{legend:{display:false}}}});
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   HOME EXTRA KPIs
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function renderHomeExtras(m,tr){
  T('h-aw','â‚¹'+F(m.aw));
  T('h-al','â‚¹'+F(m.al));
  const dp={};tr.forEach(t=>{if(!dp[t.dt])dp[t.dt]=0;dp[t.dt]+=pnl(t).net;});
  const best=Object.values(dp).length?Math.max(...Object.values(dp)):0;
  E('h-best').textContent=(best>=0?'+':'')+'â‚¹'+F(Math.abs(best));
  E('h-best').className='kv '+(best>=0?'sa':'rb');
  T('h-brok','â‚¹'+F(m.bk));
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EXPORT CSV (Tradezella-style export)
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function expCSV(){
  if(!D.trades.length){toast('No trades to export','err');return;}
  const hdr=['Date','Time','Symbol','Direction','Strategy','Entry','Exit','Qty','Brokerage','Net P&L','R:R','Setup Quality','Plan Followed','Rules Followed','Emotion','Notes'];
  const rows=D.trades.map(t=>{const p=pnl(t);return[t.dt,t.tm||'',t.sym,t.dir,t.strat,t.en,t.ex,t.qt,t.bk,p.net.toFixed(2),t.rr,t.sq,t.pl,t.rl,t.em,(t.nt||'').replace(/,/g,';')];});
  const csv=[hdr,...rows].map(r=>r.join(',')).join('\n');
  const b=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='praveen_trades_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
  toast('CSV exported âœ…','ok');
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   IMPORT JSON BACKUP
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
function impData(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const parsed=JSON.parse(e.target.result);
      if(parsed.D)D=parsed.D;
      if(parsed.CFG)CFG=parsed.CFG;
      sv();scfg();
      renderAll();
      toast('Backup imported successfully âœ…','ok');
    }catch(err){toast('Invalid backup file','err');}
  };
  reader.readAsText(file);
  input.value='';
}

function toggleRGroup(id){
  const body=E(id),arr=E(id+'-arr');if(!body)return;
  const open=body.style.display==='block';
  body.style.display=open?'none':'block';
  if(arr)arr.style.transform=open?'':'rotate(180deg)';
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   V3 FIXES â€” ALL NEW / REPLACEMENT FUNCTIONS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ CR01 FIX: Checklist date-based auto-reset â”€â”€ */
function getChecklistKey(){return 'cl_'+new Date().toISOString().slice(0,10);}
function loadChecklist(){
  const todayKey=getChecklistKey();
  const stored=localStorage.getItem('tios_cl_date');
  if(stored!==todayKey){
    // New day â€” reset all checklist items
    D.checklist.forEach(c2=>c2.done=false);
    localStorage.setItem('tios_cl_date',todayKey);
    sv();
  }
}

/* â”€â”€ CR02 FIX: Session tracker persistence â”€â”€ */
function saveSession(){
  const today=new Date().toISOString().slice(0,10);
  localStorage.setItem('tios_session',JSON.stringify({...SESSION,date:today}));
}
function loadSession(){
  try{
    const s=JSON.parse(localStorage.getItem('tios_session')||'null');
    const today=new Date().toISOString().slice(0,10);
    if(s&&s.date===today){SESSION=s;}
    else{SESSION={t1:null,t2:null,done:false,day:null};}
  }catch{SESSION={t1:null,t2:null,done:false,day:null};}
}

/* â”€â”€ CR03 FIX: currentCap includes trade P&L â”€â”€ */
function currentCap(){
  const ev=D.capital||[];
  const start=parseFloat(CFG.cap||1000000);
  const tradePnl=(D.trades||[]).reduce((s,t)=>s+pnl(t).net,0);
  if(ev.length){
    const lastEvCap=parseFloat(ev[ev.length-1].run||start);
    // Recalc from deposits/withdrawals + trade PnL
    const deps=ev.filter(e=>e.tp==='Deposit'||e.tp==='Initial').reduce((s,e)=>s+(parseFloat(e.am)||0),0);
    const wds=ev.filter(e=>e.tp==='Withdrawal').reduce((s,e)=>s+(parseFloat(e.am)||0),0);
    return start+deps-wds+tradePnl;
  }
  return start+tradePnl;
}

/* â”€â”€ CR04 FIX: XSS safe text escape â”€â”€ */
function esc(str){
  if(!str)return'';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
}

/* â”€â”€ CR05 FIX: Trade edit functionality â”€â”€ */
function editTrade(id){
  const t=D.trades.find(x=>x.id===id);
  if(!t)return;
  // Pre-fill modal
  const td=new Date().toISOString().slice(0,10);
  E('t-dt').value=t.dt||td;
  E('t-tm').value=t.tm||'09:30';
  E('t-sym').value=t.sym||'';
  E('t-dir').value=t.dir||'Long';
  E('t-en').value=t.en||'';
  E('t-ex').value=t.ex||'';
  E('t-qt').value=t.qt||1;
  E('t-em').value=t.em||'Calm ðŸ˜Œ';
  E('t-sl').value=t.sl||'';
  E('t-tg').value=t.tg||'';
  E('t-bk').value=t.bk||40;
  E('t-rp').value=t.rp||1.0;
  E('t-rr').value=t.rr||2.0;
  E('t-sq').value=t.sq||'A';
  E('t-pl').value=t.pl||'Yes';
  E('t-rl').value=t.rl||'Yes';
  E('t-nt').value=t.nt||'';
  E('t-edit-id').value=id;
  if(E('t-sl-q')) E('t-sl-q').value=t.sl||'';
  E('tradeModalTitle').textContent='âœï¸ Edit Trade';
  E('tradeSubmitBtn').textContent='ðŸ’¾ Update Trade';
  updateStratOpts();
  E('t-strat').value=t.strat||D.strategies[0]?.nm||'CPR Trend';
  pvw(); // auto-recalculates R:R from existing entry/SL/exit values
  om('tradeModal');
}

function closeTradeModal(){
  cm('tradeModal');
  resetTradeModal();
}
function resetTradeModal(){
  const td=new Date().toISOString().slice(0,10);
  E('t-dt').value=td;E('t-tm').value='09:30';E('t-sym').value='';
  E('t-en').value='';E('t-ex').value='';E('t-qt').value=1;
  E('t-sl').value='';E('t-tg').value='';E('t-bk').value=40;
  E('t-rp').value=1.0;E('t-rr').value=2.0;E('t-sq').value='A+';
  E('t-pl').value='Yes';E('t-rl').value='Yes';E('t-nt').value='';
  E('t-em').value='Calm ðŸ˜Œ';E('t-edit-id').value='';
  E('tradeModalTitle').textContent='ðŸ““ Log Trade';
  E('tradeSubmitBtn').textContent='âš¡ Save Trade';
  const wEl=E('tradeWarn');if(wEl)wEl.style.display='none';
  pvw();
}

/* â”€â”€ H06 FIX: Violation counter â€” daily scoped â”€â”€ */
function cycleRuleCheck(id){
  const today=new Date().toISOString().slice(0,10);
  if(!D.ruleChecks[today])D.ruleChecks[today]={};
  const cur=D.ruleChecks[today][id]||'unchecked';
  const next={unchecked:'followed',followed:'partial',partial:'violated',violated:'unchecked'}[cur];
  const wasViolated=cur==='violated';
  D.ruleChecks[today][id]=next;
  // Only increment if newly set to violated (not if cycling back away)
  if(next==='violated'&&cur!=='violated'){
    const r=D.rules.find(x=>x.id===id);
    if(r){
      // Check if already counted today
      const violKey='tios_viol_'+today+'_'+id;
      if(!localStorage.getItem(violKey)){
        r.violations=(r.violations||0)+1;
        localStorage.setItem(violKey,'1');
      }
    }
  }
  sv();renderChecklist();
}

/* â”€â”€ H07 FIX: Safe localStorage save â”€â”€ */
function sv(){
  try{
    localStorage.setItem('tios_data',JSON.stringify(D));
    fbSave(); // non-blocking Firebase write for cross-device sync
  }catch(e){
    if(e.name==='QuotaExceededError'){
      toast('âš ï¸ Storage full! Export backup now.','err');
      E('backupBanner').style.display='flex';
      T('backupBannerTxt','Storage is full! Export your backup immediately.');
    }
  }
}

/* â”€â”€ H08 FIX: Separate period state per page â”€â”€ */
/* JOURNAL_PERIOD hoisted to top */
/* ANALYTICS_PERIOD hoisted to top */

function setJournalPeriod(p,el){
  JOURNAL_PERIOD=p;
  el.closest('.period-bar').querySelectorAll('.period-chip').forEach(c2=>c2.classList.remove('on'));
  el.classList.add('on');
  const cd=el.closest('.period-bar').querySelector('#customDates');
  if(cd)cd.style.display=p==='custom'?'flex':'none';
  if(p!=='custom')rjnl();
}
function setAnalyticsPeriod(p,el){
  ANALYTICS_PERIOD=p;APERIOD=p;ASTART=null;AEND=null;
  el.closest('.period-bar').querySelectorAll('.period-chip').forEach(c2=>c2.classList.remove('on'));
  el.classList.add('on');
  const cd=el.closest('.period-bar').querySelector('#customDates');
  if(cd)cd.style.display=p==='custom'?'flex':'none';
  if(p!=='custom'){renderAnalytics(flt(),mtx(flt()));genSummary(true);}
}
function fltJournal(){
  const all=D.trades||[];
  if(JOURNAL_PERIOD==='all')return all;
  const now=new Date();let s;
  if(JOURNAL_PERIOD==='week')s=new Date(now.getFullYear(),now.getMonth(),now.getDate()-7);
  else if(JOURNAL_PERIOD==='month')s=new Date(now.getFullYear(),now.getMonth()-1,now.getDate());
  else if(JOURNAL_PERIOD==='quarter'){const qm=Math.floor(now.getMonth()/3)*3;s=new Date(now.getFullYear(),qm,1);}
  else if(JOURNAL_PERIOD==='fy'){const fy=now.getMonth()>=3?now.getFullYear():now.getFullYear()-1;s=new Date(fy,3,1);}
  else if(JOURNAL_PERIOD==='year')s=new Date(now.getFullYear(),0,1);
  else return all;
  return all.filter(t=>new Date(t.dt)>=s);
}

/* â”€â”€ H09 FIX: Lazy render â€” only render active page â”€â”€ */
/* ACTIVE_PAGE hoisted to top */
function renderLazy(){
  const tr=fltPeriod('month'),m=mtx(tr);
  // Always render home base KPIs
  renderHomeKPIs(m,tr);
  renderHomeExtras(m,tr);
  renderEQ(tr);renderWL(m);renderMonth();
  renderWeeklyReview();
  updateDreamWidget();updateHeroLevel(m);
  // Render active page only
  switch(ACTIVE_PAGE){
    case'journal':rjnl();break;
    case'playbook':renderPlaybook();break;
    case'ritual':renderChecklist();break;
    case'calendar':renderCalendar();break;
    case'analytics':renderAnalytics(flt(),mtx(flt()));break;
    case'strategies':renderStrategies();break;
    case'psychology':renderPsychology(tr,m);break;
    case'rules':renderRules();break;
    case'dream':renderDream();break;
    case'path':renderPath(m);break;
    case'capital':renderCapital();break;
    case'summary':genSummary(true);break;
  }
}

/* â”€â”€ H03 FIX: FAB only on home/journal â”€â”€ */
function updateFabVisibility(page){
  const showOn=['home','journal'];
  const fab=E('mobFab');
  if(fab)fab.style.display=showOn.includes(page)?'flex':'none';
}

/* â”€â”€ M04+M18 FIX: Trade modal tabs + strategy opts â”€â”€ */
function switchTradeTab(tab,el){
  document.querySelectorAll('.qtab-btn').forEach(b=>b.classList.remove('on'));
  document.querySelectorAll('.qtab-pane').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  E('qt-'+tab).classList.add('on');
}

/* â”€â”€ M07 FIX: Period chip sync to APERIOD â”€â”€ */
function syncPeriodChips(barId,period){
  const bar=E(barId);if(!bar)return;
  bar.querySelectorAll('.period-chip').forEach(chip=>{
    const chipPeriod=chip.textContent.trim().toLowerCase()
      .replace('this week','week').replace('this month','month')
      .replace('quarter','quarter').replace('calendar year','year')
      .replace('all time','all').replace('fy (aprâ€“mar)','fy')
      .replace('1w','week').replace('1m','month').replace('qtr','quarter').replace('cy','year');
    chip.classList.toggle('on',chipPeriod===period||chip.textContent.trim()==='This Week'&&period==='week');
  });
}

/* â”€â”€ M05 FIX: ESC closes modals â”€â”€ */
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    document.querySelectorAll('.ov.on').forEach(o=>o.classList.remove('on'));
    resetTradeModal();
  }
});

/* â”€â”€ M11 FIX: Short trade validation â”€â”€ */
function validateTrade(){
  const en=parseFloat(v('t-en'))||0;
  const ex=parseFloat(v('t-ex'))||0;
  const qt=parseFloat(v('t-qt'))||0;
  const dir=v('t-dir');
  const warnEl=E('tradeWarn');
  const warns=[];
  if(en>0&&ex>0&&en===ex)warns.push('âš ï¸ Entry = Exit: This trade has zero P&L.');
  if(qt<0)warns.push('âŒ Quantity cannot be negative.');
  if(qt===0)warns.push('âš ï¸ Quantity is zero.');
  const today=new Date().toISOString().slice(0,10);
  if(v('t-dt')>today)warns.push('âš ï¸ Future date detected â€” this will distort analytics.');
  if(dir==='Long'&&en>0&&ex>0&&ex<en)warns.push('â„¹ï¸ Long trade showing a loss (exit < entry).');
  if(dir==='Short'&&en>0&&ex>0&&ex>en)warns.push('â„¹ï¸ Short trade showing a loss (exit > entry).');
  if(warnEl){
    if(warns.length){warnEl.style.display='block';warnEl.innerHTML=warns.join('<br>');}
    else warnEl.style.display='none';
  }
  return !warns.some(w=>w.startsWith('âŒ'));
}

/* â”€â”€ M12 FIX: Discipline score â€” don't penalize blank R:R â”€â”€ */
function calcAutoDisc(t){
  let score=10;
  if(t.rl==='No')score-=3;else if(t.rl==='Partial')score-=1;
  if(t.pl==='No')score-=2;else if(t.pl==='Partial')score-=1;
  if(['FOMO ðŸ˜±','Revenge ðŸ˜¤','Greedy ðŸ¤‘','Anxious ðŸ˜°'].includes(t.em))score-=1;
  if(t.sq==='C'||t.sq==='D')score-=1;
  // Only penalize R:R if explicitly set below 1.5 (not if blank/zero)
  const rr=parseFloat(t.rr||0);
  if(rr>0&&rr<1.5)score-=0.5;
  return Math.max(1,Math.min(10,Math.round(score*2)/2));
}

/* â”€â”€ M14 FIX: Sort trades by date+time â”€â”€ */
function sortTrades(trades){
  return trades.slice().sort((a,b)=>{
    const da=a.dt+(a.tm||'00:00');
    const db=b.dt+(b.tm||'00:00');
    return da.localeCompare(db);
  });
}

/* â”€â”€ M15 FIX: Undo for deletions â”€â”€ */
/* _undoStack hoisted to top */
/* _undoTimer hoisted to top */
function showUndoToast(msg,undoFn){
  _undoStack=undoFn;
  const t=E('undoToast');const m=E('undoMsg');
  if(t&&m){m.textContent=msg;t.classList.add('on');}
  if(_undoTimer)clearTimeout(_undoTimer);
  _undoTimer=setTimeout(()=>{if(t)t.classList.remove('on');_undoStack=null;},5000);
}
function doUndo(){
  if(_undoStack){_undoStack();_undoStack=null;}
  const t=E('undoToast');if(t)t.classList.remove('on');
  if(_undoTimer)clearTimeout(_undoTimer);
  toast('Undone âœ…','ok');
}

/* â”€â”€ M16 FIX: Import with structure validation â”€â”€ */
function impData(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const parsed=JSON.parse(e.target.result);
      if(!parsed.D||!parsed.CFG){toast('Invalid backup: missing D or CFG','err');return;}
      if(!Array.isArray(parsed.D.trades)){toast('Invalid backup: trades not an array','err');return;}
      // Destroy all existing charts before reload
      Object.values(charts).forEach(ch=>{try{ch.destroy();}catch{}});
      charts={};
      D=parsed.D;CFG=parsed.CFG;
      sv();scfg();
      renderAll();
      toast('Backup imported âœ… ('+parsed.D.trades.length+' trades)','ok');
    }catch(err){toast('Corrupt backup file â€” '+err.message,'err');}
  };
  reader.readAsText(file);input.value='';
}

/* â”€â”€ H10+DF01 FIX: Backup reminder â”€â”€ */
function checkBackupReminder(){
  const last=parseInt(localStorage.getItem('tios_last_backup')||'0');
  const days=(Date.now()-last)/(1000*60*60*24);
  const banner=E('backupBanner');
  if(!banner)return;
  if(D.trades.length>0&&(last===0||days>7)){
    banner.style.display='flex';
    T('backupBannerTxt',last===0?'You haven\'t backed up yet. Export now to protect your data.':
      `Last backup was ${Math.floor(days)} days ago. Export to stay safe.`);
  }
}
function hideBackupBanner(){
  const b=E('backupBanner');if(b)b.style.display='none';
  localStorage.setItem('tios_last_backup',Date.now().toString());
}

/* â”€â”€ L02 FIX: Home period selector â”€â”€ */
/* HOME_PERIOD hoisted to top */
function setHomePeriod(p,el){
  HOME_PERIOD=p;
  document.querySelectorAll('.hp-chip').forEach(c2=>c2.classList.remove('on'));
  el.classList.add('on');
  const tr=fltPeriod(p),m=mtx(tr);
  renderHomeKPIs(m,tr);renderHomeExtras(m,tr);
  renderEQ(tr);renderWL(m);
}

/* â”€â”€ L03 FIX: Playbook KPI cards â”€â”€ */
function renderPlaybookKPIs(){
  const all=D.trades||[];const m=mtx(all);
  const wr=parseFloat(m.wr||0),pf=parseFloat(m.pf)||0,disc=parseFloat(m.disc||0);
  const score=Math.min(100,wr*0.35+(pf/3*35)+(disc/10*30));
  const grade=score>=85?'A+':score>=70?'A':score>=55?'B':score>=40?'C':'D';
  const gradeEl=E('pb-kpi-grade');if(gradeEl){gradeEl.textContent=grade;gradeEl.className='kv am';}
  T('pb-kpi-trades',all.length);
  const sp={};D.strategies.forEach(s=>{
    const ts=all.filter(t=>t.strat===s.nm);
    sp[s.nm]={np:ts.reduce((a,t2)=>a+pnl(t2).net,0),nm:s.nm};
  });
  const spArr=Object.values(sp);
  if(!spArr.length){T('pb-kpi-best','No strategies');T('pb-kpi-worst','No strategies');return;}
  const best=spArr.slice().sort((a,b)=>b.np-a.np)[0];
  const worst=spArr.slice().sort((a,b)=>a.np-b.np)[0];
  T('pb-kpi-best',best?best.nm+' | '+(best.np>=0?'+':'')+'\u20b9'+F(Math.abs(best.np)):'\u2014');
  T('pb-kpi-worst',worst?worst.nm+' | '+(worst.np>=0?'+':'')+'\u20b9'+F(Math.abs(worst.np)):'\u2014');
}

/* â”€â”€ L06 FIX: Seed data management â”€â”€ */
function clearSampleData(){
  if(!confirm('Clear the 9 sample trades? Your own trades will remain.'))return;
  D.trades=D.trades.filter(t=>!['T001','T002','T003','T004','T005','T006','T007','T008','T009'].includes(t.id));
  sv();renderAll();toast('Sample data cleared âœ…','ok');
}

/* â”€â”€ L10 FIX: Name from settings â”€â”€ */
function saveName(){
  const name=E('s-name').value.trim()||'Praveen';
  CFG.name=name;scfg();
  const el=document.querySelector('.hero-greeting em:last-child');
  if(el)el.textContent=name+' ðŸ‘‹';
  toast('Name updated âœ…','ok');
}
function loadName(){
  const name=CFG.name||'Praveen';
  const el=document.querySelector('.hero-greeting em:last-child');
  if(el)el.textContent=name+' ðŸ‘‹';
  const inp=E('s-name');if(inp)inp.value=name;
}

/* â”€â”€ L14 FIX: Past notes â”€â”€ */
function renderPastNotes(){
  const el=E('pastNotesList');if(!el)return;
  const notes=D.notes||{};
  const today=new Date().toISOString().slice(0,10);
  const past=Object.entries(notes)
    .filter(([d])=>d!==today)
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .slice(0,7);
  if(!past.length){el.innerHTML='<div class="empty" style="padding:12px;"><div class="esub">No past notes yet</div></div>';return;}
  el.innerHTML=past.map(([d,txt])=>`<div class="note-hist-item">
    <div class="note-hist-date">${new Date(d).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})}</div>
    <div class="note-hist-body">${esc(txt).slice(0,200)}${txt.length>200?'â€¦':''}</div>
  </div>`).join('');
}

/* â”€â”€ L15 FIX: Weekly review card â”€â”€ */
function renderWeeklyReview(){
  const el=E('weeklyStats');if(!el)return;
  const now=new Date();
  const weekStart=new Date(now);weekStart.setDate(now.getDate()-now.getDay());weekStart.setHours(0,0,0,0);
  const weekTrades=(D.trades||[]).filter(t=>new Date(t.dt)>=weekStart);
  const m=mtx(weekTrades);
  el.innerHTML=[
    {l:'Trades',v:m.tot,c:'var(--sapphire)'},
    {l:'P&L',v:(m.np>=0?'+':'')+'â‚¹'+F(Math.abs(m.np)),c:m.np>=0?'var(--emerald)':'var(--ruby)'},
    {l:'Win Rate',v:m.wr+'%',c:'var(--amber)'},
    {l:'Discipline',v:m.disc?m.disc+'/10':'â€”',c:'var(--violet)'}
  ].map(s=>`<div style="text-align:center;"><div style="font-size:18px;font-weight:900;font-family:var(--mono);color:${s.c};">${s.v}</div><div style="font-size:10px;color:var(--text3);margin-top:2px;">${s.l}</div></div>`).join('');
}

/* â”€â”€ Settings tab switcher â”€â”€ */
function switchSettingsTab(tab,el){
  document.querySelectorAll('.stab').forEach(s=>s.classList.remove('on'));
  document.querySelectorAll('.stab-pane').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');
  const pane=E('stab-'+tab);if(pane)pane.classList.add('on');
  if(tab==='data')updateStorageInfo();
}

/* â”€â”€ Storage usage display â”€â”€ */
function updateStorageInfo(){
  const el=E('storageInfo');if(!el)return;
  const keys=['tios_data','tios_cfg','tios_theme','tios_ws'];
  let total=0;
  const rows=keys.map(k=>{const v2=localStorage.getItem(k)||'';const sz=new Blob([v2]).size;total+=sz;return`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--rim);"><span style="color:var(--text2);">${k}</span><span class="tm">${(sz/1024).toFixed(1)} KB</span></div>`;});
  rows.push(`<div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;"><span>Total</span><span class="tm" style="color:var(--amber);">${(total/1024).toFixed(1)} KB / ~5120 KB</span></div>`);
  el.innerHTML=rows.join('');
}

/* â”€â”€ Analytics heatmap (moved from home) â”€â”€ */
function renderHeatmapAnalytics(){
  const wrap=E('heatmapWrapAnalytics');if(!wrap)return;
  const dp={};
  (D.trades||[]).forEach(t=>{if(!dp[t.dt])dp[t.dt]=0;dp[t.dt]+=pnl(t).net;});
  const today=new Date();
  const startDate=new Date(today);startDate.setDate(startDate.getDate()-83);
  const days=[];let cur=new Date(startDate);
  while(cur<=today){days.push(cur.toISOString().slice(0,10));cur=new Date(cur);cur.setDate(cur.getDate()+1);}
  const startDay=startDate.getDay();
  let html='<div style="display:inline-flex;gap:2px;align-items:flex-start;">';
  let week='<div class="heat-week">';
  for(let i=0;i<startDay;i++)week+='<div class="heat-day heat-0"></div>';
  days.forEach(d=>{
    const p=dp[d];
    let cls='heat-0';
    if(p!==undefined){cls=p<0?'heat-loss':p>50000?'heat-3':p>15000?'heat-2':'heat-1';}
    week+=`<div class="heat-day ${cls}" title="${d}: ${p!==undefined?(p>=0?'+':'')+'â‚¹'+F(Math.abs(p)):'No trades'}"></div>`;
    if(new Date(d).getDay()===6){html+=week+'</div>';week='<div class="heat-week">';}
  });
  html+=week+'</div></div>';
  wrap.innerHTML=html;
}

/* â”€â”€ Updated goPage â”€â”€ */
function goPage(p){
  ACTIVE_PAGE=p;
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.ni').forEach(x=>x.classList.remove('on'));
  const el=E('pg-'+p);if(el)el.classList.add('on');
  const nav=document.querySelector(`.ni[data-page="${p}"]`);if(nav)nav.classList.add('on');
  T('pgTitle',PAGE_TITLES[p]||p);
  updateFabVisibility(p);
  if(p==='journal')rjnl(1);
  if(p==='calendar')renderCalendar();
  if(p==='analytics'){renderAnalytics(flt(),mtx(flt()));renderHeatmapAnalytics();}
  if(p==='strategies')renderStrategies();
  if(p==='psychology')renderPsychology(fltPeriod('month'),mtx(fltPeriod('month')));
  if(p==='rules')renderRules();
  if(p==='dream')renderDream();
  if(p==='playbook'){renderPlaybook();renderPlaybookKPIs();}
  if(p==='path')renderPath(mtx(D.trades||[]));
  if(p==='capital')renderCapital();
  if(p==='ritual'){renderChecklist();renderPastNotes();}
  if(p==='summary')genSummary(false);
  if(p==='home'){const tr2=fltPeriod(HOME_PERIOD);renderHomeKPIs(mtx(tr2),tr2);renderHomeExtras(mtx(tr2),tr2);renderWeeklyReview();}
  if(p==='settings'){checkBackupReminder();updateStorageInfo();loadAutoSyncSettings();updateSyncUI();}
  if(p==='challenges'){renderChallengesPage();}
  if(p==='trophies'){renderTrophyPage();}
}

/* â”€â”€ Updated rjnl with per-page period and XSS fix â”€â”€ */
function rjnl(page){
  if(page)JP=page;
  const q=(E('jsrch')||{value:''}).value.toLowerCase();
  const jf=(E('jfilter')||{value:''}).value;
  let tr=fltJournal().slice().reverse();
  if(q)tr=tr.filter(t=>(t.sym+t.strat+(t.nt||'')+(t.em||'')).toLowerCase().includes(q));
  if(jf==='win')tr=tr.filter(t=>pnl(t).net>0);
  else if(jf==='loss')tr=tr.filter(t=>pnl(t).net<0);
  else if(jf==='plan-no')tr=tr.filter(t=>t.pl==='No');
  else if(jf==='fomo')tr=tr.filter(t=>t.em==='FOMO ðŸ˜±'||t.em==='Revenge ðŸ˜¤');
  else if(jf==='aq')tr=tr.filter(t=>t.sq==='A+'||t.sq==='A');
  const allTr=fltJournal();
  const m=mtx(allTr);
  const np=m.np;E('j-pnl').textContent=(np>=0?'+':'')+'â‚¹'+F(Math.abs(np));E('j-pnl').className='kv '+(np>=0?'em':'rb');
  T('j-wr',m.wr+'%');T('j-rr','1:'+m.rr);T('j-disc',m.disc?m.disc+'/10':'â€”');
  const tot=tr.length,pp=10,pgs=Math.max(1,Math.ceil(tot/pp));
  JP=Math.min(JP,pgs);const sl=tr.slice((JP-1)*pp,JP*pp);
  const ww=E('jWrap');
  if(!sl.length){
    ww.innerHTML='<div class="empty"><div class="eico">ðŸ““</div><div class="etxt">No trades found</div><div class="esub">Log your first trade</div></div>';
    E('jPg').innerHTML='';T('jInfo','');
    renderMobJournal([]);return;
  }
  // XSS safe rendering using esc()
  ww.innerHTML=`<table><thead><tr><th>DATE</th><th>SYM</th><th>DIR</th><th>ENTRY</th><th>EXIT</th><th>SL</th><th>QTY</th><th>NET P&L</th><th>R:R</th><th>STRAT</th><th>PLAN</th><th>DISC</th><th>EMOTION</th><th>SQ</th><th></th></tr></thead><tbody>${sl.map(t=>{const p=pnl(t),pos=p.net>=0,disc=calcAutoDisc(t);return`<tr>
    <td class="tm">${esc(t.dt)}</td>
    <td style="font-weight:700;">${esc(t.sym)}</td>
    <td><span class="tag ${t.dir==='Long'?'tem':'trb'}">${esc(t.dir)}</span></td>
    <td class="tm">â‚¹${esc(String(t.en))}</td>
    <td class="tm">â‚¹${esc(String(t.ex))}</td>
    <td class="tm" style="color:var(--ruby);">${t.sl?'â‚¹'+esc(String(t.sl)):'â€”'}</td>
    <td class="tm">${esc(String(t.qt))}</td>
    <td class="${pos?'tg':'tr2'}" style="font-size:13px;">${pos?'â–²':'â–¼'} ${pos?'+':''}â‚¹${F(Math.abs(p.net))}</td>
    <td class="tm">1:${esc(String(t.rr||'â€”'))}</td>
    <td style="font-size:11px;color:var(--text2);">${esc(t.strat)}</td>
    <td><span class="tag ${t.pl==='Yes'?'tem':t.pl==='Partial'?'tam':'trb'}">${esc(t.pl)}</span></td>
    <td><span class="disc-badge disc-${disc>=9?'10':disc>=7?'8':disc>=5?'6':'4'}">${disc}/10</span></td>
    <td style="font-size:11px;">${esc(t.em||'â€”')}</td>
    <td><span class="tag ${t.sq==='A+'||t.sq==='A'?'tem':t.sq==='B'?'tam':'trb'}">${esc(t.sq||'â€”')}</span></td>
    <td style="display:flex;gap:4px;">
      <button onclick="editTrade('${esc(t.id)}')" style="background:none;border:none;color:var(--sapphire);cursor:pointer;font-size:13px;padding:2px 5px;" title="Edit">âœï¸</button>
      <button onclick="delTrade('${esc(t.id)}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:2px 5px;" title="Delete">âœ•</button>
    </td>
  </tr>`;}).join('')}</tbody></table>`;
  T('jInfo',`${(JP-1)*pp+1}â€“${Math.min(JP*pp,tot)} of ${tot} trades`);
  let pg='';if(JP>1)pg+=`<div class="pgb" onclick="rjnl(${JP-1})">â€¹</div>`;
  for(let i=1;i<=pgs;i++)pg+=`<div class="pgb ${i===JP?'on':''}" onclick="rjnl(${i})">${i}</div>`;
  if(JP<pgs)pg+=`<div class="pgb" onclick="rjnl(${JP+1})">â€º</div>`;
  E('jPg').innerHTML=pg;
  renderMobJournal(sl);
}

/* â”€â”€ Updated delTrade with undo â”€â”€ */
function delTrade(id){
  const t=D.trades.find(x=>x.id===id);
  if(!t)return;
  const snapshot=JSON.parse(JSON.stringify(t));
  D.trades=D.trades.filter(x=>x.id!==id);
  sv();renderLazy();rjnl();
  showUndoToast(`Trade deleted: ${snapshot.sym} ${snapshot.dir}`,()=>{
    D.trades.push(snapshot);sv();renderLazy();rjnl();
  });
}

/* â”€â”€ Updated delRule/delStrat with undo â”€â”€ */
function delRule(id){
  const r=D.rules.find(x=>x.id===id);if(!r)return;
  const snap=JSON.parse(JSON.stringify(r));
  D.rules=D.rules.filter(x=>x.id!==id);sv();renderRules();renderChecklist();
  showUndoToast('Rule deleted',()=>{D.rules.push(snap);sv();renderRules();renderChecklist();});
}
function delStrat(id){
  const s=D.strategies.find(x=>x.id===id);if(!s)return;
  const snap=JSON.parse(JSON.stringify(s));
  D.strategies=D.strategies.filter(x=>x.id!==id);sv();renderStrategies();
  showUndoToast('Strategy deleted',()=>{D.strategies.push(snap);sv();renderStrategies();});
}

/* â”€â”€ Updated subTrade: validation, edit, reset, updateStratOpts â”€â”€ */
function subTrade(){
  if(!validateTrade())return;
  const editId=v('t-edit-id');
  // Recalculate R:R from entry+SL+exit before saving
  const _en=parseFloat(v('t-en'))||0,_ex=parseFloat(v('t-ex'))||0;
  const _sl=parseFloat(v('t-sl'))||0,_dir=v('t-dir')||'Long';
  let _rr=parseFloat(v('t-rr'))||0;
  if(_en>0&&_sl>0&&_ex>0){
    let _calc=0;
    if(_dir==='Long'&&_en>_sl) _calc=(_ex-_en)/(_en-_sl);
    else if(_dir==='Short'&&_sl>_en) _calc=(_en-_ex)/(_sl-_en);
    if(_calc>0) _rr=parseFloat(_calc.toFixed(2));
  }
  const t={
    id:editId||'T'+Date.now(),
    dt:v('t-dt'),tm:v('t-tm'),sym:v('t-sym').toUpperCase(),
    dir:v('t-dir'),strat:v('t-strat'),
    en:_en,ex:_ex,
    qt:parseFloat(v('t-qt'))||1,bk:parseFloat(v('t-bk'))||40,
    sl:_sl,tg:parseFloat(v('t-tg'))||0,
    rr:_rr,rp:parseFloat(v('t-rp'))||0,
    sq:v('t-sq')||'A',pl:v('t-pl')||'Yes',rl:v('t-rl')||'Yes',
    em:v('t-em')||'Calm ðŸ˜Œ',nt:v('t-nt')
  };
  if(!t.sym||!t.en||!t.ex){toast('Fill symbol, entry & exit','err');return;}
  if(editId){D.trades=D.trades.filter(x=>x.id!==editId);toast('Trade updated âœ…','ok');}
  else{const p2=pnl(t);toast(`Logged! Disc: ${calcAutoDisc(t)}/10 Â· P&L: ${p2.net>=0?'+':''}â‚¹${F(Math.abs(p2.net))}`,'ok');}
  D.trades.push(t);sv();
  closeTradeModal();
  renderLazy();
  onTradeLogged(t);
  if(WS)push('addTrade',{trade:t});
}

/* â”€â”€ Updated updateStratOpts to use live strategies â”€â”€ */
function updateStratOpts(){
  const sel=E('t-strat');if(!sel)return;
  const cur=sel.value;
  const strats=D.strategies.length?D.strategies:[
    {nm:'CPR Trend'},{nm:'Reversal'},{nm:'Swing Breakout'},{nm:'Opening Range'},{nm:'Other'}
  ];
  sel.innerHTML=strats.map(s=>`<option value="${esc(s.nm)}">${esc(s.nm)}</option>`).join('')+'<option value="Other">Other</option>';
  if(cur)sel.value=cur;
}

/* â”€â”€ Updated renderAll to use lazy render + new inits â”€â”€ */
function renderAll(){
  loadChecklist();
  updateStratOpts();
  loadName();
  renderLazy();
  renderHomeEngagement();
  generateWeeklyChallenges();
  if(ACTIVE_PAGE==='analytics')renderHeatmapAnalytics();
}

/* â”€â”€ L12: Chart.js CDN fallback â”€â”€ */
window.addEventListener('error',e=>{
  if(e.filename&&e.filename.includes('chart')){
    document.querySelectorAll('canvas').forEach(cv=>{
      const p=cv.parentElement;
      if(p)p.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:11px;color:var(--text3);">Chart unavailable (offline)</div>';
    });
  }
},true);

/* â”€â”€ Boot: add session load + backup check â”€â”€ */
const _origBoot=document.addEventListener;
document.addEventListener('DOMContentLoaded',()=>{
  loadSession();
  setTimeout(checkBackupReminder,2000);
  updateFabVisibility('home');
});

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   OVERRIDE pvw() to include validation
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function pvw(){
  const e2=parseFloat(v('t-en'))||0,x=parseFloat(v('t-ex'))||0,q=parseFloat(v('t-qt'))||1,bk=parseFloat(v('t-bk'))||0;
  const n=(x-e2)*q-bk;
  const el=E('pvwVal');if(el){el.textContent=(n>=0?'+':'')+'â‚¹'+F(Math.abs(n));el.style.color=n>=0?'var(--emerald)':'var(--ruby)';}
  // Auto-calculate R:R from entry + SL + exit
  const sl=parseFloat(v('t-sl')||v('t-sl-q'))||0;
  const dir=v('t-dir')||'Long';
  const rrEl=E('t-rr');
  if(e2>0&&sl>0&&x>0&&rrEl){
    let calcRR=0;
    if(dir==='Long'&&e2>sl) calcRR=(x-e2)/(e2-sl);
    else if(dir==='Short'&&sl>e2) calcRR=(e2-x)/(sl-e2);
    if(calcRR>0){
      rrEl.value=parseFloat(calcRR.toFixed(2));
      rrEl.style.color=calcRR>=1.5?'var(--emerald)':calcRR>=1?'var(--amber)':'var(--ruby)';
    }
  }
  const pl=v('t-pl'),rl=v('t-rl'),em=v('t-em'),sq=v('t-sq'),rr=parseFloat(v('t-rr'))||0;
  const fakeT={pl,rl,em,sq,rr};const disc=calcAutoDisc(fakeT);
  const discEl=E('pvwDisc');
  if(discEl){discEl.textContent=`Auto Disc: ${disc}/10`;discEl.style.color=disc>=8?'var(--emerald)':disc>=6?'var(--amber)':'var(--ruby)';}
  // Live validation
  if(e2>0||x>0)validateTrade();
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   PATCHED logSession to persist SESSION
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const _origLogSession=window.logSession;
function logSession(num,result){
  if(SESSION.done)return;
  const slot=E('tr'+num);
  const btns=E('tr'+num+'-btns');
  const badge=E('tr'+num+'-badge');
  if(slot){slot.style.borderColor=result==='profit'?'rgba(16,201,122,.35)':'rgba(240,64,96,.35)';slot.style.background=result==='profit'?'rgba(16,201,122,.05)':'rgba(240,64,96,.05)';}
  if(btns)btns.style.display='none';
  if(badge){badge.style.display='inline-flex';badge.textContent=result==='profit'?'PROFIT':'LOSS';badge.className='tag '+(result==='profit'?'tem':'trb');}
  const subEl=E('tr'+num+'-sub');if(subEl)subEl.textContent=result==='profit'?'PROFIT LOGGED âœ…':'LOSS LOGGED âŒ';
  if(num===1){SESSION.t1=result;
    if(SESSION.day==='b'){SESSION.done=true;if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';showSessionBanner(result==='profit'?'em':'rb',result==='profit'?'BUSY DAY COMPLETE':'LOSS ON BUSY DAY',result==='profit'?'One trade. Disciplined. Good.':'Tough day. Come back stronger.');}
    else setTimeout(()=>{const s=E('tr2');if(s){s.style.display='flex';}},300);
  }
  if(num===2){SESSION.t2=result;
    if(SESSION.t1==='profit'&&SESSION.t2==='profit'){SESSION.done=true;if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';showSessionBanner('em','TWO PROFITABLE TRADES âœ…','Session over. Walk away. You earned it.');}
    else setTimeout(()=>{const s=E('tr3');if(s){s.style.display='flex';}},300);
  }
  if(num===3){SESSION.done=true;if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';showSessionBanner('rb','SESSION COMPLETE â€” 3 TRADES DONE','Close the terminal. Your next trade is your next trading day.');}
  saveSession();
}

function setSessionDay(type){
  SESSION.day=type;
  ['sd-m','sd-o','sd-b'].forEach(id=>{const el=E(id);if(el)el.className='session-chip';});
  const map={m:'sd-m',o:'sd-o',b:'sd-b'};
  const el=E(map[type]);if(el)el.classList.add(map[type]);
  if(type==='b'){if(E('tr2'))E('tr2').style.display='none';if(E('tr3'))E('tr3').style.display='none';}
  saveSession();
  toast(type==='m'?'Tue/Thu â€” max 3 trades':type==='o'?'Optional day â€” genuine setup only':'Busy day â€” 1 trade, 9:15â€“10:30','ok');
}

function resetSession(){
  SESSION={t1:null,t2:null,done:false,day:SESSION.day};
  [1,2,3].forEach(n=>{
    const sl=E('tr'+n);if(!sl)return;
    sl.style.borderColor='';sl.style.background='';
    const btns=E('tr'+n+'-btns');if(btns)btns.style.display='flex';
    const badge=E('tr'+n+'-badge');if(badge)badge.style.display='none';
    const sub=E('tr'+n+'-sub');if(sub)sub.textContent=n===3?'THE LAST TRADE. No exceptions.':'Log your outcome';
  });
  if(E('tr2'))E('tr2').style.display='none';
  if(E('tr3'))E('tr3').style.display='none';
  if(E('sessionBanner'))E('sessionBanner').style.display='none';
  if(E('doneForDayBtn'))E('doneForDayBtn').style.display='block';
  saveSession();
  toast('Session reset','ok');
}

/* â”€â”€ Swipe to close mobile drawer â”€â”€ */
let _touchY=0;
const _drawer=document.getElementById?document.getElementById('mobDrawer'):null;
if(_drawer){
  _drawer.addEventListener('touchstart',e=>{_touchY=e.touches[0].clientY;},{passive:true});
  _drawer.addEventListener('touchmove',e=>{
    const dy=e.touches[0].clientY-_touchY;
    if(dy>60){closeMobDrawer();}
  },{passive:true});
}

/* â”€â”€ expData override to track backup time â”€â”€ */
const _origExpData=window.expData;
function expData(){
  const b=new Blob([JSON.stringify({D,CFG},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(b);
  a.download='praveen_tios_backup_'+new Date().toISOString().slice(0,10)+'.json';a.click();
  localStorage.setItem('tios_last_backup',Date.now().toString());
  hideBackupBanner();
  toast('Backup exported âœ…','ok');
}

/* â”€â”€ Period bar setP override to use page-specific functions â”€â”€ */
function setP(p,el){
  APERIOD=p;ASTART=null;AEND=null;
  el.closest('.period-bar').querySelectorAll('.period-chip').forEach(c2=>c2.classList.remove('on'));
  el.classList.add('on');
  const cd=el.closest('.period-bar').querySelector('#customDates');
  if(cd)cd.style.display=p==='custom'?'flex':'none';
  if(p!=='custom'){
    if(ACTIVE_PAGE==='journal'){JOURNAL_PERIOD=p;rjnl();}
    else if(ACTIVE_PAGE==='analytics'){ANALYTICS_PERIOD=p;renderAnalytics(flt(),mtx(flt()));genSummary(true);}
    else{rjnl();renderAnalytics(flt(),mtx(flt()));genSummary(true);}
  }
}

/* â”€â”€ Restore session UI after load â”€â”€ */
function restoreSessionUI(){
  if(!SESSION||!SESSION.t1)return;
  if(SESSION.t1){
    const sl=E('tr1');const btns=E('tr1-btns');const badge=E('tr1-badge');
    if(sl){sl.style.borderColor=SESSION.t1==='profit'?'rgba(16,201,122,.35)':'rgba(240,64,96,.35)';sl.style.background=SESSION.t1==='profit'?'rgba(16,201,122,.05)':'rgba(240,64,96,.05)';}
    if(btns)btns.style.display='none';
    if(badge){badge.style.display='inline-flex';badge.textContent=SESSION.t1==='profit'?'PROFIT':'LOSS';badge.className='tag '+(SESSION.t1==='profit'?'tem':'trb');}
  }
  if(SESSION.t1&&!SESSION.done){const s=E('tr2');if(s)s.style.display='flex';}
  if(SESSION.t2&&!SESSION.done){const s=E('tr3');if(s)s.style.display='flex';}
  if(SESSION.done){
    if(E('doneForDayBtn'))E('doneForDayBtn').style.display='none';
    if(SESSION.t2){
      const sl2=E('tr2');const btns2=E('tr2-btns');const badge2=E('tr2-badge');
      if(sl2){sl2.style.borderColor=SESSION.t2==='profit'?'rgba(16,201,122,.35)':'rgba(240,64,96,.35)';sl2.style.background=SESSION.t2==='profit'?'rgba(16,201,122,.05)':'rgba(240,64,96,.05)';}
      if(btns2)btns2.style.display='none';
      if(badge2){badge2.style.display='inline-flex';badge2.textContent=SESSION.t2==='profit'?'PROFIT':'LOSS';badge2.className='tag '+(SESSION.t2==='profit'?'tem':'trb');}
    }
  }
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   END V3 FIXES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   V4 â€” CHALLENGES, REWARDS & ENGAGEMENT ENGINE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ DATA STRUCTURES â”€â”€ */
function defaultEngagement(){
  return {
    xp: 0,
    level: 1,
    discipline_streak: 0,
    best_streak: 0,
    last_journal_date: null,
    challenges: [],
    completed_challenges: [],
    badges_earned: [],
    badges_new: [],
    weekly_xp: {},
  };
}
function loadEng(){
  try{ return JSON.parse(localStorage.getItem('tios_eng')||'null')||defaultEngagement(); }
  catch{ return defaultEngagement(); }
}
function saveEng(){ localStorage.setItem('tios_eng', JSON.stringify(ENG)); }
/* ENG hoisted to top */

/* â”€â”€ XP LEVELS â”€â”€ */
const XP_LEVELS = [
  { level:1,  title:'Beginner',         ico:'ðŸŒ±', min:0,    next:500,  sub:'Start journaling consistently' },
  { level:2,  title:'Learner',           ico:'ðŸ“–', min:500,  next:1200, sub:'Building the habit' },
  { level:3,  title:'Developing',        ico:'ðŸ“ˆ', min:1200, next:2500, sub:'Patterns are forming' },
  { level:4,  title:'Consistent',        ico:'ðŸŽ¯', min:2500, next:4500, sub:'Discipline is becoming natural' },
  { level:5,  title:'Focused Trader',    ico:'ðŸ”¥', min:4500, next:7500, sub:'Your edge is sharpening' },
  { level:6,  title:'Disciplined',       ico:'âš¡', min:7500, next:12000,sub:'Most traders never get here' },
  { level:7,  title:'Skilled Journaler', ico:'ðŸ’Ž', min:12000,next:18000,sub:'Reflection is your edge' },
  { level:8,  title:'Elite Mindset',     ico:'ðŸ‘‘', min:18000,next:25000,sub:'You are your own best coach' },
  { level:9,  title:'Master Trader',     ico:'ðŸ†', min:25000,next:99999,sub:'Peak performance achieved' },
];

function getCurrentLevel(){
  return XP_LEVELS.slice().reverse().find(l => ENG.xp >= l.min) || XP_LEVELS[0];
}
function getNextLevel(){
  const cur = getCurrentLevel();
  return XP_LEVELS.find(l => l.level === cur.level + 1) || null;
}

/* â”€â”€ BADGE DEFINITIONS â”€â”€ */
const BADGES = [
  // Journaling
  { id:'first_trade',   cat:'journaling',  ico:'ðŸ“', name:'First Log',        cond:'Log your first trade',                  check: ()=> (D.trades||[]).length >= 1 },
  { id:'log10',         cat:'journaling',  ico:'ðŸ““', name:'10 Trades',         cond:'Log 10 trades',                         check: ()=> (D.trades||[]).length >= 10 },
  { id:'log50',         cat:'journaling',  ico:'ðŸ“š', name:'50 Trades',         cond:'Log 50 trades',                         check: ()=> (D.trades||[]).length >= 50 },
  { id:'log100',        cat:'journaling',  ico:'ðŸ›ï¸', name:'Century',           cond:'Log 100 trades',                        check: ()=> (D.trades||[]).length >= 100 },
  { id:'notes7',        cat:'journaling',  ico:'âœï¸', name:'Reflective',        cond:'Write notes 7 days in a row',           check: ()=> checkNoteStreak(7) },
  { id:'notes30',       cat:'journaling',  ico:'ðŸ“°', name:'Deep Thinker',      cond:'Write notes 30 days',                   check: ()=> Object.keys(D.notes||{}).length >= 30 },
  { id:'all_fields',    cat:'journaling',  ico:'â­', name:'Complete Logger',   cond:'Log 5 trades with all fields filled',   check: ()=> countCompleteTrades() >= 5 },

  // Discipline
  { id:'streak3',       cat:'discipline',  ico:'ðŸ”¥', name:'On Fire',           cond:'3-day discipline streak',               check: ()=> ENG.discipline_streak >= 3 },
  { id:'streak7',       cat:'discipline',  ico:'ðŸ’ª', name:'Week Warrior',      cond:'7-day streak',                          check: ()=> ENG.discipline_streak >= 7 },
  { id:'streak21',      cat:'discipline',  ico:'ðŸŒŸ', name:'Habit Formed',      cond:'21-day streak',                         check: ()=> ENG.discipline_streak >= 21 },
  { id:'streak30',      cat:'discipline',  ico:'ðŸ‘‘', name:'Iron Discipline',   cond:'30-day streak',                         check: ()=> ENG.discipline_streak >= 30 },
  { id:'disc9',         cat:'discipline',  ico:'ðŸŽ¯', name:'Sharp Focus',       cond:'Avg discipline score 9+',               check: ()=> parseFloat(mtx(D.trades||[]).disc||0) >= 9 },
  { id:'no_override',   cat:'discipline',  ico:'ðŸ›¡ï¸', name:'Rule Keeper',       cond:'7 trades: rules followed every time',   check: ()=> checkRuleStreak(7) },
  { id:'plan100',       cat:'discipline',  ico:'ðŸ“‹', name:'Planner',           cond:'10 trades all with plan followed',      check: ()=> checkPlanStreak(10) },

  // Performance
  { id:'first_win',     cat:'performance', ico:'âœ…', name:'First Win',         cond:'Log your first profitable trade',       check: ()=> (D.trades||[]).some(t=>pnl(t).net>0) },
  { id:'wr60',          cat:'performance', ico:'ðŸ“Š', name:'Win Machine',       cond:'Win rate 60%+ over 20 trades',          check: ()=> { const m=mtx((D.trades||[]).slice(-20)); return parseFloat(m.wr||0)>=60&&m.tot>=20; } },
  { id:'pf15',          cat:'performance', ico:'âš¡', name:'Edge Proven',       cond:'Profit Factor 1.5+ over 30 trades',     check: ()=> { const m=mtx((D.trades||[]).slice(-30)); return parseFloat(m.pf||0)>=1.5&&m.tot>=30; } },
  { id:'best_day',      cat:'performance', ico:'ðŸŒŸ', name:'Big Day',           cond:'Single day P&L over Rs.10,000',         check: ()=> checkBestDay(10000) },
  { id:'consistent4',   cat:'performance', ico:'ðŸ“…', name:'Consistent Month',  cond:'4 profitable weeks in a row',           check: ()=> checkWeekStreak(4) },

  // Challenges
  { id:'first_chal',    cat:'challenges',  ico:'ðŸŽ¯', name:'Challenger',        cond:'Complete your first challenge',         check: ()=> (ENG.completed_challenges||[]).length >= 1 },
  { id:'chal5',         cat:'challenges',  ico:'ðŸ†', name:'Challenge Seeker',  cond:'Complete 5 challenges',                 check: ()=> (ENG.completed_challenges||[]).length >= 5 },
  { id:'chal20',        cat:'challenges',  ico:'ðŸ’«', name:'Mission Master',    cond:'Complete 20 challenges',                check: ()=> (ENG.completed_challenges||[]).length >= 20 },
  { id:'custom3',       cat:'challenges',  ico:'âœ¨', name:'Self-Coach',        cond:'Create 3 custom challenges',            check: ()=> (ENG.challenges||[]).filter(c=>c.source==='custom').length >= 3 },
];

/* â”€â”€ SYSTEM-GENERATED WEEKLY CHALLENGES â”€â”€ */
function generateWeeklyChallenges(){
  const all = D.trades||[];
  const m = mtx(all.slice(-30));
  const today = new Date().toISOString().slice(0,10);
  const weekKey = getWeekKey();
  const existing = (ENG.challenges||[]).filter(c=>c.weekKey===weekKey&&c.source==='system');
  if(existing.length >= 3) return; // already generated this week

  const pool = [
    { title:'Log every trade with notes', desc:'Write at least one sentence of notes for every trade you take this week. No exceptions.', cat:'journaling', target:5, xp:100, why:'Notes are your future teacher.' },
    { title:'Complete pre-market ritual every day', desc:'Fill in your morning protocol before 9:15 AM on every trading day this week.', cat:'ritual', target:5, xp:100, why:'Preparation is your edge.' },
    { title:'Post-trade review within 5 minutes', desc:'Complete the 3-question post-trade review immediately after every exit this week.', cat:'discipline', target:5, xp:150, why:'Reflection while fresh is 10x more honest.' },
    { title:'No trades after 1:30 PM', desc:'If you find yourself wanting to trade after 1:30 PM, write the reason in notes instead.', cat:'discipline', target:5, xp:200, why:'Afternoon is where discipline dies.' },
    { title:'Stick to defined setups only', desc:'Every trade this week must match a vault setup. Log it in the pre-trade gate.', cat:'discipline', target:5, xp:150, why:'Outside your setup = outside your edge.' },
    { title:'Daily discipline score 8+', desc:'Complete pre and post ritual fully each day to achieve a discipline score of 8 or above.', cat:'discipline', target:5, xp:200, why:'Process score predicts P&L over time.' },
    { title:'Write one reflection per trading day', desc:'At end of each trading day, write one paragraph in the daily notes â€” honest, specific, no excuses.', cat:'journaling', target:5, xp:100, why:'The trader who reflects improves.' },
    { title:'Rate every trade emotion honestly', desc:'Log your true pre-trade emotion for every trade. No defaulting to Calm when you are not.', cat:'mindset', target:5, xp:100, why:'Honest data leads to honest patterns.' },
  ];

  // Pick 3 challenges â€” bias toward weak areas
  const disc = parseFloat(m.disc||0);
  const planAdh = m.plan||0;
  const selected = [];

  // Always include at least one journaling challenge
  const journaling = pool.filter(p=>p.cat==='journaling');
  selected.push(journaling[Math.floor(Math.random()*journaling.length)]);

  // Add discipline challenge if disc score weak
  if(disc < 8){
    const discChals = pool.filter(p=>p.cat==='discipline'&&!selected.find(s=>s.title===p.title));
    if(discChals.length) selected.push(discChals[0]);
  }

  // Add remaining randomly
  while(selected.length < 3){
    const remaining = pool.filter(p=>!selected.find(s=>s.title===p.title));
    if(!remaining.length) break;
    selected.push(remaining[Math.floor(Math.random()*remaining.length)]);
  }

  selected.forEach(chal => {
    ENG.challenges.push({
      id: 'sys_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      title: chal.title,
      desc: chal.desc,
      cat: chal.cat,
      type: 'weekly',
      source: 'system',
      target: chal.target,
      progress: 0,
      xp: chal.xp,
      why: chal.why,
      weekKey,
      created: today,
      startDate: today,
      endDate: null,
      completed: false,
      failed: false,
    });
  });
  saveEng();
}

function getWeekKey(){
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() - d.getDay() + 1); // Monday
  return d.toISOString().slice(0,10);
}

/* â”€â”€ RENDER CHALLENGES PAGE â”€â”€ */
function renderChallenges(){
  generateWeeklyChallenges();
  const weekKey = getWeekKey();
  const active = (ENG.challenges||[]).filter(c=>!c.completed&&!c.failed);
  const done = (ENG.completed_challenges||[]).slice().reverse().slice(0,10);

  const el = E('challengesList');
  if(!el) return;

  if(!active.length){
    el.innerHTML = '<div class="empty"><div class="eico">ðŸŽ¯</div><div class="etxt">No active challenges</div><div class="esub">System will generate weekly challenges automatically</div></div>';
  } else {
    el.innerHTML = active.map(ch => renderChalCard(ch)).join('');
  }

  const doneEl = E('completedChalsList');
  if(doneEl){
    T('chal-completed-count', done.length + ' completed');
    doneEl.innerHTML = done.length ? done.map(ch => renderChalCard(ch, true)).join('') : '<div class="empty" style="padding:12px;"><div class="esub">Complete challenges to see them here</div></div>';
  }

  renderXPBar();
}

function renderChalCard(ch, isDone=false){
  const pct = ch.target > 0 ? Math.min(100, Math.round((ch.progress||0)/ch.target*100)) : 0;
  const catColors = { journaling:'var(--sapphire)', discipline:'var(--violet)', ritual:'var(--emerald)', risk:'var(--ruby)', mindset:'var(--amber)' };
  const color = catColors[ch.cat] || 'var(--amber)';
  const barColor = isDone ? 'var(--emerald)' : color;

  return `<div class="challenge-card chal-${ch.type} ${isDone?'chal-done':ch.failed?'chal-failed':''}">
    <div class="ch-top">
      <div>
        <div class="ch-title">${ch.title}</div>
        <div class="ch-desc" style="margin-top:4px;">${ch.desc}</div>
      </div>
      <div style="margin-left:10px;text-align:right;flex-shrink:0;">
        <div class="ch-badge ch-badge-${isDone?'done':ch.type}">${isDone?'âœ… DONE':ch.type.toUpperCase()}</div>
        ${ch.source==='system'?'<div style="font-size:9px;color:var(--text3);margin-top:3px;">ðŸ¤– System</div>':'<div style="font-size:9px;color:var(--text3);margin-top:3px;">âœï¸ Custom</div>'}
      </div>
    </div>
    <div class="ch-progress-wrap">
      <div class="ch-progress-top">
        <span class="ch-prog-lbl">${isDone?'Completed!':'Progress'}</span>
        <span class="ch-prog-val">${ch.progress||0} / ${ch.target}</span>
      </div>
      <div class="ch-bar"><div class="ch-bf" style="width:${pct}%;background:${barColor};"></div></div>
    </div>
    <div class="ch-reward-row">
      <span class="ch-reward-ico">â­</span>
      <span>${ch.xp} XP reward</span>
      ${ch.startDate?`<span style="margin-left:10px;font-size:10px;color:var(--text3);">ðŸ“… From ${ch.startDate}</span>`:''}
      ${ch.endDate?`<span style="margin-left:4px;font-size:10px;color:var(--text3);">â†’ ${ch.endDate}</span>`:''}
    </div>
    ${ch.why?`<div style="font-size:11px;font-style:italic;color:var(--text3);margin-top:5px;">"${ch.why}"</div>`:''}
    ${!isDone?`<div class="ch-actions">
      <button class="ch-complete-btn" onclick="logChalProgress('${ch.id}')">+ Log Progress</button>
      <button class="ch-complete-btn done" onclick="markChalDone('${ch.id}')">âœ… Mark Complete</button>
      <button class="ch-delete-btn" onclick="deleteChallenge('${ch.id}')">âœ•</button>
    </div>`:''}
  </div>`;
}

function renderXPBar(){
  const cur = getCurrentLevel();
  const nxt = getNextLevel();
  const xpInLevel = ENG.xp - cur.min;
  const xpNeeded = nxt ? nxt.min - cur.min : 1;
  const pct = Math.min(100, Math.round(xpInLevel/xpNeeded*100));

  T('xp-level-label', `${cur.ico} Level ${cur.level} â€” ${cur.title}`);
  T('xp-current', ENG.xp.toLocaleString('en-IN'));
  T('xp-next-pts', nxt ? nxt.min.toLocaleString('en-IN') : 'âˆž');
  T('xp-next-label', nxt ? `${xpNeeded-xpInLevel} XP to unlock: ${nxt.ico} ${nxt.title}` : 'ðŸ† Maximum level achieved!');
  const bar = E('xpBarFill'); if(bar) bar.style.width = pct + '%';
}

/* â”€â”€ RENDER TROPHY ROOM â”€â”€ */
function renderTrophies(){
  const cur = getCurrentLevel();
  const nxt = getNextLevel();

  // Title card
  T('trophy-title-ico', cur.ico);
  T('trophy-title-name', cur.title);
  T('trophy-title-sub', cur.sub);
  T('trophy-title-next', nxt ? `Next: ${nxt.ico} ${nxt.title} at ${nxt.min.toLocaleString('en-IN')} XP` : 'ðŸ† Maximum rank!');

  // Stats
  T('t-total-xp', ENG.xp.toLocaleString('en-IN'));
  T('t-badge-count', (ENG.badges_earned||[]).length);
  T('t-chal-done', (ENG.completed_challenges||[]).length);
  T('t-best-streak', ENG.best_streak||0);

  // Render badge categories
  const cats = ['journaling','discipline','performance','challenges'];
  cats.forEach(cat => {
    const el = E('badges-' + cat);
    if(!el) return;
    const catBadges = BADGES.filter(b=>b.cat===cat);
    el.innerHTML = catBadges.map(b => {
      const earned = (ENG.badges_earned||[]).includes(b.id);
      const isNew = (ENG.badges_new||[]).includes(b.id);
      return `<div class="badge-item ${earned?'unlocked':'locked'}" title="${b.cond}">
        ${isNew?'<div class="badge-new-glow"></div>':''}
        <div class="badge-ico">${b.ico}</div>
        <div class="badge-name">${b.name}</div>
        <div class="badge-cond">${b.cond}</div>
      </div>`;
    }).join('');
  });

  const total = BADGES.length;
  const earned = (ENG.badges_earned||[]).length;
  T('badge-unlock-count', earned + ' / ' + total + ' unlocked');
}

/* â”€â”€ HOME WIDGETS â”€â”€ */
function renderHomeEngagement(){
  // Streak
  const streakEl = E('home-streak-num'); if(streakEl) streakEl.textContent = ENG.discipline_streak||0;
  const bestEl = E('home-streak-best'); if(bestEl) bestEl.textContent = 'Best: ' + (ENG.best_streak||0) + ' days';

  // Weekly XP
  const weekKey = getWeekKey();
  const weekXP = (ENG.weekly_xp||{})[weekKey]||0;
  T('home-xp-week', weekXP + ' XP');

  // Weekly missions widget
  const weekLabel = E('mw-week-label');
  if(weekLabel){
    const d = new Date(); d.setDate(d.getDate()-d.getDay()+1);
    weekLabel.textContent = 'Week of ' + d.toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  }

  const missions = (ENG.challenges||[]).filter(c=>!c.completed&&!c.failed&&c.type==='weekly').slice(0,4);
  const mList = E('mw-missions-list');
  if(mList){
    if(!missions.length){
      mList.innerHTML = '<div style="font-size:12px;color:var(--text3);">No active weekly missions â€” go to Challenges to start</div>';
    } else {
      mList.innerHTML = missions.map(m=>{
        const done = (m.progress||0)>=m.target;
        return `<div class="mw-item">
          <div class="mw-check ${done?'done':''}"></div>
          <div class="mw-text ${done?'done':''}">${m.title}</div>
          <div class="mw-prog">${m.progress||0}/${m.target}</div>
        </div>`;
      }).join('');
    }
    const doneCount = missions.filter(m=>(m.progress||0)>=m.target).length;
    T('mw-pts-label', doneCount + ' / ' + missions.length + ' complete');
  }
}

/* â”€â”€ CHALLENGE CRUD â”€â”€ */
function createChallenge(){
  const title = v('chal-title').trim();
  const desc = v('chal-desc').trim();
  if(!title){ toast('Enter a challenge title','err'); return; }

  const _today = new Date().toISOString().slice(0,10);
  const startDate = v('chal-start') || _today;
  const endDate   = v('chal-end')   || null;

  const chal = {
    id: 'cust_' + Date.now(),
    title,
    desc,
    cat: v('chal-cat'),
    type: v('chal-type'),
    source: 'custom',
    target: parseInt(v('chal-target'))||7,
    progress: 0,
    xp: parseInt(v('chal-xp'))||100,
    why: v('chal-why'),
    weekKey: getWeekKey(),
    created: _today,
    startDate,
    endDate,
    completed: false,
    failed: false,
  };

  if(!ENG.challenges) ENG.challenges = [];
  ENG.challenges.push(chal);
  saveEng();
  cm('chalModal');
  toast('Challenge created! ðŸŽ¯','ok');
  renderChallenges();
  renderHomeEngagement();

  // Reset form
  ['chal-title','chal-desc','chal-why','chal-start','chal-end'].forEach(id=>{ const el=E(id); if(el) el.value=''; });
  const _csd=E('chal-start'); if(_csd) _csd.value=_today;
}

function logChalProgress(id){
  const chal = (ENG.challenges||[]).find(c=>c.id===id);
  if(!chal) return;
  chal.progress = (chal.progress||0) + 1;
  if(chal.progress >= chal.target) markChalDone(id);
  else { saveEng(); renderChallenges(); renderHomeEngagement(); toast('Progress logged! +1 âœ…','ok'); }
}

function markChalDone(id){
  const idx = (ENG.challenges||[]).findIndex(c=>c.id===id);
  if(idx===-1) return;
  const chal = ENG.challenges[idx];
  chal.completed = true;
  chal.progress = chal.target;
  chal.completedDate = new Date().toISOString().slice(0,10);

  // Move to completed
  if(!ENG.completed_challenges) ENG.completed_challenges = [];
  ENG.completed_challenges.push({...chal});
  ENG.challenges.splice(idx, 1);

  // Award XP
  awardXP(chal.xp, 'Challenge: ' + chal.title);

  // Update weekly XP
  const wk = getWeekKey();
  if(!ENG.weekly_xp) ENG.weekly_xp = {};
  ENG.weekly_xp[wk] = (ENG.weekly_xp[wk]||0) + chal.xp;

  saveEng();
  autoSyncEngagement();
  checkAndAwardBadges();
  renderChallenges();
  renderHomeEngagement();
}

function deleteChallenge(id){
  ENG.challenges = (ENG.challenges||[]).filter(c=>c.id!==id);
  saveEng();
  renderChallenges();
  toast('Challenge removed','ok');
}

function toggleChalFilter(type, el){
  document.querySelectorAll('#pg-challenges .btn.bgh').forEach(b=>b.style.borderColor='');
  el.style.borderColor='var(--amber)';
  // Re-render with filter
  renderChallenges();
}

/* â”€â”€ XP AWARD â”€â”€ */
function awardXP(amount, reason){
  const prevLevel = getCurrentLevel();
  ENG.xp = (ENG.xp||0) + amount;

  const newLevel = getCurrentLevel();
  const levelUp = newLevel.level > prevLevel.level;

  saveEng();
  showXPToast('+' + amount + ' XP', reason, levelUp ? 'ðŸŽ‰ LEVEL UP: ' + newLevel.title : null);

  if(levelUp){
    setTimeout(()=>toast('ðŸŽ‰ Level Up! You are now: ' + newLevel.ico + ' ' + newLevel.title,'ok'), 500);
  }
}

function showXPToast(pts, reason, extra){
  const t = E('xpToast');
  const txt = E('xpToastTxt');
  const sub = E('xpToastSub');
  if(!t||!txt||!sub) return;
  txt.textContent = extra||pts;
  sub.textContent = extra?pts:reason;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 3500);
}

/* â”€â”€ DISCIPLINE STREAK UPDATE â”€â”€ */
function updateDisciplineStreak(){
  const today = new Date().toISOString().slice(0,10);
  const lastDate = ENG.last_journal_date;

  if(!lastDate){
    ENG.discipline_streak = 1;
    ENG.last_journal_date = today;
    ENG.best_streak = Math.max(ENG.best_streak||0, 1);
    saveEng();
    return;
  }

  const last = new Date(lastDate);
  const now = new Date(today);
  const diffDays = Math.round((now-last)/(1000*60*60*24));

  if(diffDays === 0) return; // same day
  if(diffDays === 1){
    // consecutive day
    ENG.discipline_streak = (ENG.discipline_streak||0) + 1;
    ENG.best_streak = Math.max(ENG.best_streak||0, ENG.discipline_streak);
    ENG.last_journal_date = today;
    if(ENG.discipline_streak % 7 === 0){
      awardXP(50 * Math.floor(ENG.discipline_streak/7), 'Streak milestone: ' + ENG.discipline_streak + ' days!');
    }
  } else {
    // streak broken
    if(ENG.discipline_streak > 2){
      toast('Streak reset. Was ' + ENG.discipline_streak + ' days. New streak starts today. ðŸ”„','err');
    }
    ENG.discipline_streak = 1;
    ENG.last_journal_date = today;
  }
  saveEng();
}

/* â”€â”€ BADGE CHECK â”€â”€ */
function checkAndAwardBadges(){
  const newBadges = [];
  BADGES.forEach(badge => {
    if((ENG.badges_earned||[]).includes(badge.id)) return;
    try {
      if(badge.check()){
        if(!ENG.badges_earned) ENG.badges_earned = [];
        if(!ENG.badges_new) ENG.badges_new = [];
        ENG.badges_earned.push(badge.id);
        ENG.badges_new.push(badge.id);
        newBadges.push(badge);
        awardXP(50, 'Badge: ' + badge.name);
      }
    } catch(e){}
  });
  if(newBadges.length){
    saveEng();
    setTimeout(()=>{
      newBadges.forEach(b=> toast('ðŸ… Badge Unlocked: ' + b.ico + ' ' + b.name,'ok'));
    }, 600);
  }
}

/* â”€â”€ HELPER CHECKS â”€â”€ */
function checkNoteStreak(days){
  const notes = D.notes||{};
  const dates = Object.keys(notes).filter(d=>notes[d]&&notes[d].length>10).sort();
  if(dates.length < days) return false;
  let streak = 1;
  for(let i=dates.length-1;i>0;i--){
    const diff = Math.round((new Date(dates[i])-new Date(dates[i-1]))/(1000*60*60*24));
    if(diff===1) streak++;
    else break;
  }
  return streak >= days;
}
function countCompleteTrades(){
  return (D.trades||[]).filter(t=>t.sym&&t.en&&t.ex&&t.qt&&t.em&&t.nt&&t.nt.length>5).length;
}
function checkRuleStreak(n){
  const recent = (D.trades||[]).slice(-n);
  return recent.length>=n && recent.every(t=>t.rl==='Yes');
}
function checkPlanStreak(n){
  const recent = (D.trades||[]).slice(-n);
  return recent.length>=n && recent.every(t=>t.pl==='Yes');
}
function checkBestDay(amount){
  const dp = {};
  (D.trades||[]).forEach(t=>{if(!dp[t.dt])dp[t.dt]=0; dp[t.dt]+=pnl(t).net;});
  return Object.values(dp).some(v=>v>=amount);
}
function checkWeekStreak(weeks){
  const bw = {};
  (D.trades||[]).forEach(t=>{
    const d=new Date(t.dt); d.setDate(d.getDate()-d.getDay());
    const k=d.toISOString().slice(0,10);
    if(!bw[k]) bw[k]=0; bw[k]+=pnl(t).net;
  });
  const keys=Object.keys(bw).sort();
  if(keys.length<weeks) return false;
  let streak=0;
  for(let i=keys.length-1;i>=0;i--){
    if(bw[keys[i]]>0) streak++;
    else break;
  }
  return streak>=weeks;
}

/* â”€â”€ HOOK INTO EXISTING SAVE ACTIONS â”€â”€ */
// Called after subTrade() saves â€” award XP for logging
function onTradeLogged(trade){
  awardXP(10, 'Trade logged: ' + trade.sym);
  autoSyncTrade(trade);
  if(trade.nt && trade.nt.length > 20) awardXP(5, 'Detailed notes added');
  updateDisciplineStreak();
  checkAndAwardBadges();
  renderHomeEngagement();

  // Auto-increment active challenges that match journaling/discipline
  (ENG.challenges||[]).forEach(ch=>{
    if(ch.completed) return;
    // Only count trades on or after challenge startDate
    const _cs = ch.startDate || ch.created || '2000-01-01';
    if((trade.dt||'') < _cs) return;

    if(ch.cat==='journaling' && ch.title.toLowerCase().includes('log')){
      ch.progress = (ch.progress||0) + 1;
      if(ch.progress >= ch.target) markChalDone(ch.id);
    }
    if(ch.cat==='discipline' && trade.rl==='Yes' && trade.pl==='Yes'){
      if(ch.title.toLowerCase().includes('setup')||ch.title.toLowerCase().includes('vault')){
        ch.progress = (ch.progress||0) + 1;
        if(ch.progress >= ch.target) markChalDone(ch.id);
      }
    }
  });
  saveEng();
}

function onNoteSaved(){
  awardXP(5, 'Daily reflection saved');
  autoSyncNotes();
  updateDisciplineStreak();
  checkAndAwardBadges();
  // Check notes challenges
  const _noteDate = new Date().toISOString().slice(0,10);
  (ENG.challenges||[]).forEach(ch=>{
    if(ch.completed) return;
    const _cs2 = ch.startDate || ch.created || '2000-01-01';
    if(_noteDate < _cs2) return;
    if(ch.cat==='journaling' && ch.title.toLowerCase().includes('reflect')){
      ch.progress = (ch.progress||0) + 1;
      if(ch.progress >= ch.target) markChalDone(ch.id);
    }
  });
  saveEng();
  renderHomeEngagement();
}

function onRitualCompleted(type){
  autoSyncChecklist();
  // type = 'pre' or 'post'
  awardXP(type==='pre'?10:15, type==='pre'?'Pre-market ritual done':'Post-market ritual done');
  // Check ritual challenges
  const _ritualDate = new Date().toISOString().slice(0,10);
  (ENG.challenges||[]).forEach(ch=>{
    if(ch.completed) return;
    const _cs3 = ch.startDate || ch.created || '2000-01-01';
    if(_ritualDate < _cs3) return;
    if(ch.cat==='ritual'||(ch.title.toLowerCase().includes('ritual')||ch.title.toLowerCase().includes('pre-market'))){
      ch.progress = (ch.progress||0) + 0.5; // need both pre and post for 1
      if(ch.progress >= ch.target) markChalDone(ch.id);
    }
  });
  saveEng();
  renderHomeEngagement();
}

/* â”€â”€ PAGE ROUTING â”€â”€ */
// Will be merged into goPage via patch below
function renderChallengesPage(){ renderChallenges(); }
function renderTrophyPage(){ renderTrophies(); }

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   END V4 ENGAGEMENT ENGINE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FYERS CSV IMPORT ENGINE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* _importTrades declared at top */  // parsed + matched trades waiting for confirmation

/* â”€â”€ STEP 1: Parse CSV (supports both Tradebook and Orderbook) â”€â”€ */
function importFyersCSV(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const trades = parseFyersCSV(e.target.result);
      if (!trades.length) { toast('No trades found in CSV', 'err'); return; }
      _importTrades = trades;
      renderImportPreview(trades);
      om('importPreviewModal');
    } catch(err) {
      toast('Could not parse CSV: ' + err.message, 'err');
    }
  };
  reader.readAsText(file);
  input.value = '';
}

/* â”€â”€ AUTO-DETECT FORMAT: Tradebook vs Orderbook â”€â”€ */
function parseFyersCSV(raw) {
  const lines = raw.split('\n');
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('Symbol,')) { headerIdx = i; break; }
  }
  if (headerIdx === -1) throw new Error('Could not find data header row');

  const dataLines = lines.slice(headerIdx).join('\n');
  const rows = parseCSVRows(dataLines);
  if (rows.length < 2) throw new Error('No execution data found');

  const headers = rows[0];

  // Detect format by headers
  // Tradebook: has "Total value" and "Date & time" (lowercase t)
  // Orderbook: has "Status" and "Date & Time" (uppercase T), "Limit price"
  const isOrderbook = headers.includes('Status') || headers.includes('Limit price') ||
                      headers.includes('Date & Time');

  const symIdx   = headers.indexOf('Symbol');
  const dtIdx    = isOrderbook ? headers.indexOf('Date & Time') : headers.indexOf('Date & time');
  const sideIdx  = headers.indexOf('Side');
  const qtyIdx   = headers.indexOf('Qty');
  const priceIdx = headers.indexOf('Traded price');
  const statusIdx = headers.indexOf('Status');

  const executions = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[symIdx]) continue;
    // For orderbook: skip non-executed orders
    if (isOrderbook && statusIdx !== -1 && r[statusIdx].trim() !== 'Executed') continue;

    executions.push({
      sym:      r[symIdx].trim(),
      time:     r[dtIdx] ? r[dtIdx].trim() : '',
      side:     r[sideIdx] ? r[sideIdx].trim().toUpperCase() : '',
      qty:      parseInt((r[qtyIdx]||'0').replace(/,/g,'')) || 0,
      price:    parseFloat((r[priceIdx]||'0').replace(/,/g,'')) || 0,
      isOrderbook,
    });
  }

  if (!executions.length) throw new Error('No executed trades found');
  return matchExecutions(executions);
}

/* â”€â”€ SIMPLE CSV PARSER (handles quoted fields) â”€â”€ */
function parseCSVRows(text) {
  const rows = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const row = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    row.push(cur.trim());
    rows.push(row);
  }
  return rows;
}

/* â”€â”€ MATCH BUY/SELL EXECUTIONS INTO TRADES â”€â”€ */
/* Algorithm: FIFO time-based matching
   1. Consolidate partial fills by Fyers Order ID
   2. Sort all orders by timestamp
   3. Track running position â€” when it hits 0, a trade is complete
   4. Handles: simple in/out, scale-in, scale-out, mixed styles
*/
function matchExecutions(execs) {
  // Step 1: Parse timestamps for sorting
  function parseExecTime(str) {
    if (!str) return 0;
    // Format 1: Tradebook "06 Apr 2026, 09:32:41 AM"
    const m1 = str.match(/(\d{2})\s+(\w{3})\s+(\d{4}),\s+(\d{2}:\d{2}:\d{2})\s+(AM|PM)/);
    if (m1) {
      const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
      let [h, min, s] = m1[4].split(':').map(Number);
      if (m1[5] === 'PM' && h !== 12) h += 12;
      if (m1[5] === 'AM' && h === 12) h = 0;
      return new Date(parseInt(m1[3]), months[m1[2]], parseInt(m1[1]), h, min, s).getTime();
    }
    // Format 2: Orderbook "07-04-2026 13:28:39" (DD-MM-YYYY HH:MM:SS)
    const m2 = str.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (m2) {
      return new Date(parseInt(m2[3]), parseInt(m2[2])-1, parseInt(m2[1]),
                      parseInt(m2[4]), parseInt(m2[5]), parseInt(m2[6])).getTime();
    }
    return 0;
  }

  // Step 2: Group by symbol first
  const bySymbol = {};
  for (const ex of execs) {
    if (!bySymbol[ex.sym]) bySymbol[ex.sym] = [];
    bySymbol[ex.sym].push({...ex, ts: parseExecTime(ex.time)});
  }

  const allTrades = [];

  for (const [sym, symExecs] of Object.entries(bySymbol)) {
    // Step 3: Consolidate by Fyers Order ID (partial fills â†’ one order)
    const orderMap = {};
    for (const ex of symExecs) {
      const oid = ex.oid || (ex.side + '_' + ex.ts);
      if (!orderMap[oid]) {
        orderMap[oid] = {
          oid, sym, side: ex.side,
          qty: 0, totalVal: 0,
          minTs: Infinity, maxTs: 0,
          firstTime: ex.time,
        };
      }
      const ord = orderMap[oid];
      ord.qty      += ex.qty;
      ord.totalVal += ex.qty * ex.price;
      if (ex.ts < ord.minTs) { ord.minTs = ex.ts; ord.firstTime = ex.time; }
      if (ex.ts > ord.maxTs)   ord.maxTs = ex.ts;
    }

    // Step 4: Sort consolidated orders by time
    const orders = Object.values(orderMap).sort((a, b) => a.minTs - b.minTs);

    // Step 5: FIFO position tracking â€” close trade when position = 0
    let position     = 0;
    let pendingBuys  = [];   // accumulate buy orders
    let pendingSells = [];   // accumulate sell orders (for short trades)
    let openBuyVal   = 0;
    let openSellVal  = 0;
    let tradeEntryTime = null;

    for (const order of orders) {
      const avgPrice = order.totalVal / order.qty;

      if (order.side === 'BUY') {
        if (position === 0) tradeEntryTime = order.firstTime;
        position += order.qty;
        pendingBuys.push(order);
        openBuyVal += order.totalVal;
      } else { // SELL
        if (position === 0) {
          // Short trade â€” selling first
          tradeEntryTime = order.firstTime;
        }
        position -= order.qty;
        pendingSells.push(order);
        openSellVal += order.totalVal;
      }

      // Trade complete when position returns to 0
      if (position === 0 && (pendingBuys.length > 0 || pendingSells.length > 0)) {
        const isLong    = pendingBuys.length > 0 && (pendingSells.length === 0 ||
                          pendingBuys[0].minTs <= pendingSells[0].minTs);
        const entryOrds = isLong ? pendingBuys  : pendingSells;
        const exitOrds  = isLong ? pendingSells : pendingBuys;
        const entryVal  = isLong ? openBuyVal   : openSellVal;
        const exitVal   = isLong ? openSellVal  : openBuyVal;
        const entryQty  = entryOrds.reduce((s, o) => s + o.qty, 0);
        const exitQty   = exitOrds.reduce((s, o) => s + o.qty, 0);
        const matchedQty = Math.min(entryQty, exitQty);
        const avgEntry  = entryVal / entryQty;
        const avgExit   = exitVal  / exitQty;
        const grossPnl  = isLong
          ? exitVal - entryVal
          : entryVal - exitVal;

        const parsed    = parseFyersSymbol(sym);
        const tradeDate = parseTradeDate(tradeEntryTime);
        const tradeTime = parseTradeTime(tradeEntryTime);
        const exitTime  = exitOrds.length ? exitOrds[exitOrds.length-1].firstTime : '';

        allTrades.push({
          id:         'FY' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
          sym:        parsed.underlying,
          strike:     parsed.strike,
          optionType: parsed.optionType,
          expiry:     parsed.expiry,
          dir:        isLong ? 'Long' : 'Short',
          en:         parseFloat(avgEntry.toFixed(2)),
          ex:         parseFloat(avgExit.toFixed(2)),
          qt:         matchedQty,
          lots:       parsed.lots(matchedQty),
          lotSize:    getFyersLotSize(parsed.underlying),
          grossPnl:   parseFloat(grossPnl.toFixed(2)),
          dt:         tradeDate,
          tm:         tradeTime,
          rawSym:     sym,
          // Enrichment fields (filled in Step 2)
          strat:      D.strategies.length ? D.strategies[0].nm : 'CPR Trend',
          em:         'Calm ðŸ˜Œ',
          pl:         'Yes',
          rl:         'Yes',
          sq:         'A',
          bk:         40,
          rr:         2.0,
          nt:         '',
        });

        // Reset for next trade
        pendingBuys  = [];
        pendingSells = [];
        openBuyVal   = 0;
        openSellVal  = 0;
        tradeEntryTime = null;
      }
    }

    // Handle any unclosed position (open trade â€” skip, not complete)
    // Could notify user but for now just ignore
  }

  // Sort all trades by entry time
  allTrades.sort((a, b) => (a.dt + a.tm).localeCompare(b.dt + b.tm));
  return allTrades;
}


/* â”€â”€ LOT SIZES (NSE/BSE 2024-25) â”€â”€ */
function getFyersLotSize(underlying) {
  const sizes = {
    'NIFTY':      65,
    'BANKNIFTY':  30,
    'FINNIFTY':   40,
    'MIDCPNIFTY': 75,
    'SENSEX':     10,
    'BANKEX':     15,
  };
  return sizes[(underlying||'').toUpperCase()] || 65;
}

/* â”€â”€ PARSE FYERS SYMBOL â”€â”€ */
function parseFyersSymbol(sym) {
  // Strip exchange prefix if present (NSE:, BSE:, NFO:, etc.)
  sym = (sym || '').replace(/^(NSE:|BSE:|NFO:|BFO:|MCX:|CDS:)/i, '').trim();
  // Weekly: NIFTY2640722650CE â†’ NIFTY + 26 + 4 + 07 + 22650 + CE
  const wm = sym.match(/^([A-Z]+)(\d{2})(\d{1})(\d{2})(\d+)(CE|PE)$/);
  if (wm) {
    const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return {
      underlying: wm[1],
      expiry: wm[4] + ' ' + (months[parseInt(wm[3])]||'?') + ' 20' + wm[2],
      strike: parseInt(wm[5]),
      optionType: wm[6],
      lots: (qty) => Math.round(qty / getFyersLotSize(wm[1])),
    };
  }
  // Monthly: NIFTY26APR22650CE
  const mm = sym.match(/^([A-Z]+)(\d{2})(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)(\d+)(CE|PE)$/);
  if (mm) {
    return {
      underlying: mm[1],
      expiry: mm[3] + ' 20' + mm[2],
      strike: parseInt(mm[4]),
      optionType: mm[5],
      lots: (qty) => Math.round(qty / getFyersLotSize(mm[1])),
    };
  }
  return {
    underlying: sym.replace(/(CE|PE|\d+)/g,'').trim()||sym,
    expiry: '', strike: 0, optionType: '',
    lots: (qty) => Math.round(qty / 65) || 1,
  };
}

/* â”€â”€ DATE/TIME HELPERS â”€â”€ */
function parseTradeDate(timeStr) {
  if (!timeStr) return new Date().toISOString().slice(0,10);
  // Format 1: Tradebook "06 Apr 2026, 09:32:41 AM"
  const m1 = timeStr.match(/(\d{2})\s+(\w{3})\s+(\d{4})/);
  if (m1) {
    const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                    Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
    return m1[3] + '-' + (months[m1[2]]||'01') + '-' + m1[1];
  }
  // Format 2: Orderbook "07-04-2026 13:28:39" (DD-MM-YYYY)
  const m2 = timeStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (m2) return m2[3] + '-' + m2[2] + '-' + m2[1];  // â†’ YYYY-MM-DD
  // Format 3: Already YYYY-MM-DD
  const m3 = timeStr.match(/^(\d{4}-\d{2}-\d{2})/);
  if (m3) return m3[1];
  return new Date().toISOString().slice(0,10);
}
function parseTradeTime(timeStr) {
  if (!timeStr) return '09:30';
  // Orderbook: "07-04-2026 13:28:39" â†’ extract HH:MM
  const m1 = timeStr.match(/\s+(\d{2}:\d{2})/);
  if (m1) return m1[1];
  // Tradebook: "06 Apr 2026, 09:32:41 AM" â†’ extract HH:MM
  const m2 = timeStr.match(/(\d{2}:\d{2})/);
  return m2 ? m2[1] : '09:30';
}

/* â”€â”€ STEP 1: RENDER PREVIEW â”€â”€ */
function renderImportPreview(trades) {
  const el = E('imp-preview-list');
  if (!el) return;

  el.innerHTML = trades.map((t, i) => {
    const profit = t.grossPnl >= 0;
    const pnlColor = profit ? 'var(--emerald)' : 'var(--ruby)';
    return `<div class="imp-trade-row ${profit?'profit':'loss'}">
      <div class="imp-trade-top">
        <div>
          <span class="imp-sym">${t.sym} ${t.strike} ${t.optionType}</span>
          <span class="tag ${t.dir==='Long'?'tem':'trb'}" style="margin-left:6px;">${t.dir}</span>
        </div>
        <div class="imp-pnl" style="color:${pnlColor};">${profit?'+':'-'}â‚¹${parseFloat(Math.abs(t.grossPnl).toFixed(2)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
      <div class="imp-meta">
        <span class="tag tsa">Entry: â‚¹${t.en}</span>
        <span class="tag tsa">Exit: â‚¹${t.ex}</span>
        <span class="tag tam">Qty: ${t.qt} | ${t.lots} lots</span>
        <span class="tag" style="background:var(--panel3);color:var(--text3);">${t.tm} â€¢ ${t.dt}</span>
        ${t.expiry?`<span class="tag tvl">Exp: ${t.expiry}</span>`:''}
      </div>
    </div>`;
  }).join('');

  const btn = E('imp-next1-btn');
  if (btn) btn.textContent = `Next: Add Details to ${trades.length} trade${trades.length>1?'s':''} â†’`;
}

/* â”€â”€ STEP 2: RENDER ENRICH FORM â”€â”€ */
function renderImportEnrich(trades) {
  const el = E('imp-enrich-list');
  if (!el) return;

  const stratOptions = D.strategies.length
    ? D.strategies.map(s=>`<option value="${esc(s.nm)}">${esc(s.nm)}</option>`).join('')
    : '<option>CPR Trend</option><option>Other</option>';

  el.innerHTML = trades.map((t, i) => {
    const profit = t.grossPnl >= 0;
    return `<div class="imp-trade-row ${profit?'profit':'loss'}" style="margin-bottom:12px;">
      <div class="imp-trade-top">
        <div><span class="imp-sym">${t.sym} ${t.strike} ${t.optionType}</span></div>
        <div class="imp-pnl" style="color:${profit?'var(--emerald)':'var(--ruby)'};">${profit?'+':'-'}â‚¹${parseFloat(Math.abs(t.grossPnl).toFixed(2)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
      <!-- Rule breach badges -->
      <div id="breach-${i}" style="margin-bottom:8px;"></div>
      <div class="imp-enrich-fields">
        <div class="fg"><label>Strategy</label>
          <select onchange="_importTrades[${i}].strat=this.value">${stratOptions}</select></div>
        <div class="fg"><label>Emotion</label>
          <select onchange="_importTrades[${i}].em=this.value">
            <option>Calm ðŸ˜Œ</option><option>Confident ðŸ’ª</option><option>Focused ðŸŽ¯</option>
            <option>Neutral ðŸ˜</option><option>Anxious ðŸ˜°</option><option>Greedy ðŸ¤‘</option>
            <option>FOMO ðŸ˜±</option><option>Revenge ðŸ˜¤</option>
          </select></div>
        <div class="fg"><label>Plan Followed?</label>
          <select onchange="_importTrades[${i}].pl=this.value">
            <option value="Yes">âœ… Yes</option><option value="Partial">âš¡ Partial</option><option value="No">âŒ No</option>
          </select></div>
        <div class="fg"><label>Rules Followed?</label>
          <select id="rl-${i}" onchange="_importTrades[${i}].rl=this.value">
            <option value="Yes">âœ… Yes</option><option value="Partial">âš¡ Partial</option><option value="No">âŒ No</option>
          </select></div>
        <div class="fg"><label>Setup Quality</label>
          <select onchange="_importTrades[${i}].sq=this.value">
            <option value="A+">A+ Perfect</option><option value="A">A Good</option>
            <option value="B">B Average</option><option value="C">C Weak</option>
          </select></div>
        <div class="fg"><label>Stop Loss (â‚¹) <span style="color:var(--text3);font-size:10px;">for R:R calc</span></label>
          <input type="number" step="0.05" placeholder="e.g. 195"
            onchange="_importTrades[${i}].sl=parseFloat(this.value)||0; calcImportRR(${i})"></div>
        <div class="fg"><label>R:R <span style="font-size:10px;color:var(--text3);">(auto-calculated)</span></label>
          <input type="number" id="rr-${i}" value="0" step="0.1" min="0" readonly
            style="background:var(--panel3);color:var(--text3);" title="Enter Stop Loss to calculate R:R"></div>
      </div>
      <div class="fg" style="margin-top:6px;"><label>Notes (optional)</label>
        <textarea placeholder="What happened in this trade?" rows="2"
          onchange="_importTrades[${i}].nt=this.value"></textarea></div>
    </div>`;
  }).join('');
}

/* â”€â”€ STEP 3: CONFIRM SUMMARY â”€â”€ */
function renderImportConfirm(trades) {
  const el = E('imp-confirm-summary');
  if (!el) return;

  const totalPnl = trades.reduce((s, t) => s + t.grossPnl, 0);
  const wins = trades.filter(t => t.grossPnl > 0).length;
  const dupes = trades.filter(t => (D.trades||[]).some(ex => ex.dt===t.dt && ex.tm===t.tm && ex.sym===t.sym));

  el.innerHTML = `
    <div class="card cam mb12">
      <div style="font-size:15px;font-weight:800;margin-bottom:10px;">Import Summary</div>
      ${[
        ['Trades to import', trades.length],
        ['Wins', wins + ' (' + Math.round(wins/trades.length*100) + '%)'],
        ['Total Gross P&L', (totalPnl>=0?'+':'')+'â‚¹'+Math.abs(totalPnl).toLocaleString('en-IN')],
        ['Brokerage (est.)', 'â‚¹'+(trades.length*40).toLocaleString('en-IN')],
        ['Net P&L (est.)', (totalPnl-trades.length*40>=0?'+':'')+'â‚¹'+Math.abs(totalPnl-trades.length*40).toLocaleString('en-IN')],
      ].map(([l,v])=>`<div class="imp-confirm-row"><span style="color:var(--text2);">${l}</span><span class="tm" style="font-weight:800;">${v}</span></div>`).join('')}
    </div>
    ${dupes.length?`<div style="background:rgba(240,165,0,.08);border:1px solid rgba(240,165,0,.2);border-radius:var(--r2);padding:10px 13px;font-size:12px;color:var(--amber);margin-bottom:12px;">
      âš ï¸ ${dupes.length} trade(s) may already exist (same date, time, symbol). They will still be imported â€” check journal for duplicates after.
    </div>`:''}
    <div style="font-size:12px;color:var(--text3);">All ${trades.length} trades will be added to your journal with the details you provided in Step 2. You can edit any trade afterward.</div>
  `;
}

/* â”€â”€ STEP NAVIGATION â”€â”€ */
function impGoStep(step) {
  ['step1','step2','step3'].forEach((s,i)=>{
    const el = E('imp-'+s);
    const tab = E('imp-'+s+'-tab');
    if (el) el.style.display = i+1===step ? 'block' : 'none';
    if (tab) {
      tab.style.background = i+1===step ? 'var(--amber3)' : 'var(--panel2)';
      tab.style.color = i+1===step ? 'var(--amber)' : 'var(--text3)';
    }
  });
  if (step === 2) renderImportEnrich(_importTrades);
  if (step === 3) renderImportConfirm(_importTrades);
}

/* â”€â”€ FINAL IMPORT â”€â”€ */
function confirmFyersImport() {
  const brokerage = 40;
  let imported = 0;
  _importTrades.forEach(t => {
    const trade = {
      id: t.id,
      dt: t.dt,
      tm: t.tm,
      sym: t.sym,
      dir: t.dir,
      strat: t.strat || 'Other',
      en: t.en,
      ex: t.ex,
      qt: t.qt,
      bk: brokerage,
      sl: 0,
      tg: 0,
      rr: (t.rr && t.rr > 0) ? t.rr : 0,
      rp: 1.0,
      sq: t.sq || 'A',
      pl: t.pl || 'Yes',
      rl: t.rl || 'Yes',
      em: t.em || 'Calm ðŸ˜Œ',
      nt: t.nt || '',
      // Options fields
      strike: t.strike || 0,
      optionType: t.optionType || '',
      expiry: t.expiry || '',
      lots: t.lots || 1,
      source: 'fyers_import',
    };
    D.trades.push(trade);
    imported++;
    onTradeLogged(trade);
  });

  sv();
  cm('importPreviewModal');
  renderAll();
  rjnl(1);
  _importTrades = [];
  toast(`âœ… ${imported} trade${imported>1?'s':''} imported from Fyers!`, 'ok');
}
/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   END FYERS IMPORT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   EDGEMIND GOOGLE SHEETS SYNC ENGINE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FIREBASE REAL-TIME SYNC ENGINE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function initFirebase(config) {
  if (!config || !config.databaseURL) {
    toast('Firebase config must include databaseURL','err');
    return false;
  }
  try {
    // Delete existing app if re-initialising
    if (_fbApp) {
      try { firebase.app('tios').delete(); } catch(e){}
    }
    _fbApp = firebase.initializeApp(config, 'tios');
    _fbDB  = firebase.database(_fbApp);
    _fbRef = _fbDB.ref('tradingdata');
    _fbConfig = config;
    localStorage.setItem('tios_fb_config', JSON.stringify(config));
    startFbListener();
    setConn('ok', 'Firebase âœ“');
    updateFbUI(true);
    return true;
  } catch(e) {
    console.error('Firebase init failed:', e);
    toast('Firebase error: ' + e.message, 'err');
    setConn('err', 'Firebase error');
    return false;
  }
}

function disconnectFirebase() {
  if (_fbRef && _fbListener) {
    try { _fbRef.off('value', _fbListener); } catch(e){}
  }
  _fbApp = null; _fbDB = null; _fbRef = null; _fbListener = null; _fbConfig = null;
  localStorage.removeItem('tios_fb_config');
  localStorage.removeItem('tios_fb_ts');
  setConn('', 'Not connected');
  updateFbUI(false);
  toast('Firebase disconnected','ok');
}

function initSupabase(){
  if(_supabase) return _supabase;
  if(!_supabaseUrl || !_supabaseKey) {
    console.warn('Supabase not configured');
    return null;
  }
  try {
    _supabase = supabase.createClient(_supabaseUrl, _supabaseKey);
    return _supabase;
  } catch(e) {
    console.error('Supabase init failed:', e);
    return null;
  }
}

function saveSupabaseConfig(){
  const url = E('supabaseUrl').value.trim();
  const key = E('supabaseKey').value.trim();
  if(!url || !key){
    toast('Please enter both URL and key','err');
    return;
  }
  _supabaseUrl = url;
  _supabaseKey = key;
  localStorage.setItem('tios_supabase_url', url);
  localStorage.setItem('tios_supabase_key', key);
  if(initSupabase()){
    toast('Supabase connected! âœ“','ok');
    E('supabaseStatus').textContent = 'ðŸŸ¢ Connected';
    E('supabaseStatus').style.color = 'var(--emerald)';
    E('supabaseConfigArea').style.display = 'none';
    E('supabaseDisconnectBtn').style.display = 'inline-flex';
  } else {
    toast('Connection failed','err');
  }
}

function disconnectSupabase(){
  _supabase = null;
  _supabaseUrl = '';
  _supabaseKey = '';
  localStorage.removeItem('tios_supabase_url');
  localStorage.removeItem('tios_supabase_key');
  E('supabaseStatus').textContent = 'âš« Not connected';
  E('supabaseStatus').style.color = 'var(--text3)';
  E('supabaseConfigArea').style.display = 'block';
  E('supabaseDisconnectBtn').style.display = 'none';
  toast('Supabase disconnected','ok');
}

function startFbListener() {
  if (!_fbRef) return;
  if (_fbListener) { try { _fbRef.off('value', _fbListener); } catch(e){} }
  let _firstLoad = true;
  _fbListener = _fbRef.on('value', (snapshot) => {
    // Skip very first event (that's the initial load, handled separately)
    if (_firstLoad) { _firstLoad = false; return; }
    const remote = snapshot.val();
    if (!remote || !remote._ts) return;
    const localTs = parseInt(localStorage.getItem('tios_fb_ts') || '0');
    // Apply only if remote is meaningfully newer (>3s) to avoid echo-back loops
    if (remote._ts > localTs + 3000) {
      applyRemoteData(remote);
      localStorage.setItem('tios_fb_ts', String(remote._ts));
      renderAll();
      toast('â†“ Synced from another device', 'ok');
    }
  }, (err) => {
    console.warn('Firebase listener error:', err);
    setConn('err', 'Sync error');
  });
}

async function fbLoad() {
  if (!_fbRef) return null;
  try {
    const snapshot = await _fbRef.once('value');
    return snapshot.val();
  } catch(e) {
    console.warn('Firebase load failed:', e);
    return null;
  }
}

async function fbSave() {
  if (!_fbRef) return;
  try {
    const payload = buildFullPayload();
    payload._ts = Date.now();
    await _fbRef.set(payload);
    localStorage.setItem('tios_fb_ts', String(payload._ts));
    setConn('ok', 'Firebase âœ“');
  } catch(e) {
    console.warn('Firebase save failed:', e);
    setConn('err', 'Save failed');
  }
}

function applyRemoteData(remote) {
  if (remote.trades   && Array.isArray(remote.trades))   D.trades   = remote.trades;
  if (remote.notes    && typeof remote.notes === 'object') D.notes   = remote.notes;
  if (remote.capital  && Array.isArray(remote.capital))  D.capital  = remote.capital;
  if (remote.checklist && Array.isArray(remote.checklist)) D.checklist = remote.checklist;
  if (remote.rules    && Array.isArray(remote.rules))    D.rules    = remote.rules;
  if (remote.settings && typeof remote.settings === 'object') {
    CFG = {...defCfg(), ...remote.settings};
    localStorage.setItem('tios_cfg', JSON.stringify(CFG));
  }
  if (remote.xp && typeof remote.xp === 'object') {
    ENG.xp = remote.xp.xp || ENG.xp;
    ENG.level = remote.xp.level || ENG.level;
    ENG.discipline_streak = remote.xp.discipline_streak || ENG.discipline_streak;
    ENG.best_streak = remote.xp.best_streak || ENG.best_streak;
    if (remote.xp.challenges) ENG.challenges = remote.xp.challenges;
    if (remote.xp.completed_challenges) ENG.completed_challenges = remote.xp.completed_challenges;
    localStorage.setItem('tios_eng', JSON.stringify(ENG));
  }
  localStorage.setItem('tios_data', JSON.stringify(D));
}

function updateFbUI(connected) {
  const statusEl = document.getElementById('fbStatus');
  const configArea = document.getElementById('fbConfigArea');
  const disconnectBtn = document.getElementById('fbDisconnectBtn');
  if (statusEl) {
    statusEl.textContent = connected ? 'ðŸŸ¢ Connected' : 'âš« Not connected';
    statusEl.style.color = connected ? 'var(--emerald)' : 'var(--text3)';
  }
  if (configArea) configArea.style.display = connected ? 'none' : 'block';
  if (disconnectBtn) disconnectBtn.style.display = connected ? 'inline-flex' : 'none';
}

function saveFbConfig() {
  const raw = (document.getElementById('fbConfigInput')||{}).value || '';
  let config;
  try {
    config = JSON.parse(raw.trim());
  } catch(e) {
    toast('Invalid JSON â€” paste the full Firebase config object', 'err');
    return;
  }
  if (initFirebase(config)) {
    toast('Firebase connected! Data will sync across all devices âœ“', 'ok');
    fbSave(); // push current local data to Firebase immediately
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   END FIREBASE ENGINE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* _syncInProgress hoisted to top */
/* _syncQueue hoisted to top */
/* _lastSyncTime hoisted to top */
/* _pendingSync hoisted to top */

/* â”€â”€ AUTO SYNC SETTINGS â”€â”€ */
function loadAutoSyncSettings(){
  const cfg = JSON.parse(localStorage.getItem('tios_autosync')||'{"trade":true,"notes":true,"eng":true}');
  const t = E('autoSyncTrade'), n = E('autoSyncNotes'), e2 = E('autoSyncEng');
  if(t) t.checked = cfg.trade !== false;
  if(n) n.checked = cfg.notes !== false;
  if(e2) e2.checked = cfg.eng !== false;
}
function saveAutoSync(){
  const t = E('autoSyncTrade'), n = E('autoSyncNotes'), e2 = E('autoSyncEng');
  localStorage.setItem('tios_autosync', JSON.stringify({
    trade: t ? t.checked : true,
    notes: n ? n.checked : true,
    eng:   e2 ? e2.checked : true,
  }));
  toast('Auto-sync preferences saved','ok');
}
function getAutoSync(){
  return JSON.parse(localStorage.getItem('tios_autosync')||'{"trade":true,"notes":true,"eng":true}');
}

/* â”€â”€ CONNECTION â”€â”€ */
function setConn(st, lb){
  const cDot = E('cDot'), cLbl = E('cLbl');
  const sDot = E('sDot'), sLbl = E('sLbl');
  [cDot, sDot].forEach(el=>{ if(el) el.className = 'cd' + (st?' '+st:''); });
  [cLbl, sLbl].forEach(el=>{ if(el) el.textContent = lb; });
}

async function testConn(){
  if(!WS){ toast('No URL saved. Enter your Apps Script URL first.','err'); return; }
  setConn('', 'Testingâ€¦');
  try {
    const r = await fetch(WS + '?ping=1', { method: 'GET', redirect: 'follow' });
    const data = await r.json();
    if(data.status === 'ok'){
      setConn('ok', 'Connected âœ“');
      toast('âœ… Connected to Google Sheets!','ok');
      updateSyncUI();
    } else {
      setConn('err', 'Error');
      toast('Connection failed: ' + (data.message||'unknown'),'err');
    }
  } catch(e) {
    setConn('err', 'Offline');
    toast('Cannot reach Apps Script. Check URL and deployment.','err');
  }
}

async function tryConn(){
  if(!WS) return;
  try {
    const r = await fetch(WS + '?ping=1', { method: 'GET', redirect: 'follow' });
    const data = await r.json();
    if(data.status === 'ok') setConn('ok', 'Connected âœ“');
    else setConn('err', 'Error');
  } catch(e) { setConn('', 'Offline'); }
  updateSyncUI();
}

function saveAndConn(){
  const url = E('wsUrl') ? E('wsUrl').value.trim() : '';
  if(!url){ toast('Paste your Apps Script URL first','err'); return; }
  if(!url.includes('script.google.com')){
    toast('URL must be a Google Apps Script web app URL','err'); return;
  }
  WS = url;
  localStorage.setItem('tios_ws', url);
  saveProfile();
  toast('URL saved. Testing connectionâ€¦','ok');
  tryConn();
  // Show download button so user can bake URL into HTML for mobile
  showBakeURLOption(url);
}

/* old showBakeURLOption removed */
/* old downloadBakedHTML removed */
/* old showManualBakeInstructions removed */
function disconnectSync(){
  if(!confirm('Disconnect Google Sheets sync? Your local data is unaffected.')) return;
  WS = '';
  localStorage.removeItem('tios_ws');
  setConn('', 'Not connected');
  updateSyncUI();
  toast('Disconnected from Google Sheets','ok');
}

/* â”€â”€ SYNC ENGINE â”€â”€ */
async function push(action, payload){
  const supabase = initSupabase();
  if(!supabase) return;

  _pendingSync++;
  localStorage.setItem('tios_pending_sync', _pendingSync);
  updateSyncUI();

  try {
    if(action === 'addTrade'){
      const { error } = await supabase.from('trades').upsert(payload.trade);
      if(error) throw error;
    } else if(action === 'updateTrade'){
      const { error } = await supabase.from('trades').update(payload.trade).eq('id', payload.trade.id);
      if(error) throw error;
    } else if(action === 'addNote'){
      const { error } = await supabase.from('notes').upsert({ date: payload.date, content: payload.content });
      if(error) throw error;
    }
    // Add more actions as needed

    _pendingSync = Math.max(0, _pendingSync - 1);
    localStorage.setItem('tios_pending_sync', _pendingSync);
    _lastSyncTime = new Date().toISOString();
    localStorage.setItem('tios_last_sync', _lastSyncTime);
    setConn('ok', 'Synced âœ“');
    updateSyncUI();
    return { status: 'ok' };
  } catch(e) {
    setConn('', 'Offline');
    return null;
  }
}

async function syncNow(){
  const supabase = initSupabase();
  if(!supabase){
    toast('Supabase not configured', 'err');
    return;
  }

  if(_syncInProgress){
    toast('Sync already in progressâ€¦','ok');
    return;
  }
  _syncInProgress = true;

  const btn = E('syncNowBtn');
  if(btn){ btn.disabled = true; btn.textContent = 'â³ Syncingâ€¦'; btn.classList.add('sync-pulse'); }
  showSyncProgress(true, 'Starting full syncâ€¦', 0);

  try {
    // Sync trades
    showSyncProgress(true, 'Syncing tradesâ€¦', 20);
    for(const trade of D.trades || []){
      const { error } = await supabase.from('trades').upsert(trade);
      if(error) throw error;
    }

    // Sync notes
    showSyncProgress(true, 'Syncing notesâ€¦', 40);
    for(const [date, content] of Object.entries(D.notes || {})){
      const { error } = await supabase.from('notes').upsert({ date, content });
      if(error) throw error;
    }

    // Sync capital
    showSyncProgress(true, 'Syncing capitalâ€¦', 60);
    for(const cap of D.capital || []){
      const { error } = await supabase.from('capital').upsert(cap);
      if(error) throw error;
    }

    // Sync checklist
    showSyncProgress(true, 'Syncing checklistâ€¦', 80);
    for(const item of D.checklist || []){
      const { error } = await supabase.from('checklist').upsert(item);
      if(error) throw error;
    }

    showSyncProgress(true, 'âœ… Sync complete!', 100);
    toast('âœ… All data synced to Supabase!','ok');
    setTimeout(()=>showSyncProgress(false,'',0), 2000);
    updateSyncUI();
  } catch(e) {
    showSyncProgress(false,'',0);
    toast('Sync failed: ' + e.message,'err');
    setConn('err', 'Sync failed');
  } finally {
    _syncInProgress = false;
    if(btn){ btn.disabled = false; btn.textContent = 'ðŸ”„ Sync Now'; btn.classList.remove('sync-pulse'); }
  }
}

function buildFullPayload(){
  return {
    trades:     D.trades || [],
    notes:      D.notes || {},
    capital:    D.capital || [],
    checklist:  D.checklist || [],
    challenges: { challenges: ENG.challenges||[], completed_challenges: ENG.completed_challenges||[] },
    xp:         ENG,
    settings:   CFG,
  };
}

/* â”€â”€ AUTO SYNC TRIGGERS â”€â”€ */
async function autoSyncTrade(trade){
  if(!WS) return;
  const cfg = getAutoSync();
  if(!cfg.trade) return;
  await push('addTrade', { trade });
}

async function autoSyncNotes(){
  if(!WS) return;
  const cfg = getAutoSync();
  if(!cfg.notes) return;
  await push('syncNotes', { notes: D.notes||{} });
}

async function autoSyncChecklist(){
  if(!WS) return;
  const cfg = getAutoSync();
  if(!cfg.notes) return;
  await push('syncChecklist', { checklist: D.checklist||[] });
}

async function autoSyncEngagement(){
  if(!WS) return;
  const cfg = getAutoSync();
  if(!cfg.eng) return;
  await push('syncChallenges', ENG);
  await push('syncXP', ENG);
}

/* â”€â”€ UI HELPERS â”€â”€ */
function showSyncProgress(show, msg, pct){
  const wrap = E('syncProgress');
  const bar = E('syncProgressBar');
  const msgEl = E('syncProgressMsg');
  if(wrap) wrap.style.display = show ? 'block' : 'none';
  if(bar) bar.style.width = pct + '%';
  if(msgEl) msgEl.textContent = msg;
}

function updateSyncUI(){
  const tradeCount = E('sync-trade-count');
  const lastTime = E('sync-last-time');
  const pending = E('sync-pending-count');

  if(tradeCount) tradeCount.textContent = (D.trades||[]).length;
  if(lastTime){
    if(_lastSyncTime){
      const d = new Date(_lastSyncTime);
      lastTime.textContent = d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    } else {
      lastTime.textContent = 'Never';
      lastTime.style.color = 'var(--text3)';
    }
  }
  if(pending){
    pending.textContent = _pendingSync > 0 ? _pendingSync : '0';
    pending.style.color = _pendingSync > 0 ? 'var(--ruby)' : 'var(--emerald)';
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   END SYNC ENGINE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   V5 â€” STRUCTURED RULES + BREACH DETECTION + CHALLENGE HISTORY
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ RULE TYPE CONSTANTS â”€â”€ */
const RULE_TYPE_LABELS = {
  free_text:          'General',
  max_trades_day:     'Max trades/day',
  no_trade_after:     'No trade after',
  no_trade_before:    'No trade before',
  gap_after_loss:     'Gap after loss',
  daily_loss_limit:   'Daily loss limit',
  daily_profit_limit: 'Daily profit limit',
  max_lots:           'Max lots',
  same_symbol_gap:    'Symbol gap',
  two_profits_stop:   '2 profits = stop',
};
const RULE_TYPE_UNITS = {
  max_trades_day:     'trades',
  no_trade_after:     'HH:MM',
  no_trade_before:    'HH:MM',
  gap_after_loss:     'minutes',
  daily_loss_limit:   'â‚¹',
  daily_profit_limit: 'â‚¹',
  max_lots:           'lots',
  same_symbol_gap:    'minutes',
};
const RULE_TYPES_WITH_THRESHOLD = [
  'max_trades_day','no_trade_after','no_trade_before',
  'gap_after_loss','daily_loss_limit','daily_profit_limit',
  'max_lots','same_symbol_gap'
];

/* â”€â”€ MIGRATE EXISTING RULES to structured format â”€â”€ */
function migrateRulesToStructured(){
  let changed = false;
  (D.rules||[]).forEach(rule => {
    if(!rule.ruleType){
      const detected = detectRuleType(rule.desc||'');
      rule.ruleType = detected.ruleType;
      if(detected.threshold) rule.threshold = detected.threshold;
      changed = true;
    }
  });
  if(changed){ sv(); }
}

function detectRuleType(desc){
  const d = (desc||'').toLowerCase();
  if(/3 trade|trade 3|three trade|max.*3|3.*trade/.test(d))
    return { ruleType:'max_trades_day', threshold:'3' };
  if(/2 profit|two profit|2.*profit.*stop|profit.*session over/.test(d))
    return { ruleType:'two_profits_stop', threshold:null };
  if(/â‚¹50[,k].*loss|50,000.*loss|50k.*loss|loss.*50/.test(d))
    return { ruleType:'daily_loss_limit', threshold:'50000' };
  if(/â‚¹50[,k].*profit|50,000.*profit|50k.*profit|profit.*50/.test(d))
    return { ruleType:'daily_profit_limit', threshold:'50000' };
  if(/after.*(?:2:30|14:30|3\s*pm)|(?:2:30|14:30).*after/.test(d))
    return { ruleType:'no_trade_after', threshold:'14:30' };
  if(/before.*9:15|9:15.*before/.test(d))
    return { ruleType:'no_trade_before', threshold:'09:15' };
  if(/50%.*capital|capital.*50%/.test(d))
    return { ruleType:'max_lots', threshold:'4' };
  if(/gap.*loss|loss.*gap|30.*min|wait.*loss/.test(d))
    return { ruleType:'gap_after_loss', threshold:'30' };
  return { ruleType:'free_text', threshold:null };
}

/* â”€â”€ RULE MODAL HELPERS â”€â”€ */
function onRuleTypeChange(){
  const type = E('r-type').value;
  const wrap = E('r-threshold-wrap');
  const lbl  = E('r-threshold-label');
  const inp  = E('r-threshold');
  const hasThresh = RULE_TYPES_WITH_THRESHOLD.includes(type);
  if(wrap) wrap.style.display = hasThresh ? 'block' : 'none';
  if(lbl && RULE_TYPE_UNITS[type])
    lbl.textContent = `Threshold (${RULE_TYPE_UNITS[type]})`;
  if(inp){
    inp.placeholder = type==='no_trade_after'||type==='no_trade_before' ? 'e.g. 14:30' :
                      type==='daily_loss_limit'||type==='daily_profit_limit' ? 'e.g. 50000' : 'e.g. 3';
  }
}

function openAddRule(){
  E('rulModalTitle').textContent = 'ðŸ›¡ Add Rule';
  E('ruleSubmitBtn').textContent = 'Save Rule';
  E('r-edit-id').value = '';
  ['r-desc','r-threshold','r-why'].forEach(id=>{const el=E(id);if(el)el.value='';});
  E('r-type').value = 'free_text';
  E('r-cat').value = 'Risk';
  E('r-pri').value = 'Critical';
  E('r-wt').value = '2';
  onRuleTypeChange();
  om('ruleModal');
}

function editRule(id){
  const rule = (D.rules||[]).find(r=>r.id===id);
  if(!rule) return;
  E('rulModalTitle').textContent = 'âœï¸ Edit Rule';
  E('ruleSubmitBtn').textContent = 'Update Rule';
  E('r-edit-id').value = id;
  E('r-desc').value = rule.desc||'';
  E('r-cat').value = rule.cat||'Risk';
  E('r-pri').value = rule.priority||'Critical';
  E('r-wt').value = rule.weight||2;
  E('r-type').value = rule.ruleType||'free_text';
  E('r-why').value = rule.why||'';
  onRuleTypeChange();
  if(rule.threshold) E('r-threshold').value = rule.threshold;
  om('ruleModal');
}

function closeRuleModal(){
  cm('ruleModal');
}

function subRule(){
  const editId = E('r-edit-id').value;
  const ruleType = E('r-type').value;
  const threshold = E('r-threshold').value.trim();
  const rule = {
    id:        editId || 'R' + Date.now(),
    desc:      v('r-desc').trim(),
    cat:       v('r-cat'),
    priority:  v('r-pri'),
    weight:    parseInt(v('r-wt'))||2,
    why:       v('r-why').trim(),
    ruleType,
    threshold: RULE_TYPES_WITH_THRESHOLD.includes(ruleType) ? threshold : null,
    violations: 0,
  };
  if(!rule.desc){ toast('Enter rule description','err'); return; }
  if(RULE_TYPES_WITH_THRESHOLD.includes(ruleType) && !threshold){
    toast('Enter threshold value for this rule type','err'); return;
  }
  if(editId){
    const existing = (D.rules||[]).find(r=>r.id===editId);
    if(existing) rule.violations = existing.violations||0;
    D.rules = D.rules.map(r => r.id===editId ? rule : r);
    toast('Rule updated âœ…','ok');
  } else {
    if(!D.rules) D.rules = [];
    D.rules.push(rule);
    toast('Rule added âœ…','ok');
  }
  sv();
  closeRuleModal();
  renderRules();
  autoSyncChecklist();
}

/* â”€â”€ UPDATED renderRules with type badges + edit/delete â”€â”€ */
function renderRules(){
  migrateRulesToStructured();
  const cc={Entry:'#4a90f5',Exit:'#0ea5c9',Risk:'#f04060',Mindset:'#9d7ff5',Timing:'#f0a500'};
  const rules = D.rules||[];
  T('r-act', rules.length);
  T('r-viol', rules.reduce((s,r)=>s+(r.violations||0),0));
  const mv = rules.slice().sort((a,b)=>(b.violations||0)-(a.violations||0))[0];
  T('r-worst', mv&&mv.violations>0 ? mv.desc.slice(0,35)+'â€¦' : 'All clear âœ…');

  const el = E('rulesList');
  if(!el) return;

  if(!rules.length){
    el.innerHTML='<div class="empty"><div class="eico">ðŸ›¡</div><div class="etxt">No rules yet</div><div class="esub">Add your trading rules to enable auto-breach detection on import</div></div>';
    return;
  }

  const priColor = {Critical:'var(--ruby)',High:'var(--amber)',Medium:'var(--sapphire)'};
  const catColors = cc;
  el.innerHTML = rules.map(r => {
    const isAuto = r.ruleType && r.ruleType !== 'free_text';
    const typeLabel = RULE_TYPE_LABELS[r.ruleType] || 'General';
    const threshDisplay = r.threshold ? ` (${r.threshold}${RULE_TYPE_UNITS[r.ruleType]||''})` : '';
    return `<div style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;background:var(--panel2);border:1px solid var(--rim);border-left:3px solid ${catColors[r.cat]||'var(--rim)'};border-radius:var(--r);margin-bottom:8px;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:5px;line-height:1.4;">${esc(r.desc)}</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin-bottom:4px;">
          <span class="tag" style="background:${catColors[r.cat]||'var(--panel3)'}22;color:${catColors[r.cat]||'var(--text3)'};">${r.cat}</span>
          <span class="tag" style="background:${priColor[r.priority]||'var(--panel3)'}22;color:${priColor[r.priority]||'var(--text3)'};">${r.priority}</span>
          <span class="rule-type-badge ${isAuto?'rule-auto':'rule-manual'}">${isAuto?'ðŸ¤– Auto':'ðŸ“ Manual'}: ${typeLabel}${threshDisplay}</span>
          ${r.violations>0?`<span class="tag trb">âš ï¸ ${r.violations} violation${r.violations>1?'s':''}</span>`:''}
        </div>
        ${r.why?`<div style="font-size:11px;color:var(--text3);font-style:italic;">"${esc(r.why)}"</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;">
        <button onclick="editRule('${esc(r.id)}')" style="background:none;border:1px solid var(--rim2);color:var(--sapphire);cursor:pointer;font-size:11px;padding:4px 9px;border-radius:var(--r2);">âœï¸ Edit</button>
        <button onclick="delRule('${esc(r.id)}')" style="background:none;border:1px solid var(--rim2);color:var(--text3);cursor:pointer;font-size:11px;padding:4px 9px;border-radius:var(--r2);">ðŸ—‘ Del</button>
      </div>
    </div>`;
  }).join('');
}

/* â”€â”€ RULE BREACH DETECTION (used in import) â”€â”€ */
function checkTradeAgainstRules(trade, allTradesInDay, tradeIdx){
  const breaches = [];
  const rules = (D.rules||[]).filter(r=>r.ruleType && r.ruleType!=='free_text');
  const [th, tm2] = (trade.tm||'00:00').split(':').map(Number);
  const tradeMins = th*60+tm2;

  for(const rule of rules){
    const thresh = parseFloat(rule.threshold||0);
    switch(rule.ruleType){
      case 'no_trade_after':{
        const [lh,lm]=(rule.threshold||'14:30').split(':').map(Number);
        if(tradeMins > lh*60+lm)
          breaches.push({rule:rule.id,msg:`Traded at ${trade.tm} â€” after ${rule.threshold} limit`,sev:'critical',desc:rule.desc});
        break;
      }
      case 'no_trade_before':{
        const [lh,lm]=(rule.threshold||'09:15').split(':').map(Number);
        if(tradeMins < lh*60+lm)
          breaches.push({rule:rule.id,msg:`Traded at ${trade.tm} â€” before ${rule.threshold} limit`,sev:'critical',desc:rule.desc});
        break;
      }
      case 'max_trades_day':{
        if(tradeIdx+1 > thresh)
          breaches.push({rule:rule.id,msg:`Trade #${tradeIdx+1} of day â€” limit is ${thresh}`,sev:'critical',desc:rule.desc});
        break;
      }
      case 'two_profits_stop':{
        const profitsBefore = allTradesInDay.slice(0,tradeIdx).filter(t=>t.grossPnl>0).length;
        if(profitsBefore>=2)
          breaches.push({rule:rule.id,msg:`2 profits already before this trade`,sev:'critical',desc:rule.desc});
        break;
      }
      case 'gap_after_loss':{
        if(tradeIdx>0){
          const prev=allTradesInDay[tradeIdx-1];
          if((prev.grossPnl||0)<0){
            const [ph,pm]=(prev.tm||'00:00').split(':').map(Number);
            const gap=tradeMins-(ph*60+pm);
            if(gap<thresh)
              breaches.push({rule:rule.id,msg:`Only ${gap}min gap after loss â€” need ${thresh}min`,sev:'high',desc:rule.desc});
          }
        }
        break;
      }
      case 'daily_loss_limit':{
        const cumLoss=allTradesInDay.slice(0,tradeIdx).reduce((s,t)=>s+Math.min(0,t.grossPnl||0),0);
        if(Math.abs(cumLoss)>=thresh)
          breaches.push({rule:rule.id,msg:`Day loss â‚¹${F(Math.abs(cumLoss))} hit limit â‚¹${F(thresh)}`,sev:'critical',desc:rule.desc});
        break;
      }
      case 'daily_profit_limit':{
        const cumProfit=allTradesInDay.slice(0,tradeIdx).reduce((s,t)=>s+Math.max(0,t.grossPnl||0),0);
        if(cumProfit>=thresh)
          breaches.push({rule:rule.id,msg:`Day profit â‚¹${F(cumProfit)} hit limit â‚¹${F(thresh)}`,sev:'high',desc:rule.desc});
        break;
      }
      case 'max_lots':{
        const lots=trade.lots||1;
        if(lots>thresh)
          breaches.push({rule:rule.id,msg:`${lots} lots â€” limit is ${thresh}`,sev:'high',desc:rule.desc});
        break;
      }
      case 'same_symbol_gap':{
        const prevSame=allTradesInDay.slice(0,tradeIdx).reverse().find(t=>t.sym===trade.sym);
        if(prevSame&&(prevSame.grossPnl||0)<0){
          const [ph,pm]=(prevSame.tm||'00:00').split(':').map(Number);
          const gap=tradeMins-(ph*60+pm);
          if(gap<thresh)
            breaches.push({rule:rule.id,msg:`Re-entry on ${trade.sym} ${gap}min after loss â€” need ${thresh}min`,sev:'critical',desc:rule.desc});
        }
        break;
      }
    }
  }
  return breaches;
}

/* â”€â”€ R:R CALCULATION FOR IMPORT â”€â”€ */
function calcImportRR(idx){
  const t = _importTrades[idx];
  if(!t) return;
  const sl = parseFloat(t.sl||0);
  const en = parseFloat(t.en||0);
  const ex = parseFloat(t.ex||0);
  const rrEl = E('rr-'+idx);
  if(!sl||!en||!ex){ if(rrEl){rrEl.value='0';rrEl.style.color='var(--text3)';} return; }
  let rr;
  if(t.dir==='Long') rr = en>sl ? (ex-en)/(en-sl) : 0;
  else rr = en<sl ? (en-ex)/(sl-en) : 0;
  rr = parseFloat(Math.max(0,rr).toFixed(2));
  t.rr = rr;
  if(rrEl){
    rrEl.value = rr;
    rrEl.style.color = rr>=1.5?'var(--emerald)':rr>=1?'var(--amber)':'var(--ruby)';
    rrEl.style.background = 'var(--panel3)';
  }
}

/* â”€â”€ UPDATED renderImportEnrich with breach detection + SL â”€â”€ */
function renderImportEnrich(trades){
  const el = E('imp-enrich-list');
  if(!el) return;

  const stratOptions = D.strategies.length
    ? D.strategies.map(s=>`<option value="${esc(s.nm)}">${esc(s.nm)}</option>`).join('')
    : '<option>CPR Trend</option><option>Other</option>';

  // Group by date for sequential breach checking
  const byDate = {};
  trades.forEach(t=>{ if(!byDate[t.dt]) byDate[t.dt]=[]; byDate[t.dt].push(t); });
  // Sort each day's trades by time
  Object.values(byDate).forEach(arr=>arr.sort((a,b)=>(a.tm||'').localeCompare(b.tm||'')));

  el.innerHTML = trades.map((t,i) => {
    const profit = t.grossPnl >= 0;
    const dayTrades = byDate[t.dt]||[];
    const dayIdx = dayTrades.findIndex(dt=>dt.id===t.id);
    const breaches = checkTradeAgainstRules(t, dayTrades, dayIdx);
    const breachHtml = breaches.length
      ? breaches.map(b=>`<div class="breach-badge breach-${b.sev}">âš ï¸ ${b.msg}</div>`).join('')
      : '<div class="breach-badge breach-ok">âœ… No rule breaches detected</div>';

    // Auto-set rules followed based on breaches
    if(breaches.some(b=>b.sev==='critical')) _importTrades[i].rl = 'No';
    else if(breaches.length) _importTrades[i].rl = 'Partial';

    return `<div class="imp-trade-row ${profit?'profit':'loss'}" style="margin-bottom:14px;">
      <div class="imp-trade-top">
        <div><span class="imp-sym">${t.sym} ${t.strike||''} ${t.optionType||''}</span>
          <span style="font-size:10px;color:var(--text3);margin-left:6px;">${t.tm} Â· ${t.dt}</span></div>
        <div class="imp-pnl" style="color:${profit?'var(--emerald)':'var(--ruby)'};">${profit?'+':'-'}â‚¹${parseFloat(Math.abs(t.grossPnl).toFixed(2)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
      <div style="margin-bottom:8px;">${breachHtml}</div>
      <div class="imp-enrich-fields">
        <div class="fg"><label>Strategy</label>
          <select onchange="_importTrades[${i}].strat=this.value">${stratOptions}</select></div>
        <div class="fg"><label>Emotion</label>
          <select onchange="_importTrades[${i}].em=this.value">
            <option>Calm ðŸ˜Œ</option><option>Confident ðŸ’ª</option><option>Focused ðŸŽ¯</option>
            <option>Neutral ðŸ˜</option><option>Anxious ðŸ˜°</option><option>Greedy ðŸ¤‘</option>
            <option>FOMO ðŸ˜±</option><option>Revenge ðŸ˜¤</option>
          </select></div>
        <div class="fg"><label>Plan Followed?</label>
          <select onchange="_importTrades[${i}].pl=this.value">
            <option value="Yes">âœ… Yes</option><option value="Partial">âš¡ Partial</option><option value="No">âŒ No</option>
          </select></div>
        <div class="fg"><label>Rules Followed?</label>
          <select id="rl-sel-${i}" onchange="_importTrades[${i}].rl=this.value">
            <option value="Yes" ${_importTrades[i].rl==='Yes'?'selected':''}>âœ… Yes</option>
            <option value="Partial" ${_importTrades[i].rl==='Partial'?'selected':''}>âš¡ Partial</option>
            <option value="No" ${_importTrades[i].rl==='No'?'selected':''}>âŒ No</option>
          </select></div>
        <div class="fg"><label>Setup Quality</label>
          <select onchange="_importTrades[${i}].sq=this.value">
            <option value="A+">A+ Perfect</option><option value="A">A Good</option>
            <option value="B">B Average</option><option value="C">C Weak</option>
          </select></div>
        <div class="fg">
          <label>Stop Loss â‚¹ <span style="font-size:9px;color:var(--text3);">for R:R</span></label>
          <input type="number" step="0.05" placeholder="e.g. 195"
            onchange="_importTrades[${i}].sl=parseFloat(this.value)||0; calcImportRR(${i})">
        </div>
        <div class="fg">
          <label>R:R <span style="font-size:9px;color:var(--text3);">auto-calc</span></label>
          <input type="number" id="rr-${i}" value="0" step="0.1" readonly
            style="background:var(--panel3);">
        </div>
      </div>
      <div class="fg" style="margin-top:6px;"><label>Notes</label>
        <textarea placeholder="What happened? Learnings?" rows="2"
          onchange="_importTrades[${i}].nt=this.value"></textarea></div>
    </div>`;
  }).join('');
}

/* â”€â”€ DUPLICATE DETECTION â”€â”€ */
function findDuplicateTrades(importTrades){
  const existing = D.trades||[];
  return importTrades.map(t => {
    const isDupe = existing.some(ex =>
      ex.dt === t.dt &&
      ex.sym === t.sym &&
      parseFloat(ex.en) === parseFloat(t.en) &&
      (ex.tm||'').slice(0,5) === (t.tm||'').slice(0,5)
    );
    return { ...t, isDuplicate: isDupe };
  });
}

/* â”€â”€ UPDATED renderImportPreview with dupe detection â”€â”€ */
function renderImportPreview(trades){
  const el = E('imp-preview-list');
  if(!el) return;

  // Check for duplicates
  const withDupes = findDuplicateTrades(trades);
  _importTrades = withDupes;

  const dupeCount = withDupes.filter(t=>t.isDuplicate).length;
  if(dupeCount>0){
    const warn = document.createElement('div');
    warn.className = 'imp-dupe-warning';
    warn.innerHTML = `âš ï¸ ${dupeCount} trade(s) already exist in your journal and will be skipped`;
    el.parentNode.insertBefore(warn, el);
  }

  el.innerHTML = withDupes.map((t,i) => {
    const profit = t.grossPnl >= 0;
    const pnlColor = profit ? 'var(--emerald)' : 'var(--ruby)';
    return `<div class="imp-trade-row ${profit?'profit':'loss'} ${t.isDuplicate?'chal-failed':''}">
      ${t.isDuplicate?'<div class="imp-dupe-warning" style="margin-bottom:6px;">âš ï¸ Already in journal â€” will be skipped</div>':''}
      <div class="imp-trade-top">
        <div>
          <span class="imp-sym">${t.sym} ${t.strike||''} ${t.optionType||''}</span>
          <span class="tag ${t.dir==='Long'?'tem':'trb'}" style="margin-left:6px;">${t.dir}</span>
        </div>
        <div class="imp-pnl" style="color:${t.isDuplicate?'var(--text3)':pnlColor};">${profit?'+':'-'}â‚¹${parseFloat(Math.abs(t.grossPnl).toFixed(2)).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
      </div>
      <div class="imp-meta">
        <span class="tag tsa">Entry: â‚¹${t.en}</span>
        <span class="tag tsa">Exit: â‚¹${t.ex}</span>
        <span class="tag tam">Qty: ${t.qt} | ${t.lots} lots</span>
        <span class="tag" style="background:var(--panel3);color:var(--text3);">${t.tm} Â· ${t.dt}</span>
        ${t.expiry?`<span class="tag tvl">Exp: ${t.expiry}</span>`:''}
      </div>
    </div>`;
  }).join('');

  const newCount = withDupes.filter(t=>!t.isDuplicate).length;
  const btn = E('imp-next1-btn');
  if(btn) btn.textContent = newCount > 0
    ? `Next: Add Details to ${newCount} trade${newCount>1?'s':''} â†’`
    : 'All trades already imported';
}

/* â”€â”€ UPDATED confirmFyersImport â€” skip dupes, auto-update challenges â”€â”€ */
function confirmFyersImport(){
  const toImport = _importTrades.filter(t=>!t.isDuplicate);
  if(!toImport.length){ toast('No new trades to import','err'); return; }

  let imported = 0;
  toImport.forEach(t => {
    const trade = {
      id: t.id, dt: t.dt, tm: t.tm, sym: t.sym, dir: t.dir,
      strat: t.strat||'Other', en: t.en, ex: t.ex, qt: t.qt,
      bk: 40, sl: t.sl||0, tg: 0,
      rr: t.rr||0, rp: 1.0, sq: t.sq||'A',
      pl: t.pl||'Yes', rl: t.rl||'Yes',
      em: t.em||'Calm ðŸ˜Œ', nt: t.nt||'',
      strike: t.strike||0, optionType: t.optionType||'',
      expiry: t.expiry||'', lots: t.lots||1,
      source: 'fyers_import',
    };
    D.trades.push(trade);
    imported++;
    onTradeLogged(trade);

    // Auto-update challenges based on this trade
    autoUpdateChallengesFromTrade(trade);
  });

  sv();
  cm('importPreviewModal');
  renderAll();
  rjnl(1);
  _importTrades = [];

  // Sync everything to sheets
  if(WS) syncNow();

  toast(`âœ… ${imported} trade${imported>1?'s':''} imported! ${_importTrades.length>imported?`(${_importTrades.length-imported} duplicates skipped)`:''}`, 'ok');
}

/* â”€â”€ AUTO-UPDATE CHALLENGES FROM IMPORTED TRADE â”€â”€ */
function autoUpdateChallengesFromTrade(trade){
  const breaches = checkTradeAgainstRules(trade,
    (D.trades||[]).filter(t=>t.dt===trade.dt),
    (D.trades||[]).filter(t=>t.dt===trade.dt).findIndex(t=>t.id===trade.id)
  );

  (ENG.challenges||[]).forEach(ch => {
    if(ch.completed||ch.failed) return;
    // Only count trades on or after challenge startDate
    const _chalStart = ch.startDate || ch.created || '2000-01-01';
    if((trade.dt||'') < _chalStart) return;

    const title = (ch.title||'').toLowerCase();
    const cat = ch.cat||'';

    // Journaling challenges
    if(cat==='journaling' && title.includes('log')){
      ch.progress = (ch.progress||0)+1;
      if(ch.progress>=ch.target) markChalDone(ch.id);
    }
    // Discipline â€” rule breaches fail the challenge
    if(cat==='discipline' && breaches.some(b=>b.sev==='critical')){
      if(title.includes('no trades after')||title.includes('rule')||title.includes('discipline')){
        ch.failed = true;
        ch.failedDate = new Date().toISOString().slice(0,10);
        ch.failReason = breaches[0].msg;
        if(!ENG.completed_challenges) ENG.completed_challenges=[];
        ENG.completed_challenges.push({...ch});
        ENG.challenges = ENG.challenges.filter(c=>c.id!==ch.id);
        toast(`âŒ Challenge failed: "${ch.title}"`, 'err');
      }
    }
  });
  saveEng();
}

/* â”€â”€ CHALLENGE DURATION EXPIRY CHECK â”€â”€ */
function checkChallengeExpiry(){
  const today = new Date().toISOString().slice(0,10);
  const weekKey = getWeekKey();
  let changed = false;

  (ENG.challenges||[]).forEach(ch => {
    if(ch.completed||ch.failed||ch.expired) return;
    // Expire if past endDate
    if(ch.endDate && ch.endDate < today){
      const completedByEnd = (ch.progress||0) >= ch.target;
      if(completedByEnd){
        ch.completed = true;
        ch.completedDate = ch.endDate;
      } else {
        ch.expired = true;
        ch.expiredDate = today;
      }
      if(!ENG.completed_challenges) ENG.completed_challenges=[];
      ENG.completed_challenges.push({...ch});
      ENG.challenges = ENG.challenges.filter(c=>c.id!==ch.id);
      changed = true;
      if(completedByEnd) awardXP(ch.xp, 'Challenge completed: '+ch.title);
      return;
    }
    if(ch.type==='weekly' && ch.weekKey && ch.weekKey < weekKey){
      // Weekly challenge from a previous week â€” expire it
      const completed = (ch.progress||0) >= ch.target;
      if(completed){
        ch.completed = true;
        ch.completedDate = ch.weekKey;
      } else {
        ch.expired = true;
        ch.expiredDate = today;
      }
      if(!ENG.completed_challenges) ENG.completed_challenges=[];
      ENG.completed_challenges.push({...ch});
      ENG.challenges = ENG.challenges.filter(c=>c.id!==ch.id);
      changed = true;
      if(completed) awardXP(ch.xp, 'Challenge completed: '+ch.title);
    }
  });
  if(changed){ saveEng(); }
}

/* â”€â”€ CHALLENGE TAB SWITCHER â”€â”€ */
function switchChalTab(tab, el){
  document.querySelectorAll('#pg-challenges .stab').forEach(s=>s.classList.remove('on'));
  ['active','completed','history'].forEach(t=>{
    const pane=E('chal-tab-'+t);
    if(pane) pane.style.display=t===tab?'block':'none';
  });
  el.classList.add('on');
  if(tab==='history') renderChalHistory();
}

/* â”€â”€ CHALLENGE HISTORY RENDER â”€â”€ */
function renderChalHistory(){
  const el = E('chalHistoryList');
  if(!el) return;
  const all = [
    ...(ENG.completed_challenges||[]).map(c=>({...c,_status:c.completed?'completed':c.expired?'expired':'failed'})),
    ...(ENG.challenges||[]).map(c=>({...c,_status:'active'})),
  ].sort((a,b)=>(b.created||'').localeCompare(a.created||''));

  if(!all.length){
    el.innerHTML='<div class="empty" style="padding:16px;"><div class="esub">No challenge history yet</div></div>';
    return;
  }

  const statusColors = {
    active:'var(--sapphire)', completed:'var(--emerald)',
    expired:'var(--text3)', failed:'var(--ruby)'
  };
  const statusLabels = {
    active:'ðŸ”¥ Active', completed:'âœ… Done',
    expired:'â° Expired', failed:'âŒ Failed'
  };

  el.innerHTML = all.map(ch => {
    const pct = ch.target>0?Math.min(100,Math.round((ch.progress||0)/ch.target*100)):0;
    const color = statusColors[ch._status]||'var(--text3)';
    return `<div class="challenge-card" style="opacity:${ch._status==='expired'?'.6':'1'}">
      <div class="ch-top">
        <div style="flex:1;">
          <div class="ch-title">${esc(ch.title)}</div>
          <div class="ch-desc" style="margin-top:3px;">${esc(ch.desc||'')}</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div class="ch-badge" style="background:${color}22;color:${color};">${statusLabels[ch._status]||ch._status}</div>
          <div style="font-size:9px;color:var(--text3);margin-top:3px;">${ch.type}</div>
        </div>
      </div>
      <div class="ch-progress-wrap">
        <div class="ch-progress-top">
          <span class="ch-prog-lbl">${ch._status==='active'?'Progress':'Final'}</span>
          <span class="ch-prog-val">${ch.progress||0}/${ch.target}</span>
        </div>
        <div class="ch-bar"><div class="ch-bf" style="width:${pct}%;background:${color};"></div></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:6px;">
        <span>Created: ${ch.created||'â€”'}${ch.startDate&&ch.startDate!==ch.created?' Â· Trades from: '+ch.startDate:''}</span>
        <span>${ch.completedDate?'Completed: '+ch.completedDate:ch.expiredDate?'Expired: '+ch.expiredDate:ch.failedDate?'Failed: '+ch.failedDate:ch.endDate?'Ends: '+ch.endDate:''}</span>
      </div>
      ${ch.failReason?`<div style="font-size:11px;color:var(--ruby);margin-top:5px;">Reason: ${esc(ch.failReason)}</div>`:''}
      <div class="ch-reward-row" style="margin-top:6px;">
        <span class="ch-reward-ico">â­</span>
        <span>${ch._status==='completed'?'Earned':'Potential'}: ${ch.xp} XP</span>
      </div>
    </div>`;
  }).join('');
}

/* â”€â”€ PATCH renderChallenges to check expiry first â”€â”€ */
const _origRenderChallenges = window.renderChallenges;
function renderChallenges(){
  checkChallengeExpiry();
  generateWeeklyChallenges();
  const active = (ENG.challenges||[]).filter(c=>!c.completed&&!c.failed&&!c.expired);
  const done = (ENG.completed_challenges||[]).slice().reverse().slice(0,20);
  const el = E('challengesList');
  if(!el) return;
  if(!active.length){
    el.innerHTML='<div class="empty"><div class="eico">ðŸŽ¯</div><div class="etxt">No active challenges</div><div class="esub">System generates 3 weekly missions automatically each Monday</div></div>';
  } else {
    el.innerHTML = active.map(ch=>renderChalCard(ch)).join('');
  }
  const doneEl = E('completedChalsList');
  if(doneEl){
    T('chal-completed-count', (ENG.completed_challenges||[]).length+' total');
    doneEl.innerHTML = done.length ? done.map(ch=>renderChalCard(ch,true)).join('') :
      '<div class="empty" style="padding:12px;"><div class="esub">Complete challenges to see them here</div></div>';
  }
  renderXPBar();
}

/* â”€â”€ SYNC challenge/rule changes to sheets â”€â”€ */
function syncRulesAndChallenges(){
  if(!WS) return;
  push('syncChallenges', ENG);
  push('syncSettings', CFG);
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   END V5
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   GOOGLE SHEETS DATA LOADER
   Loads all data from Sheets on app open
   Falls back to localStorage if offline or no URL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

let _sheetsLoaded = false;
let _loadingFromSheets = false;

/* â”€â”€ LOADER UI â”€â”€ */
function setLoaderMsg(msg, pct, sub=''){
  const el=E('sheetsLoaderMsg');
  const bar=E('sheetsLoaderBar');
  const subEl=E('sheetsLoaderSub');
  if(el) el.textContent=msg;
  if(bar) bar.style.width=pct+'%';
  if(subEl) subEl.textContent=sub;
}

function hideLoader(){
  const el=E('sheetsLoader');
  if(el){
    el.style.opacity='0';
    el.style.transition='opacity .4s';
    setTimeout(()=>{ el.style.display='none'; },400);
  }
}

/* â”€â”€ MAIN LOAD FUNCTION â”€â”€ */
async function loadFromSheetsOrLocal(){
  if (_appBooted) return;
  _loadTimeout = setTimeout(()=>{
    if (!_appBooted) {
      setLoaderMsg('Load timeout â€” using local data', 90, 'Open Settings to connect Supabase');
      loadFromLocal();
      hideLoader();
    }
  }, 10000);

  // â”€â”€ Try Firebase first (highest priority, real-time) â”€â”€
  if (_fbConfig) {
    setLoaderMsg('Connecting to Firebaseâ€¦', 10);
    try {
      if (!_fbRef) initFirebase(_fbConfig);
      if (_fbRef) {
        setLoaderMsg('Fetching your data from Firebaseâ€¦', 30, 'Real-time sync active');
        const remote = await fbLoad();
        if (remote && remote._ts) {
          setLoaderMsg('Applying synced dataâ€¦', 70);
          await delay(200);
          applyRemoteData(remote);
          localStorage.setItem('tios_fb_ts', String(remote._ts));
          setLoaderMsg('Ready!', 100, `Loaded ${(D.trades||[]).length} trades from Firebase`);
          setConn('ok', 'Firebase âœ“');
          updateFbUI(true);
          startFbListener(); // enable live updates
          await delay(400);
          hideLoader();
          bootApp();
          return;
        }
      }
    } catch(fbErr) {
      console.warn('Firebase load failed, falling back:', fbErr);
    }
  }

  // â”€â”€ Fall back to Supabase â”€â”€
  if (!_fbConfig && (!_supabaseUrl || _supabaseUrl === 'YOUR_SUPABASE_URL' || !_supabaseKey || _supabaseKey === 'YOUR_SUPABASE_ANON_KEY')) {
    setLoaderMsg('Supabase not configured â€” using local data', 80, 'Open Settings to connect Supabase');
    loadFromLocal();
    hideLoader();
    return;
  }

  setLoaderMsg('Connecting to Supabaseâ€¦', 10);

  const supabase = initSupabase();
  if(!supabase){
    setLoaderMsg('Supabase not configured â€” using local data', 80, 'Open Settings to connect Supabase');
    loadFromLocal();
    hideLoader();
    return;
  }

  try {
    setLoaderMsg('Fetching your dataâ€¦', 30, 'Loading trades, rules, challengesâ€¦');

    // Fetch all data from Supabase
    const { data: trades, error: tradesError } = await supabase.from('trades').select('*');
    const { data: notes, error: notesError } = await supabase.from('notes').select('*');
    const { data: capital, error: capitalError } = await supabase.from('capital').select('*');
    const { data: checklist, error: checklistError } = await supabase.from('checklist').select('*');
    const { data: rules, error: rulesError } = await supabase.from('rules').select('*');
    const { data: challenges, error: challengesError } = await supabase.from('challenges').select('*');
    const { data: settings, error: settingsError } = await supabase.from('user_settings').select('*');
    const { data: xp, error: xpError } = await supabase.from('user_xp').select('*').single();

    if(tradesError || notesError || capitalError || checklistError || rulesError || challengesError || settingsError || xpError){
      throw new Error('Supabase query failed');
    }

    setLoaderMsg('Processing dataâ€¦', 70, 'Applying your trades and rulesâ€¦');
    await delay(200);

    // â”€â”€ Apply data to app â”€â”€
    // Trades
    if(trades && trades.length > 0){
      D.trades = trades;
    }
    // Notes - convert array to object
    if(notes && notes.length > 0){
      D.notes = {};
      notes.forEach(note => {
        D.notes[note.date] = note.content;
      });
    }
    // Capital
    if(capital && capital.length > 0){
      D.capital = capital;
    }
    // Checklist
    if(checklist && checklist.length > 0){
      D.checklist = checklist.map(item => ({
        id: item.id,
        text: item.text,
        type: item.type,
        done: item.done
      }));
    }
    // Rules
    if(rules && rules.length > 0){
      D.rules = rules;
    }
    // Challenges
    if(challenges && challenges.length > 0){
      ENG.challenges = challenges.filter(c => !c.completed);
      ENG.completed_challenges = challenges.filter(c => c.completed);
    }
    // Settings
    if(settings && settings.length > 0){
      settings.forEach(setting => {
        CFG[setting.key] = setting.value;
      });
    }
    // XP
    if(xp){
      ENG.xp = xp.xp || 0;
      ENG.level = xp.level || 1;
      ENG.discipline_streak = xp.discipline_streak || 0;
      ENG.best_streak = xp.best_streak || 0;
    }
    // Save to local cache
    sv();
    saveEng();
    scfg();

    setLoaderMsg('Ready!', 100, `Loaded ${D.trades.length} trades from Supabase`);
    _sheetsLoaded = true;
    setConn('ok', 'Supabase âœ“');

    await delay(500);
    if(_loadTimeout) clearTimeout(_loadTimeout);
    hideLoader();

    // Render app with Supabase data
    bootApp();

  } catch(err) {
    // Offline or Sheets error â€” fall back to local
    console.warn('Sheets load failed:', err.message);
    setLoaderMsg('Sheets unavailable â€” using local data', 80,
      navigator.onLine ? 'Sheets error: '+err.message : 'You are offline');
    setConn('', 'Offline');
    await delay(1000);
    if(_loadTimeout) clearTimeout(_loadTimeout);
    loadFromLocal();
    hideLoader();
  }
}

function loadFromLocal(){
  if (_appBooted) return;
  _appBooted = true;
  // D, CFG, ENG already loaded from localStorage at script init
  // Just boot the app
  bootApp();
  if (!_supabaseUrl || _supabaseUrl === 'YOUR_SUPABASE_URL' || !_supabaseKey || _supabaseKey === 'YOUR_SUPABASE_ANON_KEY') {
    goPage('settings');
    const connectionTab = E('stab-connection-btn');
    if (connectionTab) switchSettingsTab('connection', connectionTab);
    const loader = E('sheetsLoader');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(()=>{ loader.style.display = 'none'; }, 400);
    }
  }
}

/* â”€â”€ BOOT APP (runs after data is loaded from either source) â”€â”€ */
function bootApp(){
  if (_appBooted !== true) _appBooted = true;
  // Apply settings to UI
  if(CFG.cap) { const el=E('s-cap'); if(el) el.value=CFG.cap; }
  if(CFG.maxl) { const el=E('s-maxl'); if(el) el.value=CFG.maxl; }
  if(CFG.risk) { const el=E('s-risk'); if(el) el.value=CFG.risk; }
  if(CFG.maxt) { const el=E('s-maxt'); if(el) el.value=CFG.maxt; }
  if(CFG.tdays) { const el=E('s-tdays'); if(el) el.value=CFG.tdays; }
  if(CFG.czero) { const el=E('s-czero'); if(el) el.value=CFG.czero; }

  seedD();
  buildPeriodBars();
  loadSession();
  loadAutoSyncSettings();
  migrateRulesToStructured();
  checkChallengeExpiry();
  renderAll();
  loadName();

  setTimeout(()=>{
    restoreSessionUI();
    updateFabVisibility('home');
    updateSyncUI();
    updateFbUI(!!_fbRef); // reflect Firebase connection state in settings UI
  }, 200);
}

/* â”€â”€ HELPERS â”€â”€ */
function delay(ms){ return new Promise(r=>setTimeout(r,ms)); }

async function fetchWithTimeout(url, timeout=8000){
  const controller = new AbortController();
  const id = setTimeout(()=>controller.abort(), timeout);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      mode: 'cors',
    });
    clearTimeout(id);
    return r;
  } catch(e) {
    clearTimeout(id);
    throw e;
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   END SHEETS LOADER
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


function syncQuickSL(){
  const val = E('t-sl-q') ? E('t-sl-q').value : '';
  const slFull = E('t-sl');
  if(slFull && val) slFull.value = val;
  pvw(); // pvw() auto-calculates R:R from entry+SL+exit
}


/* â”€â”€ BAKE URL INTO HTML FOR MOBILE â”€â”€ */
function showBakeURLOption(url){
  const el = E('bakeUrlWrap');
  if(!el) return;
  el.style.display = 'block';
  el.innerHTML = '<div style="margin-top:12px;padding:12px;background:rgba(16,201,122,.06);border:1px solid rgba(16,201,122,.2);border-radius:var(--r2);">'
    + '<div style="font-size:12px;font-weight:700;color:var(--emerald);margin-bottom:6px;">ðŸ“± Make it work on ALL devices</div>'
    + '<div style="font-size:11px;color:var(--text2);margin-bottom:8px;">Download an updated HTML with your Sheets URL baked in. Upload to GitHub â€” mobile auto-connects forever.</div>'
    + '<button class="btn bam" onclick="downloadBakedHTML()">â¬‡ï¸ Download Mobile-Ready HTML</button>'
    + '</div>';
}

function downloadBakedHTML(){
  const url = WS || '';
  if(!url){ toast('Save your Apps Script URL first','err'); return; }
  const dateStr = new Date().toLocaleDateString('en-IN');
  const marker = "const SHEETS_URL = '';  // <-- paste your Apps Script URL here after first setup";
  const replacement = "const SHEETS_URL = '" + url + "';  // set on " + dateStr;
  const html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
  const updated = html.replace(marker, replacement);
  const blob = new Blob([updated], {type:'text/html'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'EdgeMind_v5.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  toast('Downloaded! Upload to GitHub â€” mobile will sync automatically âœ…','ok');
}

