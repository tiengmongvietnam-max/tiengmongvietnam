// ====== CẤU HÌNH NGÂN HÀNG & SUPABASE ======
const BANK_ID = "MB";
const ACCOUNT_NO = "0569999956789";
const ACCOUNT_NAME = "TRIEU XUAN NAM"; 
const VIP_PRICE = 10000;

const SUPABASE_URL = 'https://emplcjjqcwpundaqklci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcGxjampxY3dwdW5kYXFrbGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTEyNjAsImV4cCI6MjEwMjk2NzI2MH0.lXf9toe-FO_eeB0MtIIeyWf7f1E0TtKoRsCXj-SfvyM';

let sbClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Lỗi kết nối Supabase:", e);
}

let currentUser = null;
let userProfile = { is_paid: false, role: 'user' };
let trialSearchCount = parseInt(localStorage.getItem('trial_search_count') || '0');

let data = (typeof DICTIONARY !== 'undefined') ? [...DICTIONARY] : [];
let mode = 'mv';
const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);
const q = $('#q'), res = $('#results'), exact = $('#exact'), count = $('#count');

const norm = s => (s || '').normalize('NFC').trim().toLocaleLowerCase('vi-VN');
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function hi(s, n) {
  let a = norm(s), b = norm(n), i = a.indexOf(b);
  if (i < 0) return esc(s);
  return esc(s.slice(0, i)) + '<span class="mark">' + esc(s.slice(i, i + n.length)) + '</span>' + esc(s.slice(i + n.length));
}

// ====== HÀM PHÁT ÂM ======
window.playAudio = function(audioBase64, text) {
  if (audioBase64 && audioBase64.startsWith('data:audio')) {
    const snd = new Audio(audioBase64);
    snd.play().catch(e => console.error("Lỗi phát âm:", e));
  } else if ('speechSynthesis' in window && text) {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  } else {
    alert("Không tìm thấy âm thanh mẫu.");
  }
};

// ====== LOGIC TRA CỨU ======
function render() {
  if (!q || !res || !count) return;
  let n = norm(q.value);
  if (!n) {
    count.textContent = '';
    res.innerHTML = '<div class="empty">Nhập từ cần tra cứu để bắt đầu.</div>';
    return;
  }

  const isVip = userProfile.is_paid || userProfile.role === 'admin';
  if (!isVip && trialSearchCount >= 5) {
    count.textContent = '';
    res.innerHTML = `
      <div class="empty" style="background:#fffbe6; border:1px dashed #ffe58f; padding:30px; border-radius:12px;">
        <h3 style="color:#d48806; margin-top:0;">⚠️ Đã hết 5 lượt tra cứu miễn phí!</h3>
        <p>Để tiếp tục tra cứu từ điển không giới hạn, vui lòng nâng cấp tài khoản vĩnh viễn chỉ với <b>10.000đ</b>.</p>
        <button onclick="handleUpgradeClick()" class="primary" style="padding:10px 20px; font-size:15px; border-radius:8px; background:#1769aa; color:#fff; border:none; cursor:pointer;">⭐ Quét mã QR Nâng cấp ngay</button>
      </div>`;
    return;
  }

  let f = data.filter(x => {
    let v = norm(mode === 'mv' ? x.mong : x.viet);
    return (exact && exact.checked) ? v === n : v.includes(n);
  });

  f.sort((a, b) => {
    let A = norm(mode === 'mv' ? a.mong : a.viet), B = norm(mode === 'mv' ? b.viet : b.viet);
    return (A === n ? 0 : A.startsWith(n) ? 1 : 2) - (B === n ? 0 : B.startsWith(n) ? 1 : 2) || A.localeCompare(B, 'vi');
  });

  count.textContent = `Tìm thấy ${f.length} kết quả ${!isVip ? `(Đã dùng ${trialSearchCount}/5 lượt thử)` : '· Tài khoản VIP'}`;
  res.innerHTML = f.slice(0, 100).map(x => {
    const word = mode === 'mv' ? x.mong : x.viet;
    const audioData = x.audio ? esc(x.audio) : '';
    return `
      <article class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div class="term">${hi(word, q.value)}</div>
          <button onclick="playAudio('${audioData}', '${esc(word)}')" style="background:none; border:1px solid #d9d9d9; border-radius:50%; width:32px; height:32px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Phát âm mẫu">🔊</button>
        </div>
        <div class="meaning">${esc(mode === 'mv' ? x.viet : x.mong)}</div>
        ${x.example ? `<div class="example">Ví dụ: ${esc(x.example)}</div>` : ''}
      </article>
    `;
  }).join('') || '<div class="empty">Không tìm thấy kết quả.</div>';
}

let searchTimeout = null;
if (q) {
  q.oninput = () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      if (q.value.trim().length > 1 && !userProfile.is_paid && userProfile.role !== 'admin') {
        trialSearchCount++;
        localStorage.setItem('trial_search_count', trialSearchCount);
      }
      render();
    }, 400);
  };
}

// ====== HỆ THỐNG XÁC THỰC ======
async function checkAuth() {
  if (!sbClient) return;
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if (session && session.user) {
      currentUser = session.user;
      if ($('#loginBtn')) $('#loginBtn').style.display = 'none';
      if ($('#userInfo')) $('#userInfo').style.display = 'block';
      if ($('#userEmail')) $('#userEmail').textContent = currentUser.email;

      const { data: profile } = await sbClient.from('profiles').select('*').eq('id', currentUser.id).single();
      if (profile) {
        userProfile = profile;
        if (profile.role === 'admin') {
          if ($('#userStatus')) {
            $('#userStatus').textContent = 'Quản trị viên (Admin)';
            $('#userStatus').style.background = '#e6f7ff';
            $('#userStatus').style.color = '#0050b3';
          }
          if ($('#ownerBtn')) $('#ownerBtn').style.display = 'flex';
          loadPendingContributions();
        } else if (profile.is_paid) {
          if ($('#userStatus')) {
            $('#userStatus').textContent = 'VIP Trọn đời';
            $('#userStatus').style.background = '#f6ffed';
            $('#userStatus').style.color = '#389e0d';
          }
        }
      }
      listenPayment(currentUser.id);
    } else {
      currentUser = null;
      userProfile = { is_paid: false, role: 'user' };
      if ($('#loginBtn')) $('#loginBtn').style.display = 'block';
      if ($('#userInfo')) $('#userInfo').style.display = 'none';
      if ($('#ownerBtn')) $('#ownerBtn').style.display = 'none';
    }
  } catch (err) {
    console.error("Lỗi kiểm tra Auth:", err);
  }
}

if ($('#btnDoSignUp')) {
  $('#btnDoSignUp').onclick = async () => {
    if (!sbClient) return alert("Hệ thống đang kết nối, vui lòng thử lại!");
    const email = $('#auth_email').value.trim(), password = $('#auth_pass').value.trim();
    const msg = $('#authMsg');
    if (!email || password.length < 6) return (msg.textContent = 'Vui lòng nhập email và mật khẩu >= 6 ký tự!');
    msg.textContent = 'Đang xử lý đăng ký...';
    
    const { data: authData, error } = await sbClient.auth.signUp({ email, password });
    if (error) return (msg.textContent = error.message);
    
    if (authData && authData.user) {
      await sbClient.from('profiles').upsert([{ id: authData.user.id, email: authData.user.email, role: 'user', is_paid: false }]);
    }
    msg.textContent = 'Đăng ký thành công! Đang tải lại...';
    setTimeout(() => location.reload(), 1000);
  };
}

if ($('#btnDoLogin')) {
  $('#btnDoLogin').onclick = async () => {
    if (!sbClient) return alert("Hệ thống đang kết nối, vui lòng thử lại!");
    const email = $('#auth_email').value.trim(), password = $('#auth_pass').value.trim();
    const msg = $('#authMsg');
    msg.textContent = 'Đang đăng nhập...';
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) return (msg.textContent = 'Sai tài khoản hoặc mật khẩu!');
    location.reload();
  };
}

if ($('#logoutBtn')) {
  $('#logoutBtn').onclick = async () => {
    if (sbClient) await sbClient.auth.signOut();
    location.reload();
  };
}

function handleUpgradeClick() {
  if (!currentUser) {
    alert("Vui lòng đăng nhập hoặc đăng ký tài khoản trước khi quét mã nâng cấp!");
    openModal('#authModal');
    return;
  }
  const memo = 'TD' + currentUser.id.slice(-6).toUpperCase();
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${VIP_PRICE}&addInfo=${memo}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
  
  if ($('#qrImg')) $('#qrImg').src = qrUrl;
  if ($('#qrNotice')) {
    $('#qrNotice').innerHTML = `Số tiền: <b>10.000đ</b><br>Nội dung bắt buộc: <span style="color:#d4380d; background:#fff2e8; padding:2px 6px; border-radius:4px; font-weight:bold;">${memo}</span>`;
  }
  openModal('#payModal');
}

if ($('#upgradeBtn')) $('#upgradeBtn').onclick = handleUpgradeClick;

function listenPayment(userId) {
  if (!sbClient) return;
  sbClient
    .channel('pay_check')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, payload => {
      if (payload.new && payload.new.is_paid) {
        closeModal('#payModal');
        alert("🎉 Chúc mừng! Tài khoản của bạn đã được kích hoạt VIP trọn đời thành công!");
        location.reload();
      }
    })
    .subscribe();
}

// ====== HỆ THỐNG THU ÂM (ĐÃ KHẮC PHỤC TRIỆT ĐỂ) ======
let activeRecorder = null;
let mediaStreamRef = null;
let recordedBase64Admin = '';
let recordedBase64Contrib = '';

function getSupportedAudioMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/aac'];
  for (let t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
}

function initVoiceRecorder(btnId, audioPreviewId, onFinish) {
  const btn = $(btnId);
  const audioPreview = $(audioPreviewId);
  if (!btn) return;

  btn.onclick = async () => {
    // 1. Nếu đang thu âm -> Dừng lại
    if (activeRecorder && activeRecorder.state === 'recording') {
      activeRecorder.stop();
      if (mediaStreamRef) {
        mediaStreamRef.getTracks().forEach(track => track.stop());
      }
      btn.textContent = '🎙️ Thu âm lại';
      btn.style.background = '#e6f7ff';
      btn.style.color = '#0050b3';
      return;
    }

    // 2. Bắt đầu thu âm
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef = stream;
      
      const mimeType = getSupportedAudioMimeType();
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      activeRecorder = recorder;
      let chunks = [];

      recorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64 = reader.result;
          onFinish(base64);
          if (audioPreview) {
            audioPreview.src = base64;
            audioPreview.style.display = 'block';
          }
        };
      };

      recorder.start();
      btn.textContent = '⏹️ Đang thu... Bấm để Dừng';
      btn.style.background = '#ff4d4f';
      btn.style.color = '#fff';
    } catch (err) {
      console.error("Lỗi Microphone:", err);
      alert("Không thể truy cập Micro! Vui lòng kiểm tra quyền Micro trên trình duyệt của bạn.");
    }
  };
}

initVoiceRecorder('#btnRecordOwner', '#audioPreviewOwner', b64 => { recordedBase64Admin = b64; });
initVoiceRecorder('#btnRecordContrib', '#audioPreviewContrib', b64 => { recordedBase64Contrib = b64; });

// ====== MODAL & GIAO DIỆN CHUNG ======
function getExtras() { try { return JSON.parse(localStorage.getItem('mongviet_owner_extra') || '[]') } catch { return [] } }
function loadExtras() { 
  data = (typeof DICTIONARY !== 'undefined') ? [...DICTIONARY, ...getExtras()] : [...getExtras()]; 
  if ($('#total')) $('#total').textContent = data.length.toLocaleString('vi-VN'); 
  render(); 
}
function openModal(id) { if ($(id)) $(id).style.display = 'flex'; }
function closeModal(id) { if ($(id)) $(id).style.display = 'none'; }

$$('.tab').forEach(b => b.onclick = () => {
  if (b.dataset.mode) {
    $$('.tab').forEach(x => { if (x.dataset.mode) x.classList.remove('active'); });
    b.classList.add('active');
    mode = b.dataset.mode;
    if (q) {
      q.placeholder = mode === 'mv' ? 'Nhập tiếng Mông cần tra...' : 'Nhập nghĩa tiếng Việt cần tra...';
      q.value = '';
    }
    render();
  }
});

if (exact) exact.onchange = render;
if ($('#clear')) $('#clear').onclick = () => { if (q) { q.value = ''; render(); q.focus(); } };
if ($('#loginBtn')) $('#loginBtn').onclick = () => openModal('#authModal');
if ($('#ownerBtn')) $('#ownerBtn').onclick = () => { openModal('#ownerModal'); loadPendingContributions(); };
if ($('#contribBtn')) $('#contribBtn').onclick = () => openModal('#contribModal');
$$('[data-close]').forEach(b => b.onclick = () => closeModal('#' + b.dataset.close));
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

function field(prefix, id) { return $(prefix + '_' + id) ? $(prefix + '_' + id).value.trim() : ''; }

// Xử lý gửi đóng góp từ
if ($('#contribSave')) {
  $('#contribSave').onclick = async () => {
    let mong = field('#c', 'mong'), viet = field('#c', 'viet');
    let msg = $('#contribMsg');
    if (!mong || !viet) {
      if (msg) msg.textContent = 'Vui lòng nhập đầy đủ tiếng Mông và nghĩa tiếng Việt.';
      return;
    }
    
    if (sbClient) {
      msg.style.color = '#096dd9';
      msg.textContent = 'Đang gửi đóng góp...';
      const { error } = await sbClient.from('contributions').insert([{
        mong: mong,
        viet: viet,
        initial: field('#c', 'initial'),
        vowel: field('#c', 'vowel'),
        tone: field('#c', 'tone'),
        example: field('#c', 'example'),
        author: field('#c', 'author') || 'Bạn đọc',
        audio: recordedBase64Contrib || '',
        status: 'pending'
      }]);
      if (error) {
        msg.style.color = '#cf1322';
        msg.textContent = 'Lỗi gửi: ' + error.message;
        return;
      }
    }

    if (msg) {
      msg.style.color = '#389e0d';
      msg.textContent = '🎉 Cảm ơn bạn! Đóng góp kèm giọng đọc mẫu đã được gửi tới Ban quản trị.';
    }
    ['mong', 'viet', 'initial', 'vowel', 'tone', 'example', 'author'].forEach(k => { if ($('#c_' + k)) $('#c_' + k).value = ''; });
    if ($('#audioPreviewContrib')) $('#audioPreviewContrib').style.display = 'none';
    recordedBase64Contrib = '';
    setTimeout(() => { closeModal('#contribModal'); if (msg) msg.textContent = ''; }, 2500);
  };
}

// Xử lý Admin thêm từ trực tiếp
if ($('#ownerSave')) {
  $('#ownerSave').onclick = () => {
    let x = { 
      mong: field('#o', 'mong'), 
      viet: field('#o', 'viet'), 
      initial: field('#o', 'initial'), 
      vowel: field('#o', 'vowel'), 
      tone: field('#o', 'tone'), 
      example: field('#o', 'example'), 
      source: field('#o', 'source'),
      audio: recordedBase64Admin || ''
    };
    let msg = $('#ownerMsg');
    if (!x.mong || !x.viet) { if (msg) msg.textContent = 'Vui lòng nhập tiếng Mông và nghĩa.'; return; }
    let extras = getExtras();
    extras.push(x);
    localStorage.setItem('mongviet_owner_extra', JSON.stringify(extras));
    ['mong', 'viet', 'initial', 'vowel', 'tone', 'example', 'source'].forEach(k => { if ($('#o_' + k)) $('#o_' + k).value = ''; });
    if ($('#audioPreviewOwner')) $('#audioPreviewOwner').style.display = 'none';
    recordedBase64Admin = '';
    if (msg) msg.textContent = 'Đã lưu từ mới và giọng đọc mẫu vào từ điển!';
    loadExtras();
  };
}

// ====== CHUYỂN TAB & PHÊ DUYỆT / TỪ CHỐI (ADMIN) ======
if ($('#tabAddDirect')) {
  $('#tabAddDirect').onclick = () => {
    $('#tabAddDirect').classList.add('active');
    $('#tabReviewContrib').classList.remove('active');
    $('#sectionAddDirect').style.display = 'block';
    $('#sectionReviewContrib').style.display = 'none';
  };
}

if ($('#tabReviewContrib')) {
  $('#tabReviewContrib').onclick = () => {
    $('#tabReviewContrib').classList.add('active');
    $('#tabAddDirect').classList.remove('active');
    $('#sectionAddDirect').style.display = 'none';
    $('#sectionReviewContrib').style.display = 'block';
    loadPendingContributions();
  };
}

async function loadPendingContributions() {
  if (!sbClient || userProfile.role !== 'admin') return;
  const listEl = $('#contribList');
  if (!listEl) return;
  
  const { data: items, error } = await sbClient.from('contributions').select('*').eq('status', 'pending').order('created_at', { ascending: false });
  if (error || !items) {
    listEl.innerHTML = '<div style="color:red; text-align:center;">Lỗi tải dữ liệu đóng góp!</div>';
    return;
  }

  if ($('#pendingCount')) $('#pendingCount').textContent = items.length;

  if (items.length === 0) {
    listEl.innerHTML = '<div style="text-align:center; color:#52c41a; padding:20px;">✅ Hiện không có từ nào chờ phê duyệt!</div>';
    return;
  }

  listEl.innerHTML = items.map(it => `
    <div style="background:#fafafa; border:1px solid #e8e8e8; border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
      <div style="flex:1;">
        <div style="font-size:15px; font-weight:bold; color:#143d59;">${esc(it.mong)} <span style="font-weight:normal; color:#555;">→ ${esc(it.viet)}</span></div>
        <div style="font-size:13px; color:#777; margin-top:3px;">
          ${it.example ? `Ví dụ: <i>${esc(it.example)}</i> · ` : ''}Người gửi: <b>${esc(it.author || 'Bạn đọc')}</b>
        </div>
        ${it.audio ? `<button onclick="playAudio('${esc(it.audio)}', '')" style="margin-top:5px; font-size:12px; padding:3px 8px; border-radius:4px; border:1px solid #91d5ff; background:#e6f7ff; color:#0050b3; cursor:pointer;">🔊 Nghe bản thu mẫu</button>` : ''}
      </div>
      <div style="display:flex; gap:6px;">
        <button onclick="approveContrib(${it.id})" style="background:#52c41a; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">✓ Duyệt</button>
        <button onclick="rejectContrib(${it.id})" style="background:#ff4d4f; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer;">✕ Từ chối</button>
      </div>
    </div>
  `).join('');
}

window.approveContrib = async function(id) {
  if (!sbClient) return;
  const { data: item } = await sbClient.from('contributions').select('*').eq('id', id).single();
  if (item) {
    let extras = getExtras();
    extras.push({
      mong: item.mong,
      viet: item.viet,
      initial: item.initial || '',
      vowel: item.vowel || '',
      tone: item.tone || '',
      example: item.example || '',
      source: 'Đóng góp bởi: ' + (item.author || 'Bạn đọc'),
      audio: item.audio || ''
    });
    localStorage.setItem('mongviet_owner_extra', JSON.stringify(extras));
    await sbClient.from('contributions').update({ status: 'approved' }).eq('id', id);
    alert(`Đã duyệt và thêm từ "${item.mong}" vào từ điển!`);
    loadExtras();
    loadPendingContributions();
  }
};

window.rejectContrib = async function(id) {
  if (!confirm("Thầy có chắc chắn muốn từ chối từ này?")) return;
  if (sbClient) {
    await sbClient.from('contributions').update({ status: 'rejected' }).eq('id', id);
    loadPendingContributions();
  }
};

if ($('#exportData')) {
  $('#exportData').onclick = () => {
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    let url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'tu-dien-mong-viet.json'; a.click();
  };
}

if ($('#clearExtras')) {
  $('#clearExtras').onclick = () => {
    if (!confirm('Xóa toàn bộ từ bổ sung?')) return;
    localStorage.removeItem('mongviet_owner_extra');
    loadExtras();
  };
}

if ($('#year')) $('#year').textContent = '2026';
loadExtras();
checkAuth();
