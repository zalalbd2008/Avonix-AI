import type {
  FormCondition,
  FormConfirmation,
  FormConfirmationAction,
  FormField,
  FormFieldType,
  FormSettings,
} from "@/lib/db/schema";
import {
  choiceCssClass,
  resolveChoiceConfig,
  resolveOptionItems,
  usesRichChoiceMedia,
} from "./choice-config";
import { formIconSvgMarkup } from "@/components/forms/icons/svg-markup";
import { isIconName } from "@/components/forms/icons/registry";
import {
  captionWrapperClass,
  descriptionHtml,
  descriptionTooltipAttr,
  resolveCaption,
} from "./field-caption";
import {
  containerClassName,
  containerInlineStyle,
  groupFieldsForStructure,
  normalizeRows,
  resolveRow,
  rowClassName,
  rowInlineStyle,
} from "./structure";
import { normalizeLogic, conditionMatches } from "./smart-logic";
import { normalizeSubmissionUx } from "./submission-ux";
import { normalizeUx } from "./ux-config";
import { normalizeTrust, renderTrustHtml } from "./trust";
import { normalizeAnalytics } from "./analytics";
import {
  normalizeSecurity,
  publicSecurityForEmbed,
} from "./security-config";
import { normalizeAi, publicAiForEmbed } from "./ai-config";
import {
  normalizeEnterprise,
  publicEnterpriseForEmbed,
  resolveRoiConfig,
} from "./enterprise-config";
import {
  DEFAULT_THEME,
  themeCssText,
  themeEmbedCss,
  themeStyle,
  upgradeToTheme,
  type FormTheme,
} from "./theme";
import { googleFontsCssUrl } from "@/lib/fonts/google";
import { fieldWidthAttrs, forcesFullWidth } from "./field-width";
import { DEFAULT_LAYOUT, resolveFormLayout } from "./layout";
import {
  COMMON_TIMEZONES,
  resolveAppointmentConfig,
} from "./appointment-config";
import type { FormRowConfig } from "@/lib/db/schema";
/**
 * The pure half of forms: field definitions, validation helpers, and snippet
 * generation. No database import — keeps the builder out of the Postgres
 * driver / `tls` browser bundle failure.
 */

export const FIELD_TYPES: FormFieldType[] = [
  "text",
  "email",
  "phone",
  "number",
  "date",
  "url",
  "textarea",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "toggle",
  "range",
  "rating",
  "file",
  "appointment",
  "roi",
  "signature",
  "recaptcha",
  "hidden",
  "section",
];

/** Types that collect a value (not decorative). */
export const INPUT_TYPES = new Set<FormFieldType>([
  "text",
  "email",
  "phone",
  "number",
  "date",
  "url",
  "textarea",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "toggle",
  "range",
  "rating",
  "file",
  "appointment",
  "roi",
  "signature",
  "hidden",
]);

/** Decorative / non-input types skipped in required validation. */
export const DECORATIVE_TYPES = new Set<FormFieldType>([
  "section",
  "recaptcha",
]);

export const DEFAULT_STEP_ID = "step_1";

export const DEFAULT_SETTINGS: FormSettings = {
  steps: [{ id: DEFAULT_STEP_ID, title: "Step 1" }],
  layout: { ...DEFAULT_LAYOUT },
  appearance: DEFAULT_THEME as unknown as Record<string, unknown>,
};

export const FONT_OPTIONS = [
  { label: "System", value: "system-ui, -apple-system, Segoe UI, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, monospace" },
] as const;

export const DEFAULT_APPEARANCE = DEFAULT_THEME;

export function mergeAppearance(partial?: unknown): FormTheme {
  return upgradeToTheme(partial as FormTheme | null);
}

export function appearanceStyle(a: unknown) {
  return themeStyle(upgradeToTheme(a as FormTheme | null));
}

export function appearanceCssText(a: unknown) {
  return themeCssText(upgradeToTheme(a as FormTheme | null));
}

/**
 * The fields every form starts with — contact-mapped keys so submit creates a
 * contact with no extra mapping.
 */
export const DEFAULT_FIELDS: FormField[] = [
  {
    key: "name",
    label: "Your name",
    type: "text",
    required: true,
    width: "half",
    stepId: DEFAULT_STEP_ID,
    placeholder: "Jane Doe",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    width: "half",
    stepId: DEFAULT_STEP_ID,
    placeholder: "jane@example.com",
  },
  {
    key: "phone",
    label: "Phone",
    type: "phone",
    required: false,
    width: "half",
    stepId: DEFAULT_STEP_ID,
  },
  {
    key: "message",
    label: "How can we help?",
    type: "textarea",
    required: false,
    width: "full",
    stepId: DEFAULT_STEP_ID,
  },
];

/** Keys the submit endpoint treats as contact details rather than extra data. */
export const CONTACT_KEYS = new Set([
  "name",
  "email",
  "phone",
  "message",
  "company",
  "whatsapp",
]);

export const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;

export const MAX_FIELDS = 60;
export const MAX_STEPS = 12;

export function newStepId(n: number) {
  return `step_${n}`;
}

export function newFieldKey(prefix: string, n: number) {
  return `${prefix}_${n}`;
}

/** Caption for floating border label: field title, else placeholder. */
export function fieldFloatText(f: {
  label?: string;
  placeholder?: string;
}): string {
  const title = f.label?.trim() ?? "";
  if (title) return title;
  return f.placeholder?.trim() ?? "";
}

/** Inline styles for floating labels (builder + live preview). */
export function floatLabelInlineStyle(opts: {
  animate: boolean;
  raised: boolean;
  focused?: boolean;
  textarea?: boolean;
}): Record<string, string | number> {
  const raised = !opts.animate || opts.raised;
  const transition =
    "top .18s ease, transform .18s ease, font-size .18s ease, color .15s ease, background .15s ease, padding .15s ease, left .15s ease, font-weight .15s ease";
  if (!raised) {
    return {
      position: "absolute",
      left: "var(--avx-pad-x, 12px)",
      top: opts.textarea ? "var(--avx-pad-y, 10px)" : "50%",
      transform: opts.textarea ? "none" : "translateY(-50%)",
      zIndex: 1,
      padding: 0,
      margin: 0,
      lineHeight: 1.2,
      pointerEvents: "none",
      background: "transparent",
      color: "var(--avx-ph-color, #8b98ab)",
      fontSize: "var(--avx-ph-size, 14px)",
      fontWeight: 400,
      maxWidth: "calc(100% - 24px)",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      transition,
    };
  }
  return {
    position: "absolute",
    left: 10,
    top: 0,
    transform: "translateY(-50%)",
    zIndex: 1,
    padding: "0 6px",
    margin: 0,
    lineHeight: 1,
    pointerEvents: "none",
    background: "var(--avx-input-bg, #ffffff)",
    color: opts.focused
      ? "var(--avx-input-focus-border, #ff6600)"
      : "var(--avx-label)",
    fontSize: "var(--avx-label-size)",
    fontWeight: "var(--avx-label-weight)" as unknown as number,
    maxWidth: "calc(100% - 24px)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    transition,
  };
}

/**
 * Whether a field should render given current values (conditional logic).
 * Missing condition → always visible.
 */
export function fieldVisible(
  field: FormField,
  values: Record<string, string>,
): boolean {
  return conditionMatches(field.condition, values);
}

export { conditionMatches } from "./smart-logic";

export function defaultConfirmation(message?: string): FormConfirmation {
  return {
    rules: [
      {
        id: "default",
        action: "message",
        message: message?.trim() || "Thanks — we'll be in touch.",
      },
    ],
  };
}

/**
 * Pick the after-submit action. Conditional rules first; then the default
 * (rule without a condition, or the last rule).
 */
export function resolveConfirmation(
  confirmation: FormConfirmation | undefined | null,
  values: Record<string, string>,
  fallbackMessage = "Thanks — we'll be in touch.",
): { action: FormConfirmationAction; message: string; redirectUrl: string } {
  const rules = confirmation?.rules?.length
    ? confirmation.rules
    : defaultConfirmation(fallbackMessage).rules;

  const conditional = rules.filter((r) => r.condition?.fieldKey);
  const fallback =
    rules.find((r) => !r.condition?.fieldKey) ?? rules[rules.length - 1];

  const matched =
    conditional.find((r) => conditionMatches(r.condition, values)) ?? fallback;

  if (matched?.action === "redirect" && matched.redirectUrl?.trim()) {
    return {
      action: "redirect",
      message: matched.message?.trim() || fallbackMessage,
      redirectUrl: matched.redirectUrl.trim(),
    };
  }

  return {
    action: "message",
    message:
      matched?.message?.trim() ||
      fallback?.message?.trim() ||
      fallbackMessage,
    redirectUrl: "",
  };
}

/**
 * WordPress shortcode agencies paste into pages.
 * `id` is the per-website form number (1, 2, 3…) — not the UUID.
 */
export function formShortcode(formNumber: number) {
  return `[avonix_form id="${formNumber}"]`;
}

/**
 * The HTML (+ tiny runtime) an agency pastes into their client's site.
 *
 * Supports multi-step navigation and conditional show/hide. Posts through the
 * connector's admin-ajax proxy so no API key is exposed.
 */
export function embedSnippet(form: {
  id: string;
  /** Per-website shortcode number — preferred over UUID in the embed. */
  formNumber?: number;
  fields: FormField[];
  settings?: FormSettings | null;
  submitLabel: string;
  successMessage?: string;
}): string {
  const steps =
    form.settings?.steps?.length ? form.settings.steps : [{ id: DEFAULT_STEP_ID, title: "Step 1" }];
  const layout = resolveFormLayout(form.settings);
  const theme = mergeAppearance(form.settings?.appearance);
  const fields = form.fields.map((f) => ({
    ...f,
    stepId: f.stepId || steps[0].id,
  }));
  const embedId =
    typeof form.formNumber === "number" && form.formNumber > 0
      ? String(form.formNumber)
      : form.id;

  const stepsJson = JSON.stringify(steps);
  const logic = normalizeLogic(form.settings?.logic);
  const fieldsJson = JSON.stringify(
    fields.map((f) => {
      const items = resolveOptionItems(f);
      const scores: Record<string, number> = {};
      const amounts: Record<string, number> = {};
      for (const o of items) {
        if (typeof o.score === "number") scores[o.value] = o.score;
        if (typeof o.amount === "number") amounts[o.value] = o.amount;
      }
      return {
        key: f.key,
        type: f.type,
        stepId: f.stepId,
        required: f.required,
        condition: f.condition ?? null,
        requiredWhen: f.requiredWhen ?? null,
        scores: Object.keys(scores).length ? scores : null,
        amounts: Object.keys(amounts).length ? amounts : null,
      };
    }),
  );
  const confirmationJson = JSON.stringify(
    form.settings?.confirmation ?? defaultConfirmation(form.successMessage),
  );
  const layoutJson = JSON.stringify(layout);
  const logicJson = JSON.stringify(logic);
  const submissionUxJson = JSON.stringify(
    normalizeSubmissionUx(form.settings?.submissionUx),
  );
  const ux = normalizeUx(form.settings?.ux);
  const uxJson = JSON.stringify(ux);
  const analyticsJson = JSON.stringify(
    normalizeAnalytics(form.settings?.analytics),
  );
  const securityPub = publicSecurityForEmbed(
    normalizeSecurity(form.settings?.security),
  );
  const securityJson = JSON.stringify(securityPub);
  const aiPub = publicAiForEmbed(normalizeAi(form.settings?.ai));
  const aiJson = JSON.stringify(aiPub);
  const enterprisePub = publicEnterpriseForEmbed(
    normalizeEnterprise(form.settings?.enterprise),
  );
  const enterpriseJson = JSON.stringify(enterprisePub);
  const rows = normalizeRows(form.settings?.rows);

  const showTitles = layout.chrome?.showStepTitles !== false;
  const interactiveFields = fields.filter(
    (f) => f.type !== "hidden" && f.type !== "section" && f.type !== "recaptcha",
  );

  let panels = "";
  if (layout.mode === "conversational") {
    panels = interactiveFields
      .map((f, fi) => {
        const html = wrapFieldBox(f, renderFieldHtml(f, theme));
        return `  <div class="avx-step avx-conv-item" data-conv="${fi}" data-field-key="${escapeHtml(f.key)}"${fi === 0 ? "" : " hidden"}>
${html}
  </div>`;
      })
      .join("\n");
  } else if (layout.mode === "single") {
    const inputs = renderStructuredFields(
      fields.filter((f) => f.type !== "hidden"),
      theme,
      rows,
    );
    panels = `  <div class="avx-step" data-step="all">
${inputs}
  </div>`;
  } else {
    panels = steps
      .map((step, si) => {
        const stepFields = fields.filter((f) => f.stepId === step.id && f.type !== "hidden");
        const inputs = renderStructuredFields(stepFields, theme, rows);
        const title = showTitles
          ? `<div class="avx-step-title">${escapeHtml(step.title)}</div>`
          : "";
        if (layout.mode === "accordion") {
          return `  <div class="avx-step avx-acc" data-step="${escapeHtml(step.id)}" data-open="${si === 0 ? "1" : "0"}">
    <button type="button" class="avx-acc-head">${escapeHtml(step.title)}</button>
    <div class="avx-acc-body"${si === 0 ? "" : " hidden"}>
${inputs}
    </div>
  </div>`;
        }
        return `  <div class="avx-step${layout.mode === "card" ? " avx-card-step" : ""}" data-step="${escapeHtml(step.id)}"${si === 0 ? "" : " hidden"}>
    ${title}
${inputs}
  </div>`;
      })
      .join("\n");
  }

  const hidden = fields
    .filter((f) => f.type === "hidden")
    .map((f) => `  <input type="hidden" name="${f.key}" value="">`)
    .join("\n");

  const progressHtml = buildProgressHtml(
    layout,
    steps,
    layout.mode === "conversational" ? interactiveFields.length : steps.length,
  );

  const formClass = [
    "avonix-form",
    theme.advanced.customClass || "",
    `avx-mode-${layout.mode}`,
    layout.chrome?.progressPlacement === "sidebar" ? "avx-chrome-sidebar" : "",
    ux.stickyProgress ? "avx-sticky-progress" : "",
    theme.a11y.focusRing ? "avx-a11y-focus" : "",
    theme.a11y.contrastMode ? "avx-a11y-contrast" : "",
    theme.a11y.fontScaling ? "avx-a11y-scale" : "",
    theme.darkMode.enabled && theme.darkMode.mode === "manual"
      ? "avx-dark-ready"
      : "",
    theme.darkMode.enabled && theme.darkMode.mode === "auto" ? "avx-dark-auto" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const formAttrs = [
    theme.advanced.customId ? `id="${escapeHtml(theme.advanced.customId)}"` : "",
    `class="${escapeHtml(formClass)}"`,
    `data-form-id="${embedId}"`,
    `data-preset="${escapeHtml(theme.presetId || "custom")}"`,
    `data-avx-ultimate="1"`,
    `data-label-style="${escapeHtml(theme.labels.style ?? "stacked")}"`,
    `data-ph-mode="${escapeHtml(theme.placeholder.mode ?? "enabled")}"`,
    `data-mode="${layout.mode}"`,
    `data-mount="${layout.mount ?? "embedded"}"`,
    `data-progress="${layout.chrome?.progress ?? "none"}"`,
    `data-keyboard="${theme.a11y.keyboardNav ? "1" : "0"}"`,
    `data-enter-continue="${ux.enterToContinue ? "1" : "0"}"`,
    `data-dark-mode="${escapeHtml(theme.darkMode.mode)}"`,
    `data-dark-enabled="${theme.darkMode.enabled ? "1" : "0"}"`,
    `style="${appearanceCssText(theme)}"`,
  ]
    .filter(Boolean)
    .join(" ");

  const formInner = `<form ${formAttrs}>
  <div class="avx-draft-banner" hidden role="status">
    <span class="avx-draft-banner-text">You have a saved draft.</span>
    <button type="button" class="avx-draft-resume">Resume</button>
    <button type="button" class="avx-draft-discard">Discard</button>
  </div>
${progressHtml}
  <div class="avx-logic-bar" hidden>
    <span class="avx-logic-score" hidden></span>
    <div class="avx-budget" hidden>
      <p class="avx-budget-title"></p>
      <ul class="avx-budget-lines"></ul>
      <div class="avx-budget-total"><span>Total</span><span class="avx-budget-total-val"></span></div>
    </div>
    <span class="avx-logic-price" hidden></span>
  </div>
  <div class="avx-body">
${panels}
${hidden}
  </div>
  <!-- Hidden from people, filled in by bots. Do not remove. -->
  ${
    securityPub.honeypot
      ? `<input type="text" name="hp" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">`
      : ""
  }
  ${
    securityPub.captchaProvider !== "none" && securityPub.captchaSiteKey
      ? `<div class="avx-captcha" data-provider="${escapeHtml(securityPub.captchaProvider)}" data-sitekey="${escapeHtml(securityPub.captchaSiteKey)}"></div>`
      : ""
  }
  ${
    securityPub.otpEnabled
      ? `<div class="avx-otp" hidden>
    <label class="avx-otp-label">Email verification code
      <input type="text" class="avx-otp-input" name="avx_otp" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="6-digit code">
    </label>
    <button type="button" class="avx-otp-send">Send code</button>
    <p class="avx-otp-msg" hidden></p>
  </div>`
      : ""
  }
  <div class="avx-nav">
    <button type="button" class="avx-prev" hidden>Back</button>
    ${ux.allowResume ? `<button type="button" class="avx-draft">Save draft</button>` : ""}
    ${
      theme.darkMode.enabled &&
      theme.darkMode.mode === "manual" &&
      ux.showDarkToggle
        ? `<button type="button" class="avx-dark-toggle" aria-pressed="false" title="Toggle dark mode">Dark</button>`
        : ""
    }
    <button type="button" class="avx-next">Continue</button>
    <button type="submit" class="avx-submit"${layout.mode === "single" || layout.mode === "accordion" ? "" : " hidden"}>${escapeHtml(form.submitLabel)}</button>
  </div>
</form>`;

  const trust = normalizeTrust(form.settings?.trust);
  const trustHtml = renderTrustHtml(trust);
  const trustAbove =
    trust.enabled &&
    trustHtml &&
    (trust.placement === "above" || trust.placement === "both")
      ? trustHtml
      : "";
  const trustBelow =
    trust.enabled &&
    trustHtml &&
    (trust.placement === "below" || trust.placement === "both")
      ? trustHtml
      : "";
  const formWithTrust = `${trustAbove}${formInner}${trustBelow}`;

  const mount = layout.mount ?? "embedded";
  const wrapped =
    mount === "embedded"
      ? formWithTrust
      : `<div class="avx-mount avx-mount-${mount}" data-avx-mount="${mount}" data-open="0">
  <button type="button" class="avx-mount-open">${escapeHtml(form.submitLabel === "Send" ? "Open form" : form.submitLabel)}</button>
  <div class="avx-mount-shell" hidden>
    <button type="button" class="avx-mount-close" aria-label="Close">×</button>
${formWithTrust}
  </div>
</div>`;

  const gFontUrl = googleFontsCssUrl([
    theme.typography.fontFamily,
    theme.brandKit?.primaryFont,
  ]);
  const googleFontLink = gFontUrl
    ? `<link rel="stylesheet" href="${gFontUrl}" data-avonix-gfont="1">\n`
    : "";

  return `${googleFontLink}${wrapped}
<style>
${themeEmbedCss(theme)}
</style>
<script>
(function(){
  var root=document.currentScript&&document.currentScript.previousElementSibling;
  while(root&&root.tagName==='STYLE'){root=root.previousElementSibling;}
  var mount=root&&root.classList&&root.classList.contains('avx-mount')?root:null;
  var form=mount?mount.querySelector('.avonix-form'):root;
  while(form&&!(form.classList&&form.classList.contains('avonix-form'))){form=form.previousElementSibling;}
  if(!form){form=document.querySelector('.avonix-form[data-form-id="${embedId}"]');}
  if(!form)return;
  if(mount){
    var shell=mount.querySelector('.avx-mount-shell');
    var openBtn=mount.querySelector('.avx-mount-open');
    var closeBtn=mount.querySelector('.avx-mount-close');
    function setOpen(on){
      mount.setAttribute('data-open',on?'1':'0');
      if(shell)shell.hidden=!on;
      document.documentElement.style.overflow=on&&(mount.getAttribute('data-avx-mount')!=='slide_in')?'hidden':'';
    }
    if(openBtn)openBtn.addEventListener('click',function(){setOpen(true);});
    if(closeBtn)closeBtn.addEventListener('click',function(){setOpen(false);});
    mount.addEventListener('click',function(e){ if(e.target===mount)setOpen(false); });
  }
  var steps=${stepsJson};
  var meta=${fieldsJson};
  var confirmCfg=${confirmationJson};
  var layout=${layoutJson};
  var logic=${logicJson};
  var submissionUx=${submissionUxJson};
  var uxCfg=${uxJson};
  var analyticsCfg=${analyticsJson};
  var securityCfg=${securityJson};
  var aiCfg=${aiJson};
  var enterpriseCfg=${enterpriseJson};
  var mode=layout.mode||'wizard';
  var i=0;
  var convMeta=meta.filter(function(m){return m.type!=='section'&&m.type!=='hidden'&&m.type!=='recaptcha';});
  var formId=form.getAttribute('data-form-id')||'';
  var sessionId=(function(){
    try{
      var k='avx-fs:'+formId;
      var s=sessionStorage.getItem(k);
      if(s)return s;
      s='s_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);
      sessionStorage.setItem(k,s);
      return s;
    }catch(e){ return 's_'+Date.now().toString(36); }
  })();
  var startedAt=Date.now();
  var startedTracked=false;
  var focusedFields={};
  var formCompleted=false;
  function readUtm(){
    if(!analyticsCfg||analyticsCfg.trackUtm===false)return null;
    try{
      var q=new URLSearchParams(window.location.search);
      var u={};
      [['utm_source','source'],['utm_medium','medium'],['utm_campaign','campaign'],['utm_term','term'],['utm_content','content']].forEach(function(pair){
        var v=q.get(pair[0]); if(v) u[pair[1]]=v.slice(0,200);
      });
      return Object.keys(u).length?u:null;
    }catch(e){ return null; }
  }
  var utmCache=readUtm();
  function track(type, extra){
    if(!analyticsCfg||analyticsCfg.enabled===false)return;
    if(type==='view'&&analyticsCfg.trackViews===false)return;
    if(type==='start'&&analyticsCfg.trackStarts===false)return;
    if(type==='field'&&analyticsCfg.trackFieldDropoff===false)return;
    if(typeof window.AvonixFormTrack!=='function')return;
    var payload={ type:type, form_id:formId, session_id:sessionId, page_url:location.href };
    if(utmCache) payload.utm=utmCache;
    if(extra){ for(var k in extra){ if(Object.prototype.hasOwnProperty.call(extra,k)&&extra[k]!=null) payload[k]=extra[k]; } }
    try{ window.AvonixFormTrack(payload); }catch(e){}
  }
  function markStart(){
    if(startedTracked)return;
    startedTracked=true;
    startedAt=Date.now();
    track('start');
  }
  track('view');
  form.addEventListener('focusin',function(e){
    markStart();
    var t=e.target; if(!t||!t.name)return;
    if(focusedFields[t.name])return;
    focusedFields[t.name]=1;
    track('field',{ field_key:t.name });
  });
  form.addEventListener('input',markStart);
  form.addEventListener('change',markStart);
  function totalUnits(){
    if(mode==='conversational')return Math.max(1,convMeta.length);
    if(mode==='single'||mode==='accordion')return 1;
    return Math.max(1,steps.length);
  }
  function val(key){
    var nodes=form.querySelectorAll('[name="'+key+'"]');
    if(!nodes.length)return '';
    var el=nodes[0];
    if(el.type==='checkbox'){
      if(nodes.length>1 || (el.closest && el.closest('.avx-multiselect'))){
        return Array.prototype.map.call(form.querySelectorAll('[name="'+key+'"]:checked'),function(n){return n.value;}).filter(Boolean).join(', ');
      }
      return el.checked?'1':'';
    }
    if(el.type==='radio'){
      var c=form.querySelector('[name="'+key+'"]:checked');
      return c?c.value:'';
    }
    if(el.type==='file'){
      if(!el.files||!el.files.length)return '';
      return Array.prototype.map.call(el.files,function(f){return f.name;}).join(', ');
    }
    return el.value||'';
  }
  function collectValues(){
    var o={};
    meta.forEach(function(m){o[m.key]=val(m.key);});
    return o;
  }
  function matchCond(c,values){
    if(!c||!c.fieldKey)return true;
    var v=values[c.fieldKey]||'',f=!!String(v).trim(),t=c.value||'';
    var n=Number(v),tn=Number(t);
    if(c.op==='empty')return !f;
    if(c.op==='filled')return f;
    if(c.op==='eq')return v===t;
    if(c.op==='neq')return v!==t;
    if(c.op==='contains')return String(v).toLowerCase().indexOf(String(t).toLowerCase())>=0;
    if(c.op==='gt')return !isNaN(n)&&!isNaN(tn)&&n>tn;
    if(c.op==='gte')return !isNaN(n)&&!isNaN(tn)&&n>=tn;
    if(c.op==='lt')return !isNaN(n)&&!isNaN(tn)&&n<tn;
    if(c.op==='lte')return !isNaN(n)&&!isNaN(tn)&&n<=tn;
    return true;
  }
  function fieldRequired(m,values){
    if(m.type==='section'||m.type==='hidden'||m.type==='recaptcha')return false;
    if(m.requiredWhen&&m.requiredWhen.fieldKey)return matchCond(m.requiredWhen,values);
    return !!m.required;
  }
  function splitVals(raw){
    return String(raw||'').split(',').map(function(s){return s.trim();}).filter(Boolean);
  }
  function computeScore(values){
    var total=0;
    meta.forEach(function(m){
      if(!m.scores)return;
      splitVals(values[m.key]).forEach(function(v){
        if(typeof m.scores[v]==='number')total+=m.scores[v];
      });
      if((m.type==='rating'||m.type==='number'||m.type==='range')&&!Object.keys(m.scores).length){
        var n=Number(values[m.key]); if(!isNaN(n))total+=n;
      }
    });
    return Math.round(total*100)/100;
  }
  function computeBudget(values){
    var pricing=logic&&logic.pricing; if(!pricing||!pricing.enabled)return null;
    function money(n){ n=Number(n)||0; return Math.round(Math.min(1000000,Math.max(0,n))*100)/100; }
    var base=money(pricing.baseAmount);
    var services=0, addons=0, rulesTotal=0;
    var lines=[];
    var counted={};
    var serviceKeys={}; (pricing.serviceFieldKeys||[]).forEach(function(k){serviceKeys[k]=1;});
    var addonKeys={}; (pricing.addonFieldKeys||[]).forEach(function(k){addonKeys[k]=1;});
    var split=Object.keys(serviceKeys).length||Object.keys(addonKeys).length;
    if(base>0) lines.push({label:'Base',amount:base});
    meta.forEach(function(m){
      if(!m.amounts)return;
      var fieldTotal=0;
      splitVals(values[m.key]).forEach(function(v){
        if(typeof m.amounts[v]==='number')fieldTotal+=money(m.amounts[v]);
      });
      if(fieldTotal<=0)return;
      counted[m.key]=1;
      if(split&&addonKeys[m.key]){ addons+=fieldTotal; }
      else { services+=fieldTotal; }
      lines.push({label:m.key,amount:fieldTotal});
    });
    (pricing.rules||[]).forEach(function(rule){
      if(rule.condition&&rule.condition.fieldKey&&!matchCond(rule.condition,values))return;
      if(typeof rule.amount==='number'){
        var amt=money(rule.amount); if(amt<=0)return;
        rulesTotal+=amt; lines.push({label:rule.label||'Add-on',amount:amt}); return;
      }
      if(counted[rule.fieldKey])return;
      var m=meta.filter(function(x){return x.key===rule.fieldKey;})[0];
      if(!m||!m.amounts)return;
      var ft=0;
      splitVals(values[rule.fieldKey]).forEach(function(v){
        if(typeof m.amounts[v]==='number')ft+=money(m.amounts[v]);
      });
      if(ft<=0)return;
      rulesTotal+=ft; lines.push({label:rule.label||rule.fieldKey,amount:ft});
    });
    var subtotal=money(base+services+addons+rulesTotal);
    var discount=0, discountLabel='';
    var dkey=pricing.discountFieldKey;
    if(dkey&&pricing.discounts&&pricing.discounts.length){
      var code=String(values[dkey]||'').trim().toUpperCase();
      for(var i=0;i<pricing.discounts.length;i++){
        var d=pricing.discounts[i];
        if(String(d.code||'').toUpperCase()!==code)continue;
        discount=d.type==='percent'?money(subtotal*(Number(d.value)||0)/100):money(d.value);
        discount=Math.min(discount,subtotal);
        discountLabel=d.label||(d.type==='percent'?(d.value+'% off'):'Discount');
        break;
      }
    }
    if(discount>0) lines.push({label:discountLabel,amount:-discount});
    var taxable=money(subtotal-discount);
    var taxPct=Number(pricing.taxPercent)||0;
    var tax=taxPct>0?money(taxable*taxPct/100):0;
    var taxLabel=(pricing.taxLabel||'Tax');
    if(tax>0) lines.push({label:taxLabel+' ('+taxPct+'%)',amount:tax});
    var cur=pricing.currency||'USD';
    if(pricing.currencyFieldKey){
      var cv=String(values[pricing.currencyFieldKey]||'').trim().toUpperCase();
      if(/^[A-Z]{3}$/.test(cv))cur=cv;
    }
    return {currency:cur,total:money(taxable+tax),lines:lines,label:pricing.label||'Estimate'};
  }
  function fmtMoney(amount,currency){
    try{ return new Intl.NumberFormat(undefined,{style:'currency',currency:currency,maximumFractionDigits:2}).format(amount); }
    catch(e){ return currency+' '+Number(amount).toFixed(2); }
  }
  function updateLogicBar(){
    var bar=form.querySelector('.avx-logic-bar');
    if(!bar)return;
    var values=collectValues();
    var show=false;
    var scoreEl=bar.querySelector('.avx-logic-score');
    var budgetEl=bar.querySelector('.avx-budget');
    var priceEl=bar.querySelector('.avx-logic-price');
    if(logic&&logic.score&&logic.score.enabled&&logic.score.showLive!==false&&scoreEl){
      scoreEl.hidden=false;
      scoreEl.textContent=(logic.score.label||'Score')+': '+computeScore(values);
      show=true;
    } else if(scoreEl) scoreEl.hidden=true;
    if(logic&&logic.pricing&&logic.pricing.enabled&&logic.pricing.showLive!==false&&budgetEl){
      var b=computeBudget(values);
      if(b){
        budgetEl.hidden=false;
        var title=budgetEl.querySelector('.avx-budget-title');
        var list=budgetEl.querySelector('.avx-budget-lines');
        var tot=budgetEl.querySelector('.avx-budget-total-val');
        if(title)title.textContent=b.label;
        if(list){
          list.innerHTML=b.lines.map(function(line){
            var color=line.amount<0?'#047857':'inherit';
            return '<li style="color:'+color+'"><span>'+line.label+'</span><span>'+fmtMoney(line.amount,b.currency)+'</span></li>';
          }).join('');
        }
        if(tot)tot.textContent=fmtMoney(b.total,b.currency);
        show=true;
      } else budgetEl.hidden=true;
      if(priceEl)priceEl.hidden=true;
    } else {
      if(budgetEl)budgetEl.hidden=true;
      if(priceEl)priceEl.hidden=true;
    }
    bar.hidden=!show;
  }
  function resolveConfirm(values){
    var rules=(confirmCfg&&confirmCfg.rules)||[];
    var cond=rules.filter(function(r){return r.condition&&r.condition.fieldKey;});
    var fallback=null;
    for(var j=0;j<rules.length;j++){ if(!(rules[j].condition&&rules[j].condition.fieldKey)){ fallback=rules[j]; break; } }
    if(!fallback&&rules.length)fallback=rules[rules.length-1];
    var matched=null;
    for(var k=0;k<cond.length;k++){ if(matchCond(cond[k].condition,values)){ matched=cond[k]; break; } }
    matched=matched||fallback||{action:'message',message:'Thanks — we\\'ll be in touch.'};
    if(matched.action==='redirect'&&matched.redirectUrl){
      return {action:'redirect',url:matched.redirectUrl,message:matched.message||'',showBefore:!!matched.showBeforeRedirect};
    }
    return {action:'message',message:matched.message||'Thanks — we\\'ll be in touch.',url:'',showBefore:false};
  }
  function fireConfetti(host){
    try{
      var canvas=document.createElement('canvas');
      canvas.className='avx-confetti';
      canvas.width=host.clientWidth||320;
      canvas.height=Math.min(420, Math.max(220, host.clientHeight||280));
      host.appendChild(canvas);
      var ctx=canvas.getContext('2d'); if(!ctx)return;
      var colors=['#ff6600','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6'];
      var parts=[];
      for(var i=0;i<80;i++){
        parts.push({
          x:Math.random()*canvas.width,
          y:Math.random()*-canvas.height*0.4,
          w:4+Math.random()*6,
          h:6+Math.random()*8,
          vx:(Math.random()-0.5)*3,
          vy:2+Math.random()*3,
          rot:Math.random()*Math.PI,
          vr:(Math.random()-0.5)*0.2,
          color:colors[i%colors.length]
        });
      }
      var frames=0;
      function tick(){
        frames++;
        ctx.clearRect(0,0,canvas.width,canvas.height);
        parts.forEach(function(p){
          p.x+=p.vx; p.y+=p.vy; p.vy+=0.04; p.rot+=p.vr;
          ctx.save();
          ctx.translate(p.x,p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle=p.color;
          ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
          ctx.restore();
        });
        if(frames<90) requestAnimationFrame(tick);
        else canvas.remove();
      }
      requestAnimationFrame(tick);
    }catch(e){}
  }
  function renderSuccessScreen(message, opts){
    opts=opts||{};
    var ux=submissionUx||{};
    var animated=ux.animated!==false;
    var headline=ux.headline&&String(ux.headline).trim()?String(ux.headline).trim():message;
    var sub=ux.subtext?String(ux.subtext):'';
    var wrap=document.createElement('div');
    wrap.className='avx-success'+(animated?' avx-success--animated':'');
    var html='<div class="avx-success-badge" aria-hidden="true">✓</div>';
    html+='<h3 class="avx-success-title">'+escapeHtml(headline)+'</h3>';
    if(sub) html+='<p class="avx-success-sub">'+escapeHtml(sub)+'</p>';
    var steps=ux.nextSteps||[];
    if(steps.length){
      html+='<div class="avx-success-next"><p class="avx-success-next-title">'+escapeHtml(ux.nextStepsTitle||'What happens next')+'</p><ol class="avx-success-timeline">';
      steps.forEach(function(s,idx){
        html+='<li><span class="avx-success-num">'+(idx+1)+'</span><div><strong>'+escapeHtml(s.title||'')+'</strong>';
        if(s.description) html+='<span>'+escapeHtml(s.description)+'</span>';
        html+='</div></li>';
      });
      html+='</ol></div>';
    }
    var actions=[];
    if(ux.booking&&ux.booking.enabled&&ux.booking.url){
      actions.push('<a class="avx-success-btn avx-success-btn--primary" href="'+escapeHtml(ux.booking.url)+'" target="_blank" rel="noopener">'+escapeHtml(ux.booking.label||'Book a call')+'</a>');
    }
    if(ux.proposal&&ux.proposal.enabled&&ux.proposal.url){
      actions.push('<a class="avx-success-btn" href="'+escapeHtml(ux.proposal.url)+'" target="_blank" rel="noopener" download>'+escapeHtml(ux.proposal.label||'Download proposal')+'</a>');
    }
    if(actions.length) html+='<div class="avx-success-actions">'+actions.join('')+'</div>';
    if(opts.portalUrl){
      html+='<div class="avx-success-portal"><p class="avx-success-portal-label">Track your request</p><a class="avx-success-btn avx-success-btn--primary" href="'+escapeHtml(opts.portalUrl)+'" target="_blank" rel="noopener">Open client portal</a></div>';
    }
    if(opts.brandName) html+='<p class="avx-success-brand">'+escapeHtml(opts.brandName)+'</p>';
    else if(!opts.hideAvonix) html+='<p class="avx-success-brand">Powered by Avonix</p>';
    if(opts.redirectNote) html+='<p class="avx-success-redirect">'+escapeHtml(opts.redirectNote)+'</p>';
    wrap.innerHTML=html;
    return wrap;
  }
  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function draftKey(){
    return 'avx-form-draft:'+(form.getAttribute('data-form-id')||'');
  }
  function readDraft(){
    try{
      var raw=localStorage.getItem(draftKey());
      if(!raw)return null;
      var data=JSON.parse(raw);
      if(!data||!data.values)return null;
      var ttl=(uxCfg&&uxCfg.draftTtlDays)||7;
      if(data.savedAt&&(Date.now()-Number(data.savedAt))>ttl*86400000){
        localStorage.removeItem(draftKey());
        return null;
      }
      return data;
    }catch(e){return null;}
  }
  function writeDraft(){
    if(!uxCfg||uxCfg.autoSaveDraft===false)return;
    try{
      localStorage.setItem(draftKey(), JSON.stringify({
        savedAt:Date.now(),
        step:i,
        values:collectValues()
      }));
    }catch(e){}
  }
  function applyDraftValues(values){
    if(!values)return;
    Object.keys(values).forEach(function(key){
      var val=values[key];
      var nodes=form.querySelectorAll('[name="'+key+'"]');
      if(!nodes.length)return;
      var first=nodes[0];
      if(first.type==='checkbox'||first.type==='radio'){
        var selected=String(val).split(',');
        nodes.forEach(function(n){
          n.checked=selected.indexOf(n.value)>=0 || (n.type==='checkbox'&&n.value==='1'&&val==='1');
        });
      } else {
        first.value=val;
      }
    });
    applyConditions();
  }
  function finishOk(values){
    var r=resolveConfirm(values);
    var ux=submissionUx||{};
    var delay=typeof ux.redirectDelayMs==='number'?ux.redirectDelayMs:1500;
    try{ localStorage.removeItem(draftKey()); }catch(e){}
    var durationMs=Math.max(0, Date.now()-startedAt);
    var metaPayload={
      pageUrl: location.href,
      referrer: document.referrer||'',
      startedAt: new Date(startedAt).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: durationMs,
      sessionId: sessionId
    };
    if(utmCache) metaPayload.utm=utmCache;
    var completed=false;
    formCompleted=true;
    track('complete', analyticsCfg&&analyticsCfg.trackCompletionTime===false?{}:{ duration_ms: durationMs });
    function goRedirect(){ if(r.url) window.location.href=r.url; }
    function showSuccess(extra){
      if(completed)return;
      completed=true;
      if(r.action==='redirect'&&r.url&&!r.showBefore){
        goRedirect();
        return;
      }
      var host=mount||form;
      var portalUrl=extra&&extra.portal_url?String(extra.portal_url):'';
      var brand='';
      if(enterpriseCfg&&enterpriseCfg.whiteLabel&&enterpriseCfg.whiteLabel.enabled&&enterpriseCfg.whiteLabel.brandName){
        brand=String(enterpriseCfg.whiteLabel.brandName);
      }
      var screen=renderSuccessScreen(r.message,{
        redirectNote: r.action==='redirect'&&r.url ? 'Redirecting…' : '',
        portalUrl: portalUrl,
        brandName: brand,
        hideAvonix: !!(enterpriseCfg&&enterpriseCfg.whiteLabel&&enterpriseCfg.whiteLabel.hideAvonix)
      });
      host.replaceWith(screen);
      if(ux.confetti) fireConfetti(screen);
      if(r.action==='redirect'&&r.url){
        setTimeout(goRedirect, Math.max(0, delay));
      }
    }
    var captchaToken='';
    var captchaEl=form.querySelector('.avx-captcha');
    if(captchaEl){
      captchaToken=captchaEl.getAttribute('data-token')||'';
      if(!captchaToken){
        alert('Please complete the captcha.');
        formCompleted=false;
        return;
      }
    }
    var otpInput=form.querySelector('.avx-otp-input');
    var otpVal=otpInput?String(otpInput.value||'').trim():'';
    if(securityCfg&&securityCfg.otpEnabled){
      if(!otpVal){
        var otpBox=form.querySelector('.avx-otp');
        if(otpBox) otpBox.hidden=false;
        alert('Enter the email verification code (use Send code first).');
        formCompleted=false;
        return;
      }
    }
    var payload={
      form_id: formId,
      fields: values,
      name: values.name||'',
      email: values.email||'',
      phone: values.phone||'',
      message: values.message||'',
      page_url: location.href,
      hp: (form.querySelector('[name="hp"]')||{}).value||'',
      meta: metaPayload,
      captcha_token: captchaToken,
      otp: otpVal
    };
    if(typeof window.AvonixUltimateSubmit==='function'){
      window.AvonixUltimateSubmit(payload, function(ok, data){
        if(ok===false){
          formCompleted=false;
          alert('Could not send. Check captcha / verification code and try again.');
          return;
        }
        showSuccess(data||{});
      });
      setTimeout(function(){ if(!completed) showSuccess({}); }, 2500);
      return;
    }
    showSuccess({});
  }
  function visible(m){
    if(!m.condition||!m.condition.fieldKey)return true;
    return matchCond(m.condition,collectValues());
  }
  function applyConditions(){
    var values=collectValues();
    meta.forEach(function(m){
      if(m.type==='hidden')return;
      var nodes=form.querySelectorAll('[data-field="'+m.key+'"]');
      var show=visible(m);
      nodes.forEach(function(n){
        n.setAttribute('data-avx-hidden',show?'0':'1');
        n.querySelectorAll('input,select,textarea').forEach(function(el){
          if(el.type==='hidden')return;
          if(!show){ el.removeAttribute('required'); return; }
          if(fieldRequired(m,values)) el.setAttribute('required','required');
          else el.removeAttribute('required');
        });
      });
    });
    updateLogicBar();
  }
  function nextStepIndex(){
    if(mode==='conversational'||mode==='single'||mode==='accordion')return Math.min(i+1,totalUnits()-1);
    var rules=(logic&&logic.skipRules)||[];
    var values=collectValues();
    var cur=steps[i];
    for(var r=0;r<rules.length;r++){
      var rule=rules[r];
      if(!rule||!rule.condition||!matchCond(rule.condition,values))continue;
      for(var s=0;s<steps.length;s++){
        if(steps[s].id===rule.gotoStepId&&s!==i)return s;
      }
    }
    return Math.min(i+1,totalUnits()-1);
  }
  function updateProgress(){
    var total=totalUnits();
    var pct=Math.round(((i+1)/total)*100);
    var fill=form.querySelector('.avx-progress-fill');
    if(fill)fill.style.width=pct+'%';
    var pctEl=form.querySelector('.avx-progress-pct');
    if(pctEl)pctEl.textContent=pct+'%';
    var bar=form.querySelector('.avx-progress[role="progressbar"]');
    if(bar)bar.setAttribute('aria-valuenow',String(pct));
    form.querySelectorAll('.avx-progress-dot,.avx-progress-num').forEach(function(el,idx){
      el.setAttribute('data-state', idx<i?'done':idx===i?'active':'todo');
    });
  }
  function showStep(){
    if(mode==='conversational'){
      form.querySelectorAll('.avx-conv-item').forEach(function(p,idx){ p.hidden=idx!==i; });
    } else if(mode==='accordion'){
      form.querySelectorAll('.avx-acc').forEach(function(p,idx){
        var open=idx===i;
        p.setAttribute('data-open',open?'1':'0');
        var body=p.querySelector('.avx-acc-body');
        if(body)body.hidden=!open;
      });
    } else if(mode!=='single'){
      form.querySelectorAll('.avx-step:not(.avx-acc)').forEach(function(p,idx){
        if(p.classList.contains('avx-conv-item'))return;
        p.hidden=idx!==i;
      });
    }
    var prev=form.querySelector('.avx-prev');
    var next=form.querySelector('.avx-next');
    var sub=form.querySelector('.avx-submit');
    var last=i>=totalUnits()-1;
    if(mode==='single'||mode==='accordion'){
      if(prev)prev.hidden=true;
      if(next)next.hidden=true;
      if(sub)sub.hidden=false;
    } else {
      if(prev)prev.hidden=i===0;
      if(next)next.hidden=last;
      if(sub)sub.hidden=!last;
    }
    updateProgress();
    applyConditions();
    if(steps[i]&&steps[i].id) track('step',{ step_id:steps[i].id });
    try{
      var focusEl=form.querySelector('.avx-step:not([hidden]) input:not([type="hidden"]):not([disabled]), .avx-step:not([hidden]) select:not([disabled]), .avx-step:not([hidden]) textarea:not([disabled]), .avx-conv-item:not([hidden]) input:not([type="hidden"]), .avx-acc[data-open="1"] input:not([type="hidden"])');
      if(focusEl&&document.activeElement&&document.activeElement.tagName==='BODY') focusEl.focus();
    }catch(e){}
  }
  function stepFields(){
    if(mode==='conversational'){
      var m=convMeta[i];
      return m?[m]:[];
    }
    if(mode==='single'){
      return meta.filter(function(m){return m.type!=='section'&&m.type!=='hidden'&&m.type!=='recaptcha';});
    }
    var id=steps[i]&&steps[i].id;
    return meta.filter(function(m){return m.stepId===id && m.type!=='section' && m.type!=='hidden' && m.type!=='recaptcha';});
  }
  function validateStep(){
    var ok=true;
    var values=collectValues();
    stepFields().forEach(function(m){
      if(!visible(m)||!fieldRequired(m,values))return;
      var v=val(m.key);
      if(m.type==='appointment'){
        var parts=String(v||'').split('|');
        if(!parts[0]||!/^\\d{4}-\\d{2}-\\d{2}$/.test(parts[0])||!parts[1]||!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(parts[1]))ok=false;
        return;
      }
      if(!String(v).trim())ok=false;
    });
    return ok;
  }
  form.addEventListener('input',applyConditions);
  form.addEventListener('change',applyConditions);
  form.querySelectorAll('.avx-rating').forEach(function(r){
    r.addEventListener('click',function(e){
      var b=e.target.closest('button'); if(!b)return;
      var n=b.getAttribute('data-val');
      var name=r.getAttribute('data-name');
      var inp=form.querySelector('input[name="'+name+'"]');
      if(inp)inp.value=n;
      r.querySelectorAll('button').forEach(function(btn){
        btn.setAttribute('data-on', Number(btn.getAttribute('data-val'))<=Number(n)?'1':'0');
      });
      applyConditions();
    });
  });
  form.querySelectorAll('canvas.avx-signature').forEach(function(c){
    var ctx=c.getContext('2d'); if(!ctx)return;
    var drawing=false,name=c.getAttribute('data-name');
    var inp=form.querySelector('input[name="'+name+'"]');
    function pos(ev){var r=c.getBoundingClientRect();var t=ev.touches&&ev.touches[0];var x=(t?t.clientX:ev.clientX)-r.left;var y=(t?t.clientY:ev.clientY)-r.top;return{x:x*(c.width/r.width),y:y*(c.height/r.height)};}
    function start(ev){drawing=true;var p=pos(ev);ctx.beginPath();ctx.moveTo(p.x,p.y);ev.preventDefault();}
    function move(ev){if(!drawing)return;var p=pos(ev);ctx.strokeStyle=getComputedStyle(c).getPropertyValue('--avx-sig-pen')||'#13233c';ctx.lineWidth=2;ctx.lineTo(p.x,p.y);ctx.stroke();if(inp)inp.value=c.toDataURL();ev.preventDefault();}
    function end(){drawing=false;}
    c.addEventListener('mousedown',start);c.addEventListener('mousemove',move);window.addEventListener('mouseup',end);
    c.addEventListener('touchstart',start,{passive:false});c.addEventListener('touchmove',move,{passive:false});c.addEventListener('touchend',end);
    var clear=form.querySelector('.avx-sig-clear[data-name="'+name+'"]');
    if(clear)clear.addEventListener('click',function(){ctx.clearRect(0,0,c.width,c.height);if(inp)inp.value='';});
  });
  form.querySelectorAll('.avx-upload').forEach(function(zone){
    var inp=zone.querySelector('input[type="file"]');
    var prev=zone.querySelector('.avx-upload-previews');
    var err=zone.querySelector('.avx-upload-error');
    var maxMb=Number(zone.getAttribute('data-max-mb')||10);
    var maxFiles=Number(zone.getAttribute('data-max-files')||5);
    var multi=zone.getAttribute('data-multiple')==='1';
    function showErr(msg){
      if(!err)return;
      if(!msg){err.hidden=true;err.textContent='';return;}
      err.hidden=false;err.textContent=msg;
    }
    function renderPreviews(files){
      if(!prev)return;
      prev.innerHTML='';
      if(!files||!files.length){prev.hidden=true;return;}
      prev.hidden=false;
      Array.prototype.forEach.call(files,function(f){
        var row=document.createElement('div');
        row.className='avx-upload-row';
        var isImg=/^image\\//.test(f.type)||/\\.(png|jpe?g|gif|webp|svg)$/i.test(f.name);
        var isPdf=f.type==='application/pdf'||/\\.pdf$/i.test(f.name);
        if(isImg||isPdf){
          var url=URL.createObjectURL(f);
          if(isImg){
            var img=document.createElement('img');
            img.src=url;img.alt='';img.className='avx-upload-thumb';
            row.appendChild(img);
          } else {
            var frame=document.createElement('iframe');
            frame.src=url;frame.title=f.name;frame.className='avx-upload-pdf';
            row.appendChild(frame);
          }
        } else {
          var badge=document.createElement('span');
          badge.className='avx-upload-badge';badge.textContent='FILE';
          row.appendChild(badge);
        }
        var meta=document.createElement('span');
        meta.className='avx-upload-meta';
        meta.textContent=f.name+' · '+(f.size<1048576?(f.size/1024).toFixed(1)+' KB':(f.size/1048576).toFixed(1)+' MB');
        row.appendChild(meta);
        prev.appendChild(row);
      });
    }
    function check(files){
      if(!files||!files.length){showErr('');renderPreviews([]);return true;}
      if(!multi&&files.length>1){showErr('Only one file is allowed.');return false;}
      if(multi&&files.length>maxFiles){showErr('You can upload at most '+maxFiles+' files.');return false;}
      var maxBytes=maxMb*1024*1024;
      for(var i=0;i<files.length;i++){
        if(files[i].size>maxBytes){showErr(files[i].name+' is larger than '+maxMb+' MB.');return false;}
      }
      showErr('');
      renderPreviews(files);
      return true;
    }
    zone.addEventListener('dragenter',function(e){e.preventDefault();zone.setAttribute('data-drag','1');});
    zone.addEventListener('dragover',function(e){e.preventDefault();zone.setAttribute('data-drag','1');});
    zone.addEventListener('dragleave',function(){zone.setAttribute('data-drag','0');});
    zone.addEventListener('drop',function(e){
      e.preventDefault();zone.setAttribute('data-drag','0');
      if(!inp||!e.dataTransfer||!e.dataTransfer.files)return;
      try{
        var dt=new DataTransfer();
        Array.prototype.forEach.call(e.dataTransfer.files,function(f){dt.items.add(f);});
        if(!check(dt.files)){inp.value='';return;}
        inp.files=dt.files;
      }catch(ex){
        if(!check(e.dataTransfer.files))return;
      }
      applyConditions();
    });
    if(inp)inp.addEventListener('change',function(){
      if(!check(inp.files)){inp.value='';}
      applyConditions();
    });
  });
  form.querySelectorAll('.avx-appt').forEach(function(root){
    var name=root.getAttribute('data-name');
    var inp=form.querySelector('input[name="'+name+'"]');
    var cal=root.querySelector('.avx-appt-cal');
    var slotsEl=root.querySelector('.avx-appt-slots');
    var tzSel=root.querySelector('.avx-appt-tz-select');
    var summary=root.querySelector('.avx-appt-summary');
    var minD=Number(root.getAttribute('data-min')||0);
    var maxD=Number(root.getAttribute('data-max')||60);
    var weekdays=(root.getAttribute('data-weekdays')||'1,2,3,4,5').split(',').map(Number);
    var slots=(root.getAttribute('data-slots')||'').split(',').filter(Boolean);
    var showTz=root.getAttribute('data-tz')==='1';
    var detectedTz='UTC';
    try{detectedTz=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch(e){}
    if(tzSel&&showTz){
      var has=false;
      Array.prototype.forEach.call(tzSel.options,function(o){ if(o.value===detectedTz)has=true; });
      if(!has){ var opt=document.createElement('option'); opt.value=detectedTz; opt.textContent=detectedTz; tzSel.appendChild(opt); }
      tzSel.value=detectedTz;
    }
    var today=new Date(); today.setHours(0,0,0,0);
    var cursor=new Date(today.getFullYear(),today.getMonth(),1);
    var selectedDate=''; var selectedTime='';
    function pad(n){return n<10?'0'+n:''+n;}
    function keyOf(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
    function bookable(key){
      var p=key.split('-').map(Number); var d=new Date(p[0],p[1]-1,p[2]);
      var min=new Date(today); min.setDate(min.getDate()+minD);
      var max=new Date(today); max.setDate(max.getDate()+maxD);
      if(d<min||d>max)return false;
      return weekdays.indexOf(d.getDay())>=0;
    }
    function fmtSlot(s){
      var h=Number(s.slice(0,2)),m=s.slice(3),ap=h>=12?'PM':'AM',h12=h%12||12;
      return h12+':'+m+' '+ap;
    }
    function commit(){
      if(!inp)return;
      if(selectedDate&&selectedTime){
        var tz=showTz&&tzSel?tzSel.value:'';
        inp.value=selectedDate+'|'+selectedTime+(tz?'|'+tz:'');
      } else if(selectedDate){
        inp.value=selectedDate+'|';
      } else {
        inp.value='';
      }
      if(summary){
        if(selectedDate&&selectedTime){
          summary.hidden=false;
          summary.textContent=selectedDate+' · '+fmtSlot(selectedTime)+(showTz&&tzSel?' · '+tzSel.value:'');
        } else { summary.hidden=true; summary.textContent=''; }
      }
      applyConditions();
    }
    function renderCal(){
      if(!cal)return;
      var y=cursor.getFullYear(), m=cursor.getMonth();
      var first=new Date(y,m,1).getDay();
      var dim=new Date(y,m+1,0).getDate();
      var html='<div class="avx-appt-nav"><button type="button" data-nav="-1" aria-label="Prev">‹</button><span>'+cursor.toLocaleString(undefined,{month:'long',year:'numeric'})+'</span><button type="button" data-nav="1" aria-label="Next">›</button></div>';
      html+='<div class="avx-appt-dows">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(function(w){return '<span>'+w+'</span>';}).join('')+'</div><div class="avx-appt-grid">';
      for(var i=0;i<first;i++) html+='<span></span>';
      for(var d=1;d<=dim;d++){
        var key=y+'-'+pad(m+1)+'-'+pad(d);
        var ok=bookable(key);
        var on=key===selectedDate?'1':'0';
        html+='<button type="button" class="avx-appt-day" data-date="'+key+'" data-on="'+on+'" '+(ok?'':'disabled')+'>'+d+'</button>';
      }
      html+='</div>';
      cal.innerHTML=html;
      cal.querySelectorAll('[data-nav]').forEach(function(btn){
        btn.addEventListener('click',function(){
          cursor=new Date(y,m+Number(btn.getAttribute('data-nav')),1);
          renderCal();
        });
      });
      cal.querySelectorAll('.avx-appt-day').forEach(function(btn){
        btn.addEventListener('click',function(){
          selectedDate=btn.getAttribute('data-date')||'';
          if(selectedTime&&slots.indexOf(selectedTime)<0)selectedTime='';
          renderCal(); renderSlots(); commit();
        });
      });
    }
    function renderSlots(){
      if(!slotsEl)return;
      slotsEl.innerHTML=slots.map(function(s){
        var on=s===selectedTime&&selectedDate?'1':'0';
        return '<button type="button" class="avx-appt-slot" data-slot="'+s+'" data-on="'+on+'" '+(selectedDate?'':'disabled')+'>'+fmtSlot(s)+'</button>';
      }).join('');
      slotsEl.querySelectorAll('.avx-appt-slot').forEach(function(btn){
        btn.addEventListener('click',function(){
          if(!selectedDate)return;
          selectedTime=btn.getAttribute('data-slot')||'';
          renderSlots(); commit();
        });
      });
    }
    if(tzSel)tzSel.addEventListener('change',commit);
    renderCal(); renderSlots();
  });
  form.querySelectorAll('.avx-select-search').forEach(function(inp){
    var key=inp.getAttribute('data-for');
    var sel=form.querySelector('select[name="'+key+'"]');
    if(!sel)return;
    var all=Array.prototype.map.call(sel.options,function(o){return{v:o.value,t:o.textContent||'',el:o};});
    inp.addEventListener('input',function(){
      var q=(inp.value||'').toLowerCase();
      all.forEach(function(o){
        if(!o.v){o.el.hidden=false;return;}
        o.el.hidden=!!(q && o.t.toLowerCase().indexOf(q)<0);
      });
    });
  });
  form.querySelectorAll('.avx-acc-head').forEach(function(btn,idx){
    btn.addEventListener('click',function(){ i=idx; showStep(); });
  });
  form.querySelectorAll('.avx-sec-toggle').forEach(function(btn){
    btn.addEventListener('click',function(){
      var block=btn.closest('.avx-sec-block');
      if(!block)return;
      var body=block.querySelector('.avx-sec-body');
      var on=block.getAttribute('data-collapsed')==='1';
      block.setAttribute('data-collapsed', on?'0':'1');
      btn.setAttribute('aria-expanded', on?'true':'false');
      if(body)body.hidden=!on;
    });
  });
  var next=form.querySelector('.avx-next');
  var prev=form.querySelector('.avx-prev');
  if(next)next.addEventListener('click',function(){
    if(!validateStep()){alert('Please fill the required fields.');return;}
    if(i<totalUnits()-1){i=nextStepIndex();showStep();writeDraft();}
  });
  if(prev)prev.addEventListener('click',function(){ if(i>0){i--;showStep();writeDraft();} });

  /* Draft / resume */
  var draftBanner=form.querySelector('.avx-draft-banner');
  var draftBtn=form.querySelector('.avx-draft');
  var existingDraft=readDraft();
  if(existingDraft&&uxCfg&&uxCfg.allowResume!==false&&draftBanner){
    draftBanner.hidden=false;
    var resumeBtn=form.querySelector('.avx-draft-resume');
    var discardBtn=form.querySelector('.avx-draft-discard');
    if(resumeBtn)resumeBtn.addEventListener('click',function(){
      applyDraftValues(existingDraft.values);
      if(typeof existingDraft.step==='number') i=Math.min(Math.max(0,existingDraft.step),totalUnits()-1);
      draftBanner.hidden=true;
      showStep();
    });
    if(discardBtn)discardBtn.addEventListener('click',function(){
      try{localStorage.removeItem(draftKey());}catch(e){}
      draftBanner.hidden=true;
    });
  }
  if(draftBtn){
    draftBtn.addEventListener('click',function(){
      writeDraft();
      draftBtn.textContent='Saved';
      setTimeout(function(){ draftBtn.textContent='Save draft'; },1200);
    });
  }
  var draftTimer=null;
  function scheduleDraft(){
    if(!uxCfg||uxCfg.autoSaveDraft===false)return;
    clearTimeout(draftTimer);
    draftTimer=setTimeout(writeDraft,400);
  }
  form.addEventListener('input',scheduleDraft);
  form.addEventListener('change',scheduleDraft);

  /* Dark mode */
  function setDark(on){
    form.classList.toggle('avx-dark',!!on);
    var t=form.querySelector('.avx-dark-toggle');
    if(t){
      t.setAttribute('aria-pressed', on?'true':'false');
      t.textContent=on?'Light':'Dark';
    }
    try{ localStorage.setItem(draftKey()+':dark', on?'1':'0'); }catch(e){}
  }
  if(form.getAttribute('data-dark-enabled')==='1'){
    var dmode=form.getAttribute('data-dark-mode')||'off';
    if(dmode==='auto'){
      try{
        var mq=window.matchMedia('(prefers-color-scheme: dark)');
        setDark(mq.matches);
        if(mq.addEventListener) mq.addEventListener('change',function(ev){setDark(ev.matches);});
      }catch(e){}
    } else if(dmode==='manual'){
      var savedDark=null;
      try{ savedDark=localStorage.getItem(draftKey()+':dark'); }catch(e){}
      if(savedDark==='1') setDark(true);
      var darkToggle=form.querySelector('.avx-dark-toggle');
      if(darkToggle) darkToggle.addEventListener('click',function(){
        setDark(!form.classList.contains('avx-dark'));
      });
    }
  }

  /* Keyboard navigation */
  form.addEventListener('keydown',function(e){
    var keyboardOn=form.getAttribute('data-keyboard')==='1';
    var enterOn=form.getAttribute('data-enter-continue')==='1';
    var tag=(e.target&&e.target.tagName||'').toLowerCase();
    if(keyboardOn&&e.altKey&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
      e.preventDefault();
      if(e.key==='ArrowRight'&&next&&!next.hidden) next.click();
      if(e.key==='ArrowLeft'&&prev&&!prev.hidden) prev.click();
      return;
    }
    if(enterOn&&e.key==='Enter'&&tag!=='textarea'&&tag!=='button'&&mode!=='single'&&mode!=='accordion'){
      if(next&&!next.hidden){ e.preventDefault(); next.click(); }
    }
  });

  form.addEventListener('submit',function(e){
    e.preventDefault();
    if(mode==='accordion'){
      for(var s=0;s<steps.length;s++){
        i=s; if(!validateStep()){ showStep(); alert('Please fill the required fields.'); return; }
      }
      i=0;
    } else if(!validateStep()){alert('Please fill the required fields.');return;}
    finishOk(collectValues());
  });
  window.addEventListener('pagehide',function(){
    if(startedTracked&&!formCompleted) track('abandon',{ duration_ms: Math.max(0, Date.now()-startedAt) });
  });

  /* Captcha + OTP */
  (function initSecurity(){
    var box=form.querySelector('.avx-captcha');
    if(box&&securityCfg){
      var provider=box.getAttribute('data-provider')||securityCfg.captchaProvider;
      var sitekey=box.getAttribute('data-sitekey')||securityCfg.captchaSiteKey||'';
      function onToken(token){ box.setAttribute('data-token', token||''); }
      if(provider==='turnstile'&&sitekey){
        var s=document.createElement('script');
        s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        s.async=true;
        s.onload=function(){
          try{
            window.turnstile.render(box,{ sitekey:sitekey, callback:onToken, 'error-callback':function(){ onToken(''); } });
          }catch(e){}
        };
        document.head.appendChild(s);
      } else if(provider==='recaptcha_v2'&&sitekey){
        var holder=document.createElement('div');
        box.appendChild(holder);
        window.__avxRecaptchaCb=function(){
          try{
            window.grecaptcha.render(holder,{ sitekey:sitekey, callback:onToken });
          }catch(e){}
        };
        var rs=document.createElement('script');
        rs.src='https://www.google.com/recaptcha/api.js?onload=__avxRecaptchaCb&render=explicit';
        rs.async=true;
        document.head.appendChild(rs);
      }
    }
    var otpBox=form.querySelector('.avx-otp');
    var sendBtn=form.querySelector('.avx-otp-send');
    var otpMsg=form.querySelector('.avx-otp-msg');
    if(otpBox&&securityCfg&&securityCfg.otpEnabled){
      otpBox.hidden=false;
      if(sendBtn){
        sendBtn.addEventListener('click',function(){
          var values=collectValues();
          var email=values.email||'';
          if(!email){ alert('Enter your email first.'); return; }
          if(typeof window.AvonixUltimateSubmit!=='function'){
            if(otpMsg){ otpMsg.hidden=false; otpMsg.textContent='Connector not available on this page.'; }
            return;
          }
          sendBtn.disabled=true;
          window.AvonixUltimateSubmit({
            form_id: formId,
            email: email,
            otp_request: true,
            page_url: location.href,
            captcha_token: (form.querySelector('.avx-captcha')||{}).getAttribute? (form.querySelector('.avx-captcha').getAttribute('data-token')||'') : ''
          }, function(ok){
            sendBtn.disabled=false;
            if(otpMsg){
              otpMsg.hidden=false;
              otpMsg.textContent=ok!==false ? 'Code sent — check your email.' : 'Could not send code.';
            }
          });
        });
      }
    }

    if(aiCfg&&aiCfg.enabled!==false&&aiCfg.autofill){
      var rewriteNames=['message','Message','details','notes','description'];
      rewriteNames.forEach(function(name){
        var ta=form.querySelector('textarea[name="'+name+'"]');
        if(!ta||ta.parentNode.querySelector('.avx-ai-rewrite'))return;
        var wrap=document.createElement('div');
        wrap.className='avx-ai-rewrite-row';
        var btn=document.createElement('button');
        btn.type='button';
        btn.className='avx-ai-rewrite';
        btn.textContent='Improve message';
        var status=document.createElement('span');
        status.className='avx-ai-rewrite-status';
        status.hidden=true;
        wrap.appendChild(btn);
        wrap.appendChild(status);
        ta.parentNode.insertBefore(wrap, ta.nextSibling);
        btn.addEventListener('click',function(){
          var text=(ta.value||'').trim();
          if(!text){ status.hidden=false; status.textContent='Write something first.'; return; }
          if(typeof window.AvonixFormAi!=='function'){
            status.hidden=false; status.textContent='AI connector not available.'; return;
          }
          btn.disabled=true;
          status.hidden=false;
          status.textContent='Improving…';
          window.AvonixFormAi({ form_id: formId, message: text }, function(ok, result){
            btn.disabled=false;
            if(ok&&result){
              ta.value=result;
              status.textContent='Updated.';
              try{ ta.dispatchEvent(new Event('input',{bubbles:true})); }catch(e){}
            } else {
              status.textContent=result||'Could not improve right now.';
            }
          });
        });
      });
    }

    form.querySelectorAll('.avx-roi').forEach(function(root){
      var inv=root.querySelector('.avx-roi-investment');
      var months=root.querySelector('.avx-roi-months');
      var proj=root.querySelector('.avx-roi-projected');
      var out=root.querySelector('.avx-roi-result');
      var hidden=root.querySelector('input[type="hidden"]');
      var currency=root.getAttribute('data-currency')||'USD';
      var multiple=Number(root.getAttribute('data-multiple')||'2.5');
      function sync(fromInvestment){
        var investment=Number(inv&&inv.value)||0;
        var m=Number(months&&months.value)||1;
        if(fromInvestment&&proj){
          proj.value=String(Math.round(investment*multiple));
        }
        var projected=Number(proj&&proj.value)||0;
        var pct=investment>0?Math.round(((projected-investment)/investment)*100):0;
        if(out){
          out.textContent=currency+' '+projected.toLocaleString()+' projected · '+pct+'% ROI over '+m+' mo';
        }
        if(hidden){
          hidden.value=JSON.stringify({ investment: investment, months: m, projected: projected, currency: currency });
        }
      }
      if(inv){ inv.addEventListener('input',function(){ sync(true); }); }
      if(months){ months.addEventListener('input',function(){ sync(false); }); }
      if(proj){ proj.addEventListener('input',function(){ sync(false); }); }
      sync(false);
    });
  })();

  showStep();
})();
</script>`;
}

function buildProgressHtml(
  layout: ReturnType<typeof resolveFormLayout>,
  steps: { id: string; title: string }[],
  unitCount: number,
): string {
  const style = layout.chrome?.progress ?? "none";
  if (style === "none" || layout.mode === "single") return "";
  const units = Math.max(unitCount, 1);

  if (style === "percentage") {
    return `  <div class="avx-progress avx-progress-percentage" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Form progress"><div class="avx-progress-track"><div class="avx-progress-fill" style="width:0%"></div></div><span class="avx-progress-pct">0%</span></div>`;
  }
  if (style === "line") {
    return `  <div class="avx-progress avx-progress-line" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Form progress"><div class="avx-progress-track"><div class="avx-progress-fill" style="width:0%"></div></div></div>`;
  }
  if (style === "number") {
    const items = Array.from({ length: units }, (_, idx) => {
      const title =
        layout.mode === "conversational"
          ? String(idx + 1)
          : escapeHtml(steps[idx]?.title ?? `Step ${idx + 1}`);
      return `<span class="avx-progress-num" data-state="${idx === 0 ? "active" : "todo"}">${idx + 1}<small>${title}</small></span>`;
    }).join("");
    return `  <div class="avx-progress avx-progress-number">${items}</div>`;
  }
  const dots = Array.from({ length: units }, (_, idx) => {
    return `<span class="avx-progress-dot" data-state="${idx === 0 ? "active" : "todo"}" title="${escapeHtml(steps[idx]?.title ?? "")}"></span>`;
  }).join("");
  return `  <div class="avx-progress avx-progress-circle">${dots}</div>`;
}

/** Render fields with row grouping and collapsible sections. */
function renderStructuredFields(
  fields: FormField[],
  theme: Pick<FormTheme, "labels" | "placeholder">,
  rows: FormRowConfig[],
): string {
  const parts: string[] = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i]!;
    if (f.type === "section" && f.sectionConfig?.collapsible) {
      const section = f;
      i += 1;
      const body: FormField[] = [];
      while (i < fields.length && fields[i]!.type !== "section") {
        body.push(fields[i]!);
        i += 1;
      }
      const collapsed = Boolean(section.sectionConfig?.collapsed);
      const boxCls = containerClassName(
        section.sectionConfig?.container ?? section.container,
      );
      const boxStyle = containerInlineStyle(
        section.sectionConfig?.container ?? section.container,
      );
      const bg = section.sectionConfig?.background
        ? `background:${escapeHtml(section.sectionConfig.background)};`
        : "";
      parts.push(`    <div class="avx-sec-block avx-full ${boxCls}" data-collapsed="${collapsed ? "1" : "0"}" style="${bg}${boxStyle}">
      <button type="button" class="avx-sec-toggle" aria-expanded="${collapsed ? "false" : "true"}">
        <span>${escapeHtml(section.label || "Section")}</span>
        <span class="avx-sec-chevron" aria-hidden>▾</span>
      </button>
      <div class="avx-sec-body"${collapsed ? " hidden" : ""}>
${renderGroupedFields(body, theme, rows)}
      </div>
    </div>`);
      continue;
    }
    const chunk: FormField[] = [];
    while (i < fields.length) {
      const n = fields[i]!;
      if (n.type === "section" && n.sectionConfig?.collapsible) break;
      chunk.push(n);
      i += 1;
    }
    parts.push(renderGroupedFields(chunk, theme, rows));
  }
  return parts.join("\n");
}

function renderGroupedFields(
  fields: FormField[],
  theme: Pick<FormTheme, "labels" | "placeholder">,
  rows: FormRowConfig[],
): string {
  return groupFieldsForStructure(fields)
    .map((unit) => {
      if (unit.kind === "row") {
        const row = resolveRow(unit.rowId, rows);
        const inner = unit.fields
          .map((f) => wrapFieldBox(f, renderFieldHtml(f, theme)))
          .join("\n");
        const style = rowInlineStyle(row);
        return `    <div class="${rowClassName(row)} avx-full" data-row="${escapeHtml(unit.rowId)}"${style ? ` style="${style}"` : ""}>
${inner}
    </div>`;
      }
      return wrapFieldBox(unit.field, renderFieldHtml(unit.field, theme));
    })
    .join("\n");
}

function wrapFieldBox(f: FormField, html: string): string {
  if (f.type === "section") return html;
  const cls = containerClassName(f.container);
  const style = containerInlineStyle(f.container);
  if (!cls && !style) return html;
  return `    <div class="${cls || "avx-box"} avx-full" style="${style}">
${html}
    </div>`;
}

function renderFieldHtml(
  f: FormField,
  theme: Pick<FormTheme, "labels" | "placeholder"> = {
    labels: DEFAULT_THEME.labels,
    placeholder: DEFAULT_THEME.placeholder,
  },
): string {
  const labels = theme.labels;
  const cap = resolveCaption(f, theme);
  const forceFull = forcesFullWidth(f.type);
  const widthBits = fieldWidthAttrs({
    width: f.width,
    widthTablet: f.widthTablet,
    widthMobile: f.widthMobile,
    forceFull,
  });
  const wrapClass = widthBits.className;
  const wrapData = ` ${widthBits.data}`;
  const cond = ` data-field="${f.key}"`;
  const floatText = fieldFloatText(f);
  const floating = cap.useFloating && Boolean(floatText);
  const floatClass = cap.animateFloat
    ? "avx-float avx-float--animate"
    : "avx-float";
  const captionClass = captionWrapperClass(cap);
  const reqMark = f.required ? ` ${escapeHtml(labels.requiredText || "*")}` : "";
  const floatLabel = floating
    ? `<span class="avx-float-label">${escapeHtml(floatText)}${reqMark}</span>`
    : "";
  const stackedTitle = f.label?.trim() ?? "";
  const descEsc = escapeHtml(cap.description);
  const tip = descriptionTooltipAttr(cap, descEsc);
  const infoIcon = descriptionHtml(cap, descEsc, "info");
  const labelRow =
    cap.showStackedLabel && stackedTitle
      ? `<span class="avx-label-row"><span class="avx-label-text">${escapeHtml(stackedTitle)}${f.required ? reqMark : ""}</span>${infoIcon}</span>`
      : "";
  const descAbove = descriptionHtml(cap, descEsc, "above");
  const descBelow = descriptionHtml(cap, descEsc, "below");
  const descAcc = descriptionHtml(cap, descEsc, "accordion");
  const wrapControl = (inner: string) =>
    `<span class="avx-control">${descAbove}${inner}${descBelow}${descAcc}</span>`;

  const openLabel = (extraClass = "", extraStyle = "") => {
    const style = [widthBits.style, extraStyle].filter(Boolean).join(";");
    return `    <label class="${[wrapClass, captionClass, extraClass].filter(Boolean).join(" ")}"${cond}${wrapData}${tip} style="${style}">`;
  };
  const openDiv = (extraClass = "", extraStyle = "") => {
    const style = [widthBits.style, extraStyle].filter(Boolean).join(";");
    return `    <div class="${[wrapClass, captionClass, extraClass].filter(Boolean).join(" ")}"${cond}${wrapData}${tip} style="${style}">`;
  };

  if (f.type === "section") {
    const sc = f.sectionConfig ?? {};
    const divider = sc.divider !== false;
    const bg = sc.background ? `background:${escapeHtml(sc.background)};` : "";
    const boxCls = containerClassName(sc.container ?? f.container);
    const boxStyle = containerInlineStyle(sc.container ?? f.container);
    return `${openDiv(`avx-section avx-full${divider ? "" : " avx-section--nodivider"} ${boxCls}`, `${bg}${boxStyle}`)}${escapeHtml(f.label)}</div>`;
  }
  if (f.type === "recaptcha") {
    return wrapFieldBox(
      f,
      `${openDiv("avx-recaptcha avx-full")}reCAPTCHA (${escapeHtml(f.label || "protected")})</div>`,
    );
  }

  const req = f.required ? " required" : "";
  const ph = cap.placeholderAttr
    ? ` placeholder="${escapeHtml(cap.placeholderAttr)}"`
    : "";

  if (f.type === "file") {
    const fc = f.fileConfig ?? {};
    const multiple = fc.multiple ? " multiple" : "";
    const accept = fc.accept
      ? ` accept="${escapeHtml(fc.accept)}"`
      : ` accept="image/*,.pdf,.doc,.docx,.zip"`;
    const maxMb = typeof fc.maxSizeMb === "number" ? fc.maxSizeMb : 10;
    const maxFiles = typeof fc.maxFiles === "number" ? fc.maxFiles : 5;
    const virus = fc.virusScan ? "1" : "0";
    const hint = fc.multiple
      ? `Up to ${maxFiles} files · max ${maxMb} MB each`
      : `Max ${maxMb} MB`;
    return `${openLabel()}
      ${labelRow}
      ${wrapControl(`<div class="avx-upload" data-name="${f.key}" data-max-mb="${maxMb}" data-max-files="${maxFiles}" data-multiple="${fc.multiple ? "1" : "0"}" data-virus="${virus}">
        <span class="avx-upload-label">Drop files here or click to upload</span>
        <span class="avx-upload-hint">${escapeHtml(hint)}</span>
        <input type="file" name="${f.key}"${req}${multiple}${accept} class="avx-upload-input">
        <div class="avx-upload-previews" hidden></div>
        <p class="avx-upload-error" hidden></p>
      </div>`)}
    </label>`;
  }
  if (f.type === "appointment") {
    const ac = resolveAppointmentConfig(f.appointmentConfig);
    const slotsAttr = escapeHtml(ac.slots.join(","));
    const weekAttr = escapeHtml(ac.weekdays.join(","));
    const tzOptions = (ac.showTimezone ? COMMON_TIMEZONES : [])
      .map(
        (tz) =>
          `<option value="${escapeHtml(tz)}">${escapeHtml(tz)}</option>`,
      )
      .join("");
    const tzBlock = ac.showTimezone
      ? `<label class="avx-appt-tz"><span class="avx-appt-tz-label">Time zone</span><select class="avx-appt-tz-select">${tzOptions}</select></label>`
      : "";
    return `${openDiv()}
      ${labelRow}
      ${wrapControl(`<div class="avx-appt" data-name="${f.key}" data-min="${ac.minDaysFromToday}" data-max="${ac.maxDaysAhead}" data-weekdays="${weekAttr}" data-slots="${slotsAttr}" data-tz="${ac.showTimezone ? "1" : "0"}">
        <div class="avx-appt-cal"></div>
        <p class="avx-appt-slots-label">Time slot · ${ac.slotDurationMin} min</p>
        <div class="avx-appt-slots"></div>
        ${tzBlock}
        <input type="hidden" name="${f.key}"${req}>
        <p class="avx-appt-summary" hidden></p>
      </div>`)}
    </div>`;
  }
  if (f.type === "roi") {
    const rc = resolveRoiConfig(f.roiConfig);
    const inv = rc.defaultInvestment ?? 5000;
    const months = rc.defaultMonths ?? 6;
    const mult = rc.returnMultiple ?? 2.5;
    const projected = Math.round(inv * mult);
    return `${openDiv()}
      ${labelRow}
      ${wrapControl(`<div class="avx-roi" data-name="${f.key}" data-currency="${escapeHtml(rc.currency || "USD")}" data-multiple="${mult}">
        <label class="avx-roi-field"><span>${escapeHtml(rc.labelInvestment || "Investment")}</span><input type="number" class="avx-roi-investment" min="0" step="100" value="${inv}"></label>
        <label class="avx-roi-field"><span>${escapeHtml(rc.labelMonths || "Timeline (months)")}</span><input type="number" class="avx-roi-months" min="1" max="60" step="1" value="${months}"></label>
        <label class="avx-roi-field"><span>${escapeHtml(rc.labelReturn || "Projected return")}</span><input type="number" class="avx-roi-projected" min="0" step="100" value="${projected}"></label>
        <p class="avx-roi-result" aria-live="polite"></p>
        <input type="hidden" name="${f.key}" value="">
      </div>`)}
    </div>`;
  }
  if (f.type === "rating") {
    const max = 5;
    const stars = Array.from({ length: max }, (_, i) => i + 1)
      .map(
        (n) =>
          `      <button type="button" data-val="${n}" aria-label="${n}">★</button>`,
      )
      .join("\n");
    return `${openDiv()}
      ${labelRow}
      ${wrapControl(`<div class="avx-rating" data-name="${f.key}">
${stars}
      </div>
      <input type="hidden" name="${f.key}" value=""${req}>`)}
    </div>`;
  }
  if (f.type === "signature") {
    return `${openLabel()}
      ${labelRow}
      ${wrapControl(`<canvas class="avx-signature" data-name="${f.key}" width="600" height="160"></canvas>
      <input type="hidden" name="${f.key}" value="">
      <button type="button" class="avx-sig-clear" data-name="${f.key}" style="margin-top:6px;font-size:12px">Clear</button>`)}
    </label>`;
  }
  if (f.type === "toggle") {
    return `${openLabel("", "display:flex;align-items:center;gap:10px")}
      <input type="checkbox" class="avx-toggle" name="${f.key}" value="1"${req}>
      <span>${escapeHtml(f.label)}${f.required ? " *" : ""}</span>
      ${descBelow}${descAcc}
    </label>`;
  }
  if (f.type === "range") {
    return `${openLabel()}
      ${labelRow}
      ${wrapControl(`<input type="range" name="${f.key}" min="0" max="100" value="50"${req}>`)}
    </label>`;
  }

  if (f.type === "textarea") {
    if (floating) {
      return `${openLabel(floatClass)}
      ${floatLabel}
      ${wrapControl(`<textarea name="${f.key}" rows="4"${req}${ph}></textarea>`)}
    </label>`;
    }
    return `${openLabel()}
      ${labelRow}
      ${wrapControl(`<textarea name="${f.key}" rows="4"${req}${ph}></textarea>`)}
    </label>`;
  }
  if (f.type === "select") {
    const cfg = resolveChoiceConfig(f.type, f.choiceConfig);
    const items = resolveOptionItems(f);
    if (cfg.selectVariant === "chips" || cfg.selectVariant === "tags") {
      const options = items
        .map(
          (o) =>
            `      <label class="avx-choice"><input type="radio" name="${f.key}" value="${escapeHtml(o.value)}"${req}> <span class="avx-choice-label">${escapeHtml(o.label)}</span></label>`,
        )
        .join("\n");
      return `${openDiv(choiceCssClass(f.type, cfg), `--avx-choice-cols:${cfg.columns};--avx-choice-gap:${cfg.gap}px`)}
      ${labelRow}
      ${wrapControl(`<div class="avx-choices-inner">${options}</div>`)}
    </div>`;
    }
    const options = items
      .map(
        (o) =>
          `        <option value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</option>`,
      )
      .join("\n");
    const search =
      cfg.selectVariant === "searchable"
        ? `<input type="search" class="avx-select-search" data-for="${f.key}" placeholder="Search…" autocomplete="off">\n      `
        : "";
    if (floating) {
      return `${openLabel(floatClass)}
      ${floatLabel}
      ${wrapControl(`${search}<select name="${f.key}"${req}${cfg.selectVariant === "searchable" ? ' class="avx-select-filterable"' : ""}>
        <option value=""></option>
${options}
      </select>`)}
    </label>`;
    }
    return `${openLabel()}
      ${labelRow}
      ${wrapControl(`${search}<select name="${f.key}"${req}${cfg.selectVariant === "searchable" ? ' class="avx-select-filterable"' : ""}>
${options}
      </select>`)}
    </label>`;
  }
  if (f.type === "multiselect" || f.type === "radio") {
    const cfg = resolveChoiceConfig(f.type, f.choiceConfig);
    const items = resolveOptionItems(f);
    const multi = f.type === "multiselect";
    const rich = usesRichChoiceMedia(cfg.style);
    const options = items
      .map((o, i) => {
        const input = multi
          ? `<input type="checkbox" name="${f.key}" value="${escapeHtml(o.value)}">`
          : `<input type="radio" name="${f.key}" value="${escapeHtml(o.value)}"${req && i === 0 ? " required" : ""}>`;
        if (!rich && cfg.style === "default") {
          return `      <label class="avx-choice avx-ms-item">${input} <span class="avx-choice-label">${escapeHtml(o.label)}</span></label>`;
        }
        const img =
          (cfg.style === "image" || cfg.style === "product") && o.imageUrl
            ? `<img class="avx-choice-img" src="${escapeHtml(o.imageUrl)}" alt="">`
            : "";
        const icon =
          o.icon &&
          (cfg.style === "icon" ||
            cfg.style === "pricing" ||
            cfg.style === "service" ||
            cfg.style === "product")
            ? `<span class="avx-choice-icon">${
                isIconName(o.icon)
                  ? formIconSvgMarkup(o.icon, 22)
                  : escapeHtml(o.icon)
              }</span>`
            : "";
        const odesc = o.description
          ? `<span class="avx-choice-desc">${escapeHtml(o.description)}</span>`
          : "";
        const price = o.price
          ? `<span class="avx-choice-price">${escapeHtml(o.price)}</span>`
          : "";
        return `      <label class="avx-choice" data-style="${cfg.style}">${input}<span class="avx-choice-body">${img}${icon}<span class="avx-choice-text"><span class="avx-choice-title">${escapeHtml(o.label)}</span>${odesc}${price}</span></span></label>`;
      })
      .join("\n");
    return `${openDiv()}
      ${labelRow}
      ${wrapControl(`<div class="${choiceCssClass(f.type, cfg)}" style="--avx-choice-cols:${cfg.columns};--avx-choice-gap:${cfg.gap}px">${options}</div>`)}
    </div>`;
  }
  if (f.type === "checkbox") {
    return `${openLabel()}<input type="checkbox" name="${f.key}" value="1"${req}> ${escapeHtml(f.label)}${descBelow}${descAcc}</label>`;
  }

  const type =
    f.type === "email"
      ? "email"
      : f.type === "phone"
        ? "tel"
        : f.type === "number"
          ? "number"
          : f.type === "date"
            ? "date"
            : f.type === "url"
              ? "url"
              : "text";

  if (floating) {
    return `${openLabel(floatClass)}
      ${floatLabel}
      ${wrapControl(`<input type="${type}" name="${f.key}"${req}${ph}>`)}
    </label>`;
  }
  return `${openLabel()}
      ${labelRow}
      ${wrapControl(`<input type="${type}" name="${f.key}"${req}${ph}>`)}
    </label>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
