// Android izinlerini AndroidManifest.xml dosyasına ekler.
const fs = require('fs');
const p = 'android/app/src/main/AndroidManifest.xml';
if (!fs.existsSync(p)) {
  console.error('AndroidManifest.xml bulunamadı. Önce "npx cap add android" çalışmış olmalı.');
  process.exit(1);
}
let x = fs.readFileSync(p, 'utf8');
const perms = [
  'POST_NOTIFICATIONS',     // bildirim göstermek
  'SCHEDULE_EXACT_ALARM',   // tam saatinde alarm kurmak
  'VIBRATE',                // titreşim
  'WAKE_LOCK',              // alarmda ekranı uyandırmak
  'RECEIVE_BOOT_COMPLETED', // telefon yeniden açılınca alarmları geri kurmak
  'READ_CALENDAR',          // takvimi okumak
  'WRITE_CALENDAR'          // takvime hatırlatıcı yazmak
];
const eksik = perms.filter(n => !x.includes('android.permission.' + n));
if (eksik.length === 0) {
  console.log('Tüm izinler zaten ekli.');
} else {
  const satirlar = eksik
    .map(n => '    <uses-permission android:name="android.permission.' + n + '" />')
    .join('\n');
  x = x.replace('<application', satirlar + '\n\n    <application');
  fs.writeFileSync(p, x);
  console.log('Eklenen izinler: ' + eksik.join(', '));
}
