import React, { useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/themed-text';
import { supabase } from '@/lib/supabase';
import PaywallModal from '@/components/paywall-modal';
import { initPurchases, isFoundingMemberAvailable } from '@/lib/purchases';

const BG     = '#0D1117';
const CARD   = '#161B22';
const TEAL   = '#00C4B4';
const GREEN  = '#3DFF8F';
const ORANGE = '#F59E0B';
const TEXT   = '#FFFFFF';
const MUTED  = '#8B949E';
const BORDER = '#21262D';

type Role = 'elite' | 'team' | null;

const AGE_GROUPS = ['U9','U10','U11','U12','U13','U14','U15','U16','U17','U18','Junior','Senior'];
const SPECIALTIES = ['Skating','Shooting','Defense','Goaltending','Stickhandling','Systems & Video','Strength & Conditioning','General'];
const SEASONS = ['2025-26','2026-27','2027-28'];

const TOTAL_STEPS = 5;

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={s.progressRow}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View
          key={i}
          style={[
            s.progressSegment,
            i < step ? s.progressDone : i === step - 1 ? s.progressActive : s.progressPending,
          ]}
        />
      ))}
    </View>
  );
}

const ELITE_FEATURES = [
  'Camps & registrations',
  'Financials & payouts',
  'CRM & contacts',
  'Broadcasts & outreach',
  'Film review & upload',
  'Teams, scheduling & drills',
];

const TEAM_FEATURES = [
  'Team roster & schedule',
  'Sessions & drills',
  'Practice planning',
  'Player & parent inbox',
];

// ─── Step 1: Welcome + Role ───────────────────────────────────────────────────
function StepWelcome({ role, setRole, onNext }: { role: Role; setRole: (r: Role) => void; onNext: () => void }) {
  return (
    <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false}>
      <View style={s.logoRow}>
        <ThemedText style={s.logoPXF}>PXF</ThemedText>
        <ThemedText style={s.logoHockey}> HOCKEY</ThemedText>
      </View>

      <ThemedText style={s.stepTitle}>Welcome, Coach.</ThemedText>
      <ThemedText style={s.stepSub}>Let's get you set up in 2 minutes. First — which plan are you on?</ThemedText>

      <View style={s.roleCards}>
        {/* Elite Coach */}
        <TouchableOpacity
          style={[s.roleCard, role === 'elite' && s.roleCardActive]}
          onPress={() => setRole('elite')}
          activeOpacity={0.8}
        >
          <View style={s.roleCardTop}>
            <View style={[s.roleIconWrap, { backgroundColor: 'rgba(0,196,180,0.12)' }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color={TEAL} />
            </View>
            <View style={s.roleCardTopRight}>
              <View style={s.bestValueChip}>
                <ThemedText style={s.bestValueText}>BEST VALUE</ThemedText>
              </View>
              {role === 'elite' && <Ionicons name="checkmark-circle" size={20} color={TEAL} />}
            </View>
          </View>

          <ThemedText style={s.roleTitle}>Elite Coach</ThemedText>

          <View style={s.pricingRow}>
            <ThemedText style={s.roleFoundingPrice}>$50<ThemedText style={s.perMonth}>/mo</ThemedText></ThemedText>
            <View style={s.savingsChip}>
              <ThemedText style={s.savingsText}>Save $30 founding</ThemedText>
            </View>
          </View>
          <ThemedText style={s.rolePriceRegular}>$80/mo regular price</ThemedText>

          <View style={s.featureList}>
            {ELITE_FEATURES.map(f => (
              <View key={f} style={s.featureRow}>
                <Ionicons name="checkmark-circle" size={14} color={TEAL} />
                <ThemedText style={s.featureText}>{f}</ThemedText>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Team Coach */}
        <TouchableOpacity
          style={[s.roleCard, role === 'team' && s.roleCardActive]}
          onPress={() => setRole('team')}
          activeOpacity={0.8}
        >
          <View style={s.roleCardTop}>
            <View style={[s.roleIconWrap, { backgroundColor: 'rgba(61,255,143,0.1)' }]}>
              <Ionicons name="people-outline" size={22} color={GREEN} />
            </View>
            <View style={s.roleCardTopRight}>
              {role === 'team' && <Ionicons name="checkmark-circle" size={20} color={TEAL} />}
            </View>
          </View>

          <ThemedText style={s.roleTitle}>Team Coach</ThemedText>

          <View style={s.pricingRow}>
            <ThemedText style={[s.roleFoundingPrice, { color: GREEN }]}>$25<ThemedText style={[s.perMonth, { color: GREEN }]}>/mo</ThemedText></ThemedText>
            <View style={[s.savingsChip, { backgroundColor: 'rgba(61,255,143,0.1)', borderColor: 'rgba(61,255,143,0.25)' }]}>
              <ThemedText style={[s.savingsText, { color: GREEN }]}>Save $10 founding</ThemedText>
            </View>
          </View>
          <ThemedText style={s.rolePriceRegular}>$35/mo regular price</ThemedText>

          <View style={s.featureList}>
            {TEAM_FEATURES.map(f => (
              <View key={f} style={s.featureRow}>
                <Ionicons name="checkmark-circle" size={14} color={GREEN} />
                <ThemedText style={s.featureText}>{f}</ThemedText>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </View>

      <View style={s.foundingNote}>
        <Ionicons name="flame-outline" size={14} color={ORANGE} />
        <ThemedText style={s.foundingNoteText}>
          First 250 coaches lock in the founding price for life.
        </ThemedText>
      </View>

      <TouchableOpacity
        style={[s.nextBtn, !role && s.nextBtnDisabled]}
        onPress={onNext}
        disabled={!role}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
          <ThemedText style={s.nextBtnText}>Continue</ThemedText>
          <Ionicons name="arrow-forward" size={18} color="#000" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Step 2: Profile ──────────────────────────────────────────────────────────
function StepProfile({
  name, setName, specialty, setSpecialty, bio, setBio, onNext, onBack,
}: {
  name: string; setName: (v: string) => void;
  specialty: string; setSpecialty: (v: string) => void;
  bio: string; setBio: (v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'C';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ThemedText style={s.stepTitle}>Your profile</ThemedText>
        <ThemedText style={s.stepSub}>This is what athletes and parents will see.</ThemedText>

        {/* Avatar */}
        <TouchableOpacity style={s.avatarWrap} activeOpacity={0.8}>
          <View style={s.avatar}>
            <ThemedText style={s.avatarInitials}>{initials}</ThemedText>
          </View>
          <View style={s.avatarEdit}>
            <Ionicons name="camera" size={14} color="#000" />
          </View>
        </TouchableOpacity>

        <ThemedText style={s.fieldLabel}>FULL NAME</ThemedText>
        <TextInput
          style={s.textInput}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mike Reilly"
          placeholderTextColor={MUTED}
          autoCapitalize="words"
        />

        <ThemedText style={s.fieldLabel}>COACHING SPECIALTY</ThemedText>
        <View style={s.chipWrap}>
          {SPECIALTIES.map(sp => (
            <TouchableOpacity
              key={sp}
              style={[s.chip, specialty === sp && s.chipActive]}
              onPress={() => setSpecialty(sp)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.chipText, specialty === sp && s.chipTextActive]}>{sp}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={s.fieldLabel}>BIO <ThemedText style={s.optional}>(optional)</ThemedText></ThemedText>
        <TextInput
          style={[s.textInput, s.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell athletes a bit about your coaching background..."
          placeholderTextColor={MUTED}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <View style={s.btnRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, { flex: 1 }, !name.trim() && s.nextBtnDisabled]}
            onPress={onNext}
            disabled={!name.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
              <ThemedText style={s.nextBtnText}>Continue</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 3: Organization (Elite only) ───────────────────────────────────────
function StepOrganization({
  orgName, setOrgName, city, setCity, role, onNext, onBack,
}: {
  orgName: string; setOrgName: (v: string) => void;
  city: string; setCity: (v: string) => void;
  role: Role; onNext: () => void; onBack: () => void;
}) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ThemedText style={s.stepTitle}>Your organization</ThemedText>
        <ThemedText style={s.stepSub}>
          {role === 'elite'
            ? 'Parents and athletes will see this when they enroll in your camps and programs.'
            : 'Which club or organization do you coach for?'}
        </ThemedText>

        <ThemedText style={s.fieldLabel}>ORGANIZATION / SCHOOL NAME</ThemedText>
        <TextInput
          style={s.textInput}
          value={orgName}
          onChangeText={setOrgName}
          placeholder="e.g. PXF Skills Academy"
          placeholderTextColor={MUTED}
          autoCapitalize="words"
        />

        <ThemedText style={s.fieldLabel}>CITY</ThemedText>
        <TextInput
          style={s.textInput}
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Calgary, AB"
          placeholderTextColor={MUTED}
          autoCapitalize="words"
        />

        {role === 'elite' && (
          <>
            <ThemedText style={s.fieldLabel}>WEBSITE <ThemedText style={s.optional}>(optional)</ThemedText></ThemedText>
            <TextInput
              style={s.textInput}
              placeholder="https://yoursite.com"
              placeholderTextColor={MUTED}
              autoCapitalize="none"
              keyboardType="url"
            />
          </>
        )}

        <View style={s.btnRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, { flex: 1 }]}
            onPress={onNext}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
              <ThemedText style={s.nextBtnText}>Continue</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.skipBtn} onPress={onNext}>
          <ThemedText style={s.skipText}>Skip for now</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 4: First Team ───────────────────────────────────────────────────────
function StepFirstTeam({
  teamName, setTeamName, ageGroup, setAgeGroup, season, setSeason, onNext, onBack,
}: {
  teamName: string; setTeamName: (v: string) => void;
  ageGroup: string; setAgeGroup: (v: string) => void;
  season: string; setSeason: (v: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={s.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <ThemedText style={s.stepTitle}>Your first team</ThemedText>
        <ThemedText style={s.stepSub}>You can add more teams later from the Teams tab.</ThemedText>

        <ThemedText style={s.fieldLabel}>TEAM NAME</ThemedText>
        <TextInput
          style={s.textInput}
          value={teamName}
          onChangeText={setTeamName}
          placeholder="e.g. Lightning U14"
          placeholderTextColor={MUTED}
          autoCapitalize="words"
        />

        <ThemedText style={s.fieldLabel}>AGE GROUP</ThemedText>
        <View style={s.chipWrap}>
          {AGE_GROUPS.map(ag => (
            <TouchableOpacity
              key={ag}
              style={[s.chip, ageGroup === ag && s.chipActive]}
              onPress={() => setAgeGroup(ag)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.chipText, ageGroup === ag && s.chipTextActive]}>{ag}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <ThemedText style={s.fieldLabel}>SEASON</ThemedText>
        <View style={s.chipWrap}>
          {SEASONS.map(se => (
            <TouchableOpacity
              key={se}
              style={[s.chip, season === se && s.chipActive]}
              onPress={() => setSeason(se)}
              activeOpacity={0.8}
            >
              <ThemedText style={[s.chipText, season === se && s.chipTextActive]}>{se}</ThemedText>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.btnRow}>
          <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color={MUTED} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, { flex: 1 }, !teamName.trim() && s.nextBtnDisabled]}
            onPress={onNext}
            disabled={!teamName.trim()}
            activeOpacity={0.85}
          >
            <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
              <ThemedText style={s.nextBtnText}>Continue</ThemedText>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={s.skipBtn} onPress={onNext}>
          <ThemedText style={s.skipText}>Skip for now</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────
function StepDone({ name, role, onFinish }: { name: string; role: Role; onFinish: () => void }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'C';
  return (
    <ScrollView contentContainerStyle={[s.stepContent, { alignItems: 'center', paddingTop: 60 }]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['rgba(0,196,180,0.15)', 'transparent']} style={s.doneGlow}>
        <View style={s.doneAvatar}>
          <ThemedText style={s.doneAvatarText}>{initials}</ThemedText>
        </View>
      </LinearGradient>

      <View style={s.doneBadge}>
        <Ionicons name="flame" size={14} color={ORANGE} />
        <ThemedText style={s.doneBadgeText}>FOUNDING MEMBER</ThemedText>
      </View>

      <ThemedText style={s.doneTitle}>You're all set, Coach!</ThemedText>
      <ThemedText style={s.doneSub}>
        Welcome to PXF Hockey. Your {role === 'elite' ? 'Elite Coach' : 'Team Coach'} dashboard is ready.
      </ThemedText>

      <View style={s.doneChecklist}>
        {[
          'Profile created',
          'First team added',
          role === 'elite' ? 'Organization set up' : null,
          'Founding member locked in',
        ].filter(Boolean).map((item, i) => (
          <View key={i} style={s.doneCheckRow}>
            <View style={s.doneCheckCircle}>
              <Ionicons name="checkmark" size={12} color="#000" />
            </View>
            <ThemedText style={s.doneCheckText}>{item}</ThemedText>
          </View>
        ))}
      </View>

      <TouchableOpacity style={s.nextBtn} onPress={onFinish} activeOpacity={0.85}>
        <LinearGradient colors={[TEAL, '#00A89A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.nextBtnGrad}>
          <ThemedText style={s.nextBtnText}>Go to Dashboard</ThemedText>
          <Ionicons name="arrow-forward" size={18} color="#000" />
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [role, setRole]           = useState<Role>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  // Step 2
  const [name, setName]           = useState('');
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio]             = useState('');
  // Step 3
  const [orgName, setOrgName] = useState('');
  const [city, setCity]       = useState('');
  // Step 4
  const [teamName, setTeamName] = useState('');
  const [ageGroup, setAgeGroup] = useState('U14');
  const [season, setSeason]     = useState('2026-27');

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS)); }
  function back() { setStep(s => Math.max(s - 1, 1)); }

  // Called when user taps Continue on Step 1 (role selection)
  async function handleRoleNext() {
    if (!role) return;
    // Init RevenueCat with user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await initPurchases(user.id);
    setShowPaywall(true);
  }

  // Called when paywall purchase succeeds (or is skipped in dev)
  async function handlePaywallSuccess() {
    setShowPaywall(false);
    // Mark founding member if eligible
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const eligible = await isFoundingMemberAvailable();
      await supabase.from('profiles').upsert({
        id: user.id,
        is_founding_member: eligible,
      });
    }
    next(); // proceed to step 2
  }

  async function finish() {
    // Save profile + role to Supabase so _layout.tsx can route correctly on future logins
    if (role) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('profiles').upsert({
          id: user.id,
          role,
          full_name: name || null,
          specialty: specialty || null,
          bio: bio || null,
          org_name: orgName || null,
          city: city || null,
        });

        // Create the first team if the coach filled it in
        if (teamName.trim()) {
          await supabase.from('teams').insert({
            name: teamName.trim(),
            age_group: ageGroup || null,
            season: season || null,
            coach_id: user.id,
          });
        }
      }
    }

    if (role === 'team') {
      router.replace('/tc-home' as any);
    } else {
      router.replace('/' as any);
    }
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        {/* Progress + skip */}
        {step < TOTAL_STEPS && (
          <View style={s.topBar}>
            <ProgressBar step={step} />
            <TouchableOpacity onPress={finish} style={s.skipTopBtn}>
              <ThemedText style={s.skipTopText}>Skip</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {step === 1 && <StepWelcome role={role} setRole={setRole} onNext={handleRoleNext} />}
        {role && (
          <PaywallModal
            visible={showPaywall}
            planId={role}
            onSuccess={handlePaywallSuccess}
            onDismiss={() => setShowPaywall(false)}
          />
        )}
        {step === 2 && (
          <StepProfile
            name={name} setName={setName}
            specialty={specialty} setSpecialty={setSpecialty}
            bio={bio} setBio={setBio}
            onNext={next} onBack={back}
          />
        )}
        {step === 3 && (
          <StepOrganization
            orgName={orgName} setOrgName={setOrgName}
            city={city} setCity={setCity}
            role={role}
            onNext={next} onBack={back}
          />
        )}
        {step === 4 && (
          <StepFirstTeam
            teamName={teamName} setTeamName={setTeamName}
            ageGroup={ageGroup} setAgeGroup={setAgeGroup}
            season={season} setSeason={setSeason}
            onNext={next} onBack={back}
          />
        )}
        {step === 5 && <StepDone name={name} role={role} onFinish={finish} />}
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },

  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, gap: 12 },
  progressRow: { flex: 1, flexDirection: 'row', gap: 4 },
  progressSegment: { flex: 1, height: 3, borderRadius: 2 },
  progressDone:    { backgroundColor: TEAL },
  progressActive:  { backgroundColor: TEAL, opacity: 0.5 },
  progressPending: { backgroundColor: BORDER },

  skipTopBtn: { padding: 6 },
  skipTopText: { fontSize: 14, color: MUTED, fontWeight: '600' },

  stepContent: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  // Step 1
  logoRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 32 },
  logoPXF:    { fontSize: 28, fontWeight: '800', lineHeight: 34, color: TEXT },
  logoHockey: { fontSize: 16, fontWeight: '700', color: MUTED, letterSpacing: 2 },

  stepTitle: { fontSize: 30, fontWeight: '800', lineHeight: 38, color: TEXT, marginBottom: 8 },
  stepSub:   { fontSize: 15, color: MUTED, lineHeight: 22, marginBottom: 28 },

  roleCards: { gap: 12, marginBottom: 16 },
  roleCard: {
    backgroundColor: CARD, borderRadius: 18, padding: 18,
    borderWidth: 1.5, borderColor: BORDER,
  },
  roleCardActive: { borderColor: TEAL, backgroundColor: 'rgba(0,196,180,0.06)' },
  roleCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  roleCardTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 6 },

  // Pricing
  pricingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  roleFoundingPrice: { fontSize: 22, fontWeight: '800', color: TEAL },
  perMonth: { fontSize: 14, fontWeight: '600', color: TEAL },
  savingsChip: { backgroundColor: 'rgba(0,196,180,0.1)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,196,180,0.25)' },
  savingsText: { fontSize: 11, fontWeight: '700', color: TEAL },
  rolePriceRegular: { fontSize: 12, color: MUTED, marginBottom: 12 },

  // Best value badge
  bestValueChip: { backgroundColor: 'rgba(0,196,180,0.15)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(0,196,180,0.3)' },
  bestValueText: { fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 0.5 },

  // Feature list
  featureList: { gap: 6 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  featureText: { fontSize: 13, color: MUTED, lineHeight: 18 },

  foundingNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28, backgroundColor: 'rgba(245,158,11,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  foundingNoteText: { fontSize: 12, color: ORANGE, flex: 1 },

  // Profile
  avatarWrap: { alignSelf: 'center', marginBottom: 24, position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontSize: 28, fontWeight: '800', color: '#000', lineHeight: 34 },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BG },

  fieldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 1.5, marginBottom: 8, marginTop: 16 },
  optional:   { fontSize: 11, color: 'rgba(139,148,158,0.6)', fontWeight: '400', letterSpacing: 0 },
  textInput: { backgroundColor: CARD, borderRadius: 12, padding: 14, color: TEXT, fontSize: 15, borderWidth: 1, borderColor: BORDER },
  textArea:  { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },

  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: TEAL, borderColor: TEAL },
  chipText: { fontSize: 13, color: MUTED, fontWeight: '600' },
  chipTextActive: { color: '#000', fontWeight: '700' },

  // Buttons
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 28 },
  backBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 28 },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  nextBtnText: { fontSize: 16, fontWeight: '800', color: '#000' },
  skipBtn: { alignItems: 'center', paddingTop: 16 },
  skipText: { fontSize: 14, color: MUTED },

  // Done
  doneGlow: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  doneAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,196,180,0.4)' },
  doneAvatarText: { fontSize: 36, fontWeight: '800', lineHeight: 44, color: '#000' },
  doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', marginBottom: 20 },
  doneBadgeText: { fontSize: 11, fontWeight: '800', color: ORANGE, letterSpacing: 1 },
  doneTitle: { fontSize: 28, fontWeight: '800', lineHeight: 36, color: TEXT, textAlign: 'center', marginBottom: 8 },
  doneSub: { fontSize: 15, color: MUTED, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
  doneChecklist: { width: '100%', gap: 10, marginBottom: 32 },
  doneCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: CARD, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: BORDER },
  doneCheckCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center' },
  doneCheckText: { fontSize: 14, fontWeight: '600', color: TEXT },
});
