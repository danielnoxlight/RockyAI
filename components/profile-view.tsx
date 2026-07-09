'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { upsertProfile } from '@/app/actions/fitness'
import { signOut } from '@/lib/auth-client'
import { useTranslation } from '@/lib/i18n'
import { BottomNav } from '@/components/bottom-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, LogOut, Save, Ruler, Weight, Calendar, Activity, ChevronDown, Settings2 } from 'lucide-react'

type Profile = {
  age: number | null
  gender: string | null
  height: string | null
  weight: string | null
  fitnessLevel: string | null
} | null

export function ProfileView({
  userName,
  userEmail,
  profile,
}: {
  userName: string
  userEmail: string
  profile: Profile
}) {
  const router = useRouter()
  const { t, lang, setLang } = useTranslation()
  const p = t.profile
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [age, setAge] = useState(profile?.age?.toString() ?? '')
  const [gender, setGender] = useState(profile?.gender ?? '')
  const [height, setHeight] = useState(profile?.height?.toString() ?? '')
  const [weight, setWeight] = useState(profile?.weight?.toString() ?? '')
  const [fitnessLevel, setFitnessLevel] = useState(profile?.fitnessLevel ?? '')

  const FITNESS_LEVELS = [
    { id: 'beginner',     label: p.levelBeginner,     desc: p.levelBeginnerDesc },
    { id: 'intermediate', label: p.levelIntermediate, desc: p.levelIntermediateDesc },
    { id: 'advanced',     label: p.levelAdvanced,     desc: p.levelAdvancedDesc },
  ]

  const GENDERS = [
    { id: 'male',   label: p.male },
    { id: 'female', label: p.female },
  ]

  const handleSave = () => {
    startTransition(async () => {
      await upsertProfile({
        age: parseInt(age) || 0,
        gender,
        height: parseFloat(height) || 0,
        weight: parseFloat(weight) || 0,
        fitnessLevel,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/sign-in')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // BMI calc
  const bmi =
    height && weight
      ? (parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)
      : null

  const bmiLabel = bmi
    ? parseFloat(bmi) < 18.5 ? p.bmiUnder
      : parseFloat(bmi) < 25  ? p.bmiNormal
      : parseFloat(bmi) < 30  ? p.bmiOver
      : p.bmiObese
    : null

  return (
    <main className="min-h-svh bg-background pb-safe-nav">
      <div className="max-w-lg mx-auto px-4">

        {/* Header */}
        <div className="pt-safe pb-5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">{p.title}</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {p.signOut}
          </button>
        </div>

        {/* Avatar card */}
        <div className="bg-card border border-border rounded-3xl p-5 flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">{initials}</span>
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{userName}</h2>
            <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
            {fitnessLevel && (
              <span className="inline-block mt-1.5 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5">
                {FITNESS_LEVELS.find(f => f.id === fitnessLevel)?.label}
              </span>
            )}
          </div>
        </div>

        {/* BMI card */}
        {bmi && (
          <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{p.bmiLabel}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{bmi}</p>
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-xl ${
              bmiLabel === p.bmiNormal ? 'bg-green-400/10 text-green-400 border border-green-400/20' :
              bmiLabel === p.bmiUnder  ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20' :
              'bg-orange-400/10 text-orange-400 border border-orange-400/20'
            }`}>
              {bmiLabel}
            </span>
          </div>
        )}

        {/* Physical data */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            {p.physicalData}
          </h3>
          <div className="flex flex-col gap-4">
            {/* Gender */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">{p.genderLabel}</Label>
              <div className="flex gap-2">
                {GENDERS.map(g => (
                  <button
                    key={g.id}
                    onClick={() => setGender(g.id)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      gender === g.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-secondary text-muted-foreground'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="age" className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> {p.ageLabel}
              </Label>
              <Input
                id="age"
                type="number"
                placeholder="25"
                value={age}
                onChange={e => setAge(e.target.value)}
                min={10}
                max={100}
                className="bg-secondary border-border text-foreground h-11"
              />
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="height" className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5" /> {p.heightLabel}
                </Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="175"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className="bg-secondary border-border text-foreground h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="weight" className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Weight className="w-3.5 h-3.5" /> {p.weightLabel}
                </Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="75"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="bg-secondary border-border text-foreground h-11"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fitness level */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            {p.fitnessLevel}
          </h3>
          <div className="flex flex-col gap-2">
            {FITNESS_LEVELS.map(f => (
              <button
                key={f.id}
                onClick={() => setFitnessLevel(f.id)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${
                  fitnessLevel === f.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-secondary hover:border-border/80'
                }`}
              >
                <div>
                  <p className={`text-sm font-semibold ${fitnessLevel === f.id ? 'text-primary' : 'text-foreground'}`}>
                    {f.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
                {fitnessLevel === f.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={isPending}
          className={`w-full h-12 font-semibold rounded-xl transition-all mb-4 ${
            saved
              ? 'bg-green-500 hover:bg-green-500 text-white'
              : 'bg-primary hover:bg-primary/90 text-primary-foreground'
          }`}
        >
          {isPending ? (
            p.saving
          ) : saved ? (
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {p.saved}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {p.saveBtn}
            </span>
          )}
        </Button>

        {/* Advanced settings (language hidden here) */}
        <div className="mb-6">
          <button
            onClick={() => setAdvancedOpen(v => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors w-full py-1"
          >
            <Settings2 className="w-3 h-3" />
            <span>{lang === 'ru' ? 'Дополнительно' : 'Advanced'}</span>
            <ChevronDown className={`w-3 h-3 ml-auto transition-transform duration-200 ${advancedOpen ? 'rotate-180' : ''}`} />
          </button>
          {advancedOpen && (
            <div className="mt-3 bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground mb-3">{p.language}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLang('en')}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                    lang === 'en'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.langEn}
                </button>
                <button
                  onClick={() => setLang('ru')}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${
                    lang === 'ru'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.langRu}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      <BottomNav />
    </main>
  )
}
