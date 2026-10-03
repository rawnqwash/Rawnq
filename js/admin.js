import { db, auth } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  addDoc, 
  deleteDoc,
  query,
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ============ التحقق من تسجيل الدخول ============
onAuthStateChanged(auth, (user) => {
  if (user) {
    // مسجل دخول → حدّث وقت النشاط واعرض المحتوى
    localStorage.setItem('rawnq_last_login', Date.now().toString());
    document.getElementById('authCheck').style.display = 'none';
    document.getElementById('mainContent').style.display = 'grid';
    initDashboard();
  } else {
    // مو مسجل → روح لصفحة الدخول
    window.location.href = 'login.html';
  }
});

// ============ تسجيل الخروج ============
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (confirm('تبي تسجل خروج؟')) {
    localStorage.removeItem('rawnq_last_login');
    await signOut(auth);
    window.location.href = 'login.html';
  }
});

// ============ التبويبات ============
const tabs = document.querySelectorAll('.nav-item');
const contents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('pageTitle');

const titles = {
  content: 'محتوى الصفحة',
  settings: 'الإعدادات'
};

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    tab.classList.add('active');
    document.getElementById(target + 'Tab').classList.add('active');
    pageTitle.textContent = titles[target];
  });
});

async function initDashboard() {
  await loadSettings();
  await loadContent();
}

// ============ Toast (رسائل) ============
const toast = document.getElementById('toast');
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// ============ الإعدادات ============
async function loadSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "general"));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      document.getElementById('whatsappInput').value = data.whatsapp || '';
      document.getElementById('adminPhoneInput').value = data.adminPhone || '';
    }
  } catch (error) {
    console.error(error);
    showToast('خطأ في تحميل الإعدادات', 'error');
  }
}

document.getElementById('settingsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await setDoc(doc(db, "settings", "general"), {
      whatsapp: document.getElementById('whatsappInput').value.trim(),
      adminPhone: document.getElementById('adminPhoneInput').value.trim()
    }, { merge: true });
    showToast('تم الحفظ بنجاح');
  } catch (error) {
    console.error(error);
    showToast('خطأ في الحفظ', 'error');
  }
});

// ============ الباقات ============
async function loadPackages() {
  const container = document.getElementById('packagesList');
  if (!container) return;
  try {
    const q = query(collection(db, "packages"), orderBy("order"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="loading">لا توجد باقات، اضغط "إضافة باقة"</div>';
      return;
    }
    
    let html = '';
    snapshot.forEach((docSnap) => {
      const pkg = docSnap.data();
      const features = (pkg.features || []).map(f => `<li>${f}</li>`).join('');
      html += `
        <div class="item-card">
          <h3>${pkg.name}</h3>
          <div class="item-price">${pkg.price} ريال</div>
          <ul class="item-features">${features}</ul>
          <div class="item-actions">
            <button class="btn-edit" onclick="editPackage('${docSnap.id}')">تعديل</button>
            <button class="btn-danger" onclick="deletePackage('${docSnap.id}')">حذف</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="loading">خطأ في التحميل</div>';
  }
}

const addPackageBtn = document.getElementById('addPackageBtn');
if (addPackageBtn) {
  addPackageBtn.addEventListener('click', () => {
    openPackageModal();
  });
}

window.editPackage = async function(id) {
  const docSnap = await getDoc(doc(db, "packages", id));
  if (docSnap.exists()) {
    openPackageModal(id, docSnap.data());
  }
};

window.deletePackage = async function(id) {
  if (!confirm('متأكد تبي تحذف الباقة؟')) return;
  try {
    await deleteDoc(doc(db, "packages", id));
    showToast('تم الحذف');
    renderPackagesInPreview();
  } catch (error) {
    showToast('خطأ في الحذف', 'error');
  }
};

function openPackageModal(id = null, data = {}) {
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = id ? 'تعديل الباقة' : 'إضافة باقة جديدة';
  
  const features = data.features || [''];
  
  document.getElementById('modalBody').innerHTML = `
    <form id="packageForm">
      <div class="form-group">
        <label>اسم الباقة</label>
        <input type="text" id="pkgName" value="${data.name || ''}" required>
      </div>
      <div class="form-group">
        <label>السعر (ريال)</label>
        <input type="number" id="pkgPrice" value="${data.price || ''}" required>
      </div>
      <div class="form-group">
        <label>المميزات</label>
        <div id="featuresContainer">
          ${features.map(f => `
            <div class="feature-input-row">
              <input type="text" class="feature-input" value="${f}" placeholder="أدخل ميزة">
              <button type="button" class="btn-remove-feature" onclick="this.parentElement.remove()">×</button>
            </div>
          `).join('')}
        </div>
        <button type="button" class="btn-add-feature" onclick="addFeatureInput()">+ إضافة ميزة</button>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">حفظ</button>
        <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
      </div>
    </form>
  `;
  
  modal.classList.add('show');
  
  document.getElementById('packageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const featuresInputs = document.querySelectorAll('#featuresContainer .feature-input');
    const features = Array.from(featuresInputs).map(i => i.value.trim()).filter(v => v);
    
    const packageData = {
      name: document.getElementById('pkgName').value.trim(),
      price: parseInt(document.getElementById('pkgPrice').value),
      features: features
    };
    
    // للإضافة الجديدة: ترتيب تلقائي (آخر عنصر)
    if (!id) {
      const allSnap = await getDocs(collection(db, "packages"));
      packageData.order = allSnap.size + 1;
    } else {
      // للتعديل: خله كما هو
      packageData.order = data.order || 1;
    }
    
    try {
      if (id) {
        await updateDoc(doc(db, "packages", id), packageData);
      } else {
        await addDoc(collection(db, "packages"), packageData);
      }
      showToast('تم الحفظ');
      closeModal();
      renderPackagesInPreview();
    } catch (error) {
      console.error(error);
      showToast('خطأ في الحفظ', 'error');
    }
  });
}

window.addFeatureInput = function() {
  const container = document.getElementById('featuresContainer');
  const row = document.createElement('div');
  row.className = 'feature-input-row';
  row.innerHTML = `
    <input type="text" class="feature-input" placeholder="أدخل ميزة">
    <button type="button" class="btn-remove-feature" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(row);
};

// ============ المنتجات ============
async function loadProducts() {
  const container = document.getElementById('productsList');
  if (!container) return;
  try {
    const q = query(collection(db, "products"), orderBy("order"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<div class="loading">لا توجد منتجات، اضغط "إضافة منتج"</div>';
      return;
    }
    
    let html = '';
    snapshot.forEach((docSnap) => {
      const product = docSnap.data();
      html += `
        <div class="item-card">
          <h3>${product.name}</h3>
          <p class="item-desc">${product.description || ''}</p>
          <div class="item-actions">
            <button class="btn-edit" onclick="editProduct('${docSnap.id}')">تعديل</button>
            <button class="btn-danger" onclick="deleteProduct('${docSnap.id}')">حذف</button>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div class="loading">خطأ في التحميل</div>';
  }
}

const addProductBtn = document.getElementById('addProductBtn');
if (addProductBtn) {
  addProductBtn.addEventListener('click', () => {
    openProductModal();
  });
}

window.editProduct = async function(id) {
  const docSnap = await getDoc(doc(db, "products", id));
  if (docSnap.exists()) {
    openProductModal(id, docSnap.data());
  }
};

window.deleteProduct = async function(id) {
  if (!confirm('متأكدة تبين تحذفين المنتج؟')) return;
  try {
    await deleteDoc(doc(db, "products", id));
    showToast('تم الحذف');
    renderProductsInPreview();
  } catch (error) {
    showToast('خطأ في الحذف', 'error');
  }
};

function openProductModal(id = null, data = {}) {
  const modal = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = id ? 'تعديل المنتج' : 'إضافة منتج جديد';
  
  document.getElementById('modalBody').innerHTML = `
    <form id="productForm">
      <div class="form-group">
        <label>اسم المنتج</label>
        <input type="text" id="prodName" value="${data.name || ''}" required>
      </div>
            <div class="form-group">
        <label>الوصف</label>
        <textarea id="prodDesc" required>${data.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label>صورة المنتج</label>
        <div class="image-upload-wrap">
          <div class="image-preview" id="imagePreview" style="${data.image ? `background-image:url('${data.image}')` : ''}">
            ${!data.image ? '<span>📷 لا توجد صورة</span>' : ''}
          </div>
          <input type="file" id="prodImageFile" accept="image/*" style="display:none;" capture="environment">
          <input type="hidden" id="prodImage" value="${data.image || ''}">
          <button type="button" class="btn-upload-image" onclick="document.getElementById('prodImageFile').click()">
            📸 اختر صورة من الجهاز
          </button>
        </div>
        <small>الصورة راح تتضغط تلقائياً لتصبح بحجم مناسب</small>
      </div>
      <div class="modal-actions">
        <button type="submit" class="btn-primary">حفظ</button>
        <button type="button" class="btn-secondary" onclick="closeModal()">إلغاء</button>
      </div>
    </form>
  `;
  
  modal.classList.add('show');
  
  // ربط رفع الصورة
  const fileInput = document.getElementById('prodImageFile');
  const preview = document.getElementById('imagePreview');
  const hiddenInput = document.getElementById('prodImage');
  
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار صورة فقط', 'error');
      return;
    }
    
    preview.innerHTML = '<span>⏳ جاري المعالجة...</span>';
    
    try {
      const compressedBase64 = await compressImage(file, 800, 0.7);
      hiddenInput.value = compressedBase64;
      preview.style.backgroundImage = `url('${compressedBase64}')`;
      preview.innerHTML = '';
      showToast('تم اختيار الصورة، اضغط حفظ');
    } catch (error) {
      console.error(error);
      showToast('خطأ في معالجة الصورة', 'error');
    }
  });
  
  document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const imageValue = document.getElementById('prodImage').value.trim();
    
    const productData = {
      name: document.getElementById('prodName').value.trim(),
      description: document.getElementById('prodDesc').value.trim(),
      image: imageValue
    };
    
    if (!id) {
      const allSnap = await getDocs(collection(db, "products"));
      productData.order = allSnap.size + 1;
    } else {
      productData.order = data.order || 1;
    }
    
    try {
      if (id) {
        await updateDoc(doc(db, "products", id), productData);
      } else {
        await addDoc(collection(db, "products"), productData);
      }
      showToast('تم الحفظ');
      closeModal();
      renderProductsInPreview();
    } catch (error) {
      console.error(error);
      showToast('خطأ في الحفظ', 'error');
    }
  });
}

// ============ Modal ============
window.closeModal = function() {
  document.getElementById('modal').classList.remove('show');
};

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target.id === 'modal') closeModal();
});
// ============ محتوى الصفحة (Live Preview Editor) ============
let contentData = {};
let editedFields = {};

async function loadContent() {
  try {
    // جلب كل بيانات المحتوى من Firebase
    const contentSnapshot = await getDocs(collection(db, "content"));
    contentData = {};
    contentSnapshot.forEach(docSnap => {
      contentData[docSnap.id] = docSnap.data();
    });
    
    renderPreview();
  } catch (error) {
    console.error(error);
    document.getElementById('previewFrame').innerHTML = 
      '<div class="preview-loading">خطأ في التحميل</div>';
  }
}

function getContent(section, field, defaultValue = '') {
  return (contentData[section] && contentData[section][field]) || defaultValue;
}

function renderPreview() {
  const frame = document.getElementById('previewFrame');
  
  // القيم الافتراضية
  const hero = {
    title: getContent('hero', 'title', 'نصل إليك لنمنح سيارتك<br>رونقها الذي تستحقه'),
    subtitle: getContent('hero', 'subtitle', 'غسيل سيارات متنقل في موقعك، اطلب الخدمة عبر الواتساب ونصل إليك أينما كنت'),
    video: getContent('hero', 'video', 'assets/hero-video.mp4')
  };
  
  const about = {
    tag: getContent('about', 'tag', 'معلومات عنا'),
    title: getContent('about', 'title', 'الجودة، السرعة، والراحة في خدمتك'),
    desc: getContent('about', 'desc', 'نقدم خدمة غسيل وتلميع سيارات متنقلة باستخدام مواد عالية الجودة والالتزام بالمواعيد وسرعة الوصول إلى موقع العميل'),
    video: getContent('about', 'video', 'assets/about-car.mp4'),
    mission_title: getContent('about', 'mission_title', 'رسالتنا'),
    mission_image: getContent('about', 'mission_image', 'assets/mission.jpg'),
    vision_title: getContent('about', 'vision_title', 'رؤيتنا'),
    vision_image: getContent('about', 'vision_image', 'assets/vision.jpg')
  };
  
  const services = {
    tag: getContent('services', 'tag', 'خدماتنا'),
    title: getContent('services', 'title', 'نحن متحمسون لإعادة البريق إلى سيارتك'),
    video: getContent('services', 'video', 'assets/service-main.mp4'),
    s1_name: getContent('services', 's1_name', 'تلميع خفيف'),
    s1_image: getContent('services', 's1_image', 'assets/service-polish.jpg'),
    s2_name: getContent('services', 's2_name', 'تنظيف المقاعد'),
    s2_image: getContent('services', 's2_image', 'assets/service-seats.jpg'),
    s3_name: getContent('services', 's3_name', 'تنظيف داخلي عميق'),
    s3_image: getContent('services', 's3_image', 'assets/service-deep.jpg'),
    s4_name: getContent('services', 's4_name', 'تنظيف خارجي فاخر'),
    s4_image: getContent('services', 's4_image', 'assets/service-exterior.jpg'),
    s5_name: getContent('services', 's5_name', 'حجز سريع'),
    s5_image: getContent('services', 's5_image', 'assets/service-booking.jpg')
  };
  
  const packagesHead = {
    title: getContent('packages_header', 'title', 'لمعان يليق بسيارتك بسعر يناسبك'),
    subtitle: getContent('packages_header', 'subtitle', 'جودة عالية وسعر يرضي الجميع')
  };
  
  const productsHead = {
    title: getContent('products_header', 'title', 'منتجاتنا للعناية بسيارتك')
  };
  
  const stats = {
    title: getContent('stats', 'title', 'تجارب عملائنا أكبر دليل على جودة خدماتنا'),
    stat1_num: getContent('stats', 'stat1_num', '1000+'),
    stat1_label: getContent('stats', 'stat1_label', 'عميل راضٍ'),
    stat2_num: getContent('stats', 'stat2_num', '4.9/5'),
    stat2_label: getContent('stats', 'stat2_label', 'متوسط تقييم العملاء'),
    stat3_num: getContent('stats', 'stat3_num', '98%'),
    stat3_label: getContent('stats', 'stat3_label', 'من العملاء يوصون بخدمات رونق')
  };
  
  const footer = {
    desc: getContent('footer', 'desc', 'نقدم خدمات غسيل سيارات سريعة وبأسعار معقولة وعالية الجودة للحفاظ على سيارتك في أفضل حالاتها.'),
    phone: getContent('footer', 'phone', '+966537795835'),
    address: getContent('footer', 'address', 'المقر الرياض، حي الملك سعود - المملكة العربية السعودية'),
    email: getContent('footer', 'email', '[email protected]')
  };
  
  frame.innerHTML = `
    <link rel="stylesheet" href="css/style.css">
    <div class="preview-content" dir="rtl">
      
      <!-- Hero -->
      <section class="hero">
        <div class="hero-decoration"></div>
        <div class="hero-top">
          <div class="hero-content">
            <h1 class="hero-title" data-editable data-section="hero" data-field="title">${hero.title}</h1>
          </div>
          <div class="hero-subtitle-wrap">
            <p class="hero-subtitle" data-editable data-section="hero" data-field="subtitle">${hero.subtitle}</p>
          </div>
        </div>
        <div class="hero-video-wrap" data-media data-section="hero" data-field="video">
          <button class="media-change-btn" onclick="changeMedia('hero','video','${hero.video}')">🎬 تغيير الفيديو</button>
          <video autoplay muted loop playsinline>
            <source src="${hero.video}" type="video/mp4">
          </video>
        </div>
      </section>

      <div class="section-divider"></div>

      <!-- About -->
      <section class="section about-section">
        <div class="about-card">
          <div class="about-container">
            <div class="about-content">
              <span class="section-tag" data-editable data-section="about" data-field="tag">${about.tag}</span>
              <h2 class="about-title" data-editable data-section="about" data-field="title">${about.title}</h2>
              <p class="about-desc" data-editable data-section="about" data-field="desc">${about.desc}</p>
              <div class="about-features">
                <div class="feature-box" data-media data-section="about" data-field="mission_image">
                  <button class="media-change-btn" onclick="changeMedia('about','mission_image','${about.mission_image}')">🖼️ تغيير</button>
                  <div class="feature-icon-wrap">
                    <img src="${about.mission_image}" alt="رسالتنا" onerror="this.style.background='#0A1E3F'">
                  </div>
                  <h3 data-editable data-section="about" data-field="mission_title">${about.mission_title}</h3>
                </div>
                <div class="feature-box" data-media data-section="about" data-field="vision_image">
                  <button class="media-change-btn" onclick="changeMedia('about','vision_image','${about.vision_image}')">🖼️ تغيير</button>
                  <div class="feature-icon-wrap">
                    <img src="${about.vision_image}" alt="رؤيتنا" onerror="this.style.background='#1560BD'">
                  </div>
                  <h3 data-editable data-section="about" data-field="vision_title">${about.vision_title}</h3>
                </div>
              </div>
            </div>
            <div class="about-image" data-media data-section="about" data-field="video">
              <button class="media-change-btn" onclick="changeMedia('about','video','${about.video}')">🎬 تغيير الفيديو</button>
              <video autoplay muted loop playsinline>
                <source src="${about.video}" type="video/mp4">
              </video>
            </div>
          </div>
        </div>
      </section>

      <!-- Services -->
      <section class="section services-section">
        <div class="services-grid">
          <div class="services-right">
            <div class="services-header">
              <span class="section-tag" data-editable data-section="services" data-field="tag">${services.tag}</span>
              <h2 class="services-title" data-editable data-section="services" data-field="title">${services.title}</h2>
            </div>
            <div class="services-cards-right">
              ${renderServiceCard(1, services.s1_name, services.s1_image)}
              ${renderServiceCard(2, services.s2_name, services.s2_image)}
              ${renderServiceCard(3, services.s3_name, services.s3_image, true)}
            </div>
          </div>
          <div class="services-center">
            <div class="service-image-card" data-media data-section="services" data-field="video">
              <button class="media-change-btn" onclick="changeMedia('services','video','${services.video}')">🎬 تغيير الفيديو</button>
              <video autoplay muted loop playsinline>
                <source src="${services.video}" type="video/mp4">
              </video>
            </div>
          </div>
          <div class="services-left">
            ${renderServiceCard(4, services.s4_name, services.s4_image)}
            ${renderServiceCard(5, services.s5_name, services.s5_image)}
          </div>
        </div>
      </section>

      <!-- Packages -->
      <section class="section packages-section">
        <div class="section-header">
          <h2 class="section-title-white" data-editable data-section="packages_header" data-field="title">${packagesHead.title}</h2>
          <p class="section-subtitle" data-editable data-section="packages_header" data-field="subtitle">${packagesHead.subtitle}</p>
        </div>
        <div class="packages-grid" id="previewPackagesGrid">
          <div style="text-align:center;color:#fff;padding:20px;grid-column:1/-1;">جاري التحميل...</div>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <button class="btn-add-item" onclick="openPackageModal()">+ إضافة باقة جديدة</button>
        </div>
      </section>

      <!-- Products -->
      <section class="section products-section">
        <h2 class="section-title" data-editable data-section="products_header" data-field="title">${productsHead.title}</h2>
        <div class="products-grid" id="previewProductsGrid">
          <div style="text-align:center;color:#888;padding:20px;grid-column:1/-1;">جاري التحميل...</div>
        </div>
        <div style="text-align:center;margin-top:30px;">
          <button class="btn-add-item" onclick="openProductModal()">+ إضافة منتج جديد</button>
        </div>
      </section>

      <!-- Stats -->
      <section class="section stats-section">
        <h2 class="section-title" data-editable data-section="stats" data-field="title">${stats.title}</h2>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-number" data-editable data-section="stats" data-field="stat1_num">${stats.stat1_num}</div>
            <div class="stat-label" data-editable data-section="stats" data-field="stat1_label">${stats.stat1_label}</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" data-editable data-section="stats" data-field="stat2_num">${stats.stat2_num}</div>
            <div class="stat-label" data-editable data-section="stats" data-field="stat2_label">${stats.stat2_label}</div>
          </div>
          <div class="stat-item">
            <div class="stat-number" data-editable data-section="stats" data-field="stat3_num">${stats.stat3_num}</div>
            <div class="stat-label" data-editable data-section="stats" data-field="stat3_label">${stats.stat3_label}</div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-container">
          <div class="footer-col footer-brand">
            <div class="logo">
              <div class="logo-text-wrap">
                <span class="logo-text">رونق</span>
                <span class="logo-en">RAWNQ</span>
              </div>
            </div>
            <p class="footer-desc" data-editable data-section="footer" data-field="desc">${footer.desc}</p>
          </div>
          <div class="footer-col">
            <h4>رابط سريع</h4>
            <ul>
              <li>من نحن</li>
              <li>خدماتنا</li>
              <li>العروض</li>
              <li>المنتجات</li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>يساعد</h4>
            <ul><li>اتصل بنا</li></ul>
          </div>
          <div class="footer-col">
            <h4>اتصال</h4>
            <p data-editable data-section="footer" data-field="phone">${footer.phone}</p>
            <p data-editable data-section="footer" data-field="address">${footer.address}</p>
            <p data-editable data-section="footer" data-field="email">${footer.email}</p>
          </div>
        </div>
      </footer>

    </div>
  `;
  
  attachEditableListeners();
  renderPackagesInPreview();
  renderProductsInPreview();
}

function renderServiceCard(num, name, image, dark = false) {
  return `
    <div class="service-card ${dark ? 'service-dark' : ''}">
      <div class="service-icon" data-media data-section="services" data-field="s${num}_image">
        <button class="media-change-btn" onclick="changeMedia('services','s${num}_image','${image}')">🖼️</button>
        <img src="${image}" alt="${name}" onerror="this.parentElement.innerHTML='✨'">
      </div>
      <h3 data-editable data-section="services" data-field="s${num}_name">${name}</h3>
    </div>
  `;
}

function attachEditableListeners() {
  document.querySelectorAll('[data-editable]').forEach(el => {
    el.setAttribute('contenteditable', 'true');
    el.addEventListener('input', () => {
      const section = el.dataset.section;
      const field = el.dataset.field;
      const value = el.innerHTML;
      
      if (!editedFields[section]) editedFields[section] = {};
      editedFields[section][field] = value;
      
      el.classList.add('edited');
      document.getElementById('saveAllBtn').classList.add('has-changes');
    });
  });
}

window.changeMedia = function(section, field, currentValue) {
  showToast('تعديل الصور والفيديو من مجلد assets يدوياً فقط', 'error');
};

// زر الحفظ الكلي
document.getElementById('saveAllBtn').addEventListener('click', async () => {
  if (Object.keys(editedFields).length === 0) {
    showToast('لا توجد تغييرات للحفظ', 'error');
    return;
  }
  
  const btn = document.getElementById('saveAllBtn');
  btn.disabled = true;
  btn.textContent = 'جاري الحفظ...';
  
  try {
    for (const section in editedFields) {
      await setDoc(doc(db, "content", section), editedFields[section], { merge: true });
      // تحديث النسخة المحلية
      if (!contentData[section]) contentData[section] = {};
      Object.assign(contentData[section], editedFields[section]);
    }
    
    editedFields = {};
    document.querySelectorAll('.edited').forEach(el => el.classList.remove('edited'));
    btn.classList.remove('has-changes');
    showToast('✅ تم حفظ جميع التغييرات');
  } catch (error) {
    console.error(error);
    showToast('❌ خطأ في الحفظ', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 حفظ جميع التغييرات';
  }
});

// ============ عرض الباقات في المعاينة ============
async function renderPackagesInPreview() {
  const container = document.getElementById('previewPackagesGrid');
  if (!container) return;
  
  try {
    const q = query(collection(db, "packages"), orderBy("order"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<div style="text-align:center;color:#fff;padding:20px;grid-column:1/-1;">لا توجد باقات</div>';
      return;
    }
    
    const docs = [];
    snapshot.forEach(docSnap => docs.push({ id: docSnap.id, data: docSnap.data() }));
    
    let html = '';
    docs.forEach((item, index) => {
      const pkg = item.data;
      const featuresHtml = (pkg.features || []).map(f => `<li>${f}</li>`).join('');
      const featuredClass = (index === 1) ? 'featured' : '';
      
      html += `
        <div class="package-card ${featuredClass}" data-pkg-id="${item.id}">
          <div class="item-manage-toolbar">
            <span class="drag-handle" title="اسحب للترتيب">⋮⋮</span>
            <button class="btn-edit-item" onclick="editPackage('${item.id}')" title="تعديل">✏️</button>
            <button class="btn-delete-item" onclick="deletePackage('${item.id}')" title="حذف">🗑️</button>
          </div>
          <h3 class="package-name">${pkg.name}</h3>
          <ul class="package-features">${featuresHtml}</ul>
          <div class="package-price">${pkg.price} <span class="package-currency">ريال</span></div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div style="text-align:center;color:#fff;padding:20px;grid-column:1/-1;">خطأ في التحميل</div>';
  }
      enableDragDrop(container, 'packages');
}

// ============ عرض المنتجات في المعاينة ============
async function renderProductsInPreview() {
  const container = document.getElementById('previewProductsGrid');
  if (!container) return;
  
  try {
    const q = query(collection(db, "products"), orderBy("order"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;grid-column:1/-1;">لا توجد منتجات</div>';
      return;
    }
    
    let html = '';
    snapshot.forEach(docSnap => {
      const product = docSnap.data();
      const imageStyle = product.image 
        ? `background-image: url('${product.image}')` 
        : 'background: linear-gradient(135deg,#0A1E3F,#1560BD)';
      
      html += `
        <div class="product-card" data-prod-id="${docSnap.id}">
          <div class="item-manage-toolbar">
            <span class="drag-handle" title="اسحب للترتيب">⋮⋮</span>
            <button class="btn-edit-item" onclick="editProduct('${docSnap.id}')" title="تعديل">✏️</button>
            <button class="btn-delete-item" onclick="deleteProduct('${docSnap.id}')" title="حذف">🗑️</button>
          </div>
          <div class="product-image" style="${imageStyle}"></div>
          <div class="product-info">
            <h3 class="product-name">${product.name}</h3>
            <p class="product-description">${product.description}</p>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (error) {
    console.error(error);
    container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;grid-column:1/-1;">خطأ في التحميل</div>';
  }
      enableDragDrop(container, 'products');
}

// ============ السحب والإفلات لترتيب العناصر ============
function enableDragDrop(container, collectionName) {
  const cards = container.querySelectorAll('[data-pkg-id], [data-prod-id]');
  let draggedItem = null;
  
  cards.forEach(card => {
    card.setAttribute('draggable', 'true');
    
    card.addEventListener('dragstart', (e) => {
      draggedItem = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedItem = null;
    });
    
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = container.querySelector('.dragging');
      if (dragging && dragging !== card) {
        const rect = card.getBoundingClientRect();
        const middle = rect.left + rect.width / 2;
        if (e.clientX > middle) {
          card.parentNode.insertBefore(dragging, card);
        } else {
          card.parentNode.insertBefore(dragging, card.nextSibling);
        }
      }
    });
    
    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      await saveNewOrder(container, collectionName);
    });
  });
}

async function saveNewOrder(container, collectionName) {
  try {
    const cards = container.querySelectorAll('[data-pkg-id], [data-prod-id]');
    const idAttr = collectionName === 'packages' ? 'data-pkg-id' : 'data-prod-id';
    
    for (let i = 0; i < cards.length; i++) {
      const id = cards[i].getAttribute(idAttr);
      if (id) {
        await updateDoc(doc(db, collectionName, id), { order: i + 1 });
      }
    }
    
    showToast('تم حفظ الترتيب');
    if (collectionName === 'packages') {
      renderPackagesInPreview();
    } else {
      renderProductsInPreview();
    }
  } catch (error) {
    console.error(error);
    showToast('خطأ في حفظ الترتيب', 'error');
  }
}
// ============ نجعل openPackageModal و openProductModal متاحين globally ============
window.openPackageModal = openPackageModal;
window.openProductModal = openProductModal;

// ============ دالة ضغط الصور قبل الرفع ============
function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // حساب الأبعاد الجديدة
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }
        
        // رسم الصورة المضغوطة
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // تحويل لـ Base64
        const base64 = canvas.toDataURL('image/jpeg', quality);
        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}