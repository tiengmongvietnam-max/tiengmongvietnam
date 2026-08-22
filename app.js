let data=[...DICTIONARY],mode='mv';
const CONTRIBUTION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwhL-hSGi0-HLrZAzvmUJnR08W7b6nz-bz9mslxH_4gSFDq8my8iGDKCt-ylcPKFcKu8w/exec'; // Đã dán URL Web App Google Apps Script
let recorder=null, audioChunks=[], audioBlob=null, audioUrl=null;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const q=$('#q'),res=$('#results'),exact=$('#exact'),count=$('#count');
const norm=s=>(s||'').normalize('NFC').trim().toLocaleLowerCase('vi-VN');
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function hi(s,n){let a=norm(s),b=norm(n),i=a.indexOf(b);if(i<0)return esc(s);return esc(s.slice(0,i))+'<span class="mark">'+esc(s.slice(i,i+n.length))+'</span>'+esc(s.slice(i+n.length));}
function render(){let n=norm(q.value);if(!n){count.textContent='';res.innerHTML='<div class="empty">Nhập từ cần tra cứu để bắt đầu.</div>';return}
 let f=data.filter(x=>{let v=norm(mode==='mv'?x.mong:x.viet);return exact.checked?v===n:v.includes(n)});
 f.sort((a,b)=>{let A=norm(mode==='mv'?a.mong:a.viet),B=norm(mode==='mv'?b.mong:b.viet);return (A===n?0:A.startsWith(n)?1:2)-(B===n?0:B.startsWith(n)?1:2)||A.localeCompare(B,'vi')});
 count.textContent=`Tìm thấy ${f.length} kết quả`;
 res.innerHTML=f.slice(0,100).map(x=>`<article class="card"><div class="term">${hi(mode==='mv'?x.mong:x.viet,q.value)}</div><div class="meaning">${esc(mode==='mv'?x.viet:x.mong)}</div>${x.example?`<div class="example">Ví dụ: ${esc(x.example)}</div>`:''}</article>`).join('')||'<div class="empty">Không tìm thấy kết quả.</div>';
}
function getExtras(){try{return JSON.parse(localStorage.getItem('mongviet_owner_extra')||'[]')}catch{return []}}
function loadExtras(){data=[...DICTIONARY,...getExtras()];$('#total').textContent=data.length.toLocaleString('vi-VN');render()}
function openModal(id){$(id).style.display='flex'}
function closeModal(id){$(id).style.display='none'}
$$('.tab').forEach(b=>b.onclick=()=>{ $$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');mode=b.dataset.mode;q.placeholder=mode==='mv'?'Nhập tiếng Mông cần tra...':'Nhập nghĩa tiếng Việt cần tra...';q.value='';render();});
q.oninput=render;exact.onchange=render;$('#clear').onclick=()=>{q.value='';render();q.focus()};
$('#ownerBtn').onclick=()=>openModal('#ownerModal');$('#contribBtn').onclick=()=>openModal('#contribModal');
$$('[data-close]').forEach(b=>b.onclick=()=>closeModal('#'+b.dataset.close));
window.onclick=e=>{if(e.target.classList.contains('modal'))e.target.style.display='none'};
function field(prefix,id){return $(prefix+'_'+id).value.trim()}
$('#ownerSave').onclick=()=>{let x={mong:field('#o','mong'),viet:field('#o','viet'),initial:field('#o','initial'),vowel:field('#o','vowel'),tone:field('#o','tone'),example:field('#o','example'),source:field('#o','source')};let msg=$('#ownerMsg');if(!x.mong||!x.viet){msg.textContent='Vui lòng nhập tiếng Mông và bản dịch tiếng Việt.';return}if(data.some(d=>norm(d.mong)===norm(x.mong)&&norm(d.viet)===norm(x.viet))){msg.textContent='Từ và nghĩa này đã có trong từ điển.';return}let extras=getExtras();extras.push(x);localStorage.setItem('mongviet_owner_extra',JSON.stringify(extras));['mong','viet','initial','vowel','tone','example','source'].forEach(k=>$('#o_'+k).value='');msg.textContent='Đã thêm vào từ điển trên thiết bị này.';loadExtras()};
$('#exportData').onclick=()=>downloadJson(data,'tu-dien-mong-viet-4.0.json');
$('#clearExtras').onclick=()=>{if(!confirm('Xóa toàn bộ từ do chủ sở hữu đã thêm trên thiết bị này? Dữ liệu gốc không bị xóa.'))return;localStorage.removeItem('mongviet_owner_extra');loadExtras();$('#ownerMsg').textContent='Đã xóa phần từ bổ sung trên thiết bị.'};
function getPending(){try{return JSON.parse(localStorage.getItem('mongviet_pending')||'[]')}catch{return []}}
$($('#submitContrib').onclick=async()=>{
 let msg=$('#contribMsg'); 
 let tiengMong = field('#c','mong');
 let tiengViet = field('#c','viet');

 // Bắt buộc phải có Tiếng Mông và Tiếng Việt
 if(!tiengMong || !tiengViet){
   msg.textContent='Vui lòng nhập tiếng Mông và nghĩa tiếng Việt.';
   return;
 }
 
 msg.textContent='⏳ Đang gửi đóng góp...';

 // Xử lý file ghi âm nếu có
 let ghiAmData = "";
 if(audioBlob){ ghiAmData = await blobToDataURL(audioBlob); }

 if(CONTRIBUTION_ENDPOINT){
   try{
     // Ghép dữ liệu để gửi lên Google Sheets (khớp với e.parameter của Thầy)
     let formData = new URLSearchParams();
     formData.append('tiengMong', tiengMong);
     formData.append('tiengViet', tiengViet);
     formData.append('amDau', field('#c','initial'));
     formData.append('van', field('#c','vowel'));
     formData.append('thanh', field('#c','tone'));
     formData.append('viDu', field('#c','example'));
     
     // Gộp tên người gửi và ghi chú
     let nguoi = field('#c','person');
     let note = field('#c','note');
     let thongTinNguoi = nguoi + (note ? " (Ghi chú: " + note + ")" : "");
     formData.append('nguoiDongGop', thongTinNguoi || "Ẩn danh");
     formData.append('ghiAm', ghiAmData);

     let r = await fetch(CONTRIBUTION_ENDPOINT, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: formData
     });

     if(!r.ok) throw new Error('HTTP '+r.status);
     msg.textContent='✅ Đã gửi từ mới thẳng về máy chủ thành công!';
   } catch(e) {
     msg.textContent='⚠️ Có lỗi kết nối, chưa gửi được lên Google Sheets.';
   }
 } else {
   msg.textContent='Chưa có link cấu hình máy chủ.';
 }

 // Làm trống các ô nhập liệu sau khi gửi xong
 ['mong','viet','initial','vowel','tone','example','note','person'].forEach(k=>$('#c_'+k).value=''); 
 resetRecorder();
};
function blobToDataURL(blob){return new Promise((resolve,reject)=>{let r=new FileReader();r.onloadend=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
function resetRecorder(){if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;audioBlob=null;audioChunks=[];$('#audioPreview').hidden=true;$('#audioPreview').removeAttribute('src');$('#playRec').disabled=true;$('#clearRec').disabled=true;$('#stopRec').disabled=true;$('#startRec').disabled=false;$('#recStatus').textContent='Chưa có bản ghi.'}
$('#startRec').onclick=async()=>{try{let stream=await navigator.mediaDevices.getUserMedia({audio:true});audioChunks=[];recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)audioChunks.push(e.data)};recorder.onstop=()=>{audioBlob=new Blob(audioChunks,{type:recorder.mimeType||'audio/webm'});audioUrl=URL.createObjectURL(audioBlob);$('#audioPreview').src=audioUrl;$('#audioPreview').hidden=false;$('#playRec').disabled=false;$('#clearRec').disabled=false;$('#recStatus').textContent='Đã ghi âm. Thầy/người đóng góp có thể nghe lại trước khi gửi.';stream.getTracks().forEach(t=>t.stop())};recorder.start();$('#startRec').disabled=true;$('#stopRec').disabled=false;$('#recStatus').textContent='🔴 Đang ghi âm...';}catch(e){$('#recStatus').textContent='Không mở được micro. Hãy cho phép trình duyệt sử dụng micro và mở website bằng HTTPS.'}};
$('#stopRec').onclick=()=>{if(recorder&&recorder.state!=='inactive')recorder.stop()};
$('#playRec').onclick=()=>{$('#audioPreview').play()};
$('#clearRec').onclick=()=>resetRecorder();
$('#downloadPending').onclick=()=>{let p=getPending();if(!p.length){$('#contribMsg').textContent='Chưa có phiếu đóng góp nào trên thiết bị này.';return}downloadJson(p,'cac-phieu-dong-gop-mong-viet.json');$('#contribMsg').textContent=`Đã xuất ${p.length} phiếu đóng góp.`};
function downloadJson(obj,name){let blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)}
$('#year').textContent='2026';loadExtras();