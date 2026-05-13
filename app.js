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
        // Offline persistence — Firebase v9 compat
        db.enablePersistence({ synchronizeTabs: true }).catch(err => {
          if (err.code === 'failed-precondition') {
            db.enablePersistence().catch(() => {});
          } else if (err.code !== 'unimplemented') {
            console.warn('Firestore persistence:', err.code);
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
        newProfileForm: { name: '', relation: 'Yo', birthdate: '', sex: 'M', emoji: '👤', color: '#0ea5e9' },

        // Section
        activeSection: 'dashboard',
        medTab: 'activos',
        expandedExamenId: null,
        examFilter: '',
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
        examOrders: [],
        controles: [],
        recetas: [],
        compras: [],
        treatmentLogs: [],

        // Modal
        modal: { show: false, type: '', entry: null, editing: false, editForm: {} },

        // Consulta enrichment (phase 2)
        enrichingConsulta: null,   // consulta being enriched
        enrichMenu: false,         // show enrich menu
        enrichModal: { show: false, type: '' },  // add items modal
        enrichJsonLoader: { show: false, text: '', error: '' },

        // Consulta accordion
        expandedConsultaId: null,

        // Perfil edición
        editingProfile: false,
        profileForm: {},

        // Examen update
        examStatusForm: {},

        // JSON loader
        jsonLoader: { show: false, text: '', error: '' },
        form: {},

        // Toast
        toast: { show: false, msg: '', type: 'success' },

        // Charts
        charts: {},

        // Nav items v16
        navItems: [
          { id: 'dashboard',     label: 'Inicio',        icon: '🏠', badge: null },
          { id: 'consultas',     label: 'Consultas',     icon: '🏥', badge: null },
          { id: 'examenes',      label: 'Exámenes',      icon: '🔬', badge: null },
          { id: 'medicamentos',  label: 'Medicamentos',  icon: '💊', badge: null },
          { id: 'vacunas',       label: 'Vacunas',       icon: '💉', badge: null },
          { id: 'estadisticas',  label: 'Estadísticas',  icon: '📊', badge: null },
          { id: 'perfil',        label: 'Perfil',        icon: '👤', badge: null },
        ],
        mobileNavItems: [
          { id: 'dashboard',    label: 'Inicio',       icon: '🏠' },
          { id: 'consultas',    label: 'Consultas',    icon: '🏥' },
          { id: 'examenes',     label: 'Exámenes',     icon: '🔬' },
          { id: 'medicamentos', label: 'Meds',         icon: '💊' },
          { id: 'perfil',       label: 'Perfil',       icon: '👤' },
        ],

        // ---- INIT ----
        init() {
          initServices();
          // Watch darkMode
          this.$watch('darkMode', v => localStorage.setItem('darkMode', v));
          this.$watch('activeSection', section => {
            this.$nextTick(() => {
              if (section === 'estadisticas') this.renderCharts();
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
          this.newProfileForm = { name: '', relation: 'Yo', birthdate: '', sex: 'M', emoji: '👤', color: '#0ea5e9' };
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
            this.loadSection('ordenesExamenes'),
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
            mediciones: 'mediciones', documentos: 'documents', recordatorios: 'reminders', ordenesExamenes: 'examOrders',
            controles: 'controles', recetas: 'recetas', compras: 'compras', tomas: 'treatmentLogs'
          };
          this[mapKey[section]] = data;
        },

        async loadMedTakenToday() {
          const today = new Date().toISOString().split('T')[0];
          if (isFirebaseReady && this.currentUser && this.currentProfile) {
            const snap = await this.profilePath().collection('medTaken').where('date', '==', today).get();
            this.medTakenToday = snap.docs.map(d => ({
              medId: d.data().medId,
              doseIdx: d.data().doseIdx ?? 0
            }));
          } else {
            const r = await localDB.medTaken.filter(m => m.date === today && m.profileId === this.currentProfile?.id).toArray();
            this.medTakenToday = r.map(m => ({ medId: m.medId, doseIdx: m.doseIdx ?? 0 }));
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
          this.materializeConsultaItems(f);
          if ((category === 'medicamento' || category === 'receta') && !f.endDate && f.startDate && f.durationDays) {
            f.endDate = this.estimatedEndDate(f.startDate, f.durationDays);
          }
          delete f.doctorSelect;
          delete f.doctorOther;

          // Build clean object
          const clean = {};
          for (const [k, v] of Object.entries(f)) {
            if (Array.isArray(v)) { clean[k] = v; continue; } // always preserve arrays
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
            await this.createLinkedExamOrdersFromConsulta(clean);
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


        // ---- FORMULARIO CONSULTA POR ÍTEMS ----
        sortedMedicalCenters() {
          const centers = new Set();
          this.consultas.forEach(c => {
            const v = c.hospital || c.centroMedico || c.center;
            if (v) centers.add(v);
          });
          return [...centers].sort((a,b) => a.localeCompare(b, 'es'));
        },

        applySavedCenter() {
          if (this.form.savedCenter && this.form.savedCenter !== '__otro__') {
            this.form.hospital = this.form.savedCenter;
          } else if (this.form.savedCenter === '__otro__') {
            this.form.hospital = '';
          }
        },

        sortedMedicationNames() {
          const names = new Set();
          this.medicamentos.forEach(m => { if (m.name) names.add(m.name); });
          this.consultas.forEach(c => {
            (c.medicationItems || []).forEach(m => { if (m.name) names.add(m.name); });
          });
          return [...names].sort((a,b) => a.localeCompare(b, 'es'));
        },

        addMedicationItem() {
          if (!this.form.medicationItems) this.form.medicationItems = [];
          this.form.medicationItems.push({ savedName: '', name: '', dose: '', frequency: '', durationDays: '', durationText: '', route: '', notes: '' });
        },

        applyMedicationName(med) {
          if (med.savedName && med.savedName !== '__otro__') med.name = med.savedName;
          if (med.savedName === '__otro__') med.name = '';
        },

        sortedExamOrderNames() {
          const names = new Set();
          (this.examOrders || []).forEach(o => { if (o.name) names.add(o.name); });
          this.consultas.forEach(c => {
            (c.examOrderItems || []).forEach(o => { if (o.name) names.add(o.name); });
          });
          return [...names].sort((a,b) => a.localeCompare(b, 'es'));
        },

        addExamOrderItem() {
          if (!this.form.examOrderItems) this.form.examOrderItems = [];
          this.form.examOrderItems.push({ savedName: '', name: '', type: 'Laboratorio', notes: '' });
        },

        applyExamOrderName(order) {
          if (order.savedName && order.savedName !== '__otro__') order.name = order.savedName;
          if (order.savedName === '__otro__') order.name = '';
        },

        physicalUnitFor(type) {
          const t = (type || '').toLowerCase();
          if (t.includes('peso')) return 'kg';
          if (t.includes('talla') || t.includes('craneana')) return 'cm';
          if (t.includes('temperatura')) return '°C';
          if (t.includes('saturación')) return '%';
          if (t.includes('frecuencia')) return 'lpm';
          if (t.includes('presión')) return 'mmHg';
          if (t.includes('glucosa') || t.includes('colesterol')) return 'mg/dL';
          return '';
        },

        addPhysicalItem(type = 'Peso') {
          if (!this.form.physicalItems) this.form.physicalItems = [];
          this.form.physicalItems.push({ type, value: '', unit: this.physicalUnitFor(type), notes: '' });
        },

        applyPhysicalUnit(item) {
          if (!item.unit) item.unit = this.physicalUnitFor(item.type);
        },

        physicalMetricKey(type) {
          const t = (type || '').toLowerCase();
          if (t.includes('peso')) return 'weight';
          if (t.includes('talla') || t.includes('estatura')) return 'height';
          if (t.includes('craneana')) return 'headCircumference';
          if (t.includes('temperatura')) return 'temperature';
          if (t.includes('glucosa')) return 'glucose';
          if (t.includes('colesterol')) return 'cholesterol';
          if (t.includes('sistólica')) return 'bpSys';
          if (t.includes('diastólica')) return 'bpDia';
          return '';
        },

        materializeConsultaItems(f) {
          if (f.category !== 'consulta') return f;

          if (Array.isArray(f.physicalItems)) {
            for (const item of f.physicalItems) {
              const key = this.physicalMetricKey(item.type);
              if (key && item.value !== '' && item.value !== null && item.value !== undefined) {
                f[key] = item.value;
              }
            }
          }

          if (Array.isArray(f.medicationItems)) {
            f.medicationsText = f.medicationItems
              .filter(m => m.name)
              .map(m => [m.name, m.dose, m.frequency, (m.durationDays ? m.durationDays + ' días' : m.durationText), m.route, m.notes].filter(Boolean).join(' | '))
              .join('\n');
          }

          if (Array.isArray(f.examOrderItems)) {
            f.examOrdersText = f.examOrderItems
              .filter(o => o.name)
              .map(o => [o.name, o.type, o.notes].filter(Boolean).join(' | '))
              .join('\n');
          }

          return f;
        },

        // ---- MEDICAMENTOS TOMA ----
        // medTakenToday = array of {medId, doseIdx} objects
        isTakenToday(medId) {
          return this.medTakenToday.some(t => t.medId === medId);
        },

        isDoseTaken(medId, doseIdx) {
          return this.medTakenToday.some(t => t.medId === medId && t.doseIdx === doseIdx);
        },

        medTakenCountToday(medId) {
          return this.medTakenToday.filter(t => t.medId === medId).length;
        },

        async toggleDose(medId, name, dose, doseIdx, time) {
          const today = new Date().toISOString().split('T')[0];
          const already = this.isDoseTaken(medId, doseIdx);
          const doseKey = `${medId}_${doseIdx}`;
          if (already) {
            this.medTakenToday = this.medTakenToday.filter(t => !(t.medId === medId && t.doseIdx === doseIdx));
            if (isFirebaseReady && this.currentUser) {
              const snap = await this.profilePath().collection('medTaken')
                .where('medId','==',medId).where('doseIdx','==',doseIdx).where('date','==',today).get();
              snap.docs.forEach(d => d.ref.delete());
            }
          } else {
            this.medTakenToday.push({ medId, doseIdx });
            const data = { medId, doseIdx, doseKey, date: today, time, name, dose, profileId: this.currentProfile.id };
            if (isFirebaseReady && this.currentUser) {
              await this.profilePath().collection('medTaken').add(data);
            } else {
              await localDB.medTaken.add(data);
            }
          }
        },

        // ---- TERMINAR TRATAMIENTO ----
        async finishTreatment(med) {
          const patch = { active: false, finishedAt: new Date().toISOString().split('T')[0] };
          try {
            if (isFirebaseReady && this.currentUser) {
              await this.profilePath().collection('medicamentos').doc(med.id).set(patch, { merge: true });
            } else if (localDB) {
              await localDB.entries.update(med.id, patch);
            }
            this.medicamentos = this.medicamentos.map(m =>
              m.id === med.id ? { ...m, ...patch } : m
            );
            // Switch to historial tab so user sees where it went
            this.medTab = 'historial';
            this.showToast('Tratamiento concluido ✓ — movido a Historial');
          } catch(e) {
            this.showToast('Error: ' + e.message, 'error');
          }
        },

        // Legacy compat
        async toggleMedTakenById(medId, name, dose) { await this.toggleDose(medId, name, dose, 0, '08:00'); },
        toggleMedTaken(med) { this.toggleDose(med.id, med.name, med.dose, 0, '08:00'); },


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

        // ---- FRECUENCIA → DOSIS/DÍA + HORARIOS ----
        FREQUENCY_MAP: {
          'Cada 6 horas':   { hours: 6,  doses: 4, times: ['06:00','10:00','14:00','18:00'] },
          'Cada 8 horas':   { hours: 8,  doses: 3, times: ['06:00','12:00','18:00'] },
          'Cada 12 horas':  { hours: 12, doses: 2, times: ['06:00','18:00'] },
          'Diaria':         { hours: 24, doses: 1, times: ['08:00'] },
          'Cada 24 horas':  { hours: 24, doses: 1, times: ['08:00'] },
          'Cada 2 días':    { hours: 48, doses: 1, times: ['08:00'] },
          'Semanal':        { hours: 168,doses: 1, times: ['08:00'] },
          'Según necesidad':{ hours: 0,  doses: 0, times: [] },
        },

        dosesPerDay(frequency) {
          return this.FREQUENCY_MAP[frequency]?.doses ?? 1;
        },

        scheduledTimes(frequency) {
          return this.FREQUENCY_MAP[frequency]?.times ?? ['08:00'];
        },

        takenCountToday(medId) {
          return this.medTakenToday.filter(id => id === medId).length;
        },

        // ---- PERCENTILES OMS (niños varones y mujeres 0–24 meses) ----
        // Fuente: OMS Growth Standards 2006 — adoptadas por Minsal Chile
        // Datos: peso (kg) y talla (cm) por mes, percentiles P3/P15/P50/P85/P97
        WHO_WEIGHT_M: {
          // mes: [P3, P15, P50, P85, P97]
          0:[2.5,2.9,3.3,3.9,4.3], 1:[3.4,3.9,4.5,5.1,5.7], 2:[4.4,4.9,5.6,6.3,7.1],
          3:[5.1,5.7,6.4,7.2,8.0], 4:[5.6,6.2,7.0,7.9,8.7], 5:[6.0,6.7,7.5,8.4,9.3],
          6:[6.4,7.1,7.9,8.8,9.8], 7:[6.7,7.4,8.3,9.2,10.2], 8:[6.9,7.7,8.6,9.6,10.7],
          9:[7.1,7.9,8.9,9.9,11.0], 10:[7.4,8.2,9.2,10.2,11.4], 11:[7.6,8.4,9.4,10.5,11.7],
          12:[7.7,8.6,9.6,10.8,12.0], 13:[8.0,8.8,9.9,11.0,12.3], 14:[8.2,9.1,10.1,11.3,12.6],
          15:[8.4,9.3,10.4,11.5,12.8], 16:[8.6,9.5,10.6,11.8,13.2], 17:[8.8,9.7,10.9,12.1,13.5],
          18:[8.9,9.9,11.1,12.4,13.7], 19:[9.1,10.1,11.3,12.6,14.0], 20:[9.3,10.3,11.5,12.8,14.3],
          21:[9.5,10.5,11.8,13.1,14.6], 22:[9.7,10.7,12.0,13.4,14.9], 23:[9.9,10.9,12.2,13.6,15.2],
          24:[10.1,11.1,12.4,13.9,15.5]
        },
        WHO_HEIGHT_M: {
          0:[46.1,47.9,49.9,51.8,53.4], 1:[51.1,53.0,54.7,56.5,57.6], 2:[54.7,56.4,58.4,60.4,62.4],
          3:[57.6,59.4,61.4,63.5,65.5], 4:[60.0,61.8,63.9,65.9,67.8], 5:[61.7,63.8,65.9,68.0,69.9],
          6:[63.3,65.5,67.6,69.8,71.6], 7:[64.8,67.0,69.2,71.3,73.2], 8:[66.2,68.4,70.6,72.8,74.7],
          9:[67.5,69.7,72.0,74.2,76.2], 10:[68.7,71.0,73.3,75.6,77.6], 11:[69.9,72.2,74.5,76.9,78.9],
          12:[71.0,73.4,75.7,78.1,80.2], 13:[72.1,74.5,76.9,79.3,81.4], 14:[73.1,75.6,78.0,80.5,82.6],
          15:[74.1,76.6,79.1,81.6,83.7], 16:[75.0,77.6,80.2,82.7,84.9], 17:[76.0,78.6,81.2,83.7,86.0],
          18:[76.9,79.6,82.3,84.8,87.1], 19:[77.7,80.5,83.2,85.8,88.1], 20:[78.6,81.4,84.2,86.8,89.1],
          21:[79.4,82.3,85.1,87.8,90.1], 22:[80.2,83.1,86.0,88.7,91.1], 23:[81.0,83.9,86.9,89.6,92.1],
          24:[81.7,84.8,87.8,90.6,93.0]
        },
        WHO_WEIGHT_F: {
          0:[2.4,2.8,3.2,3.7,4.2], 1:[3.2,3.6,4.2,4.8,5.4], 2:[4.0,4.5,5.1,5.8,6.6],
          3:[4.6,5.2,5.8,6.6,7.5], 4:[5.1,5.7,6.4,7.2,8.2], 5:[5.5,6.1,6.9,7.8,8.8],
          6:[5.8,6.5,7.3,8.2,9.3], 7:[6.1,6.8,7.6,8.6,9.8], 8:[6.3,7.0,7.9,9.0,10.2],
          9:[6.6,7.3,8.2,9.3,10.5], 10:[6.8,7.5,8.5,9.6,10.9], 11:[7.0,7.7,8.7,9.9,11.2],
          12:[7.1,7.9,8.9,10.1,11.5], 13:[7.3,8.1,9.2,10.4,11.8], 14:[7.5,8.3,9.4,10.7,12.2],
          15:[7.7,8.5,9.6,11.0,12.5], 16:[7.9,8.7,9.9,11.2,12.8], 17:[8.1,8.9,10.1,11.5,13.1],
          18:[8.3,9.1,10.4,11.8,13.5], 19:[8.5,9.3,10.6,12.1,13.8], 20:[8.7,9.5,10.8,12.3,14.1],
          21:[8.8,9.7,11.1,12.6,14.4], 22:[9.0,9.9,11.3,12.9,14.7], 23:[9.2,10.2,11.5,13.1,15.0],
          24:[9.4,10.4,11.8,13.4,15.3]
        },
        WHO_HEIGHT_F: {
          0:[45.6,47.3,49.1,51.0,52.9], 1:[50.0,51.7,53.7,55.6,57.4], 2:[53.2,55.0,57.1,59.1,61.1],
          3:[55.8,57.7,59.8,61.9,63.9], 4:[58.0,60.0,62.1,64.3,66.2], 5:[59.6,61.8,64.0,66.2,68.2],
          6:[61.2,63.5,65.7,68.0,70.0], 7:[62.7,65.0,67.3,69.7,71.6], 8:[64.0,66.4,68.7,71.1,73.2],
          9:[65.3,67.7,70.1,72.6,74.7], 10:[66.5,69.0,71.5,74.0,76.1], 11:[67.7,70.3,72.8,75.3,77.5],
          12:[68.9,71.4,74.0,76.6,78.9], 13:[70.0,72.6,75.2,77.9,80.2], 14:[71.0,73.7,76.4,79.1,81.4],
          15:[72.0,74.8,77.5,80.3,82.7], 16:[73.0,75.8,78.6,81.4,83.9], 17:[74.0,76.8,79.7,82.6,85.1],
          18:[75.0,77.8,80.7,83.7,86.2], 19:[75.8,78.8,81.7,84.7,87.3], 20:[76.7,79.7,82.7,85.7,88.4],
          21:[77.5,80.5,83.7,86.7,89.4], 22:[78.4,81.4,84.6,87.7,90.4], 23:[79.2,82.3,85.5,88.6,91.4],
          24:[80.0,83.2,86.4,89.5,92.4]
        },

        getAgeInMonths(measurement) {
          if (!measurement?.date || !this.currentProfile?.birthdate) return null;
          const mDate = measurement.date?.toDate ? measurement.date.toDate() : new Date(measurement.date);
          const bDate = new Date(this.currentProfile.birthdate);
          const months = (mDate.getFullYear() - bDate.getFullYear()) * 12 + (mDate.getMonth() - bDate.getMonth());
          return Math.max(0, Math.min(24, Math.round(months)));
        },

        getPercentile(metric, measurement) {
          if (!measurement || !this.currentProfile?.sex || !this.currentProfile?.birthdate) return null;
          const value = parseFloat(measurement[metric]);
          if (!value || isNaN(value)) return null;
          const months = this.getAgeInMonths(measurement);
          if (months === null || months > 24) return null;
          const sex = this.currentProfile.sex;
          const table = metric === 'weight'
            ? (sex === 'M' ? this.WHO_WEIGHT_M : this.WHO_WEIGHT_F)
            : (sex === 'M' ? this.WHO_HEIGHT_M : this.WHO_HEIGHT_F);
          const row = table[months];
          if (!row) return null;
          const [p3, p15, p50, p85, p97] = row;
          if (value < p3)  return 3;
          if (value < p15) return 15;
          if (value < p50) return 50;
          if (value < p85) return 75;
          if (value < p97) return 85;
          return 97;
        },

        percentileColor(p) {
          if (!p) return '';
          if (p <= 3 || p >= 97) return 'text-red-500';
          if (p <= 15 || p >= 85) return 'text-amber-500';
          return 'text-green-600';
        },

        // ---- FUNCIONES LINKED DESDE CONSULTA ----

        async createLinkedMeasurementFromConsulta(consulta) {
          const metrics = ['weight','height','headCircumference','glucose','bpSys','bpDia','cholesterol','temperature'];
          const hasMetric = metrics.some(k => consulta[k] !== undefined && consulta[k] !== '' && consulta[k] !== null);
          // Also check physicalItems array
          const hasPhysical = Array.isArray(consulta.physicalItems) && consulta.physicalItems.some(p => p.value !== '' && p.value !== null && p.value !== undefined);
          if (!hasMetric && !hasPhysical) return;

          const meas = { category: 'medicion', profileId: this.currentProfile.id, date: consulta.date, title: 'Medición desde ' + (consulta.title || 'consulta'), relatedControlTitle: consulta.title || 'Consulta' };
          metrics.forEach(k => { if (consulta[k] !== undefined && consulta[k] !== '' && consulta[k] !== null) meas[k] = consulta[k]; });

          // Also materialize physicalItems into meas
          if (Array.isArray(consulta.physicalItems)) {
            for (const item of consulta.physicalItems) {
              const key = this.physicalMetricKey(item.type);
              if (key && item.value !== '' && item.value !== null && item.value !== undefined) meas[key] = item.value;
            }
          }

          let measId;
          if (isFirebaseReady && this.currentUser) {
            const ref = await this.profilePath().collection('mediciones').add({ ...meas, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
            measId = ref.id;
          } else {
            measId = Date.now().toString() + '_m';
            if (localDB) await localDB.entries.add({ ...meas, id: measId });
          }
          this.mediciones.unshift({ ...meas, id: measId });
        },

        async createLinkedMedicationsFromConsulta(consulta) {
          const items = consulta.medicationItems;
          if (!Array.isArray(items) || items.length === 0) return;
          for (const item of items) {
            // Normalize: accept name OR savedName (from form autocomplete)
            const name = item.name || item.savedName || '';
            if (!name) continue;

            // Normalize frequency — accept text variants
            const freq = item.frequency || item.durationText || 'Diaria';

            const med = {
              category: 'medicamento',
              profileId: this.currentProfile.id,
              name,
              dose:      item.dose      || '',
              frequency: freq,
              route:     item.route     || '',
              notes:     item.notes     || '',
              startDate: consulta.date,
              active:    true,
              doctor:    consulta.doctor    || '',
              hospital:  consulta.hospital  || '',
              sourceConsultaTitle: consulta.title || '',
            };

            const days = item.durationDays ? Number(item.durationDays) : null;
            if (days) {
              med.durationDays = days;
              med.endDate = this.estimatedEndDate(consulta.date, days);
            }

            let medId;
            if (isFirebaseReady && this.currentUser) {
              const ref = await this.profilePath().collection('medicamentos').add({ ...med, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
              medId = ref.id;
            } else {
              medId = Date.now().toString() + '_med_' + Math.random().toString(16).slice(2);
              if (localDB) await localDB.entries.add({ ...med, id: medId });
            }
            this.medicamentos.unshift({ ...med, id: medId });
          }
        },

        async createLinkedExamOrdersFromConsulta(consulta) {
          const items = consulta.examOrderItems;
          if (!Array.isArray(items) || items.length === 0) return;
          for (const item of items) {
            const name = item.name || item.savedName || '';
            if (!name) continue;
            const order = {
              category:  'examen',
              profileId: this.currentProfile.id,
              title:     name,
              name:      name,
              subtype:   item.type || item.subtype || 'Otro',
              notes:     item.notes || '',
              date:      consulta.date,
              status:    item.scheduledDate ? 'Agendado' : 'Pendiente',
              scheduledDate: item.scheduledDate || '',
              doctor:    consulta.doctor  || '',
              hospital:  consulta.hospital || '',
              sourceConsultaId:    consulta.id    || '',
              sourceConsultaTitle: consulta.title || '',
            };
            let orderId;
            if (isFirebaseReady && this.currentUser) {
              const ref = await this.profilePath().collection('examenes').add({ ...order, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
              orderId = ref.id;
            } else {
              orderId = Date.now().toString() + '_ord_' + Math.random().toString(16).slice(2);
              if (localDB) await localDB.entries.add({ ...order, id: orderId });
            }
            this.examenes.unshift({ ...order, id: orderId });
          }
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
            this.renderGrowthChart('weightGrowthChart', 'weight', 'Peso', 'kg', '#0ea5e9');
            this.renderGrowthChart('heightGrowthChart', 'height', 'Talla', 'cm', '#8b5cf6');
            this.renderMetricChart('headCircumferenceChart', 'headCircumference', 'Circunferencia craneana (cm)', '#14b8a6');
            this.renderMetricChart('glucoseChart', 'glucose', 'Glucosa (mg/dL)', '#f59e0b');
            this.renderMetricChart('bpSysChart', 'bpSys', 'Presión sistólica', '#ef4444');
            this.renderMetricChart('bpDiaChart', 'bpDia', 'Presión diastólica', '#ec4899');
            this.renderMetricChart('cholesterolChart', 'cholesterol', 'Colesterol (mg/dL)', '#10b981');
          });
        },

        renderGrowthChart(canvasId, key, label, unit, color) {
          const el = document.getElementById(canvasId);
          if (!el) return;
          this.destroyChart(canvasId);
          const series = [...this.mediciones]
            .filter(m => m[key] !== undefined && m[key] !== '' && m[key] !== null && !isNaN(Number(m[key])))
            .sort((a, b) => {
              const da = a.date?.toDate ? a.date.toDate() : new Date(a.date);
              const db2 = b.date?.toDate ? b.date.toDate() : new Date(b.date);
              return da - db2;
            });
          if (series.length < 1) return;

          const labels = series.map(m => this.formatDate(m.date?.toDate ? m.date.toDate() : new Date(m.date)));
          const values = series.map(m => Number(m[key]));

          // Deltas for tooltip
          const deltas = values.map((v, i) => {
            if (i === 0) return null;
            const prev = values[i - 1];
            const diff = v - prev;
            const pct = ((diff / prev) * 100).toFixed(1);
            return { diff: diff.toFixed(1), pct, prev };
          });

          this.charts[canvasId] = new Chart(el, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label,
                data: values,
                borderColor: color,
                backgroundColor: color + '18',
                tension: 0.35,
                fill: true,
                pointBackgroundColor: color,
                pointRadius: 6,
                pointHoverRadius: 8,
                datalabels: { display: false }
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (items) => labels[items[0].dataIndex],
                    label: (item) => {
                      const i = item.dataIndex;
                      const v = values[i];
                      const d = deltas[i];
                      const lines = [`${label}: ${v} ${unit}`];
                      if (d) {
                        const sign = Number(d.diff) >= 0 ? '+' : '';
                        lines.push(`Variación: ${sign}${d.diff} ${unit} (${sign}${d.pct}%)`);
                        lines.push(`Control anterior: ${d.prev} ${unit}`);
                      } else {
                        lines.push('Primer registro');
                      }
                      return lines;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: false,
                  ticks: {
                    callback: v => v + ' ' + unit
                  }
                },
                x: { ticks: { maxRotation: 30, autoSkip: true } }
              }
            },
            plugins: [{
              id: 'dataLabels',
              afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                chart.data.datasets.forEach((dataset, i) => {
                  const meta = chart.getDatasetMeta(i);
                  meta.data.forEach((point, index) => {
                    const val = dataset.data[index];
                    ctx.save();
                    ctx.font = 'bold 11px DM Sans, sans-serif';
                    ctx.fillStyle = color;
                    ctx.textAlign = 'center';
                    ctx.fillText(val + ' ' + unit, point.x, point.y - 12);
                    ctx.restore();
                  });
                });
              }
            }]
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
            ...m,
            taken: this.isTakenToday(m.id),
            takenCount: this.medTakenCountToday(m.id),
            totalDoses: this.dosesPerDay(m.frequency),
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
          if (m?.temperature) parts.push('T° ' + m.temperature);
          if (m?.vitals) parts.push(m.vitals);
          if (m?.glucose) parts.push('Glucosa ' + m.glucose + ' mg/dL');
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
          const t = { title:'Título', name:'Nombre', date:'Fecha', notes:'Notas', result:'Resultado', lab:'Laboratorio', subtype:'Tipo', doctor:'Médico', specialty:'Especialidad', hospital:'Centro', diagnosis:'Diagnóstico', dose:'Dosis', frequency:'Frecuencia', startDate:'Inicio', endDate:'Fin estimado', durationDays:'Duración del tratamiento (días)', visitType:'Tipo de control', stock:'Stock', active:'Activo', severity:'Severidad', reaction:'Reacción', surgeon:'Cirujano', center:'Centro', nextDate:'Próxima fecha', nextControlDate:'Fecha próximo control', weight:'Peso', height:'Estatura', glucose:'Glucosa', headCircumference:'Circunferencia craneana', temperature:'Temperatura', vitals:'Signos vitales', physicalExam:'Examen físico', medicationItems:'Medicamentos indicados', examOrderItems:'Órdenes / exámenes', physicalItems:'Examen físico', medicationsText:'Medicamentos indicados', generalInstructions:'Indicaciones generales', relatedControlTitle:'Control asociado', bpSys:'Presión Sist.', bpDia:'Presión Diast.', cholesterol:'Colesterol', headCircumference:'Perímetro cefálico', fileUrl:'Archivo', category:'Categoría', lastDate:'Último control', frequencyMonths:'Frecuencia meses', expirationDate:'Vence receta', startTime:'Hora inicial', frequencyHours:'Cada horas', endRealDate:'Término real', endReason:'Motivo término', scheduledTime:'Hora programada', loggedAt:'Hora registro', status:'Estado' };
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
          this.jsonLoader = { show: false, text: '', error: '' };
          this.modal.editing = false;
          this.modal.editForm = {};
          this.form = { date: today, active: true };
          if (type === 'consulta') this.form = { date: today, controlType: 'Consulta general', title: '', savedDoctor: '', doctor: '', specialty: '', savedCenter: '', hospital: '', nextControlDate: '', nextControlPreset: '', physicalItems: [], medicationItems: [], examOrderItems: [], diagnosis: '', physicalExam: '', generalInstructions: '', active: true };
          if (type === 'medicamento') this.form = { name: '', dose: '', frequency: 'Diaria', startDate: today, durationDays: 10, stock: '', active: true };
          if (type === 'control') this.form = { title: '', lastDate: today, frequencyMonths: 12, icon: '🩺', active: true };
          if (type === 'receta') this.form = { name: '', dose: '', frequencyHours: 12, startTime: '08:00', durationDays: 7, startDate: today, endDate: '', expirationDate: '', active: true };
          this.modal = { show: true, type, entry: null };
        },

        // ---- EDICIÓN MEDICAMENTO ----
        openEditMedicamento(entry) {
          this.modal.editing = true;
          this.modal.editForm = {
            name:         entry.name         || '',
            dose:         entry.dose         || '',
            frequency:    entry.frequency    || 'Diaria',
            startDate:    entry.startDate?.toDate ? entry.startDate.toDate().toISOString().split('T')[0] : (entry.startDate || ''),
            durationDays: entry.durationDays || '',
            stock:        entry.stock        || '',
            active:       entry.active !== undefined ? entry.active : true,
            notes:        entry.notes        || '',
          };
        },

        async saveEditMedicamento() {
          const entry = this.modal.entry;
          if (!this.modal.editForm.name) { this.showToast('El nombre es obligatorio', 'error'); return; }

          // Recalculate endDate if startDate or durationDays changed
          const ef = { ...this.modal.editForm };
          if (ef.startDate && ef.durationDays) {
            ef.endDate = this.estimatedEndDate(ef.startDate, ef.durationDays);
          }

          // Strip empty fields
          const patch = {};
          for (const [k, v] of Object.entries(ef)) {
            if (v !== '' && v !== null && v !== undefined) patch[k] = v;
          }

          try {
            if (isFirebaseReady && this.currentUser) {
              await this.profilePath().collection('medicamentos').doc(entry.id).set(patch, { merge: true });
            } else if (localDB) {
              await localDB.entries.update(entry.id, patch);
            }

            // Update local state
            this.medicamentos = this.medicamentos.map(m =>
              m.id === entry.id ? { ...m, ...patch } : m
            );
            // Update the entry shown in modal
            this.modal.entry = { ...entry, ...patch };
            this.modal.editing = false;
            this.showToast('Medicamento actualizado ✓');
          } catch(e) {
            this.showToast('Error al guardar: ' + e.message, 'error');
          }
        },

        // ---- ENRIQUECER CONSULTA (Fase 2) ----
        openEnrichMenu(consulta) {
          this.enrichingConsulta = consulta;
          this.enrichMenu = true;
        },

        openEnrichModal(type) {
          this.enrichMenu = false;
          this.enrichJsonLoader = { show: false, text: '', error: '' };
          this.enrichModal = { show: true, type };
          // Pre-init form
          if (type === 'physicalItems') {
            this.form = { weight:'', height:'', headCircumference:'', temperature:'', saturation:'', heartRate:'', bpSys:'', bpDia:'', glucose:'', cholesterol:'', notes:'' };
          } else if (type === 'medicationItems') {
            this.form = { items: [{ name:'', dose:'', frequency:'Diaria', durationDays:'', route:'', notes:'' }] };
          } else if (type === 'examOrderItems') {
            this.form = { items: [{ name:'', type:'Otro', notes:'', scheduledDate:'' }] };
          }
        },

        loadEnrichFromJSON() {
          this.enrichJsonLoader.error = '';
          let data;
          try { data = JSON.parse(this.enrichJsonLoader.text.trim()); }
          catch(e) { this.enrichJsonLoader.error = 'JSON inválido'; return; }

          const type = this.enrichModal.type;
          if (type === 'physicalItems') {
            const p = Array.isArray(data) ? data[0] : data;
            this.form = {
              weight: p.weight || p.peso || '',
              height: p.height || p.talla || '',
              headCircumference: p.headCircumference || p.cc || p.circunferenciaCraneana || '',
              temperature: p.temperature || p.temperatura || '',
              saturation: p.saturation || p.saturacion || '',
              heartRate: p.heartRate || p.frecuenciaCardiaca || '',
              bpSys: p.bpSys || p.presionSistolica || '',
              bpDia: p.bpDia || p.presionDiastolica || '',
              glucose: p.glucose || p.glucosa || '',
              cholesterol: p.cholesterol || p.colesterol || '',
              notes: p.notes || p.descripcion || ''
            };
          } else if (type === 'medicationItems') {
            const arr = Array.isArray(data) ? data : (data.medicationItems || [data]);
            this.form = { items: arr.map(m => ({
              name: m.name || m.nombre || '',
              dose: m.dose || m.dosis || '',
              frequency: m.frequency || m.frecuencia || 'Diaria',
              durationDays: String(m.durationDays || m.dias || ''),
              route: m.route || m.via || '',
              notes: m.notes || m.observaciones || ''
            }))};
          } else if (type === 'examOrderItems') {
            const arr = Array.isArray(data) ? data : (data.examOrderItems || [data]);
            this.form = { items: arr.map(o => ({
              name: o.name || o.nombre || '',
              type: o.type || o.tipo || 'Otro',
              notes: o.notes || o.indicacion || '',
              scheduledDate: o.scheduledDate || ''
            }))};
          }
          this.enrichJsonLoader.show = false;
          this.enrichJsonLoader.text = '';
          this.showToast('JSON cargado ✓ — revisa y guarda');
        },

        async saveEnrichment() {
          const c = this.enrichingConsulta;
          if (!c) return;
          const type = this.enrichModal.type;
          const patch = {};

          if (type === 'physicalItems') {
            // Save physical items
            const f = this.form;
            const items = [];
            if (f.weight)            { patch.weight = f.weight; items.push({ type:'Peso', value: f.weight, unit:'kg' }); }
            if (f.height)            { patch.height = f.height; items.push({ type:'Talla', value: f.height, unit:'cm' }); }
            if (f.headCircumference) { patch.headCircumference = f.headCircumference; items.push({ type:'Circunferencia craneana', value: f.headCircumference, unit:'cm' }); }
            if (f.temperature)       { patch.temperature = f.temperature; items.push({ type:'Temperatura', value: f.temperature, unit:'°C' }); }
            if (f.saturation)        { patch.saturation = f.saturation; items.push({ type:'Saturación', value: f.saturation, unit:'%' }); }
            if (f.heartRate)         { patch.heartRate = f.heartRate; items.push({ type:'Frecuencia cardíaca', value: f.heartRate, unit:'lpm' }); }
            if (f.bpSys)             { patch.bpSys = f.bpSys; }
            if (f.bpDia)             { patch.bpDia = f.bpDia; if (f.bpSys) items.push({ type:'Presión arterial', value: f.bpSys + '/' + f.bpDia, unit:'mmHg' }); }
            if (f.glucose)           { patch.glucose = f.glucose; items.push({ type:'Glucosa', value: f.glucose, unit:'mg/dL' }); }
            if (f.cholesterol)       { patch.cholesterol = f.cholesterol; items.push({ type:'Colesterol', value: f.cholesterol, unit:'mg/dL' }); }
            if (f.notes)             { patch.physicalExam = f.notes; }
            patch.physicalItems = [...(c.physicalItems || []), ...items];

            // Also create a medicion record
            await this.createLinkedMeasurementFromConsulta({ ...c, ...patch });
          }

          if (type === 'medicationItems') {
            const newItems = (this.form.items || []).filter(m => m.name);
            patch.medicationItems = [...(c.medicationItems || []), ...newItems];
            // Create medication records
            await this.createLinkedMedicationsFromConsulta({ ...c, medicationItems: newItems });
          }

          if (type === 'examOrderItems') {
            const newItems = (this.form.items || []).filter(o => o.name);
            patch.examOrderItems = [...(c.examOrderItems || []), ...newItems];
            // Create exam records with scheduledDate
            await this.createLinkedExamOrdersFromConsulta({ ...c, examOrderItems: newItems });
          }

          // Update consulta in Firestore
          try {
            if (isFirebaseReady && this.currentUser) {
              await this.profilePath().collection('consultas').doc(c.id).set(patch, { merge: true });
            }
            // Update local state
            this.consultas = this.consultas.map(x => x.id === c.id ? { ...x, ...patch } : x);
            this.enrichingConsulta = { ...c, ...patch };
            this.enrichModal.show = false;
            this.showToast('Guardado y vinculado ✓');
          } catch(e) {
            this.showToast('Error: ' + e.message, 'error');
          }
        },

        // ── Exam scheduled date helpers ───────────────────────────────────────
        examenesConFecha() {
          return this.examenes.filter(e => e.scheduledDate && e.status !== 'Completado');
        },

        daysUntilExam(exam) {
          if (!exam.scheduledDate) return null;
          const d = exam.scheduledDate?.toDate ? exam.scheduledDate.toDate() : new Date(exam.scheduledDate);
          return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
        },

        // ---- PERFIL EDICIÓN ----
        openEditProfile() {
          this.profileForm = {
            name:      this.currentProfile?.name      || '',
            birthdate: this.currentProfile?.birthdate || '',
            sex:       this.currentProfile?.sex       || 'M',
            relation:  this.currentProfile?.relation  || 'Yo',
            emoji:     this.currentProfile?.emoji     || '👤',
            color:     this.currentProfile?.color     || '#0ea5e9',
            alergias:  this.currentProfile?.alergias  || '',
            cirugias:  this.currentProfile?.cirugiasList || '',
          };
          this.editingProfile = true;
        },

        async saveProfile() {
          if (!this.profileForm.name) { this.showToast('El nombre es obligatorio', 'error'); return; }
          const patch = {
            name:          this.profileForm.name,
            birthdate:     this.profileForm.birthdate,
            sex:           this.profileForm.sex,
            relation:      this.profileForm.relation,
            emoji:         this.profileForm.emoji,
            color:         this.profileForm.color,
            alergias:      this.profileForm.alergias,
            cirugiasList:  this.profileForm.cirugias,
          };
          try {
            if (isFirebaseReady && this.currentUser) {
              await db.collection('users').doc(this.currentUser.uid)
                .collection('profiles').doc(this.currentProfile.id)
                .set(patch, { merge: true });
            } else if (localDB) {
              await localDB.profiles.update(this.currentProfile.id, patch);
            }
            this.currentProfile = { ...this.currentProfile, ...patch };
            this.profiles = this.profiles.map(p => p.id === this.currentProfile.id ? this.currentProfile : p);
            this.editingProfile = false;
            this.showToast('Perfil actualizado ✓');
          } catch(e) {
            this.showToast('Error al guardar: ' + e.message, 'error');
          }
        },

        // ---- EXAMEN STATUS UPDATE ----
        async updateExamStatus(exam, newStatus) {
          const patch = { status: newStatus };
          if (newStatus === 'Agendado' && this.examStatusForm.scheduledDate) {
            patch.scheduledDate = this.examStatusForm.scheduledDate;
          }
          if (newStatus === 'Completado' && this.examStatusForm.result) {
            patch.result = this.examStatusForm.result;
            patch.resultDate = this.examStatusForm.resultDate || new Date().toISOString().split('T')[0];
          }
          try {
            if (isFirebaseReady && this.currentUser) {
              await this.profilePath().collection('examenes').doc(exam.id).set(patch, { merge: true });
            } else if (localDB) {
              await localDB.entries.update(exam.id, patch);
            }
            this.examenes = this.examenes.map(e => e.id === exam.id ? { ...e, ...patch } : e);
            this.examStatusForm = {};
            this.modal.show = false;
            this.showToast('Examen actualizado ✓');
          } catch(e) {
            this.showToast('Error: ' + e.message, 'error');
          }
        },

        examStatusColor(status) {
          if (status === 'Pendiente')  return 'bg-amber-100 text-amber-700';
          if (status === 'Agendado')   return 'bg-sky-100 text-sky-700';
          if (status === 'Completado') return 'bg-green-100 text-green-700';
          return 'bg-slate-100 text-slate-600';
        },

        examStatusIcon(status) {
          if (status === 'Pendiente')  return '⏳';
          if (status === 'Agendado')   return '📅';
          if (status === 'Completado') return '✅';
          return '🔬';
        },

        // ---- CARGADOR JSON ----
        loadConsultaFromJSON() {
          this.jsonLoader.error = '';
          let data;
          try {
            data = JSON.parse(this.jsonLoader.text.trim());
          } catch(e) {
            this.jsonLoader.error = 'JSON inválido. Verifica el formato y vuelve a intentarlo.';
            return;
          }

          const today = new Date().toISOString().split('T')[0];

          // ── Título por defecto: "Control - Especialidad" si no viene title ──
          const specialty = data.specialty || '';
          const title = data.title || (specialty ? 'Control - ' + specialty : 'Consulta');

          // ── Normalizar medicationItems desde JSON ──
          const medicationItems = (Array.isArray(data.medicationItems) ? data.medicationItems : []).map(m => ({
            savedName:    m.name || m.savedName || '',
            name:         m.name || m.savedName || '',
            dose:         m.dose         || '',
            frequency:    m.frequency    || 'Diaria',
            durationDays: m.durationDays ? String(m.durationDays) : '',
            durationText: m.durationText || (m.durationDays ? m.durationDays + ' días' : ''),
            route:        m.route        || '',
            notes:        m.notes        || '',
          }));

          // ── Normalizar examOrderItems desde JSON ──
          const examOrderItems = (Array.isArray(data.examOrderItems) ? data.examOrderItems : []).map(o => ({
            name:        o.name        || o.savedName || '',
            type:        o.type        || o.subtype   || 'Otro',
            notes:       o.notes       || '',
            indication:  o.indication  || '',
          }));

          // ── Hospital: acepta hospital, center o centre ──
          const hospital = data.hospital || data.center || data.centre || '';

          this.form = {
            date:                data.date        || today,
            title,
            controlType:         data.visitType   || data.controlType || 'Consulta general',
            // Doctor: cargar en campo libre (savedDoctor = __otro__ para forzar input visible)
            savedDoctor:         '__otro__',
            doctor:              data.doctor      || '',
            specialty,
            // Hospital: cargar en campo libre (savedCenter = __otro__ para forzar input visible)
            savedCenter:         hospital ? '__otro__' : '',
            hospital,
            diagnosis:           data.diagnosis   || '',
            generalInstructions: data.generalInstructions || data.notes || '',
            nextControlDate:     data.nextControlDate || '',
            physicalItems:       Array.isArray(data.physicalItems) ? data.physicalItems : [],
            medicationItems,
            examOrderItems,
            active: true,
          };

          this.jsonLoader.show = false;
          this.jsonLoader.text = '';
          this.showToast('Datos cargados ✓ — revisa y guarda');
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

    // ---- SERVICE WORKER ----
    // El SW se registra desde sw.js (archivo separado).
    // El blob SW no funciona en GitHub Pages — usa el archivo sw.js incluido en el zip.
    function registerServiceWorker() {
      if (!('serviceWorker' in navigator)) return;
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => {
          // Silencioso si no existe sw.js — la app funciona igual sin SW
        });
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
