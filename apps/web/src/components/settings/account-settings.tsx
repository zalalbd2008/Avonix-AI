"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { usePlatformT } from "@/components/i18n/platform-i18n-provider";
import { getPlatformMessages, type MessageKey } from "@/lib/i18n/messages";
import { normalizePlatformLocale } from "@/lib/i18n/platform-languages";
import { updateAccountProfile } from "@/lib/settings/actions";
import { PlatformLanguageSelect } from "@/components/settings/platform-language-select";
import { useToast } from "@/components/shell/toast";

export type AccountProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  locale: string;
  image: string | null;
  agencyName: string;
  role: string;
};

/**
 * Full-page Settings dashboard — Agency Data + security cards.
 * Bleeds to the main pane edges so it reads as one surface, not a narrow form.
 */
export function AccountSettingsDashboard({ profile }: { profile: AccountProfile }) {
  const toast = useToast();
  const router = useRouter();
  const { setLocalePreview } = usePlatformT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone);
  const [locale, setLocale] = useState(normalizePlatformLocale(profile.locale));
  const [image, setImage] = useState<string | null>(profile.image);
  const [pendingImage, setPendingImage] = useState<string | null | undefined>(undefined);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profilePending, startProfile] = useTransition();
  const [passwordPending, startPassword] = useTransition();
  const [signOutPending, startSignOut] = useTransition();

  const displayImage = pendingImage === undefined ? image : pendingImage;

  const t = (key: MessageKey) => getPlatformMessages(locale)[key];

  useEffect(() => {
    setLocale(normalizePlatformLocale(profile.locale));
  }, [profile.locale]);

  function onPickImage(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("settings.chooseImage"));
      return;
    }
    if (file.size > 2.5 * 1024 * 1024) {
      toast(t("settings.imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : null;
      setPendingImage(result);
    };
    reader.readAsDataURL(file);
  }

  function saveProfile() {
    startProfile(async () => {
      const result = await updateAccountProfile({
        firstName,
        lastName,
        email: profile.email,
        phone,
        locale,
        image: pendingImage === undefined ? undefined : pendingImage,
      });
      if (!result.ok) {
        toast(result.error);
        return;
      }
      if (pendingImage !== undefined) {
        setImage(pendingImage);
        setPendingImage(undefined);
      }
      if (result.locale) setLocale(normalizePlatformLocale(result.locale));
      toast(t("settings.profileUpdated"));
      router.refresh();
    });
  }

  function savePassword() {
    startPassword(async () => {
      if (!currentPassword || !password || !confirmPassword) {
        toast(t("settings.fillPasswordFields"));
        return;
      }
      if (password.length < 8) {
        toast(t("settings.passwordMin"));
        return;
      }
      if (password !== confirmPassword) {
        toast(t("settings.passwordMismatch"));
        return;
      }
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword: password,
        revokeOtherSessions: true,
      });
      if (error) {
        toast(error.message || "Could not update password.");
        return;
      }
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      toast(t("settings.passwordUpdated"));
    });
  }

  function signOutEverywhere() {
    startSignOut(async () => {
      const { error } = await authClient.revokeSessions();
      if (error) {
        toast(error.message || "Could not sign out other sessions.");
        return;
      }
      await authClient.signOut();
      router.replace("/sign-in");
      router.refresh();
    });
  }

  return (
    <div className="-mx-6 -my-[26px] flex min-h-[calc(100vh-50px)] flex-col bg-[#eef1f6]">
      <header className="shrink-0 border-b border-[#dde3ec] bg-white px-6 py-4 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] text-faint uppercase">
              {t("settings.account")}
            </p>
            <h1 className="mt-0.5 text-[22px] font-bold tracking-tight text-ink">
              {t("settings.title")}
            </h1>
            <p className="mt-1 text-[13px] text-muted">
              {t("settings.subtitle")}{" "}
              <span className="font-semibold text-ink">{profile.agencyName}</span>
              <span className="text-faint"> · {profile.role}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-5 lg:p-6">
        <div className="grid w-full gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)] lg:items-start">
          {/* Agency Data */}
          <section className="rounded-2xl border border-[#dde3ec] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">
            <h2 className="text-[17px] font-bold text-ink">{t("settings.agencyData")}</h2>

            <div className="mt-6 flex items-center gap-5">
              <div className="relative shrink-0">
                <div className="grid size-[88px] place-items-center overflow-hidden rounded-full bg-[#e8edf5] text-[22px] font-bold text-[#5b6b83] ring-1 ring-[#d8dee8]">
                  {displayImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={displayImage} alt="" className="size-full object-cover" />
                  ) : (
                    <UserPlaceholderIcon />
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t("a11y.uploadBrandLogo")}
                  onClick={() => fileRef.current?.click()}
                  className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full border-2 border-white bg-[#3b82f6] text-white shadow-sm hover:bg-[#2563eb]"
                >
                  <CameraIcon />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickImage(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-ink">{t("settings.brandLogo")}</p>
                <p className="mt-1 whitespace-nowrap text-[12.5px] text-muted">
                  {t("settings.brandLogoHint")}
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("settings.firstName")} required>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass}
                    autoComplete="given-name"
                  />
                </Field>
                <Field label={t("settings.lastName")} required>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputClass}
                    autoComplete="family-name"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
                <Field label={t("settings.email")} required>
                  <input
                    value={profile.email}
                    readOnly
                    className={`${inputClass} bg-[#f8fafc] text-muted`}
                    autoComplete="email"
                    title="Email is managed from your login identity"
                  />
                </Field>
                <Field label={t("settings.phone")}>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={inputClass}
                    placeholder="+1 555-000-0000"
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <Field label={t("settings.platformLanguage")}>
                <PlatformLanguageSelect
                  value={locale}
                  onChange={(next) => {
                    setLocale(next);
                    setLocalePreview(next);
                  }}
                  className={`${inputClass} relative w-full py-2.5 pr-9 text-left`}
                />
              </Field>

            </div>

            <div className="mt-8 flex justify-end border-t border-[#eef1f6] pt-5">
              <button
                type="button"
                disabled={profilePending}
                onClick={saveProfile}
                className={primaryBtn}
              >
                {profilePending ? t("settings.saving") : t("settings.updateProfile")}
              </button>
            </div>
          </section>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">
              <h2 className="text-[17px] font-bold text-ink">{t("settings.changePassword")}</h2>
              <div className="mt-5 flex flex-col gap-3.5">
                <Field label={t("settings.currentPassword")} required>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="current-password"
                    placeholder={`${t("settings.currentPassword")} *`}
                  />
                </Field>
                <Field label={t("settings.password")} required>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                    placeholder={`${t("settings.password")} *`}
                  />
                </Field>
                <Field label={t("settings.confirmPassword")} required>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={inputClass}
                    autoComplete="new-password"
                    placeholder={`${t("settings.confirmPassword")} *`}
                  />
                </Field>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  disabled={passwordPending}
                  onClick={savePassword}
                  className={primaryBtn}
                >
                  {passwordPending ? t("settings.updating") : t("settings.updatePassword")}
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#dde3ec] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">
              <h2 className="text-[17px] font-bold text-ink">{t("settings.signOutEverywhere")}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                {t("settings.signOutEverywhereHint")}
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  disabled={signOutPending}
                  onClick={signOutEverywhere}
                  className="rounded-lg bg-[#2563eb] px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
                >
                  {signOutPending ? t("settings.signingOut") : t("settings.signOutEverywhere")}
                </button>
              </div>
            </section>

            <section className="flex flex-1 flex-col rounded-2xl border border-[#dde3ec] bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] sm:p-7">
              <h2 className="flex items-center gap-2 text-[17px] font-bold text-ink">
                {t("settings.twoFactor")}
                <span
                  className="grid size-[18px] place-items-center rounded-full border border-[#c9d2de] text-[10px] font-bold text-faint"
                  title="Authenticator apps add a one-time code after your password."
                >
                  i
                </span>
              </h2>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-muted">
                {t("settings.twoFactorHint")}
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => toast(t("settings.twoFactorUnavailable"))}
                  className={outlineBtn}
                >
                  {t("settings.setupTwoFactor")}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {required ? <span className="text-bad"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#d0d7e3] bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none placeholder:text-faint focus:border-[#93c5fd] focus:ring-2 focus:ring-[#93c5fd]/35";

const primaryBtn =
  "rounded-lg bg-[#60a5fa] px-5 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#3b82f6] disabled:opacity-60";

const outlineBtn =
  "rounded-lg border border-[#93c5fd] bg-[#eff6ff] px-4 py-2.5 text-[13.5px] font-semibold text-[#2563eb] hover:bg-[#dbeafe]";

function UserPlaceholderIcon() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-12 text-[#9aa8bc]" fill="none">
      <circle cx="24" cy="18" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M10 40c2.5-7 8-11 14-11s11.5 4 14 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none">
      <path
        d="M2.5 5.5h2l1-1.5h5l1 1.5h2v7.5h-11V5.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}





