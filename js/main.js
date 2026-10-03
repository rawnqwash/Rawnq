// ============ Splash Screen - تحميل حقيقي للمحتوى ============
document.body.classList.add('loading');

const progressBar = document.getElementById('progressBar');
let loadedCount = 0;
let totalAssets = 0;

function updateProgress() {
  if (totalAssets === 0) return;
  const percent = Math.min((loadedCount / totalAssets) * 100, 100);
  if (progressBar) progressBar.style.width = percent + '%';
}

function hideSplash() {
  const splash = document.getElementById('splashScreen');
  if (splash) {
    splash.classList.add('hidden');
    setTimeout(() => {
      splash.style.display = 'none';
      document.body.classList.remove('loading');
    }, 600);
  }
}

// تحميل كل الصور والفيديوهات في الصفحة
function preloadAllAssets() {
  return new Promise((resolve) => {
    const images = document.querySelectorAll('img');
    const videos = document.querySelectorAll('video');
    
    totalAssets = images.length + videos.length;
    
    if (totalAssets === 0) {
      resolve();
      return;
    }
    
    const assetLoaded = () => {
      loadedCount++;
      updateProgress();
      if (loadedCount >= totalAssets) {
        resolve();
      }
    };
    
    // تحميل الصور
    images.forEach(img => {
      if (img.complete && img.naturalWidth > 0) {
        assetLoaded();
      } else {
        img.addEventListener('load', assetLoaded, { once: true });
        img.addEventListener('error', assetLoaded, { once: true });
      }
    });
    
    // تحميل الفيديوهات
    videos.forEach(video => {
      if (video.readyState >= 3) {
        assetLoaded();
      } else {
        video.addEventListener('loadeddata', assetLoaded, { once: true });
        video.addEventListener('error', assetLoaded, { once: true });
      }
    });
    
    // كحد أقصى 15 ثانية
    setTimeout(resolve, 15000);
  });
}

// حد أدنى 2 ثانية عشان شاشة التحميل ما تختفي بسرعة
// انتظار كل شي: الصور + الفيديوهات + Firebase + حد أدنى 2 ثانية
Promise.all([
  preloadAllAssets(),
  loadSettings(),
  loadPageContent(),
  loadPackages(),
  loadProducts(),
  new Promise(resolve => setTimeout(resolve, 2000))
]).then(() => {
  if (progressBar) progressBar.style.width = '100%';
  // انتظر نصف ثانية إضافية عشان الصور الجديدة تظهر
  setTimeout(hideSplash, 500);
});
// main.js
import { db } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  query,
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ============ تحميل الإعدادات (رقم الواتساب) ============
async function loadSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", "general"));
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      
      const whatsappBtn = document.getElementById('whatsappBtn');
      if (whatsappBtn && data.whatsapp) {
        whatsappBtn.href = `https://wa.me/${data.whatsapp}`;
      }
      
      window.whatsappNumber = data.whatsapp;
    }
  } catch (error) {
    console.error("خطأ في تحميل الإعدادات:", error);
  }
}

// ============ تحميل محتوى الصفحة من Firebase ============
async function loadPageContent() {
  try {
    const contentSnapshot = await getDocs(collection(db, "content"));
    const contentData = {};
    contentSnapshot.forEach(docSnap => {
      contentData[docSnap.id] = docSnap.data();
    });
    
    // Hero
    if (contentData.hero) {
      const heroTitle = document.getElementById('heroTitle');
      const heroSubtitle = document.getElementById('heroSubtitle');
      if (heroTitle && contentData.hero.title) heroTitle.innerHTML = contentData.hero.title;
      if (heroSubtitle && contentData.hero.subtitle) heroSubtitle.innerHTML = contentData.hero.subtitle;
      
      if (contentData.hero.video) {
        const heroVideo = document.querySelector('.hero-video source');
        if (heroVideo) {
          heroVideo.src = contentData.hero.video;
          heroVideo.parentElement.load();
        }
      }
    }
    
    // About
    if (contentData.about) {
      updateBySelector('.about-section .section-tag', contentData.about.tag);
      updateBySelector('.about-title', contentData.about.title);
      updateBySelector('.about-desc', contentData.about.desc);
      updateBySelector('.feature-box:nth-child(1) h3', contentData.about.mission_title);
      updateBySelector('.feature-box:nth-child(2) h3', contentData.about.vision_title);
      updateImage('.feature-box:nth-child(1) .feature-icon-wrap img', contentData.about.mission_image);
      updateImage('.feature-box:nth-child(2) .feature-icon-wrap img', contentData.about.vision_image);
      updateVideo('.about-image video source', contentData.about.video);
    }
    
    // Services
    if (contentData.services) {
      updateBySelector('.services-section .section-tag', contentData.services.tag);
      updateBySelector('.services-title', contentData.services.title);
      updateVideo('.service-image-card video source', contentData.services.video);
      
      // 5 خدمات
      const serviceCards = document.querySelectorAll('.services-cards-right .service-card, .services-left .service-card');
      const serviceKeys = ['s1', 's2', 's3', 's4', 's5'];
      serviceCards.forEach((card, i) => {
        const key = serviceKeys[i];
        if (!key) return;
        const nameEl = card.querySelector('h3');
        const imgEl = card.querySelector('.service-icon img');
        if (nameEl && contentData.services[key + '_name']) {
          nameEl.textContent = contentData.services[key + '_name'];
        }
        if (imgEl && contentData.services[key + '_image']) {
          imgEl.src = contentData.services[key + '_image'];
        }
      });
    }
    
    // Packages Header
    if (contentData.packages_header) {
      updateBySelector('.packages-section .section-title-white', contentData.packages_header.title);
      updateBySelector('.packages-section .section-subtitle', contentData.packages_header.subtitle);
    }
    
    // Products Header
    if (contentData.products_header) {
      updateBySelector('.products-section .section-title', contentData.products_header.title);
    }
    
    // Stats
    if (contentData.stats) {
      updateBySelector('.stats-section .section-title', contentData.stats.title);
      const statItems = document.querySelectorAll('.stat-item');
      const statKeys = ['stat1', 'stat2', 'stat3'];
      statItems.forEach((item, i) => {
        const key = statKeys[i];
        if (!key) return;
        const numEl = item.querySelector('.stat-number');
        const labelEl = item.querySelector('.stat-label');
        if (numEl && contentData.stats[key + '_num']) numEl.textContent = contentData.stats[key + '_num'];
        if (labelEl && contentData.stats[key + '_label']) labelEl.textContent = contentData.stats[key + '_label'];
      });
    }
    
    // Footer
    if (contentData.footer) {
      updateBySelector('.footer-desc', contentData.footer.desc);
      const footerCol = document.querySelector('.footer-col:last-child');
      if (footerCol) {
        const paragraphs = footerCol.querySelectorAll('p');
        if (paragraphs[0] && contentData.footer.phone) paragraphs[0].textContent = contentData.footer.phone;
        if (paragraphs[1] && contentData.footer.address) paragraphs[1].textContent = contentData.footer.address;
        if (paragraphs[2] && contentData.footer.email) paragraphs[2].textContent = contentData.footer.email;
      }
    }
    
  } catch (error) {
    console.error("خطأ في تحميل المحتوى:", error);
  }
}

function updateBySelector(selector, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.innerHTML = value;
}

function updateImage(selector, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) el.src = value;
}

function updateVideo(selector, value) {
  if (!value) return;
  const el = document.querySelector(selector);
  if (el) {
    el.src = value;
    el.parentElement.load();
  }
}

// ============ فتح واتساب من زر اطلب الآن ============
window.openWhatsApp = function(message = '') {
  const num = window.whatsappNumber || '966537795835';
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  window.open(`https://wa.me/${num}${text}`, '_blank');
};

// ============ تحميل الباقات ============
async function loadPackages() {
  const container = document.getElementById('packagesGrid');
  try {
    const q = query(collection(db, "packages"), orderBy("order"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<p style="color:white;text-align:center;">لا توجد باقات حالياً</p>';
      return;
    }
    
    let html = '';
    snapshot.forEach((doc) => {
      const pkg = doc.data();
      const featuresHtml = (pkg.features || []).map(f => `<li>${f}</li>`).join('');
      const featuredClass = pkg.featured ? 'featured' : '';
      
      html += `
        <div class="package-card ${featuredClass}">
          <h3 class="package-name">${pkg.name}</h3>
          <ul class="package-features">${featuresHtml}</ul>
          <div class="package-price">${pkg.price} <span class="package-currency">ريال</span></div>
          <button class="btn-book" onclick="openWhatsApp('السلام عليكم، أبي أحجز ${pkg.name}')">احجز الآن</button>
        </div>
      `;
    });
    
    container.innerHTML = html;
  } catch (error) {
    console.error("خطأ في تحميل الباقات:", error);
    container.innerHTML = '<p style="color:white;text-align:center;">حدث خطأ في التحميل</p>';
  }
}

// ============ تحميل المنتجات ============
async function loadProducts() {
  const container = document.getElementById('productsGrid');
  try {
    const q = query(collection(db, "products"), orderBy("order"));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      container.innerHTML = '<p style="text-align:center;">لا توجد منتجات حالياً</p>';
      return;
    }
    
    let html = '';
    snapshot.forEach((doc) => {
      const product = doc.data();
      const imageStyle = product.image 
        ? `background-image: url('${product.image}')` 
        : 'background: #ddd';
      
      html += `
        <div class="product-card">
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
    console.error("خطأ في تحميل المنتجات:", error);
    container.innerHTML = '<p style="text-align:center;">حدث خطأ في التحميل</p>';
  }
}
