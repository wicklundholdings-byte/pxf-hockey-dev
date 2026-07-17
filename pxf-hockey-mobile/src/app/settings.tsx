import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import PaywallModal from '@/components/paywall-modal';
import { getManagementURL } from '@/lib/purchases';
import { Linking } from 'react-native';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const RED    = '#EF4444';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Ionicons name={icon as any} size={18} color={TEAL} style={{ marginRight: 8 }} />
      <ThemedText style={s.sectionTitle}>{title}</ThemedText>
    </View>
  );
}

function Field({ label, value, onChangeText, multiline, placeholder, keyboardType }: {
  label: string; value: string; onChangeText: (v: string) => void;
  multiline?: boolean; placeholder?: string; keyboardType?: any;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <ThemedText style={s.fieldLabel}>{label}</ThemedText>
      <TextInput
        style={[s.input, multiline && { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={MUTED}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function CheckRow({ label, sub, checked, onToggle }: {
  label: string; sub?: string; checked: boolean; onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={s.checkRow} onPress={onToggle} activeOpacity={0.7}>
      <View style={{ flex: 1, marginRight: 14 }}>
        <ThemedText style={s.checkLabel}>{label}</ThemedText>
        {sub ? <ThemedText style={s.checkSub}>{sub}</ThemedText> : null}
      </View>
      <View style={[s.checkbox, checked && s.checkboxOn]}>
        {checked && <Ionicons name="checkmark" size={14} color="#000" />}
      </View>
    </TouchableOpacity>
  );
}

function ConnectRow({ avatar, name, sub, connected }: {
  avatar?: string; name: string; sub: string; connected?: boolean;
}) {
  return (
    <View style={s.connectRow}>
      {avatar ? (
        <View style={s.connectAvatar}>
          <ThemedText style={s.connectAvatarText}>{avatar}</ThemedText>
        </View>
      ) : null}
      <View style={{ flex: 1, marginLeft: avatar ? 12 : 0, marginRight: 12 }}>
        <ThemedText style={s.connectName}>{name}</ThemedText>
        <ThemedText style={s.connectSub}>{sub}</ThemedText>
      </View>
      {connected ? (
        <View style={s.connectedBadge}>
          <Ionicons name="checkmark" size={12} color={GREEN} style={{ marginRight: 4 }} />
          <ThemedText style={s.connectedText}>Connected</ThemedText>
        </View>
      ) : (
        <TouchableOpacity style={s.connectBtn} activeOpacity={0.8}>
          <ThemedText style={s.connectBtnText}>Connect</ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
  const router = useRouter();

  // Profile state
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio,   setBio]   = useState('');
  const [role,  setRole]  = useState<string>('elite');
  const [isFoundingMember, setIsFoundingMember] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Appearance
  const [appearance, setAppearance] = useState<'system'|'light'|'dark'>('system');

  // Program
  const [programName, setProgramName] = useState('');
  const [location,    setLocation]    = useState('');
  const [website,     setWebsite]     = useState('');

  // Branding
  const [tagline,      setTagline]      = useState('Elite hockey training that moves the needle.');
  const [primaryColor, setPrimaryColor] = useState('#00C4B4');
  const BRAND_COLORS = ['#00C4B4', '#3DFF8F', '#3B82F6', '#8B5CF6', '#EF4444', '#F59E0B'];

  // Notifications
  const [notifs, setNotifs] = useState({ newReg: true, newMsg: true, campReminder: true, waitlist: false, payment: true });
  const toggleNotif = (k: keyof typeof notifs) => setNotifs(p => ({ ...p, [k]: !p[k] }));

  // SMS
  const [smsName,  setSmsName]  = useState('');
  const [smsPhone, setSmsPhone] = useState('');
  const [smsSig,   setSmsSig]   = useState('');

  // Privacy
  const [marketplace, setMarketplace] = useState(false);
  const [twoFA,       setTwoFA]       = useState(false);

  // Buffer / Pixel
  const [buffer,  setBuffer]  = useState('30');
  const [pixelId, setPixelId] = useState('');

  // Subscription / paywall
  const [showPaywall, setShowPaywall] = useState(false);

  // My Children (dual-role: coach who is also a parent)
  type LinkedChild = { id: string; full_name: string; teamName: string | null };
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);

  // ── Load profile from Supabase ──────────────────────────────────────────────
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, bio, role, org_name, city, is_founding_member')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setName(profile.full_name ?? '');
        setBio(profile.bio ?? '');
        setRole(profile.role ?? 'elite');
        setProgramName(profile.org_name ?? '');
        setLocation(profile.city ?? '');
        setIsFoundingMember(!!profile.is_founding_member);
      }
      setProfileLoading(false);

      // Check if this coach is also a parent (their email is stored as parent_email on any player)
      const { data: childData } = await supabase
        .from('players')
        .select('id, full_name, teams(name)')
        .eq('parent_email', user.email ?? '');

      if (childData && childData.length > 0) {
        setLinkedChildren(childData.map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          teamName: Array.isArray(p.teams) ? (p.teams[0]?.name ?? null) : (p.teams?.name ?? null),
        })));
      }
    }
    loadProfile();
  }, []);

  // ── Save profile ────────────────────────────────────────────────────────────
  async function handleSaveProfile() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name,
        bio,
        org_name: programName,
        city: location,
      });
      if (error) {
        Alert.alert('Error', 'Could not save profile. Please try again.');
      } else {
        Alert.alert('Saved', 'Profile updated.');
      }
    }
    setSaving(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut();
        router.replace('/auth/sign-in');
      }},
    ]);
  }

  function switchToParent() {
    router.push('/parent-home' as any);
  }

  function switchToTeamCoach() {
    router.push('/tc-home' as any);
  }

  function switchToOnboarding() {
    router.push('/onboarding' as any);
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe}>
        {/* Back */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={16} color={TEXT} />
            <ThemedText style={s.backText}>Back</ThemedText>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <ThemedText style={s.title}>Settings</ThemedText>
          <ThemedText style={s.subtitle}>Manage your account, notifications and subscription.</ThemedText>

          {/* ── Subscription ── */}
          <View style={[s.card, isFoundingMember && { borderColor: '#F59E0B' }]}>
            <View style={s.featureRow}>
              <View style={[s.featureIcon, { backgroundColor: isFoundingMember ? 'rgba(245,158,11,0.1)' : 'rgba(0,196,180,0.1)' }]}>
                <Ionicons name="star-outline" size={22} color={isFoundingMember ? '#F59E0B' : TEAL} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <ThemedText style={s.featureEyebrow}>SUBSCRIPTION</ThemedText>
                <ThemedText style={s.featureTitle}>
                  {role === 'elite' ? 'Elite Coach' : role === 'team' ? 'Team Coach' : 'PXF Hockey'}{isFoundingMember ? ' · Founding Member' : ''}
                </ThemedText>
                <ThemedText style={s.featureSub}>
                  {isFoundingMember
                    ? 'Your founding member rate is locked in for life.'
                    : 'Manage or upgrade your subscription.'}
                </ThemedText>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
              <TouchableOpacity
                style={s.subBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  const url = await getManagementURL();
                  if (url) Linking.openURL(url);
                  else Alert.alert('Manage Subscription', 'Open your device Settings → Subscriptions to manage your plan.');
                }}
              >
                <ThemedText style={s.subBtnText}>Manage Plan</ThemedText>
              </TouchableOpacity>
              {role !== 'elite' && (
                <TouchableOpacity
                  style={[s.subBtn, { backgroundColor: 'rgba(0,196,180,0.12)', borderColor: TEAL }]}
                  activeOpacity={0.8}
                  onPress={() => setShowPaywall(true)}
                >
                  <ThemedText style={[s.subBtnText, { color: TEAL }]}>Upgrade to Elite</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Paywall modal (upgrade path from Settings) */}
          <PaywallModal
            visible={showPaywall}
            planId="elite"
            onSuccess={() => setShowPaywall(false)}
            onDismiss={() => setShowPaywall(false)}
          />

          {/* ── Trust & Safety ── */}
          <TouchableOpacity style={[s.card, { borderColor: TEAL }]} activeOpacity={0.85}>
            <View style={s.featureRow}>
              <View style={[s.featureIcon, { backgroundColor: 'rgba(0,196,180,0.12)' }]}>
                <Ionicons name="shield-checkmark-outline" size={22} color={TEAL} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <ThemedText style={s.featureEyebrow}>TRUST & SAFETY</ThemedText>
                <ThemedText style={s.featureTitle}>Get Verified</ThemedText>
                <ThemedText style={s.featureSub}>Earn the blue VERIFIED badge with a one-time $35 background check. Parents see this before registering.</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>

          {/* ── Academy: My Team ── */}
          <TouchableOpacity style={s.card} activeOpacity={0.85}>
            <View style={s.featureRow}>
              <View style={[s.featureIcon, { backgroundColor: 'rgba(61,255,143,0.08)' }]}>
                <Ionicons name="people-circle-outline" size={22} color={GREEN} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <ThemedText style={s.featureEyebrow}>ACADEMY</ThemedText>
                <ThemedText style={s.featureTitle}>My Team</ThemedText>
                <ThemedText style={s.featureSub}>Invite staff, set permission levels (Owner / Coach / Assistant) and assign them to specific camps.</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>

          {/* ── Staff Coaches ── */}
          <TouchableOpacity style={s.card} activeOpacity={0.85}>
            <View style={s.featureRow}>
              <View style={[s.featureIcon, { backgroundColor: 'rgba(0,196,180,0.08)' }]}>
                <Ionicons name="people-circle-outline" size={22} color={TEAL} />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <ThemedText style={s.featureEyebrow}>ELITE</ThemedText>
                <ThemedText style={s.featureTitle}>Staff Coaches</ThemedText>
                <ThemedText style={s.featureSub}>Invite up to 3 staff coaches for free, then $9.99/mo each. Assign them to specific teams.</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={MUTED} style={{ marginLeft: 8 }} />
            </View>
          </TouchableOpacity>

          {/* ── Profile ── */}
          <View style={s.card}>
            <SectionHeader icon="person-outline" title="Profile" />
            {profileLoading ? (
              <ActivityIndicator color={TEAL} style={{ marginVertical: 20 }} />
            ) : (
              <>
                <View style={s.avatarRow}>
                  <View style={s.avatar}>
                    <ThemedText style={s.avatarText}>{name ? name[0].toUpperCase() : '?'}</ThemedText>
                  </View>
                  <TouchableOpacity style={s.changePhotoBtn} activeOpacity={0.8}>
                    <Ionicons name="camera-outline" size={14} color={TEXT} style={{ marginRight: 6 }} />
                    <ThemedText style={s.changePhotoText}>Change photo</ThemedText>
                  </TouchableOpacity>
                </View>
                <Field label="NAME"  value={name}  onChangeText={setName}  />
                <Field label="EMAIL" value={email} onChangeText={setEmail} keyboardType="email-address" />
                <Field label="PHONE" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Field label="BIO"   value={bio}   onChangeText={setBio}   multiline />
                <TouchableOpacity onPress={handleSaveProfile} disabled={saving} activeOpacity={0.85} style={{ marginTop: 4 }}>
                  <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.gradBtn, { borderRadius: 12, paddingVertical: 14, alignItems: 'center' }]}>
                    {saving
                      ? <ActivityIndicator color="#000" size="small" />
                      : <ThemedText style={s.gradBtnText}>Save Profile</ThemedText>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* ── Appearance ── */}
          <View style={s.card}>
            <SectionHeader icon="color-palette-outline" title="Appearance" />
            <ThemedText style={s.cardSub}>Choose how PXF Hockey looks. System follows your device setting.</ThemedText>
            <View style={s.appearRow}>
              {(['system', 'light', 'dark'] as const).map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[s.appearBtn, appearance === mode && s.appearBtnActive]}
                  onPress={() => setAppearance(mode)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={mode === 'system' ? 'desktop-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline'}
                    size={20}
                    color={appearance === mode ? '#000' : MUTED}
                  />
                  <ThemedText style={[s.appearText, appearance === mode && s.appearTextActive]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Program (Coach) ── */}
          <View style={s.card}>
            <SectionHeader icon="business-outline" title="Program (Coach)" />
            <Field label="PROGRAM NAME" value={programName} onChangeText={setProgramName} />
            <View style={s.logoPickerRow}>
              <View style={s.logoBox}>
                <ThemedText style={s.logoBoxText}>Logo</ThemedText>
              </View>
              <TouchableOpacity style={s.smallBtn} activeOpacity={0.8}>
                <ThemedText style={s.smallBtnText}>Upload</ThemedText>
              </TouchableOpacity>
            </View>
            <Field label="LOCATION" value={location} onChangeText={setLocation} />
            <Field label="WEBSITE"  value={website}  onChangeText={setWebsite}  keyboardType="url" />
          </View>

          {/* ── Branding (Platinum) ── */}
          <View style={s.card}>
            <SectionHeader icon="color-palette-outline" title="Branding (Platinum)" />
            <ThemedText style={s.cardSub}>Your branding appears on your public booking page and in the app when your athletes log in.</ThemedText>
            <Field label="TAGLINE" value={tagline} onChangeText={setTagline} />
            <ThemedText style={s.fieldLabel}>PROGRAM LOGO</ThemedText>
            <View style={[s.logoPickerRow, { marginBottom: 14 }]}>
              <View style={[s.logoBox, { borderStyle: 'dashed' }]}>
                <Ionicons name="image-outline" size={22} color={MUTED} />
              </View>
              <TouchableOpacity style={s.smallBtn} activeOpacity={0.8}>
                <ThemedText style={s.smallBtnText}>Upload logo</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={s.fieldLabel}>BANNER IMAGE</ThemedText>
            <TouchableOpacity style={s.bannerBox} activeOpacity={0.8}>
              <ThemedText style={s.bannerText}>1600 × 600 · click to upload</ThemedText>
            </TouchableOpacity>
            <ThemedText style={[s.fieldLabel, { marginTop: 14 }]}>PRIMARY COLOR</ThemedText>
            <View style={s.colorRow}>
              {BRAND_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorSwatch, { backgroundColor: c }, primaryColor === c && s.colorSwatchSelected]}
                  onPress={() => setPrimaryColor(c)}
                  activeOpacity={0.8}
                />
              ))}
              <View style={s.hexBox}>
                <ThemedText style={s.hexText}>{primaryColor}</ThemedText>
              </View>
            </View>
            {/* Preview */}
            <View style={s.brandPreview}>
              <ThemedText style={s.previewLabel}>PREVIEW</ThemedText>
              <View style={s.previewRow}>
                <View style={[s.previewAvatar, { backgroundColor: primaryColor }]}>
                  <ThemedText style={s.previewAvatarText}>PXF</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={s.previewName}>{programName || 'Program Name'}</ThemedText>
                  <ThemedText style={s.previewTagline}>{tagline || 'Your tagline here'}</ThemedText>
                </View>
              </View>
            </View>
          </View>

          {/* ── Notifications ── */}
          <View style={s.card}>
            <SectionHeader icon="notifications-outline" title="Notifications" />
            <CheckRow label="New registration"  checked={notifs.newReg}       onToggle={() => toggleNotif('newReg')} />
            <CheckRow label="New message"        checked={notifs.newMsg}       onToggle={() => toggleNotif('newMsg')} />
            <CheckRow label="Camp reminder"      checked={notifs.campReminder} onToggle={() => toggleNotif('campReminder')} />
            <CheckRow label="Waitlist movement"  checked={notifs.waitlist}     onToggle={() => toggleNotif('waitlist')} />
            <CheckRow label="Payment received"   checked={notifs.payment}      onToggle={() => toggleNotif('payment')} />
          </View>

          {/* ── SMS Sender ── */}
          <View style={s.card}>
            <SectionHeader icon="chatbubble-outline" title="SMS Sender" />
            <ThemedText style={s.cardSub}>Your verified business number for automated reminders and broadcasts. We'll wire this up to your SMS provider in a later step — for now save your sender details so they appear correctly in previews.</ThemedText>
            <Field label="SENDER NAME (MAX 11 CHARS)" value={smsName}  onChangeText={setSmsName}  />
            <Field label="SENDER PHONE (E.164)"        value={smsPhone} onChangeText={setSmsPhone} keyboardType="phone-pad" />
            <Field label="SIGNATURE APPENDED TO EVERY SMS" value={smsSig} onChangeText={setSmsSig} multiline />
            <View style={s.providerNote}>
              <ThemedText style={s.providerText}>
                Provider: <ThemedText style={{ fontWeight: '700', color: TEXT }}>Not configured</ThemedText>. Connect Twilio or another SMS provider to start sending live messages.
              </ThemedText>
            </View>
          </View>

          {/* ── Privacy & Security ── */}
          <View style={s.card}>
            <SectionHeader icon="lock-closed-outline" title="Privacy & Security" />
            <CheckRow
              label="Show my camps in the public PXF marketplace"
              sub="When OFF, your camps are only reachable via your direct booking link. Logged-in parents you've registered will still see your camps inside their app."
              checked={marketplace}
              onToggle={() => setMarketplace(!marketplace)}
            />
            <CheckRow label="Two-factor authentication" checked={twoFA} onToggle={() => setTwoFA(!twoFA)} />
            <TouchableOpacity
              style={[s.outlineBtn, { marginTop: 8 }]}
              activeOpacity={0.8}
              onPress={() => router.push('/auth/forgot-password' as any)}
            >
              <ThemedText style={s.outlineBtnText}>Change Password</ThemedText>
            </TouchableOpacity>
          </View>

          {/* ── Connected Accounts ── */}
          <View style={s.card}>
            <SectionHeader icon="link-outline" title="Connected Accounts" />
            <ConnectRow name="Stripe Connect"  sub="Payouts enabled · Bank ending 4421" connected />
            <View style={s.divider} />
            <ConnectRow name="Google Calendar" sub="Sync events to your calendar" />
          </View>

          {/* ── Connect Accounting ── */}
          <View style={s.card}>
            <SectionHeader icon="calculator-outline" title="Connect Accounting" />
            <ThemedText style={s.cardSub}>Sync every camp registration payment to your accounting software. Each transaction posts with the camp name, parent name, amount, and date.</ThemedText>
            <ConnectRow avatar="QB" name="QuickBooks" sub="Auto-post payments as sales receipts" />
            <View style={s.divider} />
            <ConnectRow avatar="X"  name="Xero"       sub="Auto-post payments as sales receipts" />
          </View>

          {/* ── Scheduling Buffer ── */}
          <View style={s.card}>
            <SectionHeader icon="time-outline" title="Scheduling buffer" />
            <ThemedText style={s.cardSub}>Minimum minutes between back-to-back assignments for any team member. If a coach's gap is shorter than this, we'll warn before confirming the assignment.</ThemedText>
            <View style={s.bufferRow}>
              <TextInput
                style={s.bufferInput}
                value={buffer}
                onChangeText={setBuffer}
                keyboardType="numeric"
                placeholderTextColor={MUTED}
              />
              <ThemedText style={[s.cardSub, { marginBottom: 0, flex: 1 }]}>minutes</ThemedText>
              <TouchableOpacity activeOpacity={0.85}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.gradBtn}>
                  <ThemedText style={s.gradBtnText}>Save</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Meta Pixel ── */}
          <View style={s.card}>
            <SectionHeader icon="megaphone-outline" title="Meta Pixel" />
            <ThemedText style={s.cardSub}>Paste your Facebook / Instagram Pixel ID to track ad conversions. We'll fire a Purchase event with the camp name and amount whenever a registration completes.</ThemedText>
            <Field label="PIXEL ID" value={pixelId} onChangeText={setPixelId} placeholder="e.g. 1234567890123456" keyboardType="numeric" />
            <TouchableOpacity activeOpacity={0.85}>
              <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.gradBtn, { alignSelf: 'flex-start', paddingHorizontal: 24 }]}>
                <ThemedText style={s.gradBtnText}>Save Pixel ID</ThemedText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* ── Email Marketing ── */}
          <View style={s.card}>
            <SectionHeader icon="mail-outline" title="Email Marketing" />
            <ThemedText style={s.cardSub}>Auto-add new registrants to your email list. Pick a provider, then choose which list new parents should join.</ThemedText>
            <ConnectRow avatar="MC" name="Mailchimp" sub="Connect with API key, then pick a list" />
            <View style={s.divider} />
            <ConnectRow avatar="K"  name="Klaviyo"   sub="Connect with API key, then pick a list" />
          </View>

          {/* ── Subscription ── */}
          <View style={s.card}>
            <SectionHeader icon="card-outline" title="Subscription" />
            {/* Current plan */}
            <View style={s.currentPlanCard}>
              <ThemedText style={s.planEyebrow}>CURRENT PLAN</ThemedText>
              <ThemedText style={s.planTitle}>
                {role === 'team' ? 'Team Coach' : 'Elite Coach'} — {isFoundingMember ? (role === 'team' ? '$25/mo' : '$50/mo') : (role === 'team' ? '$35/mo' : '$80/mo')}
              </ThemedText>
              <ThemedText style={s.planSub}>
                {isFoundingMember
                  ? 'Founding Member — price locked in for life'
                  : 'Active subscription'}
              </ThemedText>
            </View>
            {/* Upgrade */}
            <View style={[s.card, { margin: 0, marginTop: 10 }]}>
              <ThemedText style={s.upgradeEyebrow}>UPGRADE</ThemedText>
              <ThemedText style={s.upgradeTitle}>Academy — $99/mo</ThemedText>
              <ThemedText style={s.upgradeSub}>Multiple coaches under one organization, staff management, org-wide analytics.</ThemedText>
              <TouchableOpacity activeOpacity={0.85} style={{ marginTop: 14 }}>
                <LinearGradient colors={[TEAL, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[s.gradBtn, { borderRadius: 12, paddingVertical: 14, alignItems: 'center' }]}>
                  <ThemedText style={s.gradBtnText}>Upgrade to Academy</ThemedText>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={s.planBtnRow}>
              <TouchableOpacity style={[s.planBtn, { borderColor: TEAL, flex: 1 }]} activeOpacity={0.8}>
                <ThemedText style={[s.planBtnText, { color: TEAL }]}>Manage Plan</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[s.planBtn, { flex: 1, marginLeft: 8 }]} activeOpacity={0.8}>
                <ThemedText style={s.planBtnText}>View Invoices</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Danger Zone ── */}
          <View style={[s.card, { borderColor: RED }]}>
            <SectionHeader icon="trash-outline" title="Danger Zone" />
            <View style={s.dangerInner}>
              <ThemedText style={s.dangerTitle}>Delete account</ThemedText>
              <ThemedText style={s.dangerSub}>Permanently delete your account, camps, and all data. This cannot be undone.</ThemedText>
              <TouchableOpacity
                style={s.deleteBtn}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Delete Account', 'Permanently delete your account and all data. This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive' },
                ])}
              >
                <ThemedText style={s.deleteBtnText}>Delete Account</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── My Children (coach who is also a parent) ── */}
          {linkedChildren.length > 0 && (
            <View style={[s.card, { borderColor: 'rgba(0,196,180,0.4)' }]}>
              <View style={s.featureRow}>
                <View style={[s.featureIcon, { backgroundColor: 'rgba(0,196,180,0.12)' }]}>
                  <Ionicons name="heart-outline" size={22} color={TEAL} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <ThemedText style={s.featureEyebrow}>MY CHILDREN</ThemedText>
                  <ThemedText style={s.featureTitle}>Parent View Available</ThemedText>
                  <ThemedText style={s.featureSub}>
                    {linkedChildren.map(c => `${c.full_name}${c.teamName ? ` · ${c.teamName}` : ''}`).join('\n')}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity
                style={[s.subBtn, { marginTop: 14, backgroundColor: 'rgba(0,196,180,0.1)', borderColor: TEAL }]}
                activeOpacity={0.8}
                onPress={switchToParent}
              >
                <ThemedText style={[s.subBtnText, { color: TEAL }]}>Switch to Parent View →</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* ── DEV: Role Switcher ── */}
          <TouchableOpacity style={s.devRoleBtn} onPress={switchToParent} activeOpacity={0.8}>
            <Ionicons name="swap-horizontal-outline" size={18} color={TEAL} style={{ marginRight: 8 }} />
            <ThemedText style={s.devRoleText}>DEV: Switch to Parent View</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[s.devRoleBtn, { marginTop: 8 }]} onPress={switchToTeamCoach} activeOpacity={0.8}>
            <Ionicons name="people-outline" size={18} color={TEAL} style={{ marginRight: 8 }} />
            <ThemedText style={s.devRoleText}>DEV: Switch to Team Coach View</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[s.devRoleBtn, { marginTop: 8 }]} onPress={switchToOnboarding} activeOpacity={0.8}>
            <Ionicons name="sparkles-outline" size={18} color={TEAL} style={{ marginRight: 8 }} />
            <ThemedText style={s.devRoleText}>DEV: Preview Onboarding</ThemedText>
          </TouchableOpacity>

          {/* ── Sign Out ── */}
          <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={RED} style={{ marginRight: 8 }} />
            <ThemedText style={s.signOutText}>Sign out</ThemedText>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  topBar: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: CARD, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: BORDER, alignSelf: 'flex-start' },
  backText: { fontSize: 14, fontWeight: '600', color: TEXT },

  content: { paddingHorizontal: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEXT, marginTop: 14, marginBottom: 4 },
  subtitle: { fontSize: 14, color: MUTED, marginBottom: 20, lineHeight: 20 },

  card: { backgroundColor: CARD, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 16, marginBottom: 12 },

  // Feature cards (Trust, Academy, Staff)
  featureRow: { flexDirection: 'row', alignItems: 'flex-start' },
  featureIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  featureEyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 2 },
  featureTitle: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 4 },
  featureSub: { fontSize: 13, color: MUTED, lineHeight: 18 },

  // Section headers
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  cardSub: { fontSize: 13, color: MUTED, lineHeight: 19, marginBottom: 12, marginTop: -4 },

  // Profile avatar
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '800', lineHeight: 32, color: '#000' },
  changePhotoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: BORDER },
  changePhotoText: { fontSize: 13, fontWeight: '600', color: TEXT },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: TEXT, borderWidth: 1, borderColor: BORDER },

  // Appearance
  appearRow: { flexDirection: 'row', gap: 8 },
  appearBtn: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: BG, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: BORDER },
  appearBtnActive: { backgroundColor: TEAL, borderColor: TEAL },
  appearText: { fontSize: 12, fontWeight: '600', color: MUTED },
  appearTextActive: { color: '#000' },

  // Logo picker
  logoPickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  logoBox: { width: 52, height: 52, borderRadius: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  logoBoxText: { fontSize: 11, color: MUTED },
  smallBtn: { backgroundColor: BG, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, borderWidth: 1, borderColor: BORDER },
  smallBtnText: { fontSize: 13, fontWeight: '600', color: TEXT },

  // Subscription card buttons
  subBtn: { flex: 1, backgroundColor: CARD, borderRadius: 10, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  subBtnText: { fontSize: 13, fontWeight: '700', color: MUTED },

  // Branding
  bannerBox: { height: 80, borderRadius: 10, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  bannerText: { fontSize: 13, color: MUTED },
  colorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  colorSwatchSelected: { borderWidth: 3, borderColor: TEXT },
  hexBox: { backgroundColor: BG, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: BORDER },
  hexText: { fontSize: 13, color: TEXT, fontWeight: '600' },
  brandPreview: { backgroundColor: BG, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: BORDER },
  previewLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 1, marginBottom: 10 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  previewAvatarText: { fontSize: 12, fontWeight: '800', color: '#000' },
  previewName: { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 2 },
  previewTagline: { fontSize: 12, color: MUTED },

  // Checkboxes
  checkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, padding: 14, marginBottom: 6 },
  checkLabel: { fontSize: 15, color: TEXT, fontWeight: '500' },
  checkSub: { fontSize: 12, color: MUTED, lineHeight: 17, marginTop: 3 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkboxOn: { backgroundColor: TEAL, borderColor: TEAL },

  // Provider note
  providerNote: { backgroundColor: BG, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: BORDER, marginTop: 4 },
  providerText: { fontSize: 13, color: MUTED, lineHeight: 19 },

  // Outline button
  outlineBtn: { backgroundColor: BG, borderRadius: 10, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  outlineBtnText: { fontSize: 15, fontWeight: '700', color: TEXT },

  // Connect rows
  divider: { height: 1, backgroundColor: BORDER, marginVertical: 10 },
  connectRow: { flexDirection: 'row', alignItems: 'center' },
  connectAvatar: { width: 40, height: 40, borderRadius: 10, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  connectAvatarText: { fontSize: 12, fontWeight: '800', color: '#000' },
  connectName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  connectSub: { fontSize: 12, color: MUTED },
  connectedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(61,255,143,0.1)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(61,255,143,0.4)' },
  connectedText: { fontSize: 13, fontWeight: '700', color: GREEN },
  connectBtn: { backgroundColor: BG, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: BORDER, flexShrink: 0 },
  connectBtnText: { fontSize: 13, fontWeight: '600', color: TEXT },

  // Buffer
  bufferRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bufferInput: { width: 70, backgroundColor: BG, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: TEXT, fontWeight: '700', borderWidth: 1, borderColor: BORDER, textAlign: 'center' },

  // Gradient button
  gradBtn: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 11, alignItems: 'center' },
  gradBtnText: { fontSize: 14, fontWeight: '800', color: '#000' },

  // Subscription
  currentPlanCard: { backgroundColor: 'rgba(61,255,143,0.05)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(61,255,143,0.35)', padding: 14 },
  planEyebrow: { fontSize: 11, fontWeight: '700', color: GREEN, letterSpacing: 0.5, marginBottom: 4 },
  planTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 4 },
  planSub: { fontSize: 13, color: MUTED, lineHeight: 18 },
  upgradeEyebrow: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 4 },
  upgradeTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 4 },
  upgradeSub: { fontSize: 13, color: MUTED, lineHeight: 18 },
  planBtnRow: { flexDirection: 'row', marginTop: 12 },
  planBtn: { flex: 1, backgroundColor: BG, borderRadius: 20, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  planBtnText: { fontSize: 14, fontWeight: '700', color: TEXT },

  // Danger zone
  dangerInner: { backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239,68,68,0.35)', padding: 14 },
  dangerTitle: { fontSize: 16, fontWeight: '700', color: RED, marginBottom: 6 },
  dangerSub: { fontSize: 13, color: MUTED, lineHeight: 18, marginBottom: 12 },
  deleteBtn: { borderRadius: 20, paddingHorizontal: 20, paddingVertical: 9, borderWidth: 1, borderColor: RED, alignSelf: 'flex-start' },
  deleteBtnText: { fontSize: 14, fontWeight: '700', color: RED },

  // Dev role switcher
  devRoleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,196,180,0.08)', borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)', marginTop: 4 },
  devRoleText: { fontSize: 14, fontWeight: '700', color: TEAL },

  // Sign out
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderRadius: 14, paddingVertical: 16, borderWidth: 1, borderColor: BORDER, marginTop: 4 },
  signOutText: { fontSize: 16, fontWeight: '700', color: RED },
});
