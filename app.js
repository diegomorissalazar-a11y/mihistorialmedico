// MiHistorialMédico - app.js
// Tailwind CDN reads this config before it starts.
window.tailwind = window.tailwind || {};
    window.tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            sky: { 50:'#f0f9ff',100:'#e0f2fe',200:'#bae6fd',300:'#7dd3fc',400:'#38bdf8',500:'#0ea5e9',600:'#0284c7',700:'#0369a1',800:'#075985',900:'#0c4a6e' },
            medical: { light:'#f0f9ff', mid:'#bae6fd', accent:'#0ea5e9', dark:'#0369a1' }
          },
          fontFamily: {
            sans: ['DM Sans', 'system-ui', 'sans-serif'],
            mono: ['DM Mono', 'monospace'],
          },
          animation: {
            'fade-in': 'fadeIn 0.3s ease-out',
            'slide-up': 'slideUp 0.3s ease-out',
            'pulse-soft': 'pulseSoft 2s infinite',
          },
          keyframes: {
            fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
            slideUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
            pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
          }
        }
      }
    }

// ============================================================
    // FIREBASE CONFIGURATION
    // Reemplaza estos valores con los de tu proyecto Firebase
    // ============================================================
    const FIREBASE_CONFIG = {
      apiKey: "AIzaSyBKMfDz3XLJCmjjaYdeT_o1Z05T2yub_Qc",
      authDomain: "lumen-6ed85.firebaseapp.com",
      projectId: "lumen-6ed85",
      storageBucket: "lumen-6ed85.firebasestorage.app",
      messagingSenderId: "473887918286",
      appId: "1:473887918286:web:e3ee5a38f52e9aa107e89f"
    };
    // ============================================================

    // ---- Services are initialized lazily because this file is loaded before the CDN libraries ----
    let localDB, db, auth, storage, isFirebaseReady = false, servicesInitialized = false;

    function initServices() {
      if (servicesInitialized) return;
      servicesInitialized = true;

      // IndexedDB offline fallback
      if (window.Dexie) {
        localDB = new Dexie('MiHistorialMedico');
        localDB.version(1).stores({
          entries: '++id, profileId, category, date',
          profiles: '++id',
          medTaken: '++id, medId, date',
          documents: '++id, profileId, date'
        });
      }

      // Firebase Init
      try {
        if (!window.firebase) throw new Error('Firebase SDK no disponible');
        firebase.initializeApp(FIREBASE_CONFIG);
        db = firebase.firestore();
        auth = firebase.auth();
        storage = firebase.storage();
        isFirebaseReady = true;
        db.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition' || err.code === 'unimplemented') {
            console.warn('Firestore offline persistence unavailable:', err.code);
          }
        });
      } catch(e) {
        console.warn('Firebase no configurado. Usando modo local.', e);
        const notice = document.getElementById('config-notice');
        if (notice) notice.style.display = 'block';
      }
    }

    // ---- Alpine App ----
    function app() {
      return {
        // State
        screen: 'login',
        darkMode: localStorage.getItem('darkMode') === 'true' || window.matchMedia('(prefers-color-scheme: dark)').matches,
        authLoading: false,
        loginTab: 'login',
        loginForm: { email: '', password: '' },
        currentUser: null,
        currentProfile: null,
        profiles: [],
        newProfileForm: { name: '', relation: 'Yo', birthdate: '', emoji: '👤', color: '#0ea5e9' },

        // Section
        activeSection: 'dashboard',
        medTab: 'activos',
        calendarTab: 'controles',
        timelineFilter: '',
        timelineStartDate: '',
        uploading: false,

        // Data
        examenes: [],
        medicamentos: [],
        consultas: [],
        vacunas: [],
        alergias: [],
        cirugias: [],
        mediciones: [],
        documents: [],
        medTakenToday: [],
        reminders: [],
        importador: { raw: '', parsed: null, error: '', mode: 'json', fileName: '' },
        controles: [],
        recetas: [],
        compras: [],
        treatmentLogs: [],

        // Modal
        modal: { show: false, type: '', entry: null },
        form: {},

        // Toast
        toast: { show: false, msg: '', type: 'success' },

        // Charts
        charts: {},

        // Nav items
        navItems: [
          { id: 'dashboard', label: 'Inicio', icon: '🏠', badge: null },
          { id: 'timeline', label: 'Timeline', icon: '🕐', badge: null },
          { id: 'examenes', label: 'Exámenes', icon: '🔬', badge: null },
          { id: 'medicamentos', label: 'Medicamentos', icon: '💊', badge: null },
          { id: 'consultas', label: 'Consultas', icon: '🏥', badge: null },
          { id: 'importador', label: 'Importar JSON/CSV', icon: '📥', badge: null },
          { id: 'vacunas', label: 'Vacunas', icon: '💉', badge: null },
          { id: 'calendario', label: 'Calendario', icon: '📅', badge: null },
          { id: 'recetas', label: 'Recetas', icon: '🧾', badge: null },
          { id: 'alergias', label: 'Alergias', icon: '⚠️', badge: null },
          { id: 'cirugias', label: 'Cirugías', icon: '🏨', badge: null },
          { id: 'mediciones', label: 'Mediciones', icon: '📏', badge: null },
          { id: 'documentos', label: 'Documentos', icon: '📎', badge: null },
          { id: 'estadisticas', label: 'Estadísticas', icon: '📊', badge: null },
        ],
        mobileNavItems: [
          { id: 'dashboard', label: 'Inicio', icon: '🏠' },
          { id: 'examenes', label: 'Exámenes', icon: '🔬' },
          { id: 'medicamentos', label: 'Meds', icon: '💊' },
          { id: 'calendario', label: 'Agenda', icon: '📅' },
          { id: 'consultas', label: 'Consultas', icon: '🏥' },
          { id: 'importador', label: 'Importar', icon: '📥' },
          { id: 'estadisticas', label: 'Stats', icon: '📊' },
        ],

        // ---- INIT ----
        init() {
          initServices();
          // Watch darkMode
          this.$watch('darkMode', v => localStorage.setItem('darkMode', v));
          this.$watch('activeSection', section => {
            this.$nextTick(() => {
              if (section === 'mediciones' || section === 'estadisticas') this.renderCharts();
            });
          });

          if (!isFirebaseReady) {
            this.screen = 'login';
            return;
          }

          auth.onAuthStateChanged(user => {
            if (user) {
              this.currentUser = user;
              this.loadProfiles();
            } else {
              this.screen = 'login';
            }
          });
        },

        // ---- AUTH ----
        async doAuth() {
          if (!isFirebaseReady) { this.showToast('Configura Firebase primero', 'error'); return; }
          if (!this.loginForm.email || !this.loginForm.password) { this.showToast('Completa todos los campos', 'error'); return; }
          this.authLoading = true;
          try {
            if (this.loginTab === 'login') {
              await auth.signInWithEmailAndPassword(this.loginForm.email, this.loginForm.password);
            } else {
              await auth.createUserWithEmailAndPassword(this.loginForm.email, this.loginForm.password);
            }
          } catch(e) {
            const msgs = {
              'auth/user-not-found': 'Usuario no encontrado',
              'auth/wrong-password': 'Contraseña incorrecta',
              'auth/email-already-in-use': 'Email ya registrado',
              'auth/weak-password': 'Contraseña muy débil (mín. 6 caracteres)',
              'auth/invalid-email': 'Email inválido'
            };
            this.showToast(msgs[e.code] || e.message, 'error');
          } finally {
            this.authLoading = false;
          }
        },

        async doLogout() {
          if (isFirebaseReady) await auth.signOut();
          this.currentUser = null;
          this.currentProfile = null;
          this.screen = 'login';
        },

        // ---- PROFILES ----
        async loadProfiles() {
          if (!this.currentUser) return;
          if (isFirebaseReady) {
            const snap = await db.collection('users').doc(this.currentUser.uid).collection('profiles').get();
            this.profiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          } else {
            this.profiles = await localDB.profiles.toArray();
          }
          this.screen = 'profiles';
        },

        nextProfile() {
          if (!this.profiles || this.profiles.length === 0) return null;
          const preferredNames = ['Santiago', 'Diego'];
          const preferred = this.profiles.filter(p => preferredNames.includes((p.name || '').trim()));
          const pool = preferred.length >= 2 ? preferred : this.profiles;
          if (!this.currentProfile) return pool[0] || null;
          return pool.find(p => p.id !== this.currentProfile.id) || pool[0] || null;
        },

        profileSwitchLabel() {
          const next = this.nextProfile();
          return next ? `Cambiar a ${next.name}` : 'Cambiar perfil';
        },

        profileSwitchTitle() {
          const next = this.nextProfile();
          return next ? `Cambiar al perfil de ${next.name}` : 'Volver a selección de perfiles';
        },

        async quickSwitchProfile() {
          const next = this.nextProfile();
          if (next && next.id !== this.currentProfile?.id) {
            await this.selectProfile(next);
            this.showToast(`Perfil activo: ${next.name} ✓`);
          } else {
            this.screen = 'profiles';
          }
        },

        async selectProfile(p) {
          this.currentProfile = p;
          this.screen = 'app';
          await this.loadAllData();
        },

        async saveNewProfile() {
          if (!this.newProfileForm.name) { this.showToast('Nombre requerido', 'error'); return; }
          const p = { ...this.newProfileForm, createdAt: new Date().toISOString() };
          if (isFirebaseReady && this.currentUser) {
            const ref = await db.collection('users').doc(this.currentUser.uid).collection('profiles').add(p);
            p.id = ref.id;
          } else {
            p.id = Date.now().toString();
            await localDB.profiles.add(p);
          }
          this.profiles.push(p);
          this.modal.show = false;
          this.newProfileForm = { name: '', relation: 'Yo', birthdate: '', emoji: '👤', color: '#0ea5e9' };
          this.showToast('Perfil creado ✓');
        },


        sortedDoctors() {
          const names = new Set();
          this.consultas.forEach(c => { if (c.doctor) names.add(c.doctor); });
          this.medicamentos.forEach(m => { if (m.doctor) names.add(m.doctor); });
          return [...names].sort((a,b) => a.localeCompare(b, 'es'));
        },

        applySavedDoctor() {
          if (this.form.savedDoctor && this.form.savedDoctor !== '__otro__') {
            this.form.doctor = this.form.savedDoctor;
          } else if (this.form.savedDoctor === '__otro__') {
            this.form.doctor = '';
          }
        },

        applyControlTypeDefaults() {
          if (this.form.controlType === 'Control pediátrico') {
            this.form.specialty = 'Pediatría';
            if (!this.form.title) this.form.title = 'Control pediátrico';
          }
          if (this.form.controlType === 'Control nutricionista') {
            this.form.specialty = 'Nutrición / Nutricionista';
            if (!this.form.title) this.form.title = 'Control nutricionista';
          }
          if (this.form.controlType === 'Chequeo completo') {
            if (!this.form.specialty) this.form.specialty = 'Medicina general';
            if (!this.form.title) this.form.title = 'Chequeo completo';
          }
        },

        addMonthsToDate(dateStr, months) {
          const d = dateStr ? new Date(dateStr) : new Date();
          if (isNaN(d)) return '';
          const copy = new Date(d);
          copy.setMonth(copy.getMonth() + Number(months));
          return copy.toISOString().split('T')[0];
        },

        applyNextControlPreset() {
          if (!this.form.nextControlPreset) return;
          this.form.nextControlDate = this.addMonthsToDate(this.form.date || new Date().toISOString().split('T')[0], this.form.nextControlPreset);
        },

        // ---- LOAD DATA ----
        async loadAllData() {
          await Promise.all([
            this.loadSection('examenes'),
            this.loadSection('medicamentos'),
            this.loadSection('consultas'),
            this.loadSection('vacunas'),
            this.loadSection('alergias'),
            this.loadSection('cirugias'),
            this.loadSection('mediciones'),
            this.loadSection('documentos'),
            this.loadSection('recordatorios'),
            this.loadSection('controles'),
            this.loadSection('recetas'),
            this.loadSection('compras'),
            this.loadSection('tomas'),
            this.loadMedTakenToday(),
          ]);
        },

        profilePath() {
          return db.collection('users').doc(this.currentUser.uid).collection('profiles').doc(this.currentProfile.id);
        },

        async loadSection(section) {
          if (!this.currentProfile) return;
          let data = [];
          if (isFirebaseReady && this.currentUser) {
            const snap = await this.profilePath().collection(section).orderBy('date', 'desc').limit(200).get();
            data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          } else {
            const sectionCategory = { examenes:'examen', medicamentos:'medicamento', consultas:'consulta', vacunas:'vacuna', alergias:'alergia', cirugias:'cirugia', mediciones:'medicion', recordatorios:'recordatorio', controles:'control', recetas:'receta', compras:'compra', tomas:'toma' }[section] || section;
            data = await localDB.entries.where('profileId').equals(this.currentProfile.id).filter(e => e.category === sectionCategory).reverse().sortBy('date');
          }
          const mapKey = {
            examenes: 'examenes', medicamentos: 'medicamentos', consultas: 'consultas',
            vacunas: 'vacunas', alergias: 'alergias', cirugias: 'cirugias',
            mediciones: 'mediciones', documentos: 'documents', recordatorios: 'reminders',
            controles: 'controles', recetas: 'recetas', compras: 'compras', tomas: 'treatmentLogs'
          };
          this[mapKey[section]] = data;
        },

        async loadMedTakenToday() {
          const today = new Date().toISOString().split('T')[0];
          if (isFirebaseReady && this.currentUser && this.currentProfile) {
            const snap = await this.profilePath().collection('medTaken').where('date', '==', today).get();
            this.medTakenToday = snap.docs.map(d => d.data().medId);
          } else {
            const r = await localDB.medTaken.filter(m => m.date === today && m.profileId === this.currentProfile?.id).toArray();
            this.medTakenToday = r.map(m => m.medId);
          }
        },


        collectionFor(category) {
          const plural = {
            examen: 'examenes', medicamento: 'medicamentos', consulta: 'consultas', vacuna: 'vacunas',
            alergia: 'alergias', cirugia: 'cirugias', medicion: 'mediciones', recordatorio: 'recordatorios',
            control: 'controles', receta: 'recetas', compra: 'compras', toma: 'tomas'
          };
          return plural[category] || category;
        },

        stateKeyFor(category) {
          const mapKey = {
            examen: 'examenes', medicamento: 'medicamentos', consulta: 'consultas', vacuna: 'vacunas',
            alergia: 'alergias', cirugia: 'cirugias', medicion: 'mediciones', recordatorio: 'reminders',
            control: 'controles', receta: 'recetas', compra: 'compras', toma: 'treatmentLogs'
          };
          return mapKey[category];
        },



        get savedDoctors() {
          const names = [
            ...this.consultas.map(x => x.doctor),
            ...this.controles.map(x => x.doctor),
            ...this.recetas.map(x => x.doctor)
          ].filter(Boolean).map(x => String(x).trim()).filter(Boolean);
          return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
        },

        applyDoctorSelection() {
          if (this.form.doctorSelect === '__otro') {
            this.form.doctor = '';
            this.form.doctorOther = true;
          } else {
            this.form.doctor = this.form.doctorSelect || '';
            this.form.doctorOther = false;
          }
        },

        applyVisitTypeDefaults() {
          const type = this.form.visitType || '';
          if (type === 'Control pediátrico') {
            this.form.specialty = 'Pediatría';
            if (!this.form.title) this.form.title = 'Control pediátrico';
          }
          if (type === 'Control nutricionista') {
            this.form.specialty = 'Nutrición / Nutricionista';
            if (!this.form.title) this.form.title = 'Control nutricionista';
          }
          if (type === 'Chequeo completo') {
            this.form.specialty = 'Medicina general';
            if (!this.form.title) this.form.title = 'Chequeo completo';
          }
        },

        estimatedEndDate(startDate, durationDays) {
          if (!startDate || !durationDays) return '';
          const d = new Date(startDate);
          if (isNaN(d)) return '';
          d.setDate(d.getDate() + Number(durationDays));
          return d.toISOString().split('T')[0];
        },


        applyControlDateToMeasurement() {
          if (!this.form?.relatedControlId) return;
          const c = this.consultas.find(x => x.id === this.form.relatedControlId);
          if (!c?.date) return;
          const d = c.date?.toDate ? c.date.toDate() : new Date(c.date);
          if (!isNaN(d)) this.form.date = d.toISOString().split('T')[0];
        },

        // ---- SAVE ENTRIES ----
        async saveEntry(category) {
          const f = { ...this.form, category, profileId: this.currentProfile.id };

          // Validate required fields
          const titleField = f.title || f.name;
          if (category === 'medicion') {
            if (f.relatedControlId) {
              const c = this.consultas.find(x => x.id === f.relatedControlId);
              if (c?.date) {
                const d = c.date?.toDate ? c.date.toDate() : new Date(c.date);
                if (!isNaN(d)) f.date = d.toISOString().split('T')[0];
                f.relatedControlTitle = c.title || c.name || 'Control asociado';
              }
            }
            if (!f.date) { this.showToast('La fecha es obligatoria si no asocias un control', 'error'); return; }
            const hasMetric = ['weight','height','headCircumference','glucose','bpSys','bpDia','cholesterol'].some(k => f[k] !== '' && f[k] !== null && f[k] !== undefined);
            if (!hasMetric) { this.showToast('Ingresa al menos un indicador', 'error'); return; }
            f.title = 'Medición corporal';
            f.name = 'Medición corporal';
          } else if (!titleField) {
            this.showToast('Completa los campos obligatorios (*)', 'error'); return;
          }

          // Handle file upload
          if (f.file && isFirebaseReady) {
            try {
              const path = `users/${this.currentUser.uid}/${this.currentProfile.id}/${Date.now()}_${f.file.name}`;
              const ref = storage.ref(path);
              await ref.put(f.file);
              f.fileUrl = await ref.getDownloadURL();
              // Also save to documents collection
              const docData = { name: f.file.name, url: f.fileUrl, type: f.file.type, date: f.date || new Date().toISOString().split('T')[0], profileId: this.currentProfile.id };
              await this.profilePath().collection('documentos').add(docData);
              this.documents.unshift({ id: Date.now().toString(), ...docData });
            } catch(e) { console.warn('Upload failed', e); }
          }
          delete f.file;
          if ((category === 'medicamento' || category === 'receta') && !f.endDate && f.startDate && f.durationDays) {
            f.endDate = this.estimatedEndDate(f.startDate, f.durationDays);
          }
          delete f.doctorSelect;
          delete f.doctorOther;

          // Build clean object
          const clean = {};
          for (const [k, v] of Object.entries(f)) {
            if (v !== '' && v !== null && v !== undefined) clean[k] = v;
          }
          if (!clean.date) clean.date = new Date().toISOString().split('T')[0];

          let id;
          if (isFirebaseReady && this.currentUser) {
            const ref = await this.profilePath().collection(this.collectionFor(category)).add({ ...clean, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            id = ref.id;
          } else {
            id = Date.now().toString();
            await localDB.entries.add({ ...clean, id });
          }

          clean.id = id;

          if (category === 'consulta') {
            await this.createLinkedMeasurementFromConsulta(clean);
            await this.createLinkedMedicationsFromConsulta(clean);
          }

          // Update local state
          const stateKey = this.stateKeyFor(category);
          if (stateKey) this[stateKey].unshift(clean);

          if (category === 'consulta' && (clean.weight || clean.height || clean.glucose || clean.bpSys || clean.bpDia || clean.cholesterol)) {
            const meas = {
              category: 'medicion',
              profileId: this.currentProfile.id,
              date: clean.date,
              title: 'Medición asociada a consulta',
              weight: clean.weight || '',
              height: clean.height || '',
              glucose: clean.glucose || '',
              bpSys: clean.bpSys || '',
              bpDia: clean.bpDia || '',
              cholesterol: clean.cholesterol || '',
              notes: `Registro automático desde ${clean.visitType || clean.title || 'consulta'}`,
              sourceConsultaId: id
            };
            let measId;
            if (isFirebaseReady && this.currentUser) {
              const mref = await this.profilePath().collection('mediciones').add({ ...meas, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
              measId = mref.id;
            } else {
              measId = Date.now().toString() + '_med';
              await localDB.entries.add({ ...meas, id: measId });
            }
            this.mediciones.unshift({ ...meas, id: measId });
          }

          this.form = {};
          this.modal.show = false;
          this.showToast('Guardado correctamente ✓');
        },

        async deleteEntry(entry) {
          if (!confirm('¿Eliminar este registro?')) return;
          const cat = entry.category;
          if (isFirebaseReady && this.currentUser) {
            await this.profilePath().collection(this.collectionFor(cat)).doc(entry.id).delete();
          } else {
            await localDB.entries.delete(entry.id);
          }
          const stateKey = this.stateKeyFor(cat);
          if (stateKey) this[stateKey] = this[stateKey].filter(e => e.id !== entry.id);
          this.showToast('Eliminado ✓');
        },

        // ---- MEDICAMENTOS TOMA ----
        isTakenToday(medId) {
          return this.medTakenToday.includes(medId);
        },

        async toggleMedTakenById(medId, name, dose) {
          const today = new Date().toISOString().split('T')[0];
          const already = this.isTakenToday(medId);
          if (already) {
            this.medTakenToday = this.medTakenToday.filter(id => id !== medId);
            if (isFirebaseReady && this.currentUser) {
              const snap = await this.profilePath().collection('medTaken').where('medId','==',medId).where('date','==',today).get();
              snap.docs.forEach(d => d.ref.delete());
            }
          } else {
            this.medTakenToday.push(medId);
            const data = { medId, date: today, name, dose, profileId: this.currentProfile.id };
            if (isFirebaseReady && this.currentUser) {
              await this.profilePath().collection('medTaken').add(data);
            } else {
              await localDB.medTaken.add(data);
            }
          }
        },

        toggleMedTaken(med) { this.toggleMedTakenById(med.id, med.name, med.dose); },


        // ---- PLAN, VACUNAS Y RECETAS ----
        daysUntil(value) {
          if (!value) return null;
          const target = value?.toDate ? value.toDate() : new Date(value);
          if (isNaN(target)) return null;
          const today = new Date();
          today.setHours(0,0,0,0);
          target.setHours(0,0,0,0);
          return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
        },

        statusForDays(days) {
          if (days === null || days === undefined || isNaN(days)) return { label: 'Sin fecha', tone: 'slate', icon: '⚪' };
          if (days < 0) return { label: `Vencido hace ${Math.abs(days)} días`, tone: 'red', icon: '🔴' };
          if (days === 0) return { label: 'Hoy', tone: 'sky', icon: '🔵' };
          if (days <= 30) return { label: `Próximo: faltan ${days} días`, tone: 'amber', icon: '🟡' };
          return { label: `Al día: faltan ${days} días`, tone: 'green', icon: '✅' };
        },

        statusBadgeClass(days) {
          if (days === null || days === undefined || isNaN(days)) return 'bg-slate-100 text-slate-600';
          if (days < 0) return 'bg-red-100 text-red-700';
          if (days === 0) return 'bg-sky-100 text-sky-700';
          if (days <= 30) return 'bg-amber-100 text-amber-700';
          return 'bg-green-100 text-green-700';
        },

        addMonths(dateValue, months) {
          const d = dateValue ? new Date(dateValue) : new Date();
          if (isNaN(d)) return '';
          const day = d.getDate();
          d.setMonth(d.getMonth() + Number(months || 0));
          if (d.getDate() < day) d.setDate(0);
          return d.toISOString().split('T')[0];
        },

        calcNextDate(dateValue, frequencyMonths) {
          if (!dateValue || !frequencyMonths) return '';
          return this.addMonths(dateValue, Number(frequencyMonths));
        },

        get calendarEvents() {
          const controls = this.controles.map(c => ({
            ...c, source: 'control', icon: c.icon || '🩺', title: c.title || c.name || 'Control preventivo', dueDate: c.nextDate || this.calcNextDate(c.lastDate || c.date, c.frequencyMonths)
          }));
          const consultasProgramadas = this.consultas.filter(c => c.nextControlDate).map(c => ({
            ...c, source: 'consulta', icon: c.visitType === 'Control pediátrico' ? '👶' : c.visitType === 'Control nutricionista' ? '🥗' : '🏥', title: c.title || c.visitType || 'Próximo control', dueDate: c.nextControlDate
          }));
          const vaccines = this.vacunas.filter(v => v.nextDate).map(v => ({
            ...v, source: 'vacuna', icon: '💉', title: v.name || 'Vacuna', dueDate: v.nextDate
          }));
          const recipes = this.recetas.filter(r => r.active !== false).map(r => ({
            ...r, source: 'receta', icon: '🧾', title: r.name || 'Receta', dueDate: r.expirationDate || r.endDate
          })).filter(r => r.dueDate);
          return [...controls, ...consultasProgramadas, ...vaccines, ...recipes].map(e => {
            const days = this.daysUntil(e.dueDate);
            return { ...e, daysLeft: days, status: this.statusForDays(days) };
          }).sort((a,b) => (a.daysLeft ?? 99999) - (b.daysLeft ?? 99999));
        },

        get upcomingCalendarEvents() {
          return this.calendarEvents.filter(e => e.daysLeft === null || e.daysLeft <= 90).slice(0, 8);
        },

        get activeRecipes() {
          return this.recetas.filter(r => r.active !== false).sort((a,b) => (this.daysUntil(a.endDate || a.expirationDate) ?? 9999) - (this.daysUntil(b.endDate || b.expirationDate) ?? 9999));
        },

        get finishedRecipes() {
          return this.recetas.filter(r => r.active === false);
        },

        doseTimesForRecipe(recipe) {
          const every = Number(recipe.frequencyHours || recipe.everyHours || 24);
          const start = recipe.startTime || '08:00';
          const [hh, mm] = start.split(':').map(Number);
          const times = [];
          if (!every || every <= 0) return [start];
          for (let m = hh * 60 + (mm || 0); m < 24 * 60; m += every * 60) {
            const h = String(Math.floor(m / 60)).padStart(2, '0');
            const mi = String(m % 60).padStart(2, '0');
            times.push(`${h}:${mi}`);
          }
          return times.length ? times : [start];
        },

        isRecipeActiveToday(recipe) {
          if (recipe.active === false) return false;
          const today = new Date(); today.setHours(0,0,0,0);
          const start = recipe.startDate ? new Date(recipe.startDate) : null;
          if (start && !isNaN(start)) { start.setHours(0,0,0,0); if (today < start) return false; }
          const end = recipe.endDate ? new Date(recipe.endDate) : null;
          if (end && !isNaN(end)) { end.setHours(23,59,59,999); if (today > end) return false; }
          return true;
        },

        doseKey(recipeId, date, time) { return `${recipeId}|${date}|${time}`; },

        doseLog(recipeId, date, time) {
          const key = this.doseKey(recipeId, date, time);
          return this.treatmentLogs.find(t => t.doseKey === key);
        },

        get todayDoses() {
          const today = new Date().toISOString().split('T')[0];
          return this.activeRecipes.filter(r => this.isRecipeActiveToday(r)).flatMap(r =>
            this.doseTimesForRecipe(r).map(time => {
              const log = this.doseLog(r.id, today, time);
              return { recipe: r, recipeId: r.id, time, date: today, doseKey: this.doseKey(r.id, today, time), status: log?.status || 'pendiente', loggedAt: log?.loggedAt || null, logId: log?.id || null };
            })
          ).sort((a,b) => a.time.localeCompare(b.time));
        },

        async logDose(dose, status = 'tomada') {
          const data = {
            category: 'toma', profileId: this.currentProfile.id, recipeId: dose.recipeId, recipeName: dose.recipe.name,
            dose: dose.recipe.dose || '', date: dose.date, scheduledTime: dose.time, doseKey: dose.doseKey,
            status, loggedAt: new Date().toISOString()
          };
          const existing = this.doseLog(dose.recipeId, dose.date, dose.time);
          if (isFirebaseReady && this.currentUser) {
            if (existing?.id) await this.profilePath().collection('tomas').doc(existing.id).set(data, { merge: true });
            else {
              const ref = await this.profilePath().collection('tomas').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
              data.id = ref.id;
            }
          } else {
            if (existing?.id) await localDB.entries.update(existing.id, data);
            else { data.id = Date.now().toString() + Math.random().toString(16).slice(2); await localDB.entries.add(data); }
          }
          if (existing?.id) this.treatmentLogs = this.treatmentLogs.map(t => t.id === existing.id ? { ...t, ...data, id: existing.id } : t);
          else this.treatmentLogs.unshift(data);
          this.showToast(status === 'tomada' ? 'Toma registrada ✓' : 'Toma omitida registrada');
        },

        recipeAdherence(recipe) {
          const logs = this.treatmentLogs.filter(t => t.recipeId === recipe.id);
          const taken = logs.filter(t => t.status === 'tomada').length;
          const omitted = logs.filter(t => t.status === 'omitida').length;
          const total = taken + omitted;
          const pct = total ? Math.round((taken / total) * 100) : 0;
          return { taken, omitted, total, pct };
        },

        async endRecipe(recipe) {
          const reason = prompt('Motivo de término', 'Tratamiento completo');
          if (reason === null) return;
          const adherence = this.recipeAdherence(recipe);
          const patch = { active: false, endRealDate: new Date().toISOString().split('T')[0], endReason: reason, adherencePct: adherence.pct };
          if (isFirebaseReady && this.currentUser) {
            await this.profilePath().collection('recetas').doc(recipe.id).set(patch, { merge: true });
          } else {
            await localDB.entries.update(recipe.id, patch);
          }
          this.recetas = this.recetas.map(r => r.id === recipe.id ? { ...r, ...patch } : r);
          this.showToast('Tratamiento finalizado y registrado ✓');
        },

        openQuickControl(type) {
          const templates = {
            oftalmologo: { title: 'Oftalmólogo', icon: '👁️', frequencyMonths: 12 },
            dentista: { title: 'Dentista', icon: '🦷', frequencyMonths: 6 },
            chequeo: { title: 'Chequeo completo', icon: '🩺', frequencyMonths: 12 },
            sangre: { title: 'Exámenes de sangre', icon: '🧪', frequencyMonths: 12 },
          };
          this.openModal('control');
          this.form = { ...this.form, ...(templates[type] || {}) };
        },


        // ---- IMPORTADOR JSON / CSV ----
        importPlaceholder() {
          if (this.importador.mode === 'csv') return 'seccion,tipo,valor,unidad,detalle\nmedicion,Peso,11.2,kg,\nmedicamento,Levorigotax,,,11 gotas cada 24 horas por 2 semanas';
          return JSON.stringify(this.sampleImportJSON(), null, 2);
        },

        sampleImportJSON() {
          return {
            fechaConsulta: '2026-04-29',
            titulo: 'Control pediátrico',
            profesional: 'Patricio Vera Aguilera',
            especialidad: 'Pediatría',
            centroMedico: '',
            mediciones: [
              { tipo:'Peso', valor:11.2, unidad:'kg', fecha:'2026-04-29', estado:'confirmado', confianza:'alta' },
              { tipo:'Talla', valor:83, unidad:'cm', fecha:'2026-04-29', estado:'confirmado', confianza:'alta' },
              { tipo:'Circunferencia craneana', valor:47.8, unidad:'cm', fecha:'2026-04-29', estado:'confirmado', confianza:'alta' },
              { tipo:'IMC', valor:16.3, unidad:'', fecha:'2026-04-29', estado:'confirmado', confianza:'alta' }
            ],
            diagnosticos: [{ texto:'Resfriado común', estado:'confirmado', confianza:'alta' }],
            medicamentos: [
              { nombre:'Levorigotax gotas 20 ML', dosis:'11 gotas', frecuencia:'cada 24 horas', duracion:'2 semanas', via:'', observaciones:'', estado:'confirmado', confianza:'alta' },
              { nombre:'Broncotusilan 100MG/5ML', dosis:'2,5 ml', frecuencia:'cada 8 horas', duracion:'10 días', via:'oral', observaciones:'', estado:'confirmado', confianza:'alta' }
            ],
            indicacionesGenerales: ['NAN 250 cc (2)', 'Acevit 8 gotas día', 'Comidas + Frutas', 'Fisiolim SOS'],
            proximoControl: { textoOriginal:'Control 2 meses', fechaEstimada:'2026-06-29', estado:'confirmado', confianza:'alta' },
            ordenesExamenes: []
          };
        },

        loadImportExample() {
          this.importador.mode = 'json';
          this.importador.raw = JSON.stringify(this.sampleImportJSON(), null, 2);
          this.importador.error = '';
        },

        resetImportador() {
          this.importador = { raw:'', parsed:null, error:'', mode:'json', fileName:'' };
        },

        async handleImportFile(e) {
          const file = e.target.files?.[0];
          if (!file) return;
          const ext = file.name.toLowerCase().split('.').pop();
          if (!['json','csv'].includes(ext)) { this.importador.error = 'Archivo inválido. Usa JSON o CSV.'; return; }
          this.importador.mode = ext;
          this.importador.raw = await file.text();
          this.importador.error = '';
          e.target.value = '';
        },

        normalizeImportedData(obj) {
          const baseDate = obj.fechaConsulta || obj.date || new Date().toISOString().split('T')[0];
          return {
            fechaConsulta: baseDate,
            titulo: obj.titulo || obj.title || 'Consulta importada',
            profesional: obj.profesional || obj.doctor || '',
            especialidad: obj.especialidad || obj.specialty || '',
            centroMedico: obj.centroMedico || obj.hospital || '',
            mediciones: (obj.mediciones || obj.measurements || obj.examenFisico?.mediciones || []).map(m => ({
              tipo: m.tipo || m.type || '',
              valor: m.valor ?? m.value ?? '',
              unidad: m.unidad || m.unit || '',
              fecha: m.fecha || m.date || baseDate,
              estado: m.estado || 'pendiente_revision',
              confianza: m.confianza || 'media'
            })),
            diagnosticos: (obj.diagnosticos || obj.diagnosis || []).map(d => typeof d === 'string' ? { texto:d, estado:'pendiente_revision', confianza:'media' } : { texto:d.texto || d.text || '', estado:d.estado || 'pendiente_revision', confianza:d.confianza || 'media' }),
            medicamentos: (obj.medicamentos || obj.medications || []).map(m => ({
              nombre: m.nombre || m.name || '',
              dosis: m.dosis || m.dose || '',
              frecuencia: m.frecuencia || m.frequency || '',
              duracion: m.duracion || m.duration || '',
              via: m.via || '',
              observaciones: m.observaciones || m.notes || '',
              estado: m.estado || 'pendiente_revision',
              confianza: m.confianza || 'media'
            })),
            indicacionesGenerales: obj.indicacionesGenerales || obj.indications || [],
            proximoControl: obj.proximoControl || { textoOriginal:'', fechaEstimada:'', estado:'pendiente_revision', confianza:'media' },
            ordenesExamenes: obj.ordenesExamenes || obj.examOrders || []
          };
        },

        parseSimpleCSV(text) {
          const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          const out = this.sampleImportJSON();
          out.mediciones = []; out.medicamentos = []; out.diagnosticos = []; out.indicacionesGenerales = []; out.ordenesExamenes = [];
          for (const line of lines.slice(1)) {
            const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const [seccion,tipo,valor,unidad,detalle] = parts.map(x => String(x || '').replace(/^"|"$/g,'').trim());
            if (seccion === 'medicion') out.mediciones.push({ tipo, valor:Number(valor), unidad, fecha:out.fechaConsulta, estado:'confirmado', confianza:'media' });
            if (seccion === 'diagnostico') out.diagnosticos.push({ texto:detalle || tipo, estado:'confirmado', confianza:'media' });
            if (seccion === 'medicamento') out.medicamentos.push({ nombre:tipo, dosis:valor, frecuencia:unidad, duracion:detalle, estado:'confirmado', confianza:'media' });
            if (seccion === 'indicacion') out.indicacionesGenerales.push(detalle || tipo);
            if (seccion === 'orden') out.ordenesExamenes.push({ nombreExamen:tipo, categoria:unidad || 'Laboratorio', indicacion:detalle, estado:'pendiente_agendar' });
          }
          return out;
        },

        parseImportData() {
          try {
            this.importador.error = '';
            if (!this.importador.raw.trim()) { this.importador.error = 'Pega o carga un JSON/CSV primero.'; return; }
            const obj = this.importador.mode === 'csv' ? this.parseSimpleCSV(this.importador.raw) : JSON.parse(this.importador.raw);
            this.importador.parsed = this.normalizeImportedData(obj);
            this.showToast('Datos importados para revisión ✓');
          } catch(e) {
            this.importador.error = 'No se pudo leer el archivo. Revisa que sea JSON válido o CSV simple.';
          }
        },

        addImportMeasurement() {
          const d = this.importador.parsed?.fechaConsulta || new Date().toISOString().split('T')[0];
          this.importador.parsed.mediciones.push({ tipo:'', valor:'', unidad:'', fecha:d, estado:'pendiente_revision', confianza:'media' });
        },

        addImportMedication() {
          this.importador.parsed.medicamentos.push({ nombre:'', dosis:'', frecuencia:'', duracion:'', via:'', observaciones:'', estado:'pendiente_revision', confianza:'media' });
        },

        addImportExamOrder() {
          this.importador.parsed.ordenesExamenes.push({ nombreExamen:'', categoria:'Laboratorio', estado:'pendiente_agendar' });
        },

        importMeasurementKey(tipo) {
          const t = String(tipo || '').toLowerCase();
          if (t.includes('peso')) return 'weight';
          if (t.includes('talla') || t.includes('estatura')) return 'height';
          if (t.includes('crane')) return 'headCircumference';
          if (t.includes('gluc')) return 'glucose';
          if (t.includes('sist')) return 'bpSys';
          if (t.includes('diast')) return 'bpDia';
          if (t.includes('colesterol')) return 'cholesterol';
          return null;
        },

        async saveImportedConsultation() {
          const p = this.importador.parsed;
          if (!p) return;
          if (!confirm('¿Guardar consulta importada y datos confirmados?')) return;

          const confirmedDiagnoses = p.diagnosticos.filter(d => d.estado === 'confirmado').map(d => d.texto).filter(Boolean);
          const confirmedMeds = p.medicamentos.filter(m => m.estado === 'confirmado' && m.nombre);
          const confirmedMeasurements = p.mediciones.filter(m => m.estado === 'confirmado' && m.tipo && m.valor !== '');
          const clean = {
            category:'consulta',
            profileId:this.currentProfile.id,
            title:p.titulo || 'Consulta importada',
            date:p.fechaConsulta,
            doctor:p.profesional,
            specialty:p.especialidad,
            hospital:p.centroMedico,
            diagnosis:confirmedDiagnoses.join('; '),
            medicationsText:confirmedMeds.map(m => [m.nombre,m.dosis,m.frecuencia,m.duracion].filter(Boolean).join(' | ')).join('\n'),
            generalInstructions:p.indicacionesGenerales.join('\n'),
            nextControlDate:p.proximoControl?.fechaEstimada || '',
            nextControlText:p.proximoControl?.textoOriginal || '',
            origen:'json'
          };

          let consultaId;
          if (isFirebaseReady && this.currentUser) {
            const ref = await this.profilePath().collection('consultas').add({ ...clean, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            consultaId = ref.id;
          } else {
            consultaId = Date.now().toString();
            await localDB.entries.add({ ...clean, id:consultaId });
          }
          this.consultas.unshift({ ...clean, id:consultaId });

          for (const m of confirmedMeasurements) {
            if (String(m.tipo).toLowerCase().includes('imc')) continue;
            const key = this.importMeasurementKey(m.tipo);
            const data = { category:'medicion', profileId:this.currentProfile.id, date:m.fecha || p.fechaConsulta, title:'Medición desde JSON', name:'Medición desde JSON', relatedControlId:consultaId, relatedControlTitle:clean.title, origen:'json' };
            if (key) data[key] = Number(m.valor); else data.notes = `${m.tipo}: ${m.valor} ${m.unidad || ''}`;
            let id;
            if (isFirebaseReady && this.currentUser) {
              const ref = await this.profilePath().collection('mediciones').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
              id = ref.id;
            } else {
              id = Date.now().toString() + Math.random().toString(16).slice(2);
              await localDB.entries.add({ ...data, id });
            }
            this.mediciones.unshift({ ...data, id });
          }

          for (const m of confirmedMeds) {
            const days = this.parseDurationDays(m.duracion || '');
            const data = { category:'medicamento', profileId:this.currentProfile.id, name:m.nombre, dose:m.dosis, frequency:m.frecuencia || 'Según indicación', treatmentDays:days, durationDays:days, startDate:p.fechaConsulta, date:p.fechaConsulta, active:true, doctor:p.profesional || '', linkedConsultationId:consultaId, linkedConsultationTitle:clean.title, notes:m.observaciones || '', origen:'json' };
            if (days) data.estimatedEndDate = this.addDaysToDate(data.startDate, days);
            let id;
            if (isFirebaseReady && this.currentUser) {
              const ref = await this.profilePath().collection('medicamentos').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
              id = ref.id;
            } else {
              id = Date.now().toString() + Math.random().toString(16).slice(2);
              await localDB.entries.add({ ...data, id });
            }
            this.medicamentos.unshift({ ...data, id });
          }

          this.showToast('Consulta importada guardada ✓');
          this.resetImportador();
          this.activeSection = 'consultas';
        },

        downloadImportJSON() {
          if (!this.importador.parsed) return;
          const blob = new Blob([JSON.stringify(this.importador.parsed, null, 2)], { type:'application/json;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'consulta_importada_revisada.json';
          a.click();
        },

        downloadImportCSV() {
          if (!this.importador.parsed) return;
          const rows = [['seccion','tipo','valor','unidad','detalle']];
          this.importador.parsed.mediciones.forEach(m => rows.push(['medicion',m.tipo,m.valor,m.unidad,'']));
          this.importador.parsed.diagnosticos.forEach(d => rows.push(['diagnostico',d.texto,'','','']));
          this.importador.parsed.medicamentos.forEach(m => rows.push(['medicamento',m.nombre,m.dosis,m.frecuencia,m.duracion]));
          this.importador.parsed.indicacionesGenerales.forEach(i => rows.push(['indicacion','','','',i]));
          this.importador.parsed.ordenesExamenes.forEach(o => rows.push(['orden',o.nombreExamen,'',o.categoria,o.indicacion]));
          const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
          const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'consulta_importada_revisada.csv';
          a.click();
        },

        // ---- FILE UPLOAD ----
        async handleFileDrop(e) {
          const files = Array.from(e.dataTransfer.files);
          for (const f of files) await this.uploadDocument(f);
        },

        async handleFileInput(e) {
          const files = Array.from(e.target.files);
          for (const f of files) await this.uploadDocument(f);
        },

        async uploadDocument(file) {
          this.uploading = true;
          try {
            let url = '#';
            if (isFirebaseReady && this.currentUser) {
              const path = `users/${this.currentUser.uid}/${this.currentProfile.id}/docs/${Date.now()}_${file.name}`;
              const ref = storage.ref(path);
              await ref.put(file);
              url = await ref.getDownloadURL();
            }
            const doc = { name: file.name, url, type: file.type, date: new Date().toISOString().split('T')[0], profileId: this.currentProfile.id };
            if (isFirebaseReady && this.currentUser) {
              const ref = await this.profilePath().collection('documentos').add(doc);
              doc.id = ref.id;
            } else {
              doc.id = Date.now().toString();
              await localDB.documents.add(doc);
            }
            this.documents.unshift(doc);
            this.showToast('Documento subido ✓');
          } catch(e) { this.showToast('Error al subir archivo', 'error'); }
          finally { this.uploading = false; }
        },

        // ---- CHARTS ----
        renderCharts() {
          this.$nextTick(() => {
            this.renderMeasurementCharts();
            this.renderIMCChart();
            this.renderExamTypeChart();
            this.renderConsultasChart();
          });
        },

        chartColors: ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#14b8a6'],

        destroyChart(id) {
          if (this.charts[id]) { this.charts[id].destroy(); delete this.charts[id]; }
        },

        metricSeries(key) {
          return [...this.mediciones]
            .filter(m => m && m[key] !== '' && m[key] !== null && m[key] !== undefined && !Number.isNaN(Number(m[key])))
            .reverse();
        },

        renderMeasurementCharts() {
          this.renderMetricChart('weightChart', 'weight', 'Peso (kg)', '#0ea5e9');
          this.renderMetricChart('heightChart', 'height', 'Estatura (cm)', '#8b5cf6');
          this.renderMetricChart('headCircumferenceChart', 'headCircumference', 'Circunferencia craneana (cm)', '#14b8a6');
          this.renderMetricChart('glucoseChart', 'glucose', 'Glucosa (mg/dL)', '#f59e0b');
          this.renderMetricChart('bpSysChart', 'bpSys', 'Presión sistólica', '#ef4444');
          this.renderMetricChart('bpDiaChart', 'bpDia', 'Presión diastólica', '#ec4899');
          this.renderMetricChart('cholesterolChart', 'cholesterol', 'Colesterol (mg/dL)', '#10b981');
        },

        renderMetricChart(canvasId, key, label, color) {
          const el = document.getElementById(canvasId);
          const series = this.metricSeries(key);
          const chartKey = 'metric_' + key;
          this.destroyChart(chartKey);
          if (!el || series.length === 0) return;
          this.charts[chartKey] = new Chart(el, {
            type: 'line',
            data: {
              labels: series.map(m => this.formatDate(m.date?.toDate ? m.date.toDate() : new Date(m.date))),
              datasets: [{
                label,
                data: series.map(m => Number(m[key])),
                borderColor: color,
                backgroundColor: color + '20',
                tension: 0.35,
                fill: true,
                pointBackgroundColor: color,
                pointRadius: 3
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: false }, x: { ticks: { maxRotation: 0, autoSkip: true } } }
            }
          });
        },

        renderIMCChart() {
          const el = document.getElementById('imcChart');
          if (!el || this.mediciones.length < 2) return;
          this.destroyChart('imc');
          const sorted = [...this.mediciones].reverse();
          this.charts['imc'] = new Chart(el, {
            type: 'line',
            data: {
              labels: sorted.map(m => this.formatDate(m.date?.toDate ? m.date.toDate() : new Date(m.date))),
              datasets: [{ label: 'IMC', data: sorted.map(m => this.calcIMC(m, true)), borderColor: '#8b5cf6', backgroundColor: '#8b5cf620', tension: 0.4, fill: true }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: false } } }
          });
        },

        renderExamTypeChart() {
          const el = document.getElementById('examTypeChart');
          if (!el || this.examenes.length === 0) return;
          this.destroyChart('examType');
          const types = {};
          this.examenes.forEach(e => { types[e.subtype || 'Otro'] = (types[e.subtype || 'Otro'] || 0) + 1; });
          this.charts['examType'] = new Chart(el, {
            type: 'doughnut',
            data: {
              labels: Object.keys(types),
              datasets: [{ data: Object.values(types), backgroundColor: this.chartColors }]
            },
            options: { responsive: true, plugins: { legend: { position: 'right' } } }
          });
        },

        renderConsultasChart() {
          const el = document.getElementById('consultasChart');
          if (!el || this.consultas.length === 0) return;
          this.destroyChart('consultas');
          const years = {};
          this.consultas.forEach(c => {
            const d = c.date?.toDate ? c.date.toDate() : new Date(c.date);
            const y = d.getFullYear();
            years[y] = (years[y] || 0) + 1;
          });
          const sorted = Object.keys(years).sort();
          this.charts['consultas'] = new Chart(el, {
            type: 'bar',
            data: {
              labels: sorted,
              datasets: [{ label: 'Consultas', data: sorted.map(y => years[y]), backgroundColor: '#10b981aa', borderColor: '#10b981', borderWidth: 2, borderRadius: 8 }]
            },
            options: { responsive: true, plugins: { legend: { display: false } } }
          });
        },

        // ---- COMPUTED HELPERS ----
        get recentEntries() {
          const all = [
            ...this.examenes.map(e => ({ ...e, category: 'examen' })),
            ...this.consultas.map(e => ({ ...e, category: 'consulta' })),
            ...this.vacunas.map(e => ({ ...e, category: 'vacuna' })),
            ...this.mediciones.map(e => ({ ...e, category: 'medicion' })),
          ];
          return all.sort((a, b) => {
            const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
            const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date);
            return db2 - da;
          });
        },

        get filteredTimeline() {
          let all = this.recentEntries;
          if (this.timelineFilter) all = all.filter(e => e.category === this.timelineFilter);
          if (this.timelineStartDate) all = all.filter(e => {
            const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
            return d >= new Date(this.timelineStartDate);
          });
          return all;
        },

        get todayMeds() {
          return this.medicamentos.filter(m => m.active).map(m => ({
            ...m, taken: this.medTakenToday.includes(m.id)
          }));
        },

        get nextControlReminder() {
          const controles = this.calendarEvents
            .filter(e => ['consulta', 'control'].includes(e.source) && e.dueDate && e.daysLeft !== null && e.daysLeft !== undefined)
            .sort((a, b) => a.daysLeft - b.daysLeft);
          return controles[0] || null;
        },

        get nextControlReminderText() {
          const e = this.nextControlReminder;
          if (!e) return '';
          if (e.daysLeft < 0) return `Tu próximo control está vencido hace ${Math.abs(e.daysLeft)} días`;
          if (e.daysLeft === 0) return 'Tu próximo control es hoy';
          if (e.daysLeft === 1) return 'Falta 1 día para tu próximo control';
          return `Faltan ${e.daysLeft} días para tu próximo control`;
        },

        get upcomingReminders() {
          const manual = this.reminders.map(r => {
            const days = this.daysUntil(r.date);
            return { ...r, daysLeft: days, icon: '📅', source: 'recordatorio' };
          });

          const controles = this.calendarEvents
            .filter(e => ['consulta', 'control'].includes(e.source) && e.dueDate)
            .map(e => ({
              ...e,
              id: `control-${e.source}-${e.id}`,
              title: `Próximo control: ${e.title}`,
              date: e.dueDate,
              icon: e.icon || '🏥',
              source: 'control'
            }));

          return [...manual, ...controles]
            .filter(r => r.daysLeft !== null && r.daysLeft !== undefined && r.daysLeft <= 90)
            .sort((a, b) => a.daysLeft - b.daysLeft);
        },

        get dashboardStats() {
          const year = new Date().getFullYear();
          const thisYear = arr => arr.filter(e => {
            const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
            return d && d.getFullYear() === year;
          }).length;
          return [
            { label: 'Exámenes ' + year, value: thisYear(this.examenes) },
            { label: 'Consultas ' + year, value: thisYear(this.consultas) },
            { label: 'Medicamentos activos', value: this.medicamentos.filter(m => m.active).length },
            { label: 'Alertas próximas', value: this.upcomingCalendarEvents.length + this.upcomingReminders.length },
          ];
        },

        // ---- UTILS ----
        getAge(birthdate) {
          if (!birthdate) return '?';
          const b = new Date(birthdate);
          const today = new Date();
          let age = today.getFullYear() - b.getFullYear();
          const m = today.getMonth() - b.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
          return age;
        },

        formatDate(d) {
          if (!d) return '—';
          const date = d instanceof Date ? d : new Date(d);
          if (isNaN(date)) return '—';
          return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
        },


        clinicalPhysicalSummary(c) {
          const parts = [];
          if (c?.weight) parts.push(c.weight + ' kg');
          if (c?.height) parts.push(c.height + ' cm');
          if (c?.headCircumference) parts.push('CC ' + c.headCircumference + ' cm');
          if (c?.temperature) parts.push('T° ' + c.temperature);
          if (c?.vitals) parts.push(c.vitals);
          if (c?.physicalExam) parts.push(c.physicalExam);
          return parts.length ? parts.join(' · ') : 'Sin detalle';
        },

        measurementSummary(m) {
          const parts = [];
          if (m?.relatedControlTitle) parts.push(m.relatedControlTitle);
          if (m?.weight) parts.push(m.weight + ' kg');
          if (m?.height) parts.push(m.height + ' cm');
          if (m?.headCircumference) parts.push('Circ. craneana ' + m.headCircumference + ' cm');
          if (m?.temperature) parts.push('T° ' + m.temperature);\n          if (m?.vitals) parts.push(m.vitals);\n          if (m?.glucose) parts.push('Glucosa ' + m.glucose + ' mg/dL');
          if (m?.bpSys || m?.bpDia) parts.push('PA ' + (m.bpSys || '--') + '/' + (m.bpDia || '--'));
          if (m?.cholesterol) parts.push('Colesterol ' + m.cholesterol + ' mg/dL');
          if (m?.weight && m?.height) parts.push('IMC: ' + this.calcIMC(m));
          return parts.length ? parts.join(' · ') : 'Sin indicadores';
        },

        calcIMC(m, raw = false) {
          if (!m?.weight || !m?.height) return raw ? null : '—';
          const imc = m.weight / Math.pow(m.height / 100, 2);
          return raw ? imc.toFixed(1) : imc.toFixed(1);
        },

        categoryLabel(cat) {
          const labels = { examen: 'Examen', medicamento: 'Medicamento', consulta: 'Consulta', vacuna: 'Vacuna', alergia: 'Alergia', cirugia: 'Cirugía', medicion: 'Medición', recordatorio: 'Recordatorio', control: 'Control preventivo', receta: 'Receta', compra: 'Compra', toma: 'Toma' };
          return labels[cat] || cat;
        },

        categoryColor(cat) {
          const colors = { examen: '#0ea5e9', medicamento: '#f59e0b', consulta: '#10b981', vacuna: '#8b5cf6', alergia: '#ef4444', cirugia: '#ec4899', medicion: '#14b8a6', recordatorio: '#6366f1' };
          return colors[cat] || '#94a3b8';
        },

        fileIcon(type) {
          if (!type) return '📄';
          if (type.includes('pdf')) return '📕';
          if (type.includes('image')) return '🖼️';
          if (type.includes('doc')) return '📝';
          return '📄';
        },

        translateKey(k) {
          const t = { title:'Título', name:'Nombre', date:'Fecha', notes:'Notas', result:'Resultado', lab:'Laboratorio', subtype:'Tipo', doctor:'Médico', specialty:'Especialidad', hospital:'Centro', diagnosis:'Diagnóstico', dose:'Dosis', frequency:'Frecuencia', startDate:'Inicio', endDate:'Fin estimado', durationDays:'Duración del tratamiento (días)', visitType:'Tipo de control', stock:'Stock', active:'Activo', severity:'Severidad', reaction:'Reacción', surgeon:'Cirujano', center:'Centro', nextDate:'Próxima fecha', nextControlDate:'Fecha próximo control', weight:'Peso', height:'Estatura', glucose:'Glucosa', headCircumference:'Circunferencia craneana', temperature:'Temperatura', vitals:'Signos vitales', physicalExam:'Examen físico', medicationsText:'Medicamentos indicados', generalInstructions:'Indicaciones generales', relatedControlTitle:'Control asociado', bpSys:'Presión Sist.', bpDia:'Presión Diast.', cholesterol:'Colesterol', headCircumference:'Perímetro cefálico', fileUrl:'Archivo', category:'Categoría', lastDate:'Último control', frequencyMonths:'Frecuencia meses', expirationDate:'Vence receta', startTime:'Hora inicial', frequencyHours:'Cada horas', endRealDate:'Término real', endReason:'Motivo término', scheduledTime:'Hora programada', loggedAt:'Hora registro', status:'Estado' };
          return t[k] || k;
        },

        formatFieldValue(k, v) {
          if (k === 'fileUrl') return 'Ver adjunto';
          if (k === 'date' || k === 'startDate' || k === 'endDate' || k === 'nextDate' || k === 'nextControlDate') {
            return this.formatDate(v?.toDate ? v.toDate() : new Date(v));
          }
          if (typeof v === 'boolean') return v ? 'Sí' : 'No';
          return v;
        },

        // ---- MODALS ----
        openModal(type) {
          const today = new Date().toISOString().split('T')[0];
          this.form = { date: today, active: true };
          if (type === 'consulta') this.form = { date: today, visitType: 'Consulta general', title: '', doctorSelect: '', doctorOther: false, doctor: '', specialty: '', active: true };
          if (type === 'medicamento') this.form = { name: '', dose: '', frequency: 'Diaria', startDate: today, durationDays: 10, stock: '', active: true };
          if (type === 'control') this.form = { title: '', lastDate: today, frequencyMonths: 12, icon: '🩺', active: true };
          if (type === 'receta') this.form = { name: '', dose: '', frequencyHours: 12, startTime: '08:00', durationDays: 7, startDate: today, endDate: '', expirationDate: '', active: true };
          this.modal = { show: true, type, entry: null };
        },

        openEntryDetail(entry) {
          this.modal = { show: true, type: 'detail', entry };
        },

        // ---- TOAST ----
        showToast(msg, type = 'success') {
          this.toast = { show: true, msg, type };
          setTimeout(() => { this.toast.show = false; }, 3000);
        },

        // ---- EXPORT CSV ----
        exportCSV() {
          const all = [
            ...this.examenes.map(e => ({ ...e, _section: 'Exámenes' })),
            ...this.consultas.map(e => ({ ...e, _section: 'Consultas' })),
            ...this.medicamentos.map(e => ({ ...e, _section: 'Medicamentos' })),
            ...this.vacunas.map(e => ({ ...e, _section: 'Vacunas' })),
            ...this.alergias.map(e => ({ ...e, _section: 'Alergias' })),
            ...this.cirugias.map(e => ({ ...e, _section: 'Cirugías' })),
            ...this.mediciones.map(e => ({ ...e, _section: 'Mediciones' })),
          ];

          if (all.length === 0) { this.showToast('Sin datos para exportar', 'error'); return; }

          const headers = ['Sección','Perfil','Fecha','Título/Nombre','Tipo','Doctor','Hospital','Resultado','Diagnóstico','Dosis','Frecuencia','Notas'];
          const rows = all.map(e => [
            e._section, this.currentProfile?.name || '',
            this.formatDate(e.date?.toDate ? e.date.toDate() : new Date(e.date)),
            e.title || e.name || '', e.subtype || e.category || '',
            e.doctor || '', e.hospital || '', e.result || '', e.diagnosis || '',
            e.dose || '', e.frequency || '', e.notes || ''
          ]);

          const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
          const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `historial_${this.currentProfile?.name?.replace(/\s/g,'_') || 'medico'}_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          this.showToast('CSV exportado ✓');
        },
      };
    }

    // ---- SERVICE WORKER + PWA MANIFEST ----
    function registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      window.addEventListener('load', () => {
        const swCode = `
const CACHE = 'mihm-v2.7.1';
const ASSETS = ['./', './index.html', './styles.css', './app.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => undefined)));
});
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
        `;
        const blob = new Blob([swCode], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        navigator.serviceWorker.register(url).catch(e => console.warn('SW:', e));
      });
    }

    function setupManifest() {
      const manifestLink = document.getElementById('manifest-link');
      if (!manifestLink) return;
      const manifest = {
        name: 'MiHistorialMédico',
        short_name: 'MiHistorial',
        description: 'Tu historial médico de por vida',
        start_url: './index.html',
        display: 'standalone',
        theme_color: '#0ea5e9',
        background_color: '#f0f9ff',
        icons: [{ src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%230ea5e9"/><path d="M30 20h40a5 5 0 015 5v50a5 5 0 01-5 5H30a5 5 0 01-5-5V25a5 5 0 015-5zm15 5v10H35v5h10v10h5V40h10v-5H50V25h-5z" fill="white"/></svg>', sizes: '192x192', type: 'image/svg+xml' }]
      };
      const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      manifestLink.href = URL.createObjectURL(manifestBlob);
    }

    registerServiceWorker();
    document.addEventListener('DOMContentLoaded', setupManifest);
