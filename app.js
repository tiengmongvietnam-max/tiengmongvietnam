// ====== CẤU HÌNH NGÂN HÀNG & SUPABASE ======
const BANK_ID = "MB";
const ACCOUNT_NO = "0569999956789";
const ACCOUNT_NAME = "TRIEU XUAN NAM"; 
const VIP_PRICE = 10000;

// Thông tin kết nối Supabase
const SUPABASE_URL = 'https://emplcjjqcwpundaqklci.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVtcGxjampxY3dwdW5kYXFrbGNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTEyNjAsImV4cCI6MjEwMjk2NzI2MH0.lXf9toe-FO_eeB0MtIIeyWf7f1E0TtKoRsCXj-SfvyM';

// Khởi tạo Supabase client an toàn
let sbClient = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.error("Lỗi kết nối Supabase:", e);
}

// Biến lưu trữ trạng thái
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

// ====== LOGIC TRA CỨU & KIỂM TRA PHÂN QUYỀN ======
function render() {
  if (!q || !res || !count) return;
  let n = norm(q.value);
  if (!n) {
    count.textContent = '';
    res.innerHTML = '<div class="empty">Nhập từ cần tra cứu để bắt đầu.</div>';
    return;
  }

  const isVip = userProfile.is_paid || userProfile.role === 'admin';

  if (!isVip) {
    if (trialSearchCount >= 5) {
      count.textContent = '';
      res.innerHTML = `
        <div class="empty" style="background:#fffbe6; border:1px dashed #ffe58f; padding:30px; border-radius:12px;">
          <h3 style="color:#d48806; margin-top:0;">⚠️ Đã hết 5 lượt tra cứu miễn phí!</h3>
          <p>Để tiếp tục tra cứu từ điển không giới hạn, vui lòng nâng cấp tài khoản vĩnh viễn chỉ với <b>10.000đ</b>.</p>
          <button onclick="handleUpgradeClick()" class="primary" style="padding:10px 20px; font-size:15px; border-radius:8px; background:#1769aa; color:#fff; border:none; cursor:pointer;">⭐ Quét mã QR Nâng cấp ngay</button>
        </div>`;
      return;
    }
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
  res.innerHTML = f.slice(0, 100).map(x => `
    <article class="card">
      <div class="term">${hi(mode === 'mv' ? x.mong : x.viet, q.value)}</div>
      <div class="meaning">${esc(mode === 'mv' ? x.viet : x.mong)}</div>
      ${x.example ? `<div class="example">Ví dụ: ${esc(x.example)}</div>` : ''}
    </article>
  `).join('') || '<div class="empty">Không tìm thấy kết quả.</div>';
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

// ====== HỆ THỐNG XÁC THỰC (AUTH) ======
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
          if ($('#upgradeBtn')) $('#upgradeBtn').style.display = 'none';
        } else if (profile.is_paid) {
          if ($('#userStatus')) {
            $('#userStatus').textContent = 'VIP Trọn đời';
            $('#userStatus').style.background = '#f6ffed';
            $('#userStatus').style.color = '#389e0d';
          }
          if ($('#upgradeBtn')) $('#upgradeBtn').style.display = 'none';
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

// Đăng ký
if ($('#btnDoSignUp')) {
  $('#btnDoSignUp').onclick = async () => {
    if (!sbClient) return alert("Hệ thống dữ liệu đang kết nối, vui lòng thử lại!");
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

// Đăng nhập
if ($('#btnDoLogin')) {
  $('#btnDoLogin').onclick = async () => {
    if (!sbClient) return alert("Hệ thống dữ liệu đang kết nối, vui lòng thử lại!");
    const email = $('#auth_email').value.trim(), password = $('#auth_pass').value.trim();
    const msg = $('#authMsg');
    msg.textContent = 'Đang đăng nhập...';
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) return (msg.textContent = 'Sai tài khoản hoặc mật khẩu!');
    location.reload();
  };
}

// Đăng xuất
if ($('#logoutBtn')) {
  $('#logoutBtn').onclick = async () => {
    if (sbClient) await sbClient.auth.signOut();
    location.reload();
  };
}

// ====== MÃ VIETQR VÀ TỰ ĐỘNG KÍCH HOẠT ======
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
  $$('.tab').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  mode = b.dataset.mode;
  if (q) {
    q.placeholder = mode === 'mv' ? 'Nhập tiếng Mông cần tra...' : 'Nhập nghĩa tiếng Việt cần tra...';
    q.value = '';
  }
  render();
});

if (exact) exact.onchange = render;
if ($('#clear')) $('#clear').onclick = () => { if (q) { q.value = ''; render(); q.focus(); } };
if ($('#loginBtn')) $('#loginBtn').onclick = () => openModal('#authModal');
if ($('#ownerBtn')) $('#ownerBtn').onclick = () => openModal('#ownerModal');
$$('[data-close]').forEach(b => b.onclick = () => closeModal('#' + b.dataset.close));
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

function field(prefix, id) { return $(prefix + '_' + id) ? $(prefix + '_' + id).value.trim() : ''; }
if ($('#ownerSave')) {
  $('#ownerSave').onclick = () => {
    let x = { mong: field('#o', 'mong'), viet: field('#o', 'viet'), initial: field('#o', 'initial'), vowel: field('#o', 'vowel'), tone: field('#o', 'tone'), example: field('#o', 'example'), source: field('#o', 'source') };
    let msg = $('#ownerMsg');
    if (!x.mong || !x.viet) { if (msg) msg.textContent = 'Vui lòng nhập tiếng Mông và nghĩa.'; return; }
    let extras = getExtras();
    extras.push(x);
    localStorage.setItem('mongviet_owner_extra', JSON.stringify(extras));
    ['mong', 'viet', 'initial', 'vowel', 'tone', 'example', 'source'].forEach(k => { if ($('#o_' + k)) $('#o_' + k).value = ''; });
    if (msg) msg.textContent = 'Đã thêm từ mới vào hệ thống!';
    loadExtras();
  };
}

if ($('#exportData')) {
  $('#exportData').onclick = () => {
    let blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    let url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'tu-dien-mong-viet.json'; a.click();
  };
}

if ($('#clearExtras')) {
  $('#clearExtras').onclick = () => {
    if (!confirm('Xóa từ đã thêm?')) return;
    localStorage.removeItem('mongviet_owner_extra');
    loadExtras();
  };
}

if ($('#year')) $('#year').textContent = '2026';
loadExtras();
checkAuth();
