(() => {
  const canvas = document.getElementById('world');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const classes = {
    warrior: {name:'Warrior',icon:'⚔',hp:120,mana:55,power:11,armor:6,color:'#e6bd77'},
    mage: {name:'Mage',icon:'✷',hp:82,mana:110,power:14,armor:2,color:'#9ec9e9'},
    ranger: {name:'Ranger',icon:'➶',hp:95,mana:75,power:12,armor:4,color:'#a8d09a'},
    cleric: {name:'Cleric',icon:'✚',hp:105,mana:85,power:9,armor:5,color:'#e5d0b6'}
  };
  const fresh = () => ({hero:'Aster',calling:'warrior',level:1,xp:0,hp:100,mana:60,coins:12,kills:0,quest:0,inventory:[],x:500,y:375});
  let state = fresh();
  try { const saved = JSON.parse(localStorage.getItem('mythfall-save')); if(saved && saved.calling && classes[saved.calling]) state = {...fresh(),...saved}; } catch (_) {}
  let chosenClass = state.calling || 'warrior';
  let running = false, lastFrame = 0, toastTimer, attackCooldown = 0, regenTimer = 0, held = {}, targetPoint = null;
  let width = 900, height = 560, scaleX = 1, scaleY = 1;
  const mobs = [];
  const scenery = [];
  const rand = (min,max) => min + Math.random()*(max-min);
  const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
  function seedWorld(){
    for(let i=0;i<180;i++) scenery.push({x:rand(0,1000),y:rand(0,700),r:rand(1,4),kind:Math.random()<.77?'grass':'flower',h:rand(0,1)});
    for(let i=0;i<47;i++) scenery.push({x:rand(20,980),y:rand(15,685),r:rand(13,28),kind:'tree',h:rand(0,1)});
    for(let i=0;i<16;i++) scenery.push({x:rand(10,990),y:rand(10,690),r:rand(4,9),kind:'rock',h:rand(0,1)});
    for(let i=0;i<5;i++) spawnMob(true);
  }
  function spawnMob(randomPlace=false){
    const spots=[[260,220],[730,210],[790,470],[250,510],[525,160],[675,340],[380,590],[875,300]];
    const spot=spots[Math.floor(Math.random()*spots.length)];
    mobs.push({x:randomPlace?rand(90,910):spot[0],y:randomPlace?rand(80,620):spot[1],hp:38,maxHp:38,alive:true,hitFlash:0,attack:rand(1,3),bob:rand(0,6),seed:Math.random(),name:Math.random()<.15?'Mossback':'Wildwood slime'});
  }
  function save(){try{localStorage.setItem('mythfall-save',JSON.stringify(state));}catch(_){}}
  function updateUI(){
    const c=classes[state.calling]||classes.warrior;
    $('level').textContent=state.level; $('character-name').textContent=state.hero; $('class-name').textContent=c.name;
    $('portrait').textContent=c.icon; $('mini-avatar').textContent=(state.hero||'A').charAt(0).toUpperCase();
    const maxHp=c.hp+(state.level-1)*12, maxMana=c.mana+(state.level-1)*8;
    state.hp=clamp(state.hp,0,maxHp); state.mana=clamp(state.mana,0,maxMana);
    $('hp-text').textContent=`${Math.ceil(state.hp)} / ${maxHp}`; $('hp-bar').style.width=`${100*state.hp/maxHp}%`;
    $('mana-text').textContent=`${Math.floor(state.mana)} / ${maxMana}`; $('mana-bar').style.width=`${100*state.mana/maxMana}%`;
    $('xp-text').textContent=`${state.xp} / ${100+(state.level-1)*70}`; $('xp-bar').style.width=`${100*state.xp/(100+(state.level-1)*70)}%`;
    $('power-stat').textContent=c.power+state.level-1; $('armor-stat').textContent=c.armor+Math.floor((state.level-1)/2); $('coin-stat').textContent=state.coins;
    $('quest-progress').textContent=`${Math.min(5,state.quest)} / 5`; $('quest-bar').style.width=`${Math.min(100,state.quest*20)}%`;
    $('bag-count').textContent=`${state.inventory.length} ITEMS`;
    $('coordinates').textContent=`(${Math.round(state.x/10)}, ${Math.round(state.y/10)})`;
    $('nearby-count').textContent=mobs.filter(m=>m.alive).length;
    $('menu-hero').textContent=state.hero; $('menu-class').textContent=c.name; $('menu-level').textContent=state.level; $('menu-kills').textContent=state.kills;
  }
  function showToast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1650)}
  function addFeed(title,message,icon='✧'){
    const feed=$('activity-feed'), item=document.createElement('div'); item.className='feed-item';
    item.innerHTML=`<span class="feed-icon">${icon}</span><p><b></b><br><span></span></p><time>now</time>`;
    item.querySelector('p b').textContent=title; item.querySelector('p span').textContent=message; feed.prepend(item);
    while(feed.children.length>4) feed.lastElementChild.remove();
  }
  function closeModal(id){$(id).classList.remove('show')}
  function openModal(id){$(id).classList.add('show')}
  function begin(){
    state.calling=chosenClass; const input=$('hero-name-input').value.trim(); state.hero=input||'Aster';
    const c=classes[state.calling]; state.hp=state.hp>0?Math.min(state.hp,c.hp+(state.level-1)*12):c.hp; state.mana=Math.min(state.mana,c.mana+(state.level-1)*8);
    closeModal('class-modal'); updateUI(); save(); showToast(`Welcome, ${state.hero} the ${c.name}`); addFeed(`${state.hero} arrived in Sunmeadow.`,`The ${c.name.toLowerCase()} begins a new adventure.`);
  }
  function resize(){
    const rect=canvas.getBoundingClientRect(); if(!rect.width||!rect.height)return;
    const dpr=Math.min(window.devicePixelRatio||1,2); canvas.width=Math.round(rect.width*dpr); canvas.height=Math.round(rect.height*dpr);
    ctx.setTransform(canvas.width/1000,0,0,canvas.height/700,0,0); width=1000;height=700;scaleX=rect.width/1000;scaleY=rect.height/700;
  }
  function path(){
    ctx.beginPath();ctx.moveTo(-20,480);ctx.bezierCurveTo(170,410,80,330,300,330);ctx.bezierCurveTo(490,340,500,450,700,390);ctx.bezierCurveTo(850,345,850,210,1030,210);
    ctx.lineWidth=86;ctx.strokeStyle='#b8aa7765';ctx.stroke();ctx.lineWidth=66;ctx.strokeStyle='#c9bb8c55';ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#e2d5a31b';ctx.stroke();
  }
  function drawTree(o){
    const x=o.x,y=o.y,r=o.r;
    ctx.fillStyle='#19291d47';ctx.beginPath();ctx.ellipse(x+5,y+r*.73,r*.9,r*.38,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#624d35';ctx.fillRect(x-r*.11,y+r*.08,r*.22,r*.65);
    const colors=['#35563b','#3e6641','#496d43','#527749']; const color=colors[Math.floor(o.h*colors.length)];
    ctx.fillStyle='#294732';ctx.beginPath();ctx.arc(x,y-r*.08,r*.79,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x-r*.12,y-r*.22,r*.67,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#819c5b';ctx.beginPath();ctx.arc(x-r*.36,y-r*.32,r*.31,0,Math.PI*2);ctx.arc(x+r*.27,y-r*.15,r*.29,0,Math.PI*2);ctx.arc(x-r*.05,y+r*.13,r*.28,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c1cb8840';ctx.beginPath();ctx.ellipse(x-r*.29,y-r*.44,r*.24,r*.12,-.5,0,Math.PI*2);ctx.fill();
  }
  function drawScenery(){
    const g=ctx.createLinearGradient(0,0,900,700);g.addColorStop(0,'#536f4a');g.addColorStop(.52,'#60794e');g.addColorStop(1,'#435f42');ctx.fillStyle=g;ctx.fillRect(0,0,1000,700);
    ctx.fillStyle='#d5da9a0b';ctx.beginPath();ctx.ellipse(520,305,410,225,-.12,0,Math.PI*2);ctx.fill();
    // Distant low hills
    ctx.fillStyle='#324f3885';ctx.beginPath();ctx.moveTo(0,140);ctx.quadraticCurveTo(170,60,345,145);ctx.quadraticCurveTo(540,45,710,130);ctx.quadraticCurveTo(875,62,1000,115);ctx.lineTo(1000,235);ctx.lineTo(0,235);ctx.fill();
    path();
    for(const o of scenery.filter(o=>o.kind==='grass'||o.kind==='flower')){
      if(o.kind==='flower'){ctx.fillStyle=o.h>.5?'#e7d48e':'#d8cbb1';ctx.beginPath();ctx.arc(o.x,o.y,o.r*.65,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dec778';ctx.beginPath();ctx.arc(o.x,o.y,o.r*.25,0,Math.PI*2);ctx.fill();}
      else {ctx.strokeStyle='#b6ca876b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(o.x,o.y);ctx.lineTo(o.x-2,o.y-o.r);ctx.moveTo(o.x,o.y);ctx.lineTo(o.x+2,o.y-o.r*.7);ctx.stroke();}
    }
    const sorted=scenery.filter(o=>o.kind==='tree'||o.kind==='rock').sort((a,b)=>a.y-b.y);
    for(const o of sorted){if(o.kind==='tree')drawTree(o);else{ctx.fillStyle='#293932';ctx.beginPath();ctx.ellipse(o.x,o.y,o.r,o.r*.62,-.3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#89907a';ctx.beginPath();ctx.ellipse(o.x-o.r*.2,o.y-o.r*.22,o.r*.57,o.r*.26,-.3,0,Math.PI*2);ctx.fill();}}
    // Sun shafts and edge vignette
    ctx.fillStyle='#f6d79e09';ctx.beginPath();ctx.moveTo(790,-30);ctx.lineTo(860,-30);ctx.lineTo(500,500);ctx.lineTo(450,500);ctx.fill();
  }
  function drawMob(m,time){
    const bob=Math.sin(time/280+m.bob)*2, x=m.x,y=m.y+bob;
    ctx.save();ctx.translate(x,y);
    ctx.fillStyle='#17201944';ctx.beginPath();ctx.ellipse(0,13,22,9,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=m.hitFlash>0?'#fff1c8':'#8baa70';ctx.beginPath();ctx.moveTo(-18,8);ctx.quadraticCurveTo(-19,-8,-8,-12);ctx.quadraticCurveTo(-2,-18,4,-12);ctx.quadraticCurveTo(19,-10,18,6);ctx.quadraticCurveTo(8,15,-5,12);ctx.quadraticCurveTo(-15,14,-18,8);ctx.fill();
    ctx.fillStyle='#a5be7e';ctx.beginPath();ctx.ellipse(-4,-7,8,4,-.3,Math.PI,0);ctx.fill();
    ctx.fillStyle='#273329';ctx.beginPath();ctx.arc(-5,2,1.5,0,Math.PI*2);ctx.arc(5,2,1.5,0,Math.PI*2);ctx.fill();
    if(m.hp<m.maxHp){ctx.fillStyle='#172019';ctx.fillRect(-18,-24,36,4);ctx.fillStyle='#d9745d';ctx.fillRect(-18,-24,36*m.hp/m.maxHp,4);}
    ctx.restore();
  }
  function drawHero(time){
    const c=classes[state.calling]||classes.warrior;const x=state.x,y=state.y;
    ctx.fillStyle='#17201955';ctx.beginPath();ctx.ellipse(x,y+15,18,7,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#313c3a';ctx.beginPath();ctx.ellipse(x,y+4,11,13,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=c.color;ctx.beginPath();ctx.moveTo(x,y-17);ctx.lineTo(x+10,y-4);ctx.lineTo(x+7,y+9);ctx.lineTo(x,y+14);ctx.lineTo(x-7,y+9);ctx.lineTo(x-10,y-4);ctx.closePath();ctx.fill();
    ctx.fillStyle='#e3cda0';ctx.beginPath();ctx.arc(x,y-13,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#56412e';ctx.beginPath();ctx.arc(x,y-15,7,Math.PI,Math.PI*2);ctx.fill();ctx.fillRect(x-7,y-15,14,3);
    ctx.strokeStyle='#eee0b7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+8,y-4);ctx.lineTo(x+16,y-14);ctx.stroke();
    ctx.fillStyle='#f1d991';ctx.beginPath();ctx.arc(x,y-27+Math.sin(time/280)*1.5,2.4,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e8dfc7';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(state.hero,x,y-34);ctx.textAlign='left';
  }
  function loop(time){
    const dt=Math.min(.04,(time-lastFrame)/1000||0); lastFrame=time;
    ctx.clearRect(0,0,1000,700);drawScenery();
    if(running){
      let dx=(held.ArrowRight||held.d?1:0)-(held.ArrowLeft||held.a?1:0),dy=(held.ArrowDown||held.s?1:0)-(held.ArrowUp||held.w?1:0);
      if(targetPoint&&!dx&&!dy){dx=targetPoint.x-state.x;dy=targetPoint.y-state.y;const d=Math.hypot(dx,dy);if(d<9)targetPoint=null;else{dx/=d;dy/=d;}}
      if(dx||dy){const d=Math.hypot(dx,dy);state.x=clamp(state.x+dx/d*145*dt,35,965);state.y=clamp(state.y+dy/d*145*dt,45,655);}
      attackCooldown=Math.max(0,attackCooldown-dt);regenTimer+=dt;
      if(regenTimer>1){regenTimer=0;const c=classes[state.calling];state.mana=clamp(state.mana+2,c.mana?0:0,c.mana+(state.level-1)*8);if(state.hp>0)state.hp=clamp(state.hp+.12,0,c.hp+(state.level-1)*12);updateUI();}
      for(const m of mobs){if(!m.alive)continue;m.hitFlash=Math.max(0,m.hitFlash-dt*3);const dist=Math.hypot(state.x-m.x,state.y-m.y);if(dist<190&&dist>28){m.x+=(state.x-m.x)/dist*30*dt;m.y+=(state.y-m.y)/dist*30*dt;}else if(dist<=31&&Math.random()<dt*.6){const c=classes[state.calling];state.hp=Math.max(0,state.hp-Math.max(2,m.attack+1-c.armor*.3));$('combat-flash').classList.remove('hit');void $('combat-flash').offsetWidth;$('combat-flash').classList.add('hit');updateUI();if(state.hp<=0){state.hp=Math.ceil((c.hp+(state.level-1)*12)*.55);state.x=500;state.y=375;showToast('You catch your breath at the trailhead');addFeed('A moment to recover.','You return to the meadow with renewed resolve.','☼');save();}}
      }
      if(Math.random()<dt*.025&&mobs.filter(m=>m.alive).length<5)spawnMob(true);
      if(Math.floor(time/1000)%3===0)save();
    }
    mobs.forEach(m=>{if(m.alive)drawMob(m,time)});drawHero(time);
    const mx=48+state.x/1000*42,my=23+state.y/700*55;document.querySelector('.map-player').style.left=`${mx}%`;document.querySelector('.map-player').style.top=`${my}%`;
    requestAnimationFrame(loop);
  }
  function nearestMob(range=Infinity){let best=null,distance=range;for(const m of mobs){if(!m.alive)continue;const d=Math.hypot(m.x-state.x,m.y-state.y);if(d<distance){best=m;distance=d;}}return best;}
  function killMob(m){
    m.alive=false;state.kills++;state.xp+=25;state.coins+=Math.floor(rand(2,7));
    const loot=Math.random()<.5?{name:'Meadow bloom',description:'A fragrant wildflower'}:{name:'Slime mote',description:'A faintly glowing keepsake'};
    if(Math.random()<.67)state.inventory.push(loot);
    if(state.quest<5){state.quest++;if(state.quest>=5){state.xp+=120;state.coins+=30;showToast('Quest complete! +120 XP · +30 coins');addFeed('Quest complete!','A quieter grove · 120 XP and 30 coins','✦');}else showToast(`Wildwood slime defeated · ${state.quest}/5`);}
    else showToast('Wildwood slime defeated · +25 XP');
    let required=100+(state.level-1)*70;
    while(state.xp>=required){state.xp-=required;state.level++;const c=classes[state.calling];state.hp=c.hp+(state.level-1)*12;state.mana=c.mana+(state.level-1)*8;required=100+(state.level-1)*70;showToast(`Level up! You are now level ${state.level}`);addFeed(`${state.hero} reached level ${state.level}!`,'A new chapter of the journey begins.','✦');}
    addFeed('Wildwood slime defeated.',loot.name+' added to your satchel.','⚔');
    setTimeout(()=>{if(mobs.filter(e=>e.alive).length<5)spawnMob(true);updateUI();},4200);updateUI();save();
  }
  function attack(kind=1){
    if(!running)return; if(attackCooldown>0)return;
    const c=classes[state.calling];let manaCost=kind===2?15:kind===3?20:kind===4?25:0;
    if(kind===4){if(state.hp>=c.hp+(state.level-1)*12){showToast('You are already at full health');return;}if(state.mana<manaCost){showToast('Not enough mana');return;}state.mana-=manaCost;state.hp=clamp(state.hp+35,c.hp+(state.level-1)*12);attackCooldown=.55;showToast('A warm light restores your health');updateUI();save();return;}
    if(kind===3){if(state.mana<manaCost){showToast('Not enough mana');return;}state.mana-=manaCost;state.x=clamp(state.x+rand(-60,60),35,965);state.y=clamp(state.y+rand(-50,50),45,655);attackCooldown=.35;showToast('Quickstep!');updateUI();save();return;}
    if(state.mana<manaCost){showToast('Not enough mana');return;}
    const target=nearestMob(kind===2?185:95);
    if(!target){const far=nearestMob(300);if(far){targetPoint={x:far.x,y:far.y};showToast('Move closer to attack');}else showToast('No creatures in range');return;}
    if(kind===2)state.mana-=manaCost;
    const damage=Math.round(c.power+(state.level-1)*2+(kind===2?16:kind===3?4:0)+rand(-2,3));target.hp-=damage;target.hitFlash=.4;attackCooldown=kind===2?.55:.38;
    showToast(`${kind===2?'Arcane burst':'Strike'} · ${damage} damage`);if(target.hp<=0)killMob(target);else if(kind===2){target.hp=Math.max(0,target.hp-8);if(target.hp===0)killMob(target);}
    updateUI();save();
  }
  function selectCalling(classKey){chosenClass=classKey;document.querySelectorAll('.class-card').forEach(el=>el.classList.toggle('selected',el.dataset.class===classKey));}
  document.querySelectorAll('.class-card').forEach(card=>card.addEventListener('click',()=>selectCalling(card.dataset.class)));
  $('begin-adventure').addEventListener('click',begin);
  $('change-class').addEventListener('click',()=>{$('hero-name-input').value=state.hero;selectCalling(state.calling);openModal('class-modal')});
  $('ability-1').addEventListener('click',()=>attack(1));$('ability-2').addEventListener('click',()=>attack(2));$('ability-3').addEventListener('click',()=>attack(3));$('ability-4').addEventListener('click',()=>attack(4));$('mobile-attack').addEventListener('click',()=>attack(1));
  $('inventory-button').addEventListener('click',()=>{const list=$('inventory-list');list.innerHTML='';if(!state.inventory.length)list.innerHTML='<div class="empty-inventory">Your satchel is empty. The meadow may have a few treasures.</div>';else state.inventory.slice().reverse().forEach(item=>{const row=document.createElement('div');row.className='inventory-item';row.innerHTML=`<b>${item.name}</b><span>${item.description}</span>`;list.appendChild(row)});openModal('inventory-modal')});
  $('menu-button').addEventListener('click',()=>openModal('menu-modal'));
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
  $('reset-game').addEventListener('click',()=>{if(confirm('Begin a new adventure? Your current journey will be erased.')){localStorage.removeItem('mythfall-save');state=fresh();mobs.splice(0,mobs.length);seedWorld();chosenClass='warrior';$('hero-name-input').value='Aster';selectCalling(chosenClass);updateUI();save();openModal('class-modal')}});
  $('chat-button').addEventListener('click',()=>{addFeed(`${state.hero} waves hello!`,'A friendly greeting echoes across the realm.','☼');showToast('You wave to the realm')});
  $('guide-info').addEventListener('click',()=>showToast('A meadow slime: weak to a well-aimed strike'));
  $('sound-toggle').addEventListener('click',e=>{const on=e.currentTarget.dataset.muted!=='true';e.currentTarget.dataset.muted=String(on);e.currentTarget.style.color=on?'#778078':'#d8b979';showToast(on?'Ambience muted':'Ambience enabled')});
  window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){held[key.length===1?key:e.key]=true;targetPoint=null;}if(key===' '||key==='1')attack(1);if(key==='2')attack(2);if(key==='3')attack(3);if(key==='4')attack(4);if(key==='i')$('inventory-button').click();if(key==='escape'){document.querySelectorAll('.modal-backdrop.show').forEach(m=>m.classList.remove('show'));}});
  window.addEventListener('keyup',e=>{delete held[e.key];delete held[e.key.toLowerCase()]});
  document.querySelectorAll('[data-move]').forEach(button=>{const key={up:'w',down:'s',left:'a',right:'d'}[button.dataset.move];button.addEventListener('pointerdown',e=>{e.preventDefault();held[key]=true;button.setPointerCapture(e.pointerId)});button.addEventListener('pointerup',()=>delete held[key]);button.addEventListener('pointercancel',()=>delete held[key]);button.addEventListener('lostpointercapture',()=>delete held[key]);});
  canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();targetPoint={x:(e.clientX-r.left)/r.width*1000,y:(e.clientY-r.top)/r.height*700};});
  function updateClock(){const d=new Date();$('clock').textContent=`${String(8+d.getHours()%12).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;}
  if(!localStorage.getItem('mythfall-save'))openModal('class-modal');else{$('hero-name-input').value=state.hero;selectCalling(state.calling);closeModal('class-modal');}
  if(state.hero&&state.level)running=true;
  seedWorld();updateUI();resize();window.addEventListener('resize',resize);updateClock();setInterval(updateClock,30000);requestAnimationFrame(loop);
})();
