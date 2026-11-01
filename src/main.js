import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar';


var KEY="ilacTakip2";
var S={start:"",use:21,brk:7,time:"21:00",taken:{},off:{},ack:{}};
try{var r=localStorage.getItem(KEY)||localStorage.getItem("ilacTakip");if(r){S=Object.assign(S,JSON.parse(r));S.off=S.off||{};S.ack=S.ack||{};}}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}if(window.scheduleSoon)window.scheduleSoon();}
var $=function(i){return document.getElementById(i)};
function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function parse(s){var p=s.split("-");return new Date(+p[0],+p[1]-1,+p[2])}
function addDays(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function diff(a,b){return Math.round((Date.UTC(a.getFullYear(),a.getMonth(),a.getDate())-Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()))/864e5)}
function fmt(d){return d.toLocaleDateString("tr-TR",{day:"numeric",month:"long",weekday:"long"})}
function midnight(){var t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())}

/* program */
function sched(day){
  if(!S.start)return null;
  var st=parse(S.start),N=+S.use||1,M=+S.brk||0,L=N+M,d=diff(day,st);
  if(d<0)return{before:true,d:d};
  var cyc=Math.floor(d/L),pos=d-cyc*L;
  return{d:d,cyc:cyc,pos:pos,N:N,M:M,L:L,cs:addDays(st,cyc*L),calcMed:pos<N,med:pos<N&&!S.off[iso(day)]};
}

/* ses + titreşim + ekran açık */
var ctx=null,beepT=null,ringing=false,snoozeUntil=0,wl=null;
function unlock(){
  try{if(!ctx){var AC=window.AudioContext||window.webkitAudioContext;if(AC)ctx=new AC();}
  if(ctx&&ctx.state==="suspended")ctx.resume();}catch(e){}
  try{if(navigator.wakeLock&&!wl){navigator.wakeLock.request("screen").then(function(l){wl=l;l.addEventListener("release",function(){wl=null});}).catch(function(){});}}catch(e){}
  bell();
}
document.addEventListener("pointerdown",unlock);
document.addEventListener("visibilitychange",function(){if(!document.hidden){wl=null;unlock();tick();}});
function beep(){
  try{
    if(ctx){var o=ctx.createOscillator(),g=ctx.createGain();o.type="square";o.frequency.value=880;g.gain.value=.25;o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+.25);
      setTimeout(function(){try{var o2=ctx.createOscillator(),g2=ctx.createGain();o2.type="square";o2.frequency.value=1175;g2.gain.value=.25;o2.connect(g2);g2.connect(ctx.destination);o2.start();o2.stop(ctx.currentTime+.25);}catch(e){}},300);}
    if(navigator.vibrate)navigator.vibrate([300,150,300]);
  }catch(e){}
}
function startRing(sound){
  ringing=true;
  if(sound){beep();beepT=setInterval(beep,1500);}
  else{try{if(navigator.vibrate)navigator.vibrate(200);}catch(e){}}
  try{if(window.Notification&&Notification.permission==="granted")new Notification("💊 İlaç zamanı");}catch(e){}
}
function stopRing(){
  ringing=false;clearInterval(beepT);beepT=null;clearInterval(window.clkT);
  try{if(navigator.vibrate)navigator.vibrate(0);}catch(e){}
  $("alarm").className="";$("alarm").innerHTML="";
}
function showAlarm(test){
  var s=sched(midnight()),h="";
  var med=test?true:(s&&s.med);
  if(med){
    h='<div class="clk" id="clk"></div><div class="pulse"><span>💊</span></div><h2>İlaç zamanı</h2><p>Bugünkü ilacını içtin mi?</p>'+
      '<div class="btns"><button class="btn p" data-a="took">✓ İçtim</button>'+
      '<button class="btn g" data-a="snooze">Henüz içmedim, 10 dk sonra hatırlat</button></div>';
  }else{
    h='<div class="clk" id="clk"></div><div class="pulse"><span>🌙</span></div><h2>Bugün ara günü</h2><p>Bugün ilaç yok, dinlenebilirsin.</p><div class="btns"><button class="btn p" data-a="ok">Tamam</button></div>';
  }
  var a=$("alarm");a.innerHTML=h;a.className="on"+(med?"":" rest");
  var ck=function(){var n=new Date(),e=$("clk");if(e)e.textContent=pad(n.getHours())+":"+pad(n.getMinutes());};ck();clearInterval(window.clkT);window.clkT=setInterval(ck,5000);
  [].forEach.call(a.querySelectorAll("button"),function(b){b.onclick=function(){resolve(b.dataset.a,test)}});
  startRing(med);
}
function resolve(type,test){
  var k=iso(midnight());
  stopRing();
  if(!test){
    if(type==="snooze"){snoozeUntil=Date.now()+10*60000;}
    else{
      S.ack[k]=1;
      if(type==="took"){S.taken[k]=1;delete S.off[k];}
      if(type==="off"){S.off[k]=1;delete S.taken[k];}
      save();
    }
  }
  render();
}
function tick(){
  if(ringing||!S.start)return;
  var n=new Date(),s=sched(midnight()),k=iso(n);
  if(!s||s.before||S.ack[k]||Date.now()<snoozeUntil)return;
  var p=(S.time||"21:00").split(":"),due=new Date(n.getFullYear(),n.getMonth(),n.getDate(),+p[0],+p[1]);
  if(n>=due)showAlarm(false);
}
setInterval(tick,5000);

function bell(){
  $("bell").textContent="🔔 Alarm her gün "+(S.time||"21:00")+(ctx&&ctx.state==="running"?" — ses hazır ✓":" — sesi açmak için ekrana bir kez dokun");
}

/* ekran */
function render(){renderMain();drawCal();}
function renderMain(){
  $("start").value=S.start;$("use").value=S.use;$("brk").value=S.brk;$("time").value=S.time;
  bell();
  var t=$("today"),g=$("grid"),day=midnight();
  if(!S.start){t.innerHTML='<p class="big">Hoş geldin</p><p class="mut">Aşağıdan başlama tarihini ve gün sayılarını girip kaydet.</p>';g.innerHTML="";return;}
  var s=sched(day);
  if(s.before){t.innerHTML='<p class="big">Henüz başlamadı</p><p class="mut">Başlama günü: '+fmt(parse(S.start))+' ('+(-s.d)+' gün sonra)</p>';g.innerHTML="";return;}
  var last=addDays(s.cs,s.N-1),next=addDays(s.cs,s.L),k=iso(day),took=!!S.taken[k],h="";
  if(s.med){
    h+='<p class="big">Bugün ilaç günü <span class="stat '+(took?'s-ok':'s-wait')+'">'+(took?'İçildi ✓':'Henüz içilmedi')+'</span></p>';
    h+='<p class="mut">Döngünün '+(s.pos+1)+'. günü / '+s.N+'</p>';
    h+='<button id="tk" '+(took?'class="sec"':'')+'>'+(took?'Geri al':'İlacı içtim ✓')+'</button>';
  }else{
    h+='<p class="big">Bugün ara günü <span class="stat s-brk">İlaç yok</span></p>';
    h+='<p class="mut">'+(s.calcMed?'Bugünü ara günü olarak işaretledin.':'Ara günü: '+(s.pos-s.N+1)+' / '+s.M)+'</p>';
    if(s.calcMed)h+='<button id="un" class="sec">Ara gününü geri al</button>';
  }
  var left=s.calcMed?(s.N-1-s.pos):0;
  h+='<div class="info"><div>Son ilaç günü<b>'+fmt(last)+'</b>'+(s.calcMed?(left===0?'bugün':left+' gün sonra'):'geçti')+'</div>';
  h+='<div>'+(s.M>0?'Yeniden başlama':'Sonraki döngü')+'<b>'+fmt(next)+'</b>'+diff(next,day)+' gün sonra</div></div>';
  t.innerHTML=h;
  var tk=$("tk");if(tk)tk.onclick=function(){if(S.taken[k])delete S.taken[k];else{S.taken[k]=1;S.ack[k]=1;}save();render();};
  var un=$("un");if(un)un.onclick=function(){delete S.off[k];save();render();};
}
var cm=midnight();cm=new Date(cm.getFullYear(),cm.getMonth(),1);
$("prev").onclick=function(){cm=new Date(cm.getFullYear(),cm.getMonth()-1,1);drawCal();};
$("next").onclick=function(){cm=new Date(cm.getFullYear(),cm.getMonth()+1,1);drawCal();};
function drawCal(){
  var today=midnight(),y=cm.getFullYear(),mo=cm.getMonth();
  $("mname").textContent=cm.toLocaleDateString("tr-TR",{month:"long",year:"numeric"});
  var lead=(cm.getDay()+6)%7,dim=new Date(y,mo+1,0).getDate(),h="",ok=0,bad=0,brk=0;
  for(var i=0;i<lead;i++)h+='<div></div>';
  for(var n=1;n<=dim;n++){
    var dd=new Date(y,mo,n),key=iso(dd),rel=diff(dd,today),s=sched(dd),c="d",m=0;
    if(s&&!s.before){
      if(!s.med){c+=" brk";if(rel<=0)brk++;}
      else{c+=" med";m=rel<=0?1:0;if(S.taken[key]){c+=" taken";ok++;}else if(rel<0){c+=" miss";bad++;}}
    }
    if(rel===0)c+=" today";
    h+='<div class="'+c+'" data-k="'+key+'" data-m="'+m+'">'+n+'</div>';
  }
  var g=$("grid");g.innerHTML=h;
  [].forEach.call(g.querySelectorAll(".d"),function(el){el.onclick=function(){
    if(el.dataset.m!=="1")return;
    var kk=el.dataset.k;if(S.taken[kk])delete S.taken[kk];else{S.taken[kk]=1;if(kk===iso(today))S.ack[kk]=1;}
    save();render();};});
  $("msum").textContent=S.start?("Bu ay: "+ok+" gün içildi, "+bad+" gün içilmedi, "+brk+" gün ara"):"";
  gcal();
}
function pad(n){return String(n).padStart(2,"0")}
function gcal(){
  var box=$("gcal");box.innerHTML="";
  if(!S.start){box.innerHTML='<p class="mut">Önce başlama tarihini kaydet.</p>';return;}
  var today=midnight(),st=parse(S.start),s=sched(today),N=+S.use||1,M=+S.brk||0,L=N+M,tp=(S.time||"21:00").split(":");
  var k0=s.before?0:s.cyc;
  for(var k=0,made=0;made<4&&k<8;k++){
    var cs=addDays(st,(k0+k)*L),ev=cs,cnt=N;
    if(diff(cs,today)<0){var used=diff(today,cs);if(used>=N)continue;ev=today;cnt=N-used;}
    var e=new Date(ev.getFullYear(),ev.getMonth(),ev.getDate(),+tp[0],+tp[1]+10);
    var d1=ev.getFullYear()+pad(ev.getMonth()+1)+pad(ev.getDate())+"T"+pad(+tp[0])+pad(+tp[1])+"00";
    var d2=e.getFullYear()+pad(e.getMonth()+1)+pad(e.getDate())+"T"+pad(e.getHours())+pad(e.getMinutes())+"00";
    var rule="RRULE:FREQ=DAILY"+(M>0?";COUNT="+cnt:"");
    var url="https://calendar.google.com/calendar/render?action=TEMPLATE&text="+encodeURIComponent("💊 İlaç zamanı")+"&dates="+d1+"/"+d2+"&recur="+encodeURIComponent(rule);
    var a=document.createElement("a");a.className="glink";a.href=url;a.target="_blank";a.rel="noopener noreferrer";
    var last=addDays(ev,cnt-1);
    a.textContent="Takvime ekle: "+ev.toLocaleDateString("tr-TR",{day:"numeric",month:"short"})+(M>0?" – "+last.toLocaleDateString("tr-TR",{day:"numeric",month:"short"}):" ▸ her gün");
    box.appendChild(a);made++;
    if(M===0)break;
  }
}
$("save").onclick=function(){
  S.start=$("start").value;S.use=Math.max(1,+$("use").value||1);S.brk=Math.max(0,+$("brk").value||0);S.time=$("time").value||"21:00";
  save();unlock();
  try{if(window.Notification&&Notification.permission==="default")Notification.requestPermission();}catch(e){}
  render();tick();
};
$("test").onclick=function(){unlock();showAlarm(true);};
var NATIVE=false;try{NATIVE=Capacitor.isNativePlatform();}catch(e){}
var LN=NATIVE?LocalNotifications:null,CAL=NATIVE?CapacitorCalendar:null,schT=null;
function nmsg(t){var e=$("natmsg");if(e)e.textContent=t;}
if(NATIVE){$("nat").hidden=false;$("webonly").hidden=true;nmsg("Android uygulaması algılandı, eklentiler yüklendi.");}
window.scheduleSoon=function(){if(!LN)return;clearTimeout(schT);schT=setTimeout(scheduleAll,800);};

async function scheduleAll(){
  if(!LN||!S.start)return 0;
  try{
    var pend=await LN.getPending();
    if(pend.notifications&&pend.notifications.length){
      await LN.cancel({notifications:pend.notifications.filter(function(n){return n.id<1000000000}).map(function(n){return{id:n.id}})});
    }
    var list=[],now=Date.now(),t0=midnight(),tp=(S.time||"21:00").split(":");
    for(var i=0;i<30;i++){
      var day=addDays(t0,i),s=sched(day);
      if(!s||s.before||!s.med)continue;
      var key=iso(day);
      if(S.taken[key]||S.ack[key])continue;
      var base=+(key.replace(/-/g,""))*10;
      [0,10,20].forEach(function(off,j){
        var at=new Date(day.getFullYear(),day.getMonth(),day.getDate(),+tp[0],+tp[1]+off);
        if(at.getTime()<=now)return;
        list.push({id:base+j,title:j?"💊 İlaç hâlâ işaretlenmedi":"💊 İlaç zamanı",body:"Bugünkü ilacını içtin mi?",
          schedule:{at:at,allowWhileIdle:true},channelId:"ilac",actionTypeId:"ILAC",extra:{key:key}});
      });
    }
    if(list.length)await LN.schedule({notifications:list});
    return list.length;
  }catch(e){nmsg("Alarm kurulamadı: "+String(e&&e.message||e));return 0;}
}

async function nativeInit(){
  if(!LN)return;
  try{await LN.createChannel({id:"ilac",name:"İlaç alarmı",description:"Günlük ilaç alarmı",importance:5,visibility:1,vibration:true,lights:true});}catch(e){}
  try{await LN.registerActionTypes({types:[{id:"ILAC",actions:[{id:"took",title:"İçtim"},{id:"snooze",title:"10 dk sonra"}]}]});}catch(e){}
  try{
    LN.addListener("localNotificationActionPerformed",function(ev){
      var k=ev.notification&&ev.notification.extra&&ev.notification.extra.key;
      if(ev.actionId==="took"&&k){S.taken[k]=1;S.ack[k]=1;save();render();}
      else if(ev.actionId==="snooze"){
        LN.schedule({notifications:[{id:1500000000+((Date.now()/1000)%100000|0),title:"💊 İlaç zamanı",body:"Bugünkü ilacını içtin mi?",
          schedule:{at:new Date(Date.now()+600000),allowWhileIdle:true},channelId:"ilac",actionTypeId:"ILAC",extra:{key:k}}]});
      }
    });
  }catch(e){}
  scheduleAll();
}

async function nativeSetup(){
  var out=[];
  if(LN){
    try{var p=await LN.requestPermissions();out.push("Bildirim izni: "+(p.display==="granted"?"verildi":"verilmedi"));}catch(e){out.push("Bildirim izni alınamadı ("+String(e&&e.message||e)+")");}
    try{var ex=await LN.checkExactNotificationSetting();
      if(ex.exact_alarm!=="granted"){await LN.changeExactNotificationSetting();out.push("Tam zamanlı alarm için ayar ekranı açıldı, izni aç");}
      else out.push("Tam zamanlı alarm: açık");}catch(e){}
  }
  if(CAL){
    var okc=false,cerr="";
    var names=["requestWriteOnlyCalendarAccess","requestFullCalendarAccess","requestAllPermissions"];
    for(var q=0;q<names.length&&!okc;q++){
      try{if(typeof CAL[names[q]]==="function"){await CAL[names[q]]();okc=true;}}catch(e){cerr=String(e&&e.message||e);}
    }
    out.push(okc?"Takvim izni istendi":"Takvim izni alınamadı"+(cerr?" ("+cerr+")":""));
  }
  var n=await scheduleAll();
  nmsg(out.join(" · ")+(n?" · "+n+" alarm kuruldu":""));
}

async function addToCalendar(){
  if(!CAL){nmsg("Takvim eklentisi bulunamadı.");return;}
  if(!S.start){nmsg("Önce başlama tarihini kaydet.");return;}
  var id;
  try{if(CAL.getDefaultCalendar){var r=await CAL.getDefaultCalendar();id=r&&r.result&&r.result.id;}}catch(e){}
  S.cal=S.cal||{};
  var n=0,err="",tp=(S.time||"21:00").split(":"),t0=midnight();
  for(var i=0;i<30;i++){
    var day=addDays(t0,i),s=sched(day);
    if(!s||s.before||!s.med)continue;
    var key=iso(day);
    if(S.cal[key]||S.taken[key])continue;
    var st=new Date(day.getFullYear(),day.getMonth(),day.getDate(),+tp[0],+tp[1]).getTime();
    try{
      var o={title:"💊 İlaç zamanı",description:"Günlük ilaç hatırlatıcısı",startDate:st,endDate:st+600000,alerts:[0]};
      if(id)o.calendarId=id;
      await CAL.createEvent(o);S.cal[key]=1;n++;
    }catch(e){err=String(e&&e.message||e);break;}
  }
  save();
  nmsg(n+" hatırlatıcı takvime eklendi"+(err?" · Hata: "+err:""));
}

async function testNotif(){
  if(!LN){nmsg("Bildirim eklentisi bulunamadı.");return;}
  try{
    await LN.requestPermissions();
    await LN.schedule({notifications:[{id:1999999990,title:"💊 Deneme alarmı",body:"Telefon kilitliyken de böyle çalacak",
      schedule:{at:new Date(Date.now()+5000),allowWhileIdle:true},channelId:"ilac"}]});
    nmsg("5 saniye sonra bildirim gelecek. Telefonu kilitleyip bekle.");
  }catch(e){nmsg("Deneme kurulamadı: "+String(e&&e.message||e));}
}

$("natset").onclick=nativeSetup;
$("natcal").onclick=addToCalendar;
$("nattest").onclick=testNotif;
if(NATIVE){
  nativeInit();
  if(!S.permAsked2){S.permAsked2=1;save();setTimeout(nativeSetup,800);}
}
function tab(n){$("p1").hidden=n!==1;$("p2").hidden=n!==2;$("t1").className=n===1?"on":"";$("t2").className=n===2?"on":"";window.scrollTo(0,0);}
$("t1").onclick=function(){tab(1)};$("t2").onclick=function(){tab(2)};
render();tick();
