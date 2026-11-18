'use strict';
const KEY='nudo-cron:v1',MAX_BYTES=1000000;
const $=id=>document.getElementById(id);
const clean=()=>({version:1,userName:'',sessions:[],theme:'cream'});
const int=(n,min,max)=>Number.isInteger(Number(n))&&String(n).trim()!==''&&Number(n)>=min&&Number(n)<=max;
function validSession(s){return !!s&&typeof s==='object'&&!Array.isArray(s)&&['basic','custom'].includes(s.mode)&&typeof s.name==='string'&&s.name.length<=80&&int(s.blocks,1,50)&&int(s.exercises,1,100)&&int(s.work,1,3600)&&int(s.rest,0,3600)&&int(s.blockRest,0,3600)&&['replace','add'].includes(s.restPolicy)&&(s.countdown===undefined||int(s.countdown,0,60))}
function validData(d){return !!d&&typeof d==='object'&&!Array.isArray(d)&&d.version===1&&typeof d.userName==='string'&&d.userName.length<=70&&Array.isArray(d.sessions)&&d.sessions.length<=200&&d.sessions.every(s=>validSession(s)&&typeof s.id==='string'&&s.id.length<100)}
function readData(){try{let d=JSON.parse(localStorage.getItem(KEY));return validData(d)?d:clean()}catch{return clean()}}
let data=readData(),activeTab='basic',editingId=null,engine=null,interval=null,audio=null;
function saveData(){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{toast('No se puede acceder al almacenamiento del navegador',true);return false}}
function toast(message,error=false){const el=$('toast');el.textContent=message;el.classList.toggle('error',error);el.hidden=false;clearTimeout(toast.timeout);toast.timeout=setTimeout(()=>el.hidden=true,4500)}
function view(name){for(const el of document.querySelectorAll('main .screen'))el.hidden=el.id!==name;$('header').hidden=name==='welcome';window.scrollTo({top:0,behavior:'instant'})}
function home(){if(!data.userName.trim()){view('welcome');return}$('greeting').textContent=data.userName.trim().split(/\s+/)[0];renderSaved();showTab(activeTab);view('home')}
function toTime(n){let t=Math.max(0,Math.ceil(n)),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return h?`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
function steps(s){if(s.mode==='basic')return [{type:'work',duration:s.work,label:'ACTIVIDAD',detail:'Ronda' },...(s.rest?[{type:'rest',duration:s.rest,label:'DESCANSO',detail:'Ronda'}]:[])];const seq=[];for(let b=1;b<=s.blocks;b++)for(let e=1;e<=s.exercises;e++){seq.push({type:'work',duration:s.work,label:'ACTIVIDAD',detail:`Bloque ${b} de ${s.blocks} · Ejercicio ${e} de ${s.exercises}`});if(e<s.exercises&&s.rest)seq.push({type:'rest',duration:s.rest,label:'DESCANSO',detail:`Bloque ${b} · Siguiente ejercicio ${e+1}`});if(e===s.exercises&&b<s.blocks){if(s.restPolicy==='add'&&s.rest)seq.push({type:'rest',duration:s.rest,label:'DESCANSO',detail:`Fin del bloque ${b}`});if(s.blockRest)seq.push({type:'rest',duration:s.blockRest,label:'ENTRE BLOQUES',detail:`Siguiente: bloque ${b+1}`})}}return seq}
function duration(s){return steps(s).reduce((t,x)=>t+x.duration,0)}
function newActivity(session=null){editingId=session?.id||null;const f=$('activity-form');f.reset();const defaults=session||{name:'',blocks:2,exercises:4,work:40,rest:20,blockRest:60,countdown:3,restPolicy:'replace'};for(const name of ['name','blocks','exercises','work','rest','blockRest','countdown'])f.elements.namedItem(name).value=defaults[name]??3;f.querySelector(`input[name="restPolicy"][value="${defaults.restPolicy}"]`).checked=true;$('editor-title').textContent=editingId?'Editar actividad.':'Nueva actividad.';updatePreview();view('editor')}
function fromForm(){const raw=new FormData($('activity-form'));const s={mode:'custom',name:String(raw.get('name')||'').trim(),blocks:Number(raw.get('blocks')),exercises:Number(raw.get('exercises')),work:Number(raw.get('work')),rest:Number(raw.get('rest')),blockRest:Number(raw.get('blockRest')),countdown:Number(raw.get('countdown')),restPolicy:String(raw.get('restPolicy'))};if(!s.name||!validSession(s))throw Error('Revisa el nombre, los bloques, los ejercicios y los tiempos.');return s}
function updatePreview(){try{const s=fromForm();$('preview-text').textContent=notation(s);$('preview-time').textContent=`Duración total: ${toTime(duration(s))}`}catch{$('preview-text').textContent='Completa los datos para ver el resumen';$('preview-time').textContent=''}}
function createButton(label,callback,cls=''){let el=document.createElement('button');el.type='button';el.textContent=label;el.className=cls;el.addEventListener('click',callback);return el}
function showTab(tab){activeTab=tab;for(const name of ['basic','saved']){$('home-'+name).hidden=name!==tab;$('tab-'+name).classList.toggle('active',name===tab);$('tab-'+name).setAttribute('aria-selected',String(name===tab))}}
function notation(s){return `${s.blocks>1?s.blocks+' bloques · ':''}${s.exercises}×(${s.work}–${s.rest})${s.blocks>1?' · '+s.blockRest+' s entre bloques':''}`}
function renderSaved(){const root=$('saved-list');root.replaceChildren();$('saved-count').textContent=String(data.sessions.length);if(!data.sessions.length){let el=document.createElement('div');el.className='empty';el.textContent='No hay actividades guardadas.';root.append(el);return}for(const s of data.sessions){const card=document.createElement('article');card.className='saved-card';const h=document.createElement('h3');h.textContent=s.name;const p=document.createElement('p');p.textContent=s.mode==='basic'?`${s.work}–${s.rest}`:notation(s);const buttons=document.createElement('div');buttons.className='card-actions';buttons.append(createButton('▶ Iniciar',()=>start(s)),createButton('Editar',()=>newActivity(s)),createButton('Eliminar',async()=>{if(await confirmBox('Eliminar actividad',`¿Eliminar «${s.name}»?`)){const previous=data.sessions;data.sessions=data.sessions.filter(x=>x.id!==s.id);if(!saveData())data.sessions=previous;renderSaved() }},'danger'));card.append(h,p,buttons);root.append(card)}}
function confirmBox(title,message){const el=$('confirm-dialog');$('dialog-title').textContent=title;$('dialog-message').textContent=message;if(typeof el.showModal!=='function')return Promise.resolve(window.confirm(message));return new Promise(resolve=>{el.addEventListener('close',()=>resolve(el.returnValue==='confirm'),{once:true});el.showModal()})}
function beep(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;audio??=new C();if(audio.state==='suspended')audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.frequency.value=850;g.gain.setValueAtTime(.001,audio.currentTime);g.gain.exponentialRampToValueAtTime(.13,audio.currentTime+.025);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.17);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.18)}catch{}}
function playPoliceWhistle(){const a=new Audio('sounds/police-whistle.wav');a.play().catch(()=>{})}
function playHornsFanfare(){const a=new Audio('sounds/horns-fanfare.mp3');a.volume=0.9;a.play().catch(()=>{})}
function current(){return engine?.sequence[engine.index]}
// Un único aviso por segundo mostrado; nunca se repite al pausar o redibujar.
// La preparación avisa cada segundo; los intervalos, solo en los últimos cinco.
function signalCountdown(){
  if(!engine||engine.done||engine.paused)return;
  const phase=current();
  const second=Math.ceil(engine.remaining/1000);
  if(second<1||second===engine.lastSignalSecond)return;
  if(phase.type==='ready'||second<=5){
    engine.lastSignalSecond=second;
    beep();
  }
}

function fitTimerClock(){
 const el=$('timer-clock');
 if(!el || $('timer').hidden)return;
 const center=el.parentElement;
 const availableWidth=Math.max(100,center.clientWidth-12);
 const availableHeight=Math.max(100,center.clientHeight*0.62);
 const text=el.textContent||'00:00';
 const measure=document.createElement('canvas').getContext('2d');
 const family=getComputedStyle(el).fontFamily;
 const weight=getComputedStyle(el).fontWeight;
 let low=40,high=Math.min(620,availableHeight*1.35);
 for(let i=0;i<18;i++){
  const mid=(low+high)/2;
  measure.font=`${weight} ${mid}px ${family}`;
  // Account for negative letter spacing in the final width.
  const width=measure.measureText(text).width + Math.max(0,text.length-1)*mid*(-0.065);
  if(width<=availableWidth*0.95 && mid*0.98<=availableHeight)low=mid;else high=mid;
 }
 el.style.fontSize=`${Math.floor(low)}px`;
}
window.addEventListener('resize',fitTimerClock);
function displayTimer(){if(!engine)return;const x=current(),done=engine.done,v=$('timer');const centerActive=$('timer-center-active');const centerResults=$('timer-center-results');const actionsNormal=$('timer-actions-normal');const actionsResults=$('timer-actions-results');if(done){centerActive.hidden=true;centerResults.hidden=false;actionsNormal.hidden=true;actionsResults.hidden=false;const totalWork=engine.sequence.filter(p=>p.type==='work').reduce((t,p)=>t+p.duration,0);const totalRest=engine.sequence.filter(p=>p.type==='rest').reduce((t,p)=>t+p.duration,0);const totalTime=totalWork+totalRest;$('result-work-total').textContent=toTime(totalWork);$('result-rest-total').textContent=toTime(totalRest);$('result-time-total').textContent=toTime(totalTime)}else{centerActive.hidden=false;centerResults.hidden=true;actionsNormal.hidden=false;actionsResults.hidden=true;v.classList.toggle('rest',x?.type==='rest');$('timer-phase').textContent=x.label;$('timer-clock').textContent=toTime(engine.remaining/1000);$('timer-progress').textContent=x?.type==='ready'?(engine.paused?'Detenido · Espacio para comenzar':'Comienza en'):engine.session.mode==='basic'?`Ronda ${engine.round}${engine.paused?' · En pausa':''}`:`${x.detail}${engine.paused?' · En pausa':''}`;$('timer-fill').style.width=`${Math.max(0,Math.min(100,engine.remaining/(x.duration*1000)*100))}%`;fitTimerClock()}v.classList.toggle('done',done);$('pause-timer').textContent=done?'Volver al inicio':engine.paused?'▶ Continuar':'Ⅱ Pausar';$('skip-timer').hidden=done||x?.type==='ready';$('stop-timer').hidden=done}
function advance(){if(!engine)return;const prevType=current()?.type;engine.index++;if(engine.index>=engine.sequence.length){engine.done=true;engine.remaining=0;clearInterval(interval);displayTimer();return}if(current().type==='work'){playPoliceWhistle()}if(prevType==='work'){playPoliceWhistle();setTimeout(()=>playPoliceWhistle(),300)}engine.remaining=current().duration*1000;engine.deadline=performance.now()+engine.remaining;engine.lastSignalSecond=null;if(current().type==='ready'||engine.remaining<=5000)signalCountdown();displayTimer()}
function tick(){if(!engine||engine.done||engine.paused)return;const now=performance.now();let diff=engine.deadline-now;let guard=0;while(diff<=0&&!engine.done&&guard++<5200){const excess=-diff;advance();if(engine.done)return;engine.deadline=now+current().duration*1000-excess;diff=engine.deadline-now}if(guard>=5200){engine.deadline=now+current().duration*1000;diff=current().duration*1000}engine.remaining=Math.max(0,diff);signalCountdown();displayTimer()}
function start(s,initiallyPaused=false){const sequence=[...(Number(s.countdown??3)>0?[{type:'ready',duration:Number(s.countdown??3),label:'PREPARACIÓN',detail:'Comienza en'}]:[]),...steps(s)];if(!sequence.length)return toast('La actividad no tiene intervalos válidos',true);engine={session:s,sequence,index:0,round:1,done:false,paused:initiallyPaused,remaining:sequence[0].duration*1000,deadline:performance.now()+sequence[0].duration*1000,lastSignalSecond:null};$('timer-name').textContent=s.name;$('timer').hidden=false;document.body.style.overflow='hidden';displayTimer();signalCountdown();clearInterval(interval);interval=setInterval(tick,100);$('timer').requestFullscreen?.().catch(()=>{})}
function stop(){clearInterval(interval);interval=null;engine=null;$('timer').hidden=true;document.body.style.overflow='';if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});home()}
$('go-home').addEventListener('click',home);$('new-activity').addEventListener('click',()=>newActivity());$('settings-button').addEventListener('click',()=>{$('profile-name').value=data.userName;view('settings')});$('back-settings').addEventListener('click',home);$('back-editor').addEventListener('click',home);
$('welcome-form').addEventListener('submit',e=>{e.preventDefault();const name=$('welcome-name').value.trim();if(!name)return;data.userName=name;if(saveData())home()});
$('basic-form').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.currentTarget);const s={mode:'basic',name:'Básico',blocks:1,exercises:1,work:Number(fd.get('work')),rest:Number(fd.get('rest')),blockRest:0,countdown:3,restPolicy:'replace'};if(!validSession(s))return toast('Revisa los tiempos del modo básico',true);start(s)});
$('activity-form').addEventListener('input',updatePreview);$('activity-form').addEventListener('change',updatePreview);$('activity-form').addEventListener('submit',e=>{e.preventDefault();try{start(fromForm())}catch(err){toast(err.message,true)}});
$('save-activity').addEventListener('click',()=>{try{const s=fromForm();const original=data.sessions;if(editingId){data.sessions=data.sessions.map(x=>x.id===editingId?{...s,id:editingId}:x)}else{if(data.sessions.length>=200)throw Error('Has alcanzado el máximo de 200 actividades');data.sessions=[{...s,id:crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`},...data.sessions]}if(saveData()){toast('Actividad guardada');home()}else data.sessions=original}catch(err){toast(err.message,true)}});
$('save-profile').addEventListener('click',()=>{const name=$('profile-name').value.trim();if(!name)return toast('Introduce tu nombre',true);const prev=data.userName;data.userName=name;if(saveData())toast('Nombre guardado');else data.userName=prev});
$('export-data').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`nudo-intervalos-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('Configuración exportada')});
$('import-data').addEventListener('click',()=>$('import-file').click());$('import-file').addEventListener('change',async e=>{const input=e.currentTarget;try{const file=input.files?.[0];if(!file)return;if(file.size>MAX_BYTES)throw Error('El archivo supera 1 MB');const incoming=JSON.parse(await file.text());if(!validData(incoming))throw Error('JSON no válido');if(!await confirmBox('Importar datos','Se reemplazarán el nombre y las actividades guardadas. ¿Continuar?'))return;const old=data;data=incoming;if(!saveData()){data=old;return}applyTheme();toast('Configuración importada');home()}catch(err){toast(`No se pudo importar: ${err.message}`,true)}finally{input.value=''}});
$('pause-timer').addEventListener('click',()=>{if(!engine)return;if(engine.done)return stop();if(engine.paused){engine.deadline=performance.now()+engine.remaining;engine.paused=false;signalCountdown()}else{engine.remaining=Math.max(0,engine.deadline-performance.now());engine.paused=true}displayTimer()});
$('stop-timer').addEventListener('click',()=>{if(engine&&!engine.done)start(engine.session,true)});
$('restart-timer').addEventListener('click',()=>{if(engine)start(engine.session)});
$('exit-results').addEventListener('click',stop);
$('skip-timer').addEventListener('click',()=>{if(!engine||engine.done)return;const paused=engine.paused;advance();if(engine&&!engine.done&&paused){engine.paused=true;engine.remaining=current().duration*1000;displayTimer()}});
$('exit-timer').addEventListener('click',async()=>{if(!engine||engine.done||await confirmBox('Terminar entrenamiento','¿Quieres salir del entrenamiento actual?'))stop()});
window.addEventListener('keydown',e=>{
  if(!engine || $('timer').hidden || $('confirm-dialog').open || e.repeat)return;
  if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
  if(e.code==='Space'){e.preventDefault();$('pause-timer').click()}
  else if(e.code==='KeyS'){e.preventDefault();$('stop-timer').click()}
  else if(e.code==='Escape'){e.preventDefault();$('exit-timer').click()}
});
$('tab-basic').addEventListener('click',()=>showTab('basic'));
$('tab-saved').addEventListener('click',()=>showTab('saved'));
$('basic-form').addEventListener('input',()=>{const f=$('basic-form');$('basic-notation').textContent=`${f.elements.work.value||'0'}–${f.elements.rest.value||'0'}`});
const THEMES=['cream','olive','slate','navy'];
function applyTheme(){const theme=THEMES.includes(data.theme)?data.theme:'cream';document.documentElement.dataset.theme=theme;document.querySelectorAll('[data-theme-choice]').forEach(b=>{const selected=b.dataset.themeChoice===theme;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected))})}
document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>{const previous=data.theme;data.theme=b.dataset.themeChoice;if(!saveData())data.theme=previous;applyTheme()}));
applyTheme();home();
