import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-firestore.js";

// إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyAYj5wYf4-Ot4AEjQ9bdxBP7O20YcUgvVg",
    authDomain: "project-ef0e4.firebaseapp.com",
    projectId: "project-ef0e4",
    storageBucket: "project-ef0e4.firebasestorage.app",
    messagingSenderId: "723951659624",
    appId: "1:723951659624:web:869d6c5d5b39c31f7a29dd"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// إدارة الحالة
let isOwner = localStorage.getItem('isOwner') === 'true';
let userName = localStorage.getItem('userName') || '';
let currentReply = null;
const guestId = localStorage.getItem('guestId') || 'gid_' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('guestId', guestId);

// --- 1. منطق الصفحة الرئيسية (فتح المودال) ---
const openBtn = document.getElementById('openChatBtn');
if(openBtn) {
    openBtn.onclick = () => {
        if(!userName && !isOwner) {
            const name = prompt("من فضلك ادخل اسمك:");
            if(name) { userName = name; localStorage.setItem('userName', name); } else return;
        }
        document.getElementById('chatModal').style.display = 'block';
    };
}
if(document.getElementById('closeModal')) {
    document.getElementById('closeModal').onclick = () => document.getElementById('chatModal').style.display = 'none';
}

// --- 2. الوضع الليلي (Dark Mode) ---
const nightBtn = document.getElementById('nightModeBtn');
if(nightBtn) {
    nightBtn.onclick = () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    };
}
if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark-mode');

// --- 3. نظام البحث في الرسائل ---
const searchToggle = document.getElementById('searchToggleBtn');
const searchInput = document.getElementById('searchInput');
if(searchToggle) {
    searchToggle.onclick = () => document.getElementById('searchBar').classList.toggle('active');
}
if(searchInput) {
    searchInput.oninput = () => {
        const val = searchInput.value.toLowerCase();
        document.querySelectorAll('.msg-container').forEach(m => {
            const txt = m.querySelector('.text-content').innerText.toLowerCase();
            m.style.display = txt.includes(val) ? 'flex' : 'none';
        });
    };
}

// --- 4. إرسال الرسائل ونظام المالك ---
const msgInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const container = document.getElementById('messagesContainer');

if(sendBtn) {
    sendBtn.onclick = async () => {
        const text = msgInput.value.trim();
        if(!text) return;

        // التحقق من نقل الملكية
        if(text === ".انا المالك") {
            if(prompt("كلمة السر:") === "1000Kms1000#") {
                localStorage.setItem('isOwner', 'true');
                location.reload();
            }
            return;
        }

        await addDoc(collection(db, "messages"), {
            text, sender: isOwner ? "kaream" : userName,
            guestId, isOwner, timestamp: new Date(),
            replyTo: currentReply,
            threadId: isOwner && currentReply ? currentReply.guestId : guestId
        });
        msgInput.value = '';
        currentReply = null;
        document.getElementById('replyPreview').style.display = 'none';
    };
}

// --- 5. استقبال الرسائل وتحديث الشاشة ---
if(container) {
    const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
    onSnapshot(q, (snap) => {
        container.innerHTML = '';
        snap.docs.slice(-100).forEach(d => {
            const data = d.data();
            if(!isOwner && data.guestId !== guestId && data.threadId !== guestId) return;

            const div = document.createElement('div');
            div.className = 'msg-container';
            div.innerHTML = `
                <div class="bubble ${data.isOwner ? 'owner' : ''}">
                    ${data.replyTo ? `<div style="font-size:10px; opacity:0.7; border-bottom:1px solid #ddd; margin-bottom:5px;">رداً على: ${data.replyTo.text}</div>` : ''}
                    <span class="sender-name">${data.sender}</span>
                    <div class="text-content">${data.text}</div>
                </div>
            `;
            // تفعيل قائمة الخيارات عند الضغط بيمين الماوس أو ضغطة مطولة
            div.oncontextmenu = (e) => showMenu(e, d.id, data);
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    });
}

// --- 6. وظيفة القائمة المنبثقة مع معالجة الخروج عن حدود الشاشة ---
function showMenu(e, id, data) {
    e.preventDefault();
    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';

    let x = e.clientX;
    let y = e.clientY;

    // الحصول على عرض وطول القائمة الفعلي
    const menuWidth = menu.offsetWidth || 140;
    const menuHeight = menu.offsetHeight || 120;

    // إذا كانت القائمة ستخرج من جهة اليمين، اسحبها لليسار
    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 10;
    }
    
    // إذا كانت القائمة ستخرج من جهة الأسفل، اسحبها للأعلى
    if (y + menuHeight > window.innerHeight) {
        y = window.innerHeight - menuHeight - 10;
    }

    // تأكد أن القائمة لا تخرج من اليسار أو الأعلى أيضاً (في الشاشات الصغيرة جداً)
    if (x < 10) x = 10;
    if (y < 10) y = 10;

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    // إعداد أزرار القائمة
    document.getElementById('menuReply').onclick = () => {
        currentReply = { text: data.text, guestId: data.guestId, sender: data.sender };
        const preview = document.getElementById('replyPreview');
        preview.style.display = 'flex';
        document.getElementById('replyText').innerText = data.text;
        document.getElementById('replyUser').innerText = data.sender;
        menu.style.display = 'none';
    };

    document.getElementById('menuDelete').onclick = () => {
        // السماح بالمسح للمالك دائماً، وللضيف في رسائله فقط
        if (isOwner || !data.isOwner) {
            deleteDoc(doc(db, "messages", id));
        }
        menu.style.display = 'none';
    };
    
    // إخفاء خيار الحظر عن الضيوف
    const blockBtn = document.getElementById('menuBlock');
    if (blockBtn) blockBtn.style.display = isOwner ? 'block' : 'none';
}

// إغلاق القائمة عند الضغط في أي مكان آخر
window.onclick = () => { 
    const menu = document.getElementById('contextMenu');
    if(menu) menu.style.display = 'none'; 
};

// وظيفة إلغاء الرد
const cancelReplyBtn = document.getElementById('cancelReplyBtn');
if (cancelReplyBtn) {
    cancelReplyBtn.onclick = () => {
        currentReply = null;
        document.getElementById('replyPreview').style.display = 'none';
    };
}
