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
let checkPaymentInterval = null;

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

// ====== LOGIC TRA CỨU TỪ ĐIỂN ======
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

// ====== HỆ THỐNG XÁC THỰC & TÀI KHOẢN ======
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
    if (!email || password.length < 6) {
      msg.style.color = '#cf1322';
      return (msg.textContent = 'Vui lòng nhập email và mật khẩu >= 6 ký tự!');
    }
    msg.style.color = '#096dd9';
    msg.textContent = 'Đang xử lý đăng ký...';
    
    const { data: authData, error } = await sbClient.auth.signUp({ email, password });
    if (error) {
      msg.style.color = '#cf1322';
      return (msg.textContent = error.message);
    }
    
    if (authData && authData.user) {
      await sbClient.from('profiles').upsert([{ id: authData.user.id, email: authData.user.email, role: 'user', is_paid: false }]);
    }
    msg.style.color = '#389e0d';
    msg.textContent = 'Đăng ký thành công! Đang tải lại...';
    setTimeout(() => location.reload(), 1000);
  };
}

if ($('#btnDoLogin')) {
  $('#btnDoLogin').onclick = async () => {
    if (!sbClient) return alert("Hệ thống đang kết nối, vui lòng thử lại!");
    const email = $('#auth_email').value.trim(), password = $('#auth_pass').value.trim();
    const msg = $('#authMsg');
    msg.style.color = '#096dd9';
    msg.textContent = 'Đang đăng nhập...';
    const { error } = await sbClient.auth.signInWithPassword({ email, password });
    if (error) {
      msg.style.color = '#cf1322';
      return (msg.textContent = 'Sai tài khoản hoặc mật khẩu!');
    }
    location.reload();
  };
}

if ($('#logoutBtn')) {
  $('#logoutBtn').onclick = async () => {
    if (sbClient) await sbClient.auth.signOut();
    location.reload();
  };
}

if ($('#linkForgotPassword')) {
  $('#linkForgotPassword').onclick = () => {
    $('#authTitle').textContent = '📩 Cấp lại mật khẩu';
    $('#authNote').textContent = 'Nhập email tài khoản của bạn. Hệ thống sẽ gửi một liên kết đổi mật khẩu vào Gmail.';
    $('#passGroup').style.display = 'none';
    $('#forgotGroup').style.display = 'none';
    $('#authActions').style.display = 'none';
    $('#forgotActions').style.display = 'flex';
    if ($('#authMsg')) $('#authMsg').textContent = '';
  };
}

if ($('#btnBackToLogin')) {
  $('#btnBackToLogin').onclick = () => {
    $('#authTitle').textContent = '🔑 Tài khoản';
    $('#authNote').textContent = 'Nhập Email và mật khẩu để Đăng nhập hoặc Đăng ký tài khoản.';
    $('#passGroup').style.display = 'block';
    $('#forgotGroup').style.display = 'block';
    $('#authActions').style.display = 'flex';
    $('#forgotActions').style.display = 'none';
    if ($('#authMsg')) $('#authMsg').textContent = '';
  };
}

if ($('#btnSendResetEmail')) {
  $('#btnSendResetEmail').onclick = async () => {
    if (!sbClient) return;
    const email = $('#auth_email').value.trim();
    const msg = $('#authMsg');
    if (!email) {
      msg.style.color = '#cf1322';
      msg.textContent = 'Vui lòng nhập email cần cấp lại mật khẩu!';
      return;
    }

    msg.style.color = '#096dd9';
    msg.textContent = 'Đang gửi thư yêu cầu...';

    const { error } = await sbClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
      msg.style.color = '#cf1322';
      msg.textContent = 'Lỗi: ' + error.message;
    } else {
      msg.style.color = '#389e0d';
      msg.textContent = '✅ Đã gửi link đổi mật khẩu vào Gmail. Vui lòng kiểm tra hộp thư!';
    }
  };
}

if ($('#changePassBtn')) {
  $('#changePassBtn').onclick = () => {
    if ($('#new_password')) $('#new_password').value = '';
    if ($('#confirm_new_password')) $('#confirm_new_password').value = '';
    if ($('#changePassMsg')) $('#changePassMsg').textContent = '';
    openModal('#changePassModal');
  };
}

if ($('#btnSaveNewPassword')) {
  $('#btnSaveNewPassword').onclick = async () => {
    if (!sbClient) return;
    const newPass = $('#new_password').value.trim();
    const confirmPass = $('#confirm_new_password').value.trim();
    const msg = $('#changePassMsg');

    if (newPass.length < 6) {
      msg.style.color = '#cf1322';
      msg.textContent = 'Mật khẩu mới phải có tối thiểu 6 ký tự!';
      return;
    }
    if (newPass !== confirmPass) {
      msg.style.color = '#cf1322';
      msg.textContent = 'Mật khẩu xác nhận không khớp!';
      return;
    }

    msg.style.color = '#096dd9';
    msg.textContent = 'Đang lưu mật khẩu mới...';

    const { error } = await sbClient.auth.updateUser({ password: newPass });
    if (error) {
      msg.style.color = '#cf1322';
      msg.textContent = 'Lỗi: ' + error.message;
    } else {
      msg.style.color = '#389e0d';
      msg.textContent = '🎉 Đổi mật khẩu thành công!';
      setTimeout(() => {
        closeModal('#changePassModal');
        msg.textContent = '';
      }, 1600);
    }
  };
}

if (sbClient) {
  sbClient.auth.onAuthStateChange(async (event) => {
    if (event === "PASSWORD_RECOVERY") {
      openModal('#changePassModal');
      const msg = $('#changePassMsg');
      if (msg) {
        msg.style.color = '#096dd9';
        msg.textContent = 'Vui lòng nhập mật khẩu mới của bạn bên dưới.';
      }
    }
  });
}

// ====== NÂNG CẤP VIP & THANH TOÁN ======
function handleUpgradeClick() {
  if (!currentUser) {
    alert("Vui lòng đăng nhập hoặc đăng ký tài khoản trước khi quét mã nâng cấp!");
    openModal('#authModal');
    return;
  }

  const userCode = currentUser.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const memo = 'TD' + userCode;
  const qrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-compact2.png?amount=${VIP_PRICE}&addInfo=${memo}&accountName=${encodeURIComponent(ACCOUNT_NAME)}`;
  
  if ($('#qrImg')) $('#qrImg').src = qrUrl;
  if ($('#qrNotice')) {
    $('#qrNotice').innerHTML = `
      <div style="font-size:15px; margin-bottom:6px;">Số tiền: <b style="color:#d4380d;">10.000đ</b></div>
      <div style="font-size:13px; color:#555;">Nội dung chuyển khoản (bắt buộc):</div>
      <div style="display:inline-block; margin-top:5px; font-size:16px; font-weight:bold; color:#0958d9; background:#e6f4ff; border:1px dashed #91caff; padding:4px 14px; border-radius:6px; letter-spacing:1px;">
        ${memo}
      </div>
    `;
  }
  
  openModal('#payModal');
  listenPayment(currentUser.id);
}

if ($('#upgradeBtn')) $('#upgradeBtn').onclick = handleUpgradeClick;

function listenPayment(userId) {
  if (!sbClient) return;

  sbClient
    .channel('payment_realtime_' + userId)
    .on('postgres_changes', { 
      event: 'UPDATE', 
      schema: 'public', 
      table: 'profiles', 
      filter: `id=eq.${userId}` 
    }, payload => {
      if (payload.new && payload.new.is_paid) {
        onVipActivated();
      }
    })
    .subscribe();

  if (checkPaymentInterval) clearInterval(checkPaymentInterval);
  checkPaymentInterval = setInterval(async () => {
    try {
      const { data: profile } = await sbClient.from('profiles').select('is_paid').eq('id', userId).single();
      if (profile && profile.is_paid) {
        clearInterval(checkPaymentInterval);
        onVipActivated();
      }
    } catch (e) {
      console.warn("Đang đợi xác nhận tiền vào...", e);
    }
  }, 3000);
}

function onVipActivated() {
  if (checkPaymentInterval) clearInterval(checkPaymentInterval);
  closeModal('#payModal');
  alert("🎉 Chúc mừng! Tài khoản của bạn đã được kích hoạt VIP trọn đời thành công!");
  location.reload();
}

// ====== TRỢ LÝ SOẠN THẢO BÀI VIẾT ======
if ($('#writerBtn')) {
  $('#writerBtn').onclick = () => {
    openModal('#writerModal');
    updateWriterSuggestions();
  };
}

let writerDebounce = null;
if ($('#writerInput')) {
  $('#writerInput').oninput = () => {
    clearTimeout(writerDebounce);
    writerDebounce = setTimeout(updateWriterSuggestions, 300);
  };
}

function updateWriterSuggestions() {
  const inputEl = $('#writerInput');
  const suggBox = $('#writerSuggestions');
  const countEl = $('#writerMatchCount');
  if (!inputEl || !suggBox) return;

  const text = norm(inputEl.value);
  if (!text) {
    if (countEl) countEl.textContent = '0';
    suggBox.innerHTML = '<div style="color:#888; font-size:13px; text-align:center; padding:30px 10px;">Hãy gõ từ hoặc câu vào ô soạn thảo bên trái để nhận gợi ý từ vựng phù hợp.</div>';
    return;
  }

  const wordsInText = text.split(/[\s,.\?!;:\n\r\t]+/).filter(w => w.length >= 2);
  if (wordsInText.length === 0) return;

  let matched = [];
  let seen = new Set();

  data.forEach(item => {
    const m = norm(item.mong), v = norm(item.viet);
    const hasMatch = wordsInText.some(w => m.includes(w) || v.includes(w) || w.includes(m) || w.includes(v));
    if (hasMatch && !seen.has(item.mong + '_' + item.viet)) {
      seen.add(item.mong + '_' + item.viet);
      matched.push(item);
    }
  });

  if (countEl) countEl.textContent = matched.length;

  if (matched.length === 0) {
    suggBox.innerHTML = '<div style="color:#888; font-size:13px; text-align:center; padding:20px 10px;">Không tìm thấy từ vựng trùng khớp trực tiếp trong từ điển.</div>';
    return;
  }

  suggBox.innerHTML = matched.slice(0, 15).map(it => {
    const audioData = it.audio ? esc(it.audio) : '';
    return `
      <div style="background:#fff; border:1px solid #e8e8e8; border-radius:6px; padding:8px; font-size:13px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <b style="color:#1d39c4;">${esc(it.mong)}</b>
          <div style="display:flex; gap:4px;">
            <button onclick="playAudio('${audioData}', '${esc(it.mong)}')" style="border:none; background:#e6f7ff; color:#0050b3; border-radius:4px; padding:2px 6px; cursor:pointer;" title="Phát âm">🔊</button>
            <button onclick="insertWordToWriter('${esc(it.mong)}')" style="border:none; background:#f6ffed; color:#389e0d; border-radius:4px; padding:2px 6px; cursor:pointer;" title="Chèn vào bài viết">+ Chèn</button>
          </div>
        </div>
        <div style="color:#555; margin-top:2px;">Nghĩa: <i>${esc(it.viet)}</i></div>
        ${it.example ? `<div style="color:#888; font-size:11px; margin-top:3px; background:#fafafa; padding:2px 4px; border-radius:3px;">VD: ${esc(it.example)}</div>` : ''}
      </div>
    `;
  }).join('');
}

window.insertWordToWriter = function(word) {
  const inputEl = $('#writerInput');
  if (!inputEl) return;
  inputEl.value = (inputEl.value.trim() ? inputEl.value + ' ' : '') + word;
  inputEl.focus();
  updateWriterSuggestions();
};

if ($('#btnClearWriter')) {
  $('#btnClearWriter').onclick = () => {
    if (confirm("Thầy có muốn xóa toàn bộ nội dung soạn thảo hiện tại?")) {
      $('#writerInput').value = '';
      updateWriterSuggestions();
    }
  };
}

if ($('#btnCopyWriter')) {
  $('#btnCopyWriter').onclick = () => {
    const inputEl = $('#writerInput');
    const msg = $('#writerCopyMsg');
    if (!inputEl || !inputEl.value.trim()) return alert("Vui lòng nhập nội dung trước khi sao chép!");
    navigator.clipboard.writeText(inputEl.value).then(() => {
      if (msg) {
        msg.textContent = '✓ Đã sao chép vào bộ nhớ tạm!';
        setTimeout(() => msg.textContent = '', 2000);
      }
    });
  };
}

if ($('#btnInsertTemplate')) {
  $('#btnInsertTemplate').onclick = () => {
    const templates = [
      "Nyob zoo sawv daws! (Xin chào tất cả mọi người!)",
      "Koj tuaj qhov twg tuaj? (Bạn từ đâu đến?)",
      "Kuv mus kawm ntawv. (Tôi đi học bài.)",
      "Hnub no huab cua zoo heev. (Hôm nay thời tiết rất đẹp.)",
      "Kuv hlub kuv tsev neeg heev. (Tôi rất yêu quý gia đình của mình.)"
    ];
    const sample = templates[Math.floor(Math.random() * templates.length)];
    const inputEl = $('#writerInput');
    if (inputEl) {
      inputEl.value = (inputEl.value.trim() ? inputEl.value + '\n' : '') + sample;
      updateWriterSuggestions();
    }
  };
}

// ====== HỆ THỐNG THU ÂM ======
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

function initVoiceRecorder(btnId, audioPreviewId, deleteBtnId, onFinish) {
  const btn = $(btnId);
  const audioPreview = $(audioPreviewId);
  const delBtn = $(deleteBtnId);
  if (!btn) return;

  btn.onclick = async () => {
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
          if (delBtn) delBtn.style.display = 'inline-block';
        };
      };

      recorder.start();
      btn.textContent = '⏹️ Đang thu... Bấm để Dừng';
      btn.style.background = '#ff4d4f';
      btn.style.color = '#fff';
    } catch (err) {
      console.error("Lỗi Micro:", err);
      alert("Không thể mở Microphone trên trình duyệt.");
    }
  };

  if (delBtn) {
    delBtn.onclick = () => {
      onFinish('');
      if (audioPreview) {
        audioPreview.src = '';
        audioPreview.style.display = 'none';
      }
      delBtn.style.display = 'none';
      btn.textContent = '🎙️ Bấm để Thu âm';
      btn.style.background = '#e6f7ff';
      btn.style.color = '#0050b3';
    };
  }
}

initVoiceRecorder('#btnRecordOwner', '#audioPreviewOwner', '#btnDeleteAudioOwner', b64 => { recordedBase64Admin = b64; });
initVoiceRecorder('#btnRecordContrib', '#audioPreviewContrib', '#btnDeleteAudioContrib', b64 => { recordedBase64Contrib = b64; });

// ====== TẢI DỮ LIỆU TỪ SUPABASE & GITHUB (TỰ ĐỘNG & ĐỒNG BỘ TOÀN BỘ) ======
async function loadExtras() { 
  let baseData = (typeof DICTIONARY !== 'undefined') ? [...DICTIONARY] : [];
  
  if (sbClient) {
    try {
      const { data: cloudWords, error } = await sbClient
        .from('words')
        .select('*')
        .order('id', { ascending: true })
        .limit(10000);

      if (!error && cloudWords && cloudWords.length > 0) {
        const existingKeys = new Set(baseData.map(item => norm(item.mong) + '|' + norm(item.viet)));
        cloudWords.forEach(cw => {
          const key = norm(cw.mong) + '|' + norm(cw.viet);
          if (!existingKeys.has(key)) {
            baseData.push(cw);
            existingKeys.add(key);
          }
        });
      }
    } catch (e) {
      console.warn("Lỗi tải từ Supabase:", e);
    }
  }
  
  data = baseData;
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
if ($('#loginBtn')) $('#loginBtn').onclick = () => {
  if ($('#btnBackToLogin')) $('#btnBackToLogin').click();
  openModal('#authModal');
};
if ($('#ownerBtn')) $('#ownerBtn').onclick = () => { openModal('#ownerModal'); loadPendingContributions(); };
if ($('#contribBtn')) $('#contribBtn').onclick = () => openModal('#contribModal');
$$('[data-close]').forEach(b => b.onclick = () => {
  closeModal('#' + b.dataset.close);
  if (b.dataset.close === 'payModal' && checkPaymentInterval) {
    clearInterval(checkPaymentInterval);
  }
});
window.onclick = e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; };

function field(prefix, id) { return $(prefix + '_' + id) ? $(prefix + '_' + id).value.trim() : ''; }

// Gửi đóng góp từ độc giả
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
    if ($('#btnDeleteAudioContrib')) $('#btnDeleteAudioContrib').style.display = 'none';
    recordedBase64Contrib = '';
    setTimeout(() => { closeModal('#contribModal'); if (msg) msg.textContent = ''; }, 2500);
  };
}

// Admin thêm từ trực tiếp -> LƯU VĨNH VIỄN VÀO SUPABASE
if ($('#ownerSave')) {
  $('#ownerSave').onclick = async () => {
    let mong = field('#o', 'mong'), viet = field('#o', 'viet');
    let msg = $('#ownerMsg');
    if (!mong || !viet) { 
      if (msg) { msg.style.color = '#cf1322'; msg.textContent = 'Vui lòng nhập tiếng Mông và nghĩa.'; }
      return; 
    }

    let newWord = { 
      mong: mong, 
      viet: viet, 
      initial: field('#o', 'initial'), 
      vowel: field('#o', 'vowel'), 
      tone: field('#o', 'tone'), 
      example: field('#o', 'example'), 
      source: field('#o', 'source') || 'Ban quản trị',
      audio: recordedBase64Admin || ''
    };

    if (msg) { msg.style.color = '#096dd9'; msg.textContent = 'Đang lưu từ mới lên hệ thống...'; }

    if (sbClient) {
      const { error } = await sbClient.from('words').insert([newWord]);
      if (error) {
        if (msg) { msg.style.color = '#cf1322'; msg.textContent = 'Lỗi lưu: ' + error.message; }
        return;
      }
    }

    ['mong', 'viet', 'initial', 'vowel', 'tone', 'example', 'source'].forEach(k => { if ($('#o_' + k)) $('#o_' + k).value = ''; });
    if ($('#audioPreviewOwner')) $('#audioPreviewOwner').style.display = 'none';
    if ($('#btnDeleteAudioOwner')) $('#btnDeleteAudioOwner').style.display = 'none';
    recordedBase64Admin = '';
    if (msg) { msg.style.color = '#389e0d'; msg.textContent = '🎉 Đã lưu từ mới vĩnh viễn vào hệ thống từ điển!'; }
    await loadExtras();
  };
}

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
    listEl.innerHTML = '<div style="color:red; text-align:center;">Lỗi tải danh sách đóng góp!</div>';
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

// Duyệt đóng góp -> LƯU VĨNH VIỄN VÀO SUPABASE
window.approveContrib = async function(id) {
  if (!sbClient) return;
  const { data: item } = await sbClient.from('contributions').select('*').eq('id', id).single();
  if (item) {
    await sbClient.from('words').insert([{
      mong: item.mong,
      viet: item.viet,
      initial: item.initial || '',
      vowel: item.vowel || '',
      tone: item.tone || '',
      example: item.example || '',
      source: 'Đóng góp bởi: ' + (item.author || 'Bạn đọc'),
      audio: item.audio || ''
    }]);

    await sbClient.from('contributions').update({ status: 'approved' }).eq('id', id);
    alert(`Đã duyệt và lưu từ "${item.mong}" vĩnh viễn vào từ điển!`);
    await loadExtras();
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
  $('#clearExtras').style.display = 'none';
}

if ($('#year')) $('#year').textContent = '2026';
loadExtras();
checkAuth();
