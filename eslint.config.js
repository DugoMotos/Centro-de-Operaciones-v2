/* ============================================================
   ESLINT — Configuración para el Centro de Operaciones
   ============================================================
   Objetivo: cazar la clase de bugs que este proyecto es
   propenso a tener por usar scripts clásicos con variables
   globales compartidas entre archivos.

   Las dos reglas que más importan acá:
   - no-redeclare  → detecta funciones definidas dos veces
                     (ej: apiInvEscribirPlaca, que existía
                     duplicada y la segunda pisaba a la primera
                     en silencio)
   - no-undef      → detecta llamadas a funciones que no existen
                     o typos en nombres de variables globales

   ------------------------------------------------------------
   CÓMO USARLO (requiere Node.js instalado)
   ------------------------------------------------------------
     npm install --save-dev eslint
     npx eslint js/

   Para que corrija lo que pueda automáticamente:
     npx eslint js/ --fix
   ============================================================ */

module.exports = [
  {
    files: ['js/**/*.js'],

    languageOptions: {
      ecmaVersion: 2015,
      sourceType: 'script', // scripts clásicos, NO módulos ES6

      globals: {
        // ---- APIs del navegador que usamos ----
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        AbortController: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        Promise: 'readonly',
        Intl: 'readonly',

        /* ------------------------------------------------------
           Globales propias del app.

           Están declaradas con `var` en los archivos de abajo y
           se comparten entre todos. Van como 'writable' porque
           los módulos las mutan.

           >>> Si agregás una variable global nueva en state.js
               o config.js, sumala también acá o ESLint la va a
               reportar como no definida. <<<
           ------------------------------------------------------ */

        // config.js
        SUPABASE_URL: 'writable',
        SUPABASE_ANON_KEY: 'writable',
        SUPABASE_TABLES: 'writable',
        DEFAULT_URLS: 'writable',
        SK_A: 'readonly',
        SK_AC: 'readonly',
        SK_P: 'readonly',
        SK_PC: 'readonly',
        SK_OVR: 'readonly',
        SK_PIN: 'readonly',
        getUrl: 'readonly',
        supabaseReady: 'readonly',

        // data.js
        PREFIXES: 'readonly',
        ACT_C: 'readonly',
        actK: 'readonly',
        RESP_R: 'readonly',
        ALL_R: 'readonly',
        AREAS: 'readonly',
        DAYS: 'readonly',
        TRAM_STEPS: 'readonly',
        ALIST_OPTS: 'readonly',
        ACTIVIDADES_TRAM: 'readonly',
        TOTAL_TRAM: 'readonly',

        // utils.js
        ls: 'readonly',
        sv: 'readonly',
        iD: 'readonly',
        fD: 'readonly',
        fT: 'readonly',
        fIso: 'readonly',
        negFmtFecha: 'readonly',
        negDiasDesde: 'readonly',
        negParseFechaHora: 'readonly',
        negTieneHora: 'readonly',
        negFmtHora: 'readonly',
        negDiaBogota: 'readonly',
        negDiasCalendario: 'readonly',
        esc: 'readonly',
        toast: 'readonly',
        chk: 'readonly',
        negProgressColor: 'readonly',
        negNormMarca: 'readonly',
        negNormTipo: 'readonly',

        // state.js — todas mutables
        main: 'writable',
        adminPin: 'writable',
        cfgAdmin: 'writable',
        cfgPinInput: 'writable',
        urlOverrides: 'writable',
        aCfg: 'writable',
        pCfg: 'writable',
        negMotos: 'writable',
        negAvances: 'writable',
        negLoading: 'writable',
        negError: 'writable',
        negSortKey: 'writable',
        negSortDir: 'writable',
        negFilterArea: 'writable',
        negFilterTipo: 'writable',
        negFilterMarca: 'writable',
        negSearchTxt: 'writable',
        negAsesores: 'writable',
        negFilterAsesor: 'writable',
        negAsesorInput: 'writable',
        negAsesorDropdownOpen: 'writable',
        pSub: 'writable',
        pArea: 'writable',
        pMotos: 'writable',
        pActive: 'writable',
        pAlistSel: 'writable',
        pMode: 'writable',
        pLoading: 'writable',
        pUserArea: 'writable',
        pOpenDays: 'writable',
        pFocusReg: 'writable',
        pExpandStep: 'writable',
        aTab: 'writable',
        aRecs: 'writable',
        aMoto: 'writable',
        aRows: 'writable',
        aChosen: 'writable',
        aSt: 'writable',
        aResp: 'writable',
        aCmt: 'writable',
        aFD: 'writable',
        aFA: 'writable',
        aFR: 'writable',
        aFC: 'writable',
        aLoading: 'writable',
        planData: 'writable',
        planLoading: 'writable',
        planFilter: 'writable',
        planFilterProc: 'writable',
        planFilterEstado: 'writable',
        planFilterFecha: 'writable',
        planExpanded: 'writable',
        planUbicaciones: 'writable',
        planFechaDesde: 'writable',
        planFechaHasta: 'writable',
        planillaFecha: 'writable',
        planillaFilterMarca: 'writable',
        planillaFilterProc: 'writable',
        planillaMostrarEjec: 'writable',
        planillaData: 'writable',
        planillaLoading: 'writable',

        // api.js
        API_TIMEOUT: 'readonly',
        API_TIMEOUT_LONG: 'readonly',
        apiPost: 'readonly',
        apiSupabase: 'readonly',
        apiTramConsultarMoto: 'readonly',
        apiTramEscribirFecha: 'readonly',
        apiContEscribirFecha: 'readonly',
        apiTramListar: 'readonly',
        apiAvanceConsultar: 'readonly',
        apiAvanceEscribir: 'readonly',
        apiCatalogoConsultar: 'readonly',
        apiAvanceConsultarMoto: 'readonly',
        apiAsesoresConsultar: 'readonly',
        apiPlanConsultar: 'readonly',
        apiPlanEscribir: 'readonly',
        apiAlistConsultar: 'readonly',
        apiAlistEscribir: 'readonly',
        apiInvEscribirPlaca: 'readonly',
        apiRegAlistCrear: 'readonly',
        apiRegAlistConsultar: 'readonly',
        apiRegAlistMarcarEjecutada: 'readonly',
        apiRegListar: 'readonly',

        // app.js
        setMain: 'readonly',
        render: 'readonly',
        toggleSide: 'readonly',
        toggleProcParent: 'readonly',
        init: 'readonly',

        // módulos — funciones llamadas desde onclick en el HTML
        renderHome: 'readonly',
        homeSaludo: 'readonly',
        homeFmtHoraCorta: 'readonly',
        homeInitials: 'readonly',
        homeAvatarColor: 'readonly',
        renderNegocios: 'readonly',
        negGetScopeActs: 'readonly',
        negFirstPending: 'readonly',
        negUltimaAct: 'readonly',
        negUltimaActTexto: 'readonly',
        negRender: 'readonly',
        negSort: 'readonly',
        negSync: 'readonly',
        renderProc: 'readonly',
        pFlujoView: 'readonly',
        pTrackView: 'readonly',
        pFindTramStep: 'readonly',
        pBuscar: 'readonly',
        pReg: 'readonly',
        pRegNA: 'readonly',
        pToggle: 'readonly',
        pConfirmAlist: 'readonly',
        pRegPlaca: 'readonly',
        pCheckStep: 'readonly',
        pToggleDay: 'readonly',
        pToggleAll: 'readonly',
        pConfirmPlaca: 'readonly',
        renderAlist: 'readonly',
        aStripNonAlnumUpper: 'readonly',
        aBuscar: 'readonly',
        aElegir: 'readonly',
        aRegistrar: 'readonly',
        aReset: 'readonly',
        aRegView: 'readonly',
        renderPlan: 'readonly',
        planFmtFecha: 'readonly',
        planFmtFechaHora: 'readonly',
        planIsoDate: 'readonly',
        PLAN_PROC_COLOR: 'readonly',
        planToggle: 'readonly',
        planSetPresetRango: 'readonly',
        planSetFechaDesde: 'readonly',
        planSetFechaHasta: 'readonly',
        planPresetActivo: 'readonly',
        planRenderMotoCard: 'readonly',
        planSync: 'readonly',
        renderPlanilla: 'readonly',
        PLANILLA_PROC_COLOR: 'readonly',
        PLANILLA_PROC_ORDEN: 'readonly',
        PLANILLA_MARCAS_FIJAS: 'readonly',
        planillaFmtFechaLarga: 'readonly',
        planillaFmtFechaHora: 'readonly',
        planillaNormMarca: 'readonly',
        planillaRenderBlock: 'readonly',
        planillaSync: 'readonly',
        renderConfig: 'readonly',
        cfgCheckPin: 'readonly'
      }
    },

    rules: {
      /* ------------------------------------------------------
         no-redeclare con builtinGlobals:false

         Las globales de arriba están declaradas para que
         `no-undef` sepa que existen. Pero si dejáramos
         builtinGlobals en true (el default), ESLint reportaría
         CADA definición real como "ya está definida" — cientos
         de errores falsos.

         Con false sigue cazando lo importante: la misma función
         definida dos veces DENTRO de un archivo (que fue
         exactamente el caso de apiInvEscribirPlaca).

         Para duplicados ENTRE archivos, ESLint no sirve: lintea
         cada archivo por separado. Para eso está
         `npm run check:dupes` (scripts/check-duplicados.js).
         ------------------------------------------------------ */
      'no-redeclare': ['error', { builtinGlobals: false }],

      /* ---- Las que cazan los bugs reales de este proyecto ---- */
      'no-undef': 'error',          // nombre que no existe (typo)
      'no-dupe-keys': 'error',      // clave repetida en un objeto
      'no-dupe-args': 'error',
      'no-func-assign': 'error',
      'no-unreachable': 'error',
      'no-fallthrough': 'error',
      'no-cond-assign': 'error',
      'no-self-compare': 'error',
      'valid-typeof': 'error',
      'use-isnan': 'error',

      /* ------------------------------------------------------
         no-unused-vars: APAGADA a propósito.

         Casi todas las funciones y variables de este proyecto se
         usan desde OTRO archivo o desde un onclick en el HTML.
         ESLint no ve nada de eso, así que reportaría ~200 falsos
         positivos y volvería inútil la salida.
         ------------------------------------------------------ */
      'no-unused-vars': 'off',

      /* ---- Higiene, como aviso ---- */
      'no-empty': ['warn', { allowEmptyCatch: true }],
      eqeqeq: ['warn', 'smart']
    }
  }
];
