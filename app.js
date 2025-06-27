// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.0/firebase-app.js";
import { 
  getDatabase, 
  ref, 
  set, 
  push, 
  onValue, 
  remove, 
  update, 
  get,
  off,
  query,
  orderByChild,
  limitToLast
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-database.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/9.6.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCJ4VhGD49H3RNifMf9VCRPnkALAxNpsOU",
  authDomain: "project-2980864980936907935.firebaseapp.com",
  databaseURL: "https://project-2980864980936907935-default-rtdb.firebaseio.com",
  projectId: "project-2980864980936907935",
  storageBucket: "project-2980864980936907935.appspot.com",
  messagingSenderId: "580110751353",
  appId: "1:580110751353:web:8f039f9b34e1709d4126a8",
  measurementId: "G-R3JNPHCFZG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// State management
const state = {
  currentUser: null,
  currentUserType: null,
  barbers: {},
  queueListeners: {},
  barbersListener: null,
  currentRating: null,
  currentClientToRate: null,
  barberRating: null,
  barberRatingsListener: null
};

// DOM elements
const elements = {
  screens: {
    roleSelection: document.getElementById('roleSelection'),
    clientLogin: document.getElementById('clientLogin'),
    barberLogin: document.getElementById('barberLogin'),
    clientDashboard: document.getElementById('clientDashboard'),
    barberDashboard: document.getElementById('barberDashboard')
  },
  client: {
    name: document.getElementById('clientName'),
    phone: document.getElementById('clientPhone'),
    error: document.getElementById('clientError'),
    avatar: document.getElementById('clientAvatar'),
    bookingContainer: document.getElementById('currentBookingContainer'),
    bookingBarber: document.getElementById('bookingBarber'),
    bookingPosition: document.getElementById('bookingPosition'),
    bookingTime: document.getElementById('bookingTime'),
    cancelBookingBtn: document.getElementById('cancelBookingBtn'),
    barbersList: document.getElementById('barbersList'),
    citySearch: document.getElementById('citySearch')
  },
  barber: {
    phone: document.getElementById('barberPhone'),
    password: document.getElementById('barberPassword'),
    name: document.getElementById('barberName'),
    newPhone: document.getElementById('newBarberPhone'),
    city: document.getElementById('barberCity'),
    location: document.getElementById('barberLocation'),
    newPassword: document.getElementById('newBarberPassword'),
    confirmPassword: document.getElementById('confirmBarberPassword'),
    error: document.getElementById('barberError'),
    avatar: document.getElementById('barberAvatar'),
    queue: document.getElementById('barberQueue'),
    statusToggle: document.getElementById('statusToggle'),
    statusText: document.getElementById('statusText'),
    formTitle: document.getElementById('barberFormTitle'),
    loginForm: document.getElementById('barberLoginForm'),
    signupForm: document.getElementById('barberSignupForm'),
    ratingContainer: document.getElementById('barberRatingContainer'),
    ratingStars: document.querySelectorAll('#barberRatingContainer .stars i'),
    ratingComment: document.getElementById('barberRatingComment'),
    averageRating: document.getElementById('barberAverageRating'),
    ratingCount: document.getElementById('barberRatingCount'),
    recentRatings: document.getElementById('barberRecentRatings')
  },
  rating: {
    container: document.getElementById('ratingContainer'),
    stars: document.querySelectorAll('.stars i'),
    comment: document.getElementById('ratingComment')
  }
};

// Utility functions
const utils = {
  generateId: () => 'id-' + Math.random().toString(36).substr(2, 9),
  
  showError: (element, message) => {
    element.textContent = message;
    element.classList.remove('hidden');
    setTimeout(() => element.classList.add('hidden'), 5000);
  },
  
  validatePhone: (phone) => /^[0-9]{10,15}$/.test(phone),
  
  clearForm: (formElements) => {
    Object.values(formElements).forEach(element => {
      if (element && element.value) element.value = '';
    });
  },
  
  debounce: (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  },
  
  adjustLayoutForMobile: () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    
    const roleSelection = document.getElementById('roleSelection');
    const loginContainers = document.querySelectorAll('.login-container');
    const dashboards = document.querySelectorAll('.dashboard');
    
    if (roleSelection) {
      roleSelection.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    }
    
    loginContainers.forEach(container => {
      container.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    });
    
    dashboards.forEach(dashboard => {
      dashboard.style.minHeight = 'calc(var(--vh, 1vh) * 100)';
    });
  }
};

// Screen management
function showScreen(screenId) {
  Object.values(elements.screens).forEach(screen => {
    screen.classList.add('hidden');
  });
  elements.screens[screenId].classList.remove('hidden');
  
  window.scrollTo(0, 0);
  utils.adjustLayoutForMobile();
}

// Barber form management
function showBarberSignup() {
  elements.barber.formTitle.innerHTML = '<i class="fas fa-user-plus"></i> إنشاء حساب حلاق جديد';
  elements.barber.loginForm.classList.add('hidden');
  elements.barber.signupForm.classList.remove('hidden');
}

function showBarberLogin() {
  elements.barber.formTitle.innerHTML = '<i class="fas fa-cut"></i> تسجيل الدخول للحلاقين';
  elements.barber.signupForm.classList.add('hidden');
  elements.barber.loginForm.classList.remove('hidden');
}

// Authentication functions
async function clientLogin() {
  const name = elements.client.name.value.trim();
  const phone = elements.client.phone.value.trim();
  const rememberMe = document.getElementById('rememberMeClient').checked;
  
  if (!name) {
    utils.showError(elements.client.error, 'الرجاء إدخال الاسم');
    return;
  }
  
  if (!phone || !utils.validatePhone(phone)) {
    utils.showError(elements.client.error, 'الرجاء إدخال رقم هاتف صحيح (10-15 رقمًا)');
    return;
  }
  
  try {
    state.currentUser = {
      id: utils.generateId(),
      name,
      phone,
      type: 'client'
    };
    state.currentUserType = 'client';
    
    elements.client.avatar.textContent = name.charAt(0);
    showClientDashboard();
    await loadBarbers();
    await checkExistingBooking();
    
    if (rememberMe) {
      localStorage.setItem('client_data', JSON.stringify({ name, phone, remember: true }));
    } else {
      localStorage.removeItem('client_data');
    }
  } catch (error) {
    utils.showError(elements.client.error, 'حدث خطأ أثناء تسجيل الدخول');
    console.error('Client login error:', error);
  }
}

async function barberSignup() {
  const { name, newPhone, city, location, newPassword, confirmPassword, error } = elements.barber;
  
  if (!name.value || !newPhone.value || !city.value || !location.value || !newPassword.value || !confirmPassword.value) {
    utils.showError(error, 'جميع الحقول مطلوبة');
    return;
  }
  
  if (!utils.validatePhone(newPhone.value)) {
    utils.showError(error, 'رقم الهاتف يجب أن يكون بين 10-15 رقمًا');
    return;
  }
  
  if (newPassword.value.length < 6) {
    utils.showError(error, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    return;
  }
  
  if (newPassword.value !== confirmPassword.value) {
    utils.showError(error, 'كلمتا المرور غير متطابقتين');
    return;
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      `${newPhone.value}@barber.com`, 
      newPassword.value
    );
    
    await set(ref(database, 'barbers/' + userCredential.user.uid), {
      name: name.value,
      phone: newPhone.value,
      city: city.value,
      location: location.value,
      status: 'open',
      queue: {},
      averageRating: 0,
      ratingCount: 0,
      barberRating: 0,
      barberRatingCount: 0
    });
    
    state.currentUser = {
      id: userCredential.user.uid,
      name: name.value,
      phone: newPhone.value,
      city: city.value,
      location: location.value,
      type: 'barber'
    };
    
    elements.barber.avatar.textContent = name.value.charAt(0);
    showBarberDashboard();
    loadBarberQueue();
    loadBarberRatings();
    
    utils.clearForm({
      name: name,
      newPhone: newPhone,
      city: city,
      location: location,
      newPassword: newPassword,
      confirmPassword: confirmPassword
    });
    
  } catch (error) {
    let errorMessage = 'حدث خطأ أثناء إنشاء الحساب';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'هذا الرقم مسجل بالفعل، يرجى تسجيل الدخول';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'رقم الهاتف غير صالح';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'كلمة المرور ضعيفة جداً';
    }
    
    utils.showError(elements.barber.error, errorMessage);
    console.error('Barber signup error:', error);
  }
}

async function barberLogin() {
  const { phone, password, error } = elements.barber;
  const rememberMe = document.getElementById('rememberMeBarber').checked;
  
  if (!phone.value || !password.value) {
    utils.showError(error, 'رقم الهاتف وكلمة المرور مطلوبان');
    return;
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      `${phone.value}@barber.com`,
      password.value
    );
    
    if (rememberMe) {
      localStorage.setItem('barber_login', JSON.stringify({
        phone: phone.value,
        password: password.value,
        remember: true
      }));
    } else {
      localStorage.removeItem('barber_login');
    }
    
    const barberRef = ref(database, 'barbers/' + userCredential.user.uid);
    const snapshot = await get(barberRef);
    
    if (snapshot.exists()) {
      const barberData = snapshot.val();
      
      state.currentUser = {
        id: userCredential.user.uid,
        name: barberData.name,
        phone: barberData.phone,
        city: barberData.city,
        location: barberData.location,
        type: 'barber'
      };
      
      elements.barber.avatar.textContent = barberData.name.charAt(0);
      showBarberDashboard();
      loadBarberQueue();
      loadBarberRatings();
      
      utils.clearForm({
        phone: phone,
        password: password
      });
    } else {
      utils.showError(error, 'بيانات الحلاق غير موجودة');
      await signOut(auth);
    }
    
  } catch (error) {
    let errorMessage = 'بيانات الدخول غير صحيحة';
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'لا يوجد حساب مرتبط بهذا الرقم';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'كلمة المرور غير صحيحة';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'تم تجاوز عدد المحاولات المسموح بها، يرجى المحاولة لاحقاً';
    }
    
    utils.showError(elements.barber.error, errorMessage);
    console.error('Barber login error:', error);
  }
}

// Dashboard functions
function showClientDashboard() {
  showScreen('clientDashboard');
}

function showBarberDashboard() {
  showScreen('barberDashboard');
  
  onValue(ref(database, 'barbers/' + state.currentUser.id + '/status'), (snapshot) => {
    const status = snapshot.val() || 'open';
    elements.barber.statusToggle.checked = status === 'open';
    elements.barber.statusText.textContent = status === 'open' ? 'مفتوح' : 'مغلق';
  });
  
  elements.barber.statusToggle.addEventListener('change', function() {
    const newStatus = this.checked ? 'open' : 'closed';
    update(ref(database, 'barbers/' + state.currentUser.id), { status: newStatus });
  });
}

// Barber management
async function loadBarbers() {
  elements.client.barbersList.innerHTML = '<div class="loading">جارٍ تحميل قائمة الحلاقين...</div>';
  
  if (state.barbersListener) {
    off(state.barbersListener);
  }
  
  state.barbersListener = onValue(ref(database, 'barbers'), (snapshot) => {
    state.barbers = snapshot.val() || {};
    renderBarbersList();
  }, (error) => {
    elements.client.barbersList.innerHTML = '<div class="error">حدث خطأ أثناء تحميل الحلاقين</div>';
    console.error('Load barbers error:', error);
  });
}

function renderBarbersList() {
  if (!elements.client.barbersList) return;
  
  elements.client.barbersList.innerHTML = '';
  
  if (!state.barbers || Object.keys(state.barbers).length === 0) {
    elements.client.barbersList.innerHTML = '<div class="no-results">لا يوجد حلاقون مسجلون حالياً</div>';
    return;
  }
  
  const sortedBarbers = Object.entries(state.barbers)
    .sort(([, a], [, b]) => (b.averageRating || 0) - (a.averageRating || 0));
  
  sortedBarbers.forEach(([id, barber], index) => {
    const isTopRated = index < 3 && barber.averageRating >= 4;
    
    const barberCard = document.createElement('div');
    barberCard.className = `barber-card ${isTopRated ? 'top-rated' : ''}`;
    
    const statusClass = barber.status === 'open' ? 'status-open' : 'status-closed';
    const statusText = barber.status === 'open' ? 'مفتوح' : 'مغلق';
    const queueLength = barber.queue ? Object.keys(barber.queue).length : 0;
    const hasBooking = state.currentUser?.booking;
    
    const ratingStars = barber.averageRating ? 
      `<div class="barber-rating">
        ${'<i class="fas fa-star"></i>'.repeat(Math.round(barber.averageRating))}
        <span class="barber-rating-count">(${barber.ratingCount || 0})</span>
      </div>` : '';
    
    const barberRatingStars = barber.barberRating ?
      `<div class="barber-rating" style="margin-top: 0.5rem;">
        <small>تقييم الحلاق:</small>
        ${'<i class="fas fa-star"></i>'.repeat(Math.round(barber.barberRating))}
        <span class="barber-rating-count">(${barber.barberRatingCount || 0})</span>
      </div>` : '';
    
    barberCard.innerHTML = `
      <div class="barber-info">
        <div class="barber-header">
          <div class="barber-avatar">${barber.name.charAt(0)}</div>
          <div class="barber-name">${barber.name}</div>
        </div>
        <div class="barber-status ${statusClass}">${statusText}</div>
        ${ratingStars}
        ${barberRatingStars}
        <div class="barber-details">
          <div><i class="fas fa-city"></i> المدينة: <span class="city-name">${barber.city || 'غير متوفر'}</span></div>
          <div><i class="fas fa-phone"></i> رقم الهاتف: ${barber.phone || 'غير متوفر'}</div>
          <div><i class="fas fa-map-marker-alt"></i> الموقع: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barber.location)}" target="_blank" class="location-link">${barber.location || 'غير متوفر'}</a></div>
          <div><i class="fas fa-users"></i> عدد المنتظرين: ${queueLength}</div>
          <div><i class="fas fa-clock"></i> وقت الانتظار التقريبي: ${queueLength * 15} دقيقة</div>
        </div>
      </div>
      <button class="book-btn" ${barber.status === 'closed' || hasBooking ? 'disabled' : ''}" 
              onclick="bookAppointment('${id}', '${barber.name.replace(/'/g, "\\'")}')">
        ${hasBooking ? '<i class="fas fa-calendar-check"></i> لديك حجز بالفعل' : 
          (barber.status === 'open' ? '<i class="fas fa-calendar-plus"></i> احجز الآن' : '<i class="fas fa-calendar-times"></i> غير متاح')}
      </button>
    `;
    
    elements.client.barbersList.appendChild(barberCard);
  });
}

// Booking management
async function bookAppointment(barberId, barberName) {
  if (!state.currentUser) return;
  
  if (state.currentUser.booking) {
    alert('لديك حجز بالفعل، لا يمكنك الحجز أكثر من مرة في نفس الوقت');
    return;
  }
  
  try {
    const newBookingRef = push(ref(database, `barbers/${barberId}/queue`));
    await set(newBookingRef, {
      clientId: state.currentUser.id,
      clientName: state.currentUser.name,
      clientPhone: state.currentUser.phone,
      timestamp: Date.now()
    });
    
    state.currentUser.booking = {
      barberId,
      barberName,
      bookingId: newBookingRef.key,
      timestamp: new Date().toLocaleString('ar-EG')
    };
    
    showCurrentBooking();
    renderBarbersList();
    
    alert(`تم الحجز بنجاح مع الحلاق ${barberName}`);
  } catch (error) {
    alert('حدث خطأ أثناء الحجز: ' + error.message);
    console.error('Booking error:', error);
  }
}

async function checkExistingBooking() {
  if (!state.currentUser || state.currentUser.type !== 'client') return;
  
  for (const [barberId, barber] of Object.entries(state.barbers)) {
    if (barber.queue) {
      for (const [bookingId, booking] of Object.entries(barber.queue)) {
        if (booking.clientId === state.currentUser.id) {
          state.currentUser.booking = {
            barberId,
            barberName: barber.name,
            bookingId,
            timestamp: new Date(booking.timestamp).toLocaleString('ar-EG')
          };