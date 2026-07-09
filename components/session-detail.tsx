'use client'

import { useState, useTransition } from 'react'
import { completeWorkoutSession, uncompleteWorkoutSession, type ExerciseEffort } from '@/app/actions/fitness'
// SetFeedback is defined locally in this file
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, Circle, Clock, Dumbbell, X, ChevronDown, ChevronUp,
  Flame, Zap, Wind, Leaf, TrendingUp, TrendingDown, Minus, Sparkles,
  AlertCircle, ThumbsUp,
} from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export type Exercise = {
  name: string
  sets: number
  reps: string
  restSeconds: number
  muscleGroup: string
  equipment: string
  description: string
  phase: 'warmup' | 'strength' | 'cardio' | 'cooldown'
}

type WorkoutSessionData = {
  id: string
  scheduledDate: string
  completed: boolean
  notes: string | null
  exercisesJson: unknown
}

// ─── Phase config ─────────────────────────────────────────────────────────────

// Static (non-translatable) parts of phase config
const PHASE_STYLE = {
  warmup: {
    icon: Flame,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    dot: 'bg-orange-400',
  },
  strength: {
    icon: Dumbbell,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  cardio: {
    icon: Zap,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
  },
  cooldown: {
    icon: Leaf,
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
  },
} as const

type PhaseKey = keyof typeof PHASE_STYLE

// ─── SVG Exercise Illustrations ───────────────────────────────────────────────
// Each illustration shows key movement phases as a 2-frame SVG stick figure.
// viewBox: 0 0 120 80, figures are ~20px tall.

type IllustrationProps = { className?: string }

// Reusable stick-figure primitives
function StickFigure({
  cx, cy, // torso centre
  headR = 5,
  // limb endpoint offsets from torso centre
  leftArm, rightArm, leftLeg, rightLeg,
  torsoLen = 14,
  color = 'currentColor',
}: {
  cx: number; cy: number; headR?: number
  leftArm: [number, number]; rightArm: [number, number]
  leftLeg: [number, number]; rightLeg: [number, number]
  torsoLen?: number; color?: string
}) {
  const headY = cy - torsoLen / 2 - headR
  const shoulderY = cy - torsoLen / 2
  const hipY = cy + torsoLen / 2
  return (
    <g stroke={color} strokeWidth="2" strokeLinecap="round" fill="none">
      <circle cx={cx} cy={headY} r={headR} fill={color} fillOpacity={0.15} />
      <line x1={cx} y1={shoulderY} x2={cx} y2={hipY} />
      <line x1={cx} y1={shoulderY} x2={cx + leftArm[0]} y2={shoulderY + leftArm[1]} />
      <line x1={cx} y1={shoulderY} x2={cx + rightArm[0]} y2={shoulderY + rightArm[1]} />
      <line x1={cx} y1={hipY} x2={cx + leftLeg[0]} y2={hipY + leftLeg[1]} />
      <line x1={cx} y1={hipY} x2={cx + rightLeg[0]} y2={hipY + rightLeg[1]} />
    </g>
  )
}

function IllustrationWrapper({ children, label }: { children: React.ReactNode; label: string }) {
  // Split label into steps on " — " for cleaner display
  const steps = label.split(' — ')
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 120 80" className="w-full h-[72px]" aria-label={label} role="img">
        {children}
      </svg>
      {/* Step indicators */}
      <div className="flex items-start gap-1.5 w-full flex-wrap justify-center">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground/40 text-[10px]">→</span>}
            <span className="text-[10px] text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded-md leading-tight">
              {step}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Phase arrow between frames
function Arrow({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground/40">
      <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
      <polyline points={`${x + 2},${y - 3} ${x + 6},${y} ${x + 2},${y + 3}`} />
    </g>
  )
}

// Ground line
function Ground({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  return <line x1={x1} y1={y} x2={x2} y2={y} stroke="currentColor" strokeWidth="1" className="text-border" />
}

// ── Individual exercise illustrations ──

function BenchPressIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Лёжа на скамье — опустить к груди — выжать вверх">
      {/* Frame 1: bar lowered to chest */}
      <g className="text-foreground">
        {/* bench */}
        <rect x="4" y="48" width="48" height="6" rx="2" fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth="1.5" />
        {/* figure lying down */}
        <circle cx="28" cy="34" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="28" y1="39" x2="28" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="41" x2="14" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="41" x2="42" y2="36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* barbell */}
        <line x1="10" y1="35" x2="46" y2="35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="10" cy="35" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="46" cy="35" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
      <Arrow x={60} y={40} />
      {/* Frame 2: bar pressed up */}
      <g className="text-foreground" transform="translate(64,0)">
        <rect x="4" y="48" width="48" height="6" rx="2" fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth="1.5" />
        <circle cx="28" cy="34" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="28" y1="39" x2="28" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="41" x2="14" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="41" x2="42" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="10" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="46" cy="24" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
    </IllustrationWrapper>
  )
}

function SquatIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Ноги на ширине плеч — присесть до параллели — встать">
      <Ground x1={4} x2={52} y={70} />
      {/* Frame 1: standing */}
      <StickFigure cx={28} cy={45} leftArm={[-10, 8]} rightArm={[10, 8]} leftLeg={[-8, 20]} rightLeg={[8, 20]} color="currentColor" />
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      {/* Frame 2: squatting */}
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={52} torsoLen={12} leftArm={[-12, 4]} rightArm={[12, 4]} leftLeg={[-10, 16]} rightLeg={[10, 16]} color="currentColor" />
      </g>
    </IllustrationWrapper>
  )
}

function DeadliftIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Тазобедренн��й шарнир — тянуть вдоль ног — полное выпрямление">
      <Ground x1={4} x2={52} y={70} />
      {/* Frame 1: hinged over bar */}
      <g className="text-foreground">
        <StickFigure cx={28} cy={44} torsoLen={14} leftArm={[-10, 14]} rightArm={[10, 14]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
        {/* bar on ground */}
        <line x1="10" y1="67" x2="46" y2="67" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="10" cy="67" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="46" cy="67" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      {/* Frame 2: locked out standing */}
      <g className="text-foreground" transform="translate(64,0)">
        <StickFigure cx={28} cy={42} leftArm={[-10, 20]} rightArm={[10, 20]} leftLeg={[-8, 24]} rightLeg={[8, 24]} color="currentColor" />
        <line x1="18" y1="62" x2="38" y2="62" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="18" cy="62" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="38" cy="62" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
    </IllustrationWrapper>
  )
}

function PullUpIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Вис на перекладине — тянуть грудью к перекладине — медленно опустить">
      {/* Bar */}
      <line x1="12" y1="10" x2="48" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Frame 1: hanging */}
      <StickFigure cx={28} cy={38} leftArm={[-10, -22]} rightArm={[10, -22]} leftLeg={[-7, 20]} rightLeg={[7, 20]} color="currentColor" />
      <Arrow x={60} y={40} />
      {/* Bar 2 */}
      <line x1="76" y1="10" x2="112" y2="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Frame 2: chin above bar */}
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={26} leftArm={[-10, -10]} rightArm={[10, -10]} leftLeg={[-7, 20]} rightLeg={[7, 20]} color="currentColor" />
      </g>
    </IllustrationWrapper>
  )
}

function OverheadPressIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Гриф у плеч — жать строго вверх — опустить под контролем">
      <Ground x1={4} x2={52} y={72} />
      {/* Frame 1: bar at shoulders */}
      <g className="text-foreground">
        <StickFigure cx={28} cy={46} leftArm={[-12, 6]} rightArm={[12, 6]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
        <line x1="12" y1="40" x2="44" y2="40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="40" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="44" cy="40" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={72} />
      {/* Frame 2: arms locked out overhead */}
      <g className="text-foreground" transform="translate(64,0)">
        <StickFigure cx={28} cy={50} leftArm={[-12, -18]} rightArm={[12, -18]} leftLeg={[-9, 20]} rightLeg={[9, 20]} color="currentColor" />
        <line x1="12" y1="22" x2="44" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="12" cy="22" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <circle cx="44" cy="22" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
    </IllustrationWrapper>
  )
}

function PlankIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Упор лёжа — тело прямое — держать позицию">
      <Ground x1={4} x2={116} y={60} />
      {/* Body flat, head right */}
      <circle cx="100" cy="44" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
      <line x1="20" y1="53" x2="95" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="53" x2="20" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="52" x2="28" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="78" y1="52" x2="78" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="86" y1="51" x2="86" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IllustrationWrapper>
  )
}

function HipThrustIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Плечи на скамье — поднять бёдра до параллели — сжать ягодицы">
      <Ground x1={4} x2={116} y={70} />
      {/* bench */}
      <rect x="4" y="46" width="26" height="8" rx="2" fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth="1.5" />
      {/* Frame 1: hips low */}
      <g className="text-foreground">
        <circle cx="18" cy="40" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="18" y1="45" x2="38" y2="52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="52" x2="42" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="52" x2="34" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <Arrow x={60} y={40} />
      {/* bench 2 */}
      <rect x="68" y="46" width="26" height="8" rx="2" fill="currentColor" fillOpacity={0.1} stroke="currentColor" strokeWidth="1.5" />
      {/* Frame 2: hips up */}
      <g className="text-foreground">
        <circle cx="82" cy="40" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="82" y1="45" x2="98" y2="38" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="98" y1="38" x2="104" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="98" y1="38" x2="94" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </IllustrationWrapper>
  )
}

function LateralRaiseIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Руки опущены — поднять до уровня плеч — медленно опустить">
      <Ground x1={4} x2={52} y={70} />
      {/* Frame 1: arms down */}
      <StickFigure cx={28} cy={44} leftArm={[-8, 16]} rightArm={[8, 16]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      {/* Frame 2: arms at shoulder height */}
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={44} leftArm={[-16, 0]} rightArm={[16, 0]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
      </g>
    </IllustrationWrapper>
  )
}

function LungeIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Шаг вперёд — опустить заднее колено к полу — оттолкнут��ся">
      <Ground x1={4} x2={52} y={70} />
      <StickFigure cx={28} cy={44} leftArm={[-8, 12]} rightArm={[8, 12]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      {/* Lunge position */}
      <g className="text-foreground" transform="translate(64,0)">
        <circle cx="28" cy="26" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="28" y1="31" x2="28" y2="45" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="33" x2="18" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="28" y1="33" x2="38" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* front leg */}
        <line x1="28" y1="45" x2="18" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="18" y1="60" x2="12" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* back leg down */}
        <line x1="28" y1="45" x2="38" y2="56" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="38" y1="56" x2="38" y2="70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </IllustrationWrapper>
  )
}

function JumpingJacksIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Ноги вместе — прыжок врозь с подъёмом рук — вернуться">
      <Ground x1={4} x2={52} y={70} />
      <StickFigure cx={28} cy={44} leftArm={[-8, 14]} rightArm={[8, 14]} leftLeg={[-5, 22]} rightLeg={[5, 22]} color="currentColor" />
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={40} leftArm={[-14, -10]} rightArm={[14, -10]} leftLeg={[-12, 24]} rightLeg={[12, 24]} color="currentColor" />
      </g>
    </IllustrationWrapper>
  )
}

function StretchIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Принять позу — дышать и удерживать растяжку">
      <Ground x1={4} x2={116} y={70} />
      {/* sitting stretch figure */}
      <circle cx="30" cy="38" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
      <line x1="30" y1="43" x2="30" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="48" x2="14" y2="55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="48" x2="46" y2="55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="58" x2="14" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="58" x2="46" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* reach arrow */}
      <Arrow x={65} y={60} />
      {/* reaching toward feet */}
      <circle cx="90" cy="44" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
      <line x1="90" y1="49" x2="90" y2="58" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="52" x2="78" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="52" x2="102" y2="62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="58" x2="76" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="90" y1="58" x2="104" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IllustrationWrapper>
  )
}

function CurlIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Локти у корпуса — согнуть до плеча — медленно опустить">
      <Ground x1={4} x2={52} y={70} />
      <StickFigure cx={28} cy={44} leftArm={[-8, 16]} rightArm={[8, 16]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={44} leftArm={[-14, 6]} rightArm={[14, 6]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
      </g>
    </IllustrationWrapper>
  )
}

function RowIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Наклон вперёд — тянуть к поясу — сжать лопатки">
      <Ground x1={4} x2={52} y={70} />
      {/* Frame 1: arms extended down */}
      <g className="text-foreground">
        <circle cx="28" cy="28" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="28" y1="33" x2="26" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="40" x2="14" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="40" x2="38" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="48" x2="20" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="48" x2="32" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      {/* Frame 2: arms pulled to hips */}
      <g className="text-foreground" transform="translate(64,0)">
        <circle cx="28" cy="28" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="28" y1="33" x2="26" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="40" x2="12" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="40" x2="40" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="48" x2="20" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="48" x2="32" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </IllustrationWrapper>
  )
}

function TreadmillIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Чередовать 1 мин бег / 1 мин ходьба">
      <Ground x1={4} x2={52} y={70} />
      {/* Running figure */}
      <StickFigure cx={28} cy={42} leftArm={[-14, 8]} rightArm={[10, 14]} leftLeg={[-12, 24]} rightLeg={[10, 20]} color="currentColor" />
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      {/* Walking figure */}
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={44} leftArm={[-10, 12]} rightArm={[8, 16]} leftLeg={[-10, 22]} rightLeg={[6, 22]} color="currentColor" />
      </g>
    </IllustrationWrapper>
  )
}

function KettlebellSwingIllustration({ className }: IllustrationProps) {
  return (
    <IllustrationWrapper label="Тазобедренный шарнир — мах гирей до плеч — вернуть">
      <Ground x1={4} x2={52} y={70} />
      {/* Frame 1: hinge back */}
      <g className="text-foreground">
        <circle cx="28" cy="28" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity={0.15} />
        <line x1="28" y1="33" x2="26" y2="48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="40" x2="12" y2="50" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="48" x2="18" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="26" y1="48" x2="34" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        {/* kettlebell */}
        <circle cx="8" cy="56" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      {/* Frame 2: standing, bell at shoulder */}
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={44} leftArm={[-14, -10]} rightArm={[14, -10]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
        <circle cx="14" cy="22" r="4" stroke="currentColor" strokeWidth="1.5" fill="none" />
      </g>
    </IllustrationWrapper>
  )
}

function GenericIllustration({ label }: { label: string }) {
  return (
    <IllustrationWrapper label={label}>
      <Ground x1={4} x2={52} y={70} />
      <StickFigure cx={28} cy={44} leftArm={[-10, 12]} rightArm={[10, 12]} leftLeg={[-9, 22]} rightLeg={[9, 22]} color="currentColor" />
      <Arrow x={60} y={40} />
      <Ground x1={68} x2={116} y={70} />
      <g transform="translate(64,0)">
        <StickFigure cx={28} cy={38} leftArm={[-12, 6]} rightArm={[12, 6]} leftLeg={[-9, 28]} rightLeg={[9, 28]} color="currentColor" />
      </g>
    </IllustrationWrapper>
  )
}

const ILLUSTRATION_MAP: Record<string, (p: IllustrationProps) => React.ReactElement> = {
  'Barbell Bench Press': BenchPressIllustration,
  'Incline Dumbbell Press': BenchPressIllustration,
  'Barbell Back Squat': SquatIllustration,
  'Leg Press': SquatIllustration,
  'Deadlift': DeadliftIllustration,
  'Sumo Deadlift': DeadliftIllustration,
  'Romanian Deadlift': DeadliftIllustration,
  'Pull-Up': PullUpIllustration,
  'Lat Pulldown': PullUpIllustration,
  'Overhead Press': OverheadPressIllustration,
  'Arnold Press': OverheadPressIllustration,
  'Plank': PlankIllustration,
  'Hip Thrust': HipThrustIllustration,
  'Glute Bridge': HipThrustIllustration,
  'Lateral Raise': LateralRaiseIllustration,
  'Front Raise': LateralRaiseIllustration,
  'Rear Delt Flye': LateralRaiseIllustration,
  'Walking Lunges': LungeIllustration,
  'Bulgarian Split Squat': LungeIllustration,
  'Jumping Jacks': JumpingJacksIllustration,
  'Burpee': JumpingJacksIllustration,
  'Barbell Curl': CurlIllustration,
  'Hammer Curl': CurlIllustration,
  'Concentration Curl': CurlIllustration,
  'Barbell Row': RowIllustration,
  'Seated Cable Row': RowIllustration,
  'Single-Arm Dumbbell Row': RowIllustration,
  'Treadmill Intervals': TreadmillIllustration,
  'Jump Rope': TreadmillIllustration,
  'Kettlebell Swing': KettlebellSwingIllustration,
  'Thrusters': OverheadPressIllustration,
  // Stretches
  'Standing Quad Stretch': StretchIllustration,
  'Seated Hamstring Stretch': StretchIllustration,
  'Chest Opener Stretch': StretchIllustration,
  "Child's Pose": StretchIllustration,
  'Pigeon Pose': StretchIllustration,
  'Shoulder Cross Stretch': StretchIllustration,
  'Supine Twist': StretchIllustration,
  'Cat-Cow Stretch': StretchIllustration,
  'Leg Swing': JumpingJacksIllustration,
  'Inchworm': PlankIllustration,
  'Arm Circles': LateralRaiseIllustration,
}

function ExerciseIllustration({ exercise }: { exercise: Exercise }) {
  const Comp = ILLUSTRATION_MAP[exercise.name]
  if (Comp) return <Comp />
  return <GenericIllustration label={exercise.description} />
}

// ─── Muscle body map ──────────────────────────────────────────────────────────

const MUSCLE_COLOR_MAP: Record<string, string> = {
  Chest:       '#3b82f6',
  Back:        '#8b5cf6',
  Legs:        '#10b981',
  Shoulders:   '#f59e0b',
  Arms:        '#ef4444',
  Core:        '#f97316',
  Glutes:      '#ec4899',
  'Full Body': '#6366f1',
  Cardio:      '#06b6d4',
}

const MUSCLE_LABEL: Record<string, string> = {
  Chest: 'Грудь', Back: 'Спина', Legs: 'Ноги', Shoulders: 'Плечи',
  Arms: 'Руки', Core: 'Пресс', Glutes: 'Ягодицы', 'Full Body': 'Всё тело', Cardio: 'Кардио',
}

function MuscleBodyMap({ exercises }: { exercises: Exercise[] }) {
  const { t } = useTranslation()
  const mainExercises = exercises.filter(e => e.phase === 'strength' || e.phase === 'cardio')
  const activeMuscles = [...new Set(mainExercises.map(e => e.muscleGroup))]

  const regions = [
    { id: 'Shoulders', path: 'M28,30 Q22,28 20,36 L24,44 Q30,40 36,38 Z M72,30 Q78,28 80,36 L76,44 Q70,40 64,38 Z' },
    { id: 'Chest',     path: 'M36,38 Q44,34 50,35 Q56,34 64,38 L62,52 Q50,55 38,52 Z' },
    { id: 'Arms',      path: 'M20,36 L16,58 L24,60 L28,44 Z M80,36 L84,58 L76,60 L72,44 Z' },
    { id: 'Core',      path: 'M38,52 Q50,55 62,52 L60,72 Q50,75 40,72 Z' },
    { id: 'Glutes',    path: 'M38,72 Q44,70 50,71 Q56,70 62,72 L64,82 Q50,86 36,82 Z' },
    { id: 'Legs',      path: 'M38,82 L35,110 L44,112 L50,90 L56,112 L65,110 L62,82 Q50,86 38,82 Z' },
    { id: 'Back',      path: 'M36,38 Q44,34 50,35 Q56,34 64,38 L62,68 Q50,70 38,68 Z' },
  ]
  const bodyPath = 'M50,8 a10,12 0 1,1 0.001,0 M36,20 Q22,22 20,36 L16,60 L24,62 L28,80 L38,82 L35,112 L44,114 L50,92 L56,114 L65,112 L62,82 L72,80 L76,62 L84,60 L80,36 Q78,22 64,20 Z'

  const totalSets = mainExercises.reduce((a, e) => a + e.sets, 0)
  const estMinutes = Math.round(mainExercises.reduce((a, e) => a + e.sets * (60 + e.restSeconds), 0) / 60)

  return (
    <div className="bg-secondary border border-border rounded-2xl overflow-hidden mb-4">
      {/* Stats strip */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
        <div className="flex flex-col items-center py-2.5 gap-0.5">
          <span className="text-base font-bold text-foreground leading-none">{mainExercises.length}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.session.exercises}</span>
        </div>
        <div className="flex flex-col items-center py-2.5 gap-0.5">
          <span className="text-base font-bold text-foreground leading-none">{totalSets}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.session.sets}</span>
        </div>
        <div className="flex flex-col items-center py-2.5 gap-0.5">
          <span className="text-base font-bold text-foreground leading-none">~{estMinutes}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.session.minutes}</span>
        </div>
      </div>
      {/* Body map */}
      <div className="p-4">
        <p className="text-xs font-semibold text-foreground mb-3">{t.session.musclesUsed}</p>
        <div className="flex gap-4 items-start">
          <svg viewBox="0 0 100 120" className="w-20 h-24 flex-shrink-0" aria-label={t.session.musclesUsed}>
            <path d={bodyPath} fill="currentColor" className="text-muted-foreground/15" stroke="currentColor" strokeWidth="0.5" />
            <circle cx="50" cy="8" r="10" fill="currentColor" className="text-muted-foreground/20" />
            {regions.map(r => {
              const isActive = activeMuscles.includes(r.id)
              const isFullBody = activeMuscles.includes('Full Body')
              if (!isActive && !isFullBody) return null
              const color = isFullBody ? MUSCLE_COLOR_MAP['Full Body'] : (MUSCLE_COLOR_MAP[r.id] ?? '#6b7280')
              return <path key={r.id} d={r.path} fill={color} fillOpacity={0.7} stroke={color} strokeWidth="0.5" />
            })}
          </svg>
          <div className="flex-1 flex flex-col gap-1.5">
            {activeMuscles.length === 0 && (
              <p className="text-xs text-muted-foreground">{t.session.noMuscleData}</p>
            )}
            {activeMuscles.map(muscle => (
              <div key={muscle} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: MUSCLE_COLOR_MAP[muscle] ?? '#6b7280' }} />
                <span className="text-xs font-medium text-foreground">{t.session.muscleLabels[muscle as keyof typeof t.session.muscleLabels] ?? muscle}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Per-exercise set tracker ─────────────────────────────────────────────────

// Per-set feedback stored as array indexed by set number
export type SetFeedback = {
  done: true
  score: number // 1–10
} | {
  done: false
  completedReps: number // how many reps they actually did
}

// EffortRating now stores per-set feedback array
function SetFeedbackWidget({
  setIndex,
  totalSets,
  reps,
  feedback,
  onSave,
}: {
  setIndex: number
  totalSets: number
  reps: string
  feedback: SetFeedback | null
  onSave: (f: SetFeedback) => void
}) {
  const { t } = useTranslation()
  const s = t.session
  type Step = 'ask' | 'done' | 'not-done'
  const [step, setStep] = useState<Step>(feedback ? 'ask' : 'ask')
  const [score, setScore] = useState(feedback?.done ? feedback.score : 5)
  const [completedReps, setCompletedReps] = useState<number | ''>(
    feedback && !feedback.done ? feedback.completedReps : ''
  )
  const [saved, setSaved] = useState(!!feedback)

  if (saved && feedback) {
    return (
      <button
        onClick={() => { setSaved(false); setStep('ask') }}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-[11px] text-muted-foreground hover:border-primary/30 transition-colors w-full"
      >
        {feedback.done
          ? <><span className="text-primary font-semibold">{s.doneSummary}</span><span>· {feedback.score}/10</span></>
          : <><span className="text-red-400 font-semibold">{s.notDoneSummary}</span><span>· {feedback.completedReps} {s.reps}</span></>
        }
        <span className="ml-auto opacity-50">{s.editBtn}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2.5 rounded-xl bg-secondary/70 border border-border mt-1">
      <p className="text-[11px] font-semibold text-foreground">
        {s.setFeedbackTitle(setIndex)}
      </p>

      {step === 'ask' && (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setStep('done')}
            className="py-2 rounded-lg border border-green-500/30 bg-green-500/10 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors"
          >
            {s.yesDid}
          </button>
          <button
            onClick={() => setStep('not-done')}
            className="py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            {s.notFull}
          </button>
        </div>
      )}

      {step === 'done' && (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">{s.difficulty}</span>
              <span className="text-[11px] font-bold text-foreground">{score}/10</span>
            </div>
            <input
              type="range" min={1} max={10} value={score}
              onChange={e => setScore(Number(e.target.value))}
              className="w-full accent-primary h-1.5 rounded-full"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{s.easy}</span>
              <span>{s.max}</span>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setStep('ask')}
              className="flex-1 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-secondary transition-colors"
            >
              {s.backBtn}
            </button>
            <button
              onClick={() => { onSave({ done: true, score }); setSaved(true) }}
              className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
            >
              {s.saveBtn}
            </button>
          </div>
        </>
      )}

      {step === 'not-done' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex-shrink-0">{s.repsDone}</span>
            <input
              type="number"
              min={0}
              value={completedReps}
              onChange={e => setCompletedReps(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder={`/ ${reps}`}
              className="w-16 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => setStep('ask')}
              className="flex-1 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-secondary transition-colors"
            >
              {s.backBtn}
            </button>
            <button
              onClick={() => {
                onSave({ done: false, completedReps: Number(completedReps) || 0 })
                setSaved(true)
              }}
              className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90 transition-colors"
            >
              {s.saveBtn}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ExerciseSetTracker({
  exercise,
  index,
  completedSets,
  onToggleSet,
  phaseColor,
  setFeedbacks,
  onSaveSetFeedback,
}: {
  exercise: Exercise
  index: number
  completedSets: boolean[]
  onToggleSet: (setIndex: number) => void
  phaseColor: string
  setFeedbacks: (SetFeedback | null)[]
  onSaveSetFeedback: (setIndex: number, f: SetFeedback) => void
}) {
  const { t } = useTranslation()
  const s = t.session
  const [expanded, setExpanded] = useState(index < 2)
  const doneCount = completedSets.filter(Boolean).length
  const allDone = doneCount === completedSets.length
  const isStretch = exercise.phase === 'warmup' || exercise.phase === 'cooldown'
  const phaseStyle = PHASE_STYLE[exercise.phase as keyof typeof PHASE_STYLE] ?? PHASE_STYLE.strength

  return (
    <div className={`rounded-2xl border transition-colors duration-200 overflow-hidden ${
      allDone ? 'border-green-500/30 bg-green-500/5' : 'border-border bg-card'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Index / done indicator */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 border ${
          allDone
            ? 'bg-green-500/15 border-green-500/30 text-green-400'
            : `${phaseStyle.bg} ${phaseStyle.border} ${phaseStyle.color}`
        }`}>
          {allDone ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${allDone ? 'text-green-400 line-through decoration-green-400/60' : 'text-foreground'}`}>
            {exercise.name}
          </p>
          {/* Muscle group + brief stats */}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className={`text-[10px] font-semibold ${phaseStyle.color}`}>
              {s.muscleLabels[exercise.muscleGroup as keyof typeof s.muscleLabels] ?? exercise.muscleGroup}
            </span>
            {!isStretch && (
              <span className="text-[10px] text-muted-foreground">
                {exercise.sets} {s.sets} · {exercise.reps} {s.reps}
              </span>
            )}
            {isStretch && (
              <span className="text-[10px] text-muted-foreground">{exercise.reps}</span>
            )}
          </div>
        </div>

        {/* Set progress dots */}
        {!isStretch && (
          <div className="flex gap-1 flex-shrink-0">
            {completedSets.map((done, si) => (
              <span
                key={si}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  done ? 'bg-green-400 scale-110' : 'bg-border'
                }`}
              />
            ))}
          </div>
        )}

        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3">

          {/* Stats row — scannable at a glance */}
          {!isStretch && (
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col items-center gap-0.5 bg-secondary rounded-xl py-2.5 border border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{s.sets_label}</span>
                <span className="text-2xl font-bold text-foreground leading-none">{exercise.sets}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 bg-secondary rounded-xl py-2.5 border border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{s.reps_label}</span>
                <span className="text-2xl font-bold text-foreground leading-none">{exercise.reps}</span>
              </div>
              <div className="flex flex-col items-center gap-0.5 bg-secondary rounded-xl py-2.5 border border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{s.rest_label}</span>
                <span className="text-2xl font-bold text-foreground leading-none">{exercise.restSeconds}<span className="text-sm font-medium">{s.seconds}</span></span>
              </div>
            </div>
          )}

          {/* Muscle group + equipment pill row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary">
              <Dumbbell className="w-3 h-3" />
              {s.muscleLabels[exercise.muscleGroup as keyof typeof s.muscleLabels] ?? exercise.muscleGroup}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
              {exercise.equipment}
            </span>
          </div>

          {/* Movement illustration — phase-tinted panel */}
          <div className={`rounded-2xl border p-3 ${phaseStyle.bg} ${phaseStyle.border}`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${phaseStyle.color}`}>
              {s.movementTech}
            </p>
            <ExerciseIllustration exercise={exercise} />
          </div>

          {/* Technique cues — structured numbered list */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{s.howTo}</p>
            {exercise.description
              .split(/\.\s+|(?<=\d)\.\s/)
              .map(cueStr => cueStr.trim().replace(/\.$/, ''))
              .filter(Boolean)
              .map((cue, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-secondary border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{cue}</p>
                </div>
              ))
            }
          </div>

          {/* Set rows — for every phase type */}
          {!isStretch && (
            <div className="flex flex-col gap-1.5">
              {Array.from({ length: exercise.sets }, (_, si) => (
                <div key={si}>
                  <button
                    onClick={() => onToggleSet(si)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                      completedSets[si]
                        ? 'border-green-500/30 bg-green-500/10'
                        : 'border-border bg-secondary hover:border-primary/30'
                    }`}
                  >
                    {completedSets[si]
                      ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    }
                    <span className={`flex-1 text-sm font-medium transition-all ${
                      completedSets[si] ? 'text-green-400 line-through decoration-green-400/60' : 'text-foreground'
                    }`}>
                      {s.setRow(si, exercise.reps)}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {s.restRow(exercise.restSeconds)}
                    </span>
                  </button>
                  {/* Show feedback widget right after this set is ticked */}
                  {completedSets[si] && (
                    <SetFeedbackWidget
                      setIndex={si}
                      totalSets={exercise.sets}
                      reps={exercise.reps}
                      feedback={setFeedbacks[si] ?? null}
                      onSave={f => onSaveSetFeedback(si, f)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stretch / warmup / cooldown: single done button + feedback */}
          {isStretch && (
            <div>
              <button
                onClick={() => onToggleSet(0)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                  completedSets[0]
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-border bg-secondary hover:border-primary/30'
                }`}
              >
                {completedSets[0]
                  ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  : <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                }
                <span className={`flex-1 text-sm font-medium ${
                  completedSets[0] ? 'text-green-400 line-through decoration-green-400/60' : 'text-foreground'
                }`}>
                  {exercise.reps} — {exercise.name}
                </span>
              </button>
              {completedSets[0] && (
                <SetFeedbackWidget
                  setIndex={0}
                  totalSets={1}
                  reps={exercise.reps}
                  feedback={setFeedbacks[0] ?? null}
                  onSave={f => onSaveSetFeedback(0, f)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Phase section ────────────────────────────────────────────────────��───────

function PhaseSection({
  phase,
  exercises,
  exerciseOffset,
  completedSets,
  onToggleSet,
  setFeedbacksMap,
  onSaveSetFeedback,
}: {
  phase: Exercise['phase']
  exercises: Exercise[]
  exerciseOffset: number
  completedSets: boolean[][]
  onToggleSet: (exIdx: number, setIdx: number) => void
  setFeedbacksMap: Record<string, (SetFeedback | null)[]>
  onSaveSetFeedback: (exerciseName: string, setIndex: number, f: SetFeedback) => void
}) {
  const { t } = useTranslation()
  const cfg = PHASE_STYLE[phase as keyof typeof PHASE_STYLE] ?? PHASE_STYLE.strength
  const Icon = cfg.icon
  const phaseLabel = t.session.phaseLabels[phase as keyof typeof t.session.phaseLabels] ?? phase
  const phaseSub   = t.session.phaseSublabels[phase as keyof typeof t.session.phaseSublabels] ?? ''

  if (exercises.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {/* Phase header */}
      <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl ${cfg.bg} border ${cfg.border}`}>
        <Icon className={`w-4 h-4 ${cfg.color} flex-shrink-0`} />
        <div>
          <p className={`text-xs font-bold ${cfg.color}`}>{phaseLabel}</p>
          <p className="text-[10px] text-muted-foreground">{phaseSub}</p>
        </div>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {exercises.length} {t.session.exercises}
        </span>
      </div>

      {exercises.map((ex, i) => (
        <ExerciseSetTracker
          key={i}
          exercise={ex}
          index={exerciseOffset + i}
          completedSets={completedSets[exerciseOffset + i] ?? []}
          onToggleSet={si => onToggleSet(exerciseOffset + i, si)}
          phaseColor={''}
          setFeedbacks={setFeedbacksMap[ex.name] ?? []}
          onSaveSetFeedback={(si, f) => onSaveSetFeedback(ex.name, si, f)}
        />
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const PHASE_ORDER: Exercise['phase'][] = ['warmup', 'strength', 'cardio', 'cooldown']

type AdaptRec = {
  exerciseName: string
  action: 'increase' | 'decrease' | 'keep'
  change: string
  newSets?: number
  newReps?: string
  newRestSeconds?: number
}

type AdaptResult = {
  summary: string
  recommendations: AdaptRec[]
}

export function SessionDetail({
  session,
  onClose,
}: {
  session: WorkoutSessionData
  onClose: () => void
}) {
  const { t, lang } = useTranslation()
  const s = t.session
  const [isPending, startTransition] = useTransition()
  const [notes, setNotes] = useState(session.notes ?? '')
  const rawExercises = (session.exercisesJson as Exercise[]) ?? []

  // Ensure every exercise has a phase (backwards compat with old sessions)
  const exercises: Exercise[] = rawExercises.map(e => ({
    ...e,
    phase: e.phase ?? 'strength',
  }))

  // completedSets[exerciseIndex][setIndex]
  const [completedSets, setCompletedSets] = useState<boolean[][]>(() =>
    exercises.map(ex => {
      const isStretch = !ex.phase || ex.phase === 'warmup' || ex.phase === 'cooldown'
      const count = isStretch ? 1 : ex.sets
      return Array(count).fill(session.completed)
    })
  )

  // Per-set feedbacks: { [exerciseName]: SetFeedback[] }
  const [setFeedbacksMap, setSetFeedbacksMap] = useState<Record<string, (SetFeedback | null)[]>>({})
  const handleSaveSetFeedback = (exerciseName: string, setIndex: number, f: SetFeedback) => {
    setSetFeedbacksMap(prev => {
      const current = prev[exerciseName] ?? []
      const updated = [...current]
      updated[setIndex] = f
      return { ...prev, [exerciseName]: updated }
    })
  }

  // AI adaptation state
  const [adaptResult, setAdaptResult] = useState<AdaptResult | null>(null)
  const [adaptLoading, setAdaptLoading] = useState(false)

  const totalSets = completedSets.reduce((a, row) => a + row.length, 0)
  const doneSets = completedSets.flat().filter(Boolean).length
  const allDone = totalSets > 0 && doneSets === totalSets
  const progressPct = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0

  const totalTime = exercises.reduce((acc, e) => acc + e.sets * (60 + e.restSeconds), 0)
  const minutes = Math.round(totalTime / 60)

  const handleToggleSet = (exIdx: number, setIdx: number) => {
    setCompletedSets(prev => {
      const next = prev.map(row => [...row])
      next[exIdx][setIdx] = !next[exIdx][setIdx]
      return next
    })
  }

  const hasEffortData = Object.keys(setFeedbacksMap).length > 0

  const handleComplete = () => {
    startTransition(async () => {
      if (session.completed) {
        await uncompleteWorkoutSession(session.id)
        onClose()
        return
      }
      // Convert per-set feedbacks to ExerciseEffort summary per exercise for storage
      const effortSummary: Record<string, ExerciseEffort> = {}
      for (const ex of exercises) {
        const feedbacks = (setFeedbacksMap[ex.name] ?? []).filter(Boolean) as SetFeedback[]
        if (feedbacks.length === 0) continue
        const doneFeedbacks = feedbacks.filter((f): f is Extract<SetFeedback, { done: true }> => f.done)
        const notDoneFeedbacks = feedbacks.filter((f): f is Extract<SetFeedback, { done: false }> => !f.done)
        const avgScore = doneFeedbacks.length > 0
          ? Math.round(doneFeedbacks.reduce((s, f) => s + f.score, 0) / doneFeedbacks.length)
          : notDoneFeedbacks.length > 0 ? 3 : 5
        const feeling: ExerciseEffort['feeling'] = avgScore >= 8 ? 'hard' : avgScore <= 4 ? 'easy' : 'normal'
        effortSummary[ex.name] = {
          feeling,
          score: avgScore,
          ...(notDoneFeedbacks.length > 0 ? { completedSets: doneFeedbacks.length } : {}),
        }
      }

      await completeWorkoutSession(session.id, notes || undefined, hasEffortData ? effortSummary : undefined)
      // If effort data exists, fetch AI recommendations
      if (hasEffortData) {
        setAdaptLoading(true)
        try {
          const res = await fetch('/api/adapt-workout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exercises, effortData: effortSummary, lang }),
          })
          if (res.ok) {
            const data = await res.json()
            setAdaptResult(data)
          }
        } catch {
          // ignore
        } finally {
          setAdaptLoading(false)
        }
      } else {
        onClose()
      }
    })
  }

  const formatDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long', day: 'numeric', month: 'long',
    })

  // Group by phase and calculate offsets
  const phaseGroups = PHASE_ORDER.map(phase => ({
    phase,
    exercises: exercises.filter(e => (e.phase ?? 'strength') === phase),
  }))

  let offset = 0
  const phaseGroupsWithOffsets = phaseGroups.map(g => {
    const o = offset
    offset += g.exercises.length
    return { ...g, offset: o }
  })

  // ── AI Adaptation Result overlay ─────────────────────────────────────────
  if (adaptLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-4 py-12">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-foreground">{s.analyzing}</p>
          <p className="text-sm text-muted-foreground mt-1">{s.analyzingSub}</p>
        </div>
      </div>
    )
  }

  if (adaptResult) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">{s.adaptTitle}</h2>
              <p className="text-xs text-muted-foreground">{s.adaptSubtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Summary */}
        <div className="flex gap-3 px-4 py-3 rounded-2xl bg-primary/8 border border-primary/20 mb-4">
          <ThumbsUp className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground leading-relaxed">{adaptResult.summary}</p>
        </div>

        {/* Recommendations */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-2 pb-4">
          {adaptResult.recommendations.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary border border-border text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {s.noAdaptations}
            </div>
          )}
          {adaptResult.recommendations.map((rec, i) => {
            const isIncrease = rec.action === 'increase'
            const isDecrease = rec.action === 'decrease'
            return (
              <div key={i} className={`flex flex-col gap-1.5 px-4 py-3 rounded-2xl border ${
                isIncrease ? 'bg-green-500/5 border-green-500/20' :
                isDecrease ? 'bg-red-500/5 border-red-500/20' :
                'bg-secondary border-border'
              }`}>
                <div className="flex items-center gap-2">
                  {isIncrease && <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  {isDecrease && <TrendingDown className="w-4 h-4 text-red-400 flex-shrink-0" />}
                  {!isIncrease && !isDecrease && <Minus className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <span className="text-sm font-semibold text-foreground">{rec.exerciseName}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.change}</p>
                {(rec.newSets || rec.newReps || rec.newRestSeconds) && (
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {rec.newSets && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
                        {rec.newSets} {s.sets}
                      </span>
                    )}
                    {rec.newReps && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
                        {rec.newReps} {s.reps}
                      </span>
                    )}
                    {rec.newRestSeconds && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">
                        {rec.newRestSeconds}{s.seconds} {s.rest}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={onClose} className="w-full h-12 font-semibold rounded-xl">
            {s.adaptClose}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground capitalize">{formatDate(session.scheduledDate)}</p>
          <h2 className="text-xl font-bold text-foreground mt-1">{s.workoutTitle}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Dumbbell className="w-3.5 h-3.5" />
              {exercises.length} {s.exercises}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              ~{minutes} {s.minutes}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Muscle visualization */}
      <MuscleBodyMap exercises={exercises} />

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">{s.progressLabel}</span>
          <span className="text-xs font-semibold text-foreground">{doneSets} / {totalSets}</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-end mt-1">
          <span className={`text-[10px] font-semibold ${allDone ? 'text-green-400' : 'text-muted-foreground'}`}>
            {progressPct}%{allDone ? ` — ${s.readyLabel}` : ''}
          </span>
        </div>
      </div>

      {/* Completed badge */}
      {session.completed && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4 text-sm font-medium bg-green-500/10 border border-green-500/20 text-green-400">
          <CheckCircle2 className="w-4 h-4" />
          {s.workoutDoneBadge}
        </div>
      )}

      {/* Phase-grouped exercise list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-2">
        {phaseGroupsWithOffsets.map(g => (
          <PhaseSection
            key={g.phase}
            phase={g.phase}
            exercises={g.exercises}
            exerciseOffset={g.offset}
            completedSets={completedSets}
            onToggleSet={handleToggleSet}
            setFeedbacksMap={setFeedbacksMap}
            onSaveSetFeedback={handleSaveSetFeedback}
          />
        ))}

        {/* Notes */}
        {!session.completed && (
          <div className="mt-2">
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              {s.notesLabel}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={s.notesPlaceholder}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        {session.completed && session.notes && (
          <div className="bg-secondary border border-border rounded-xl p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">{s.notesCompletedLabel}</p>
            <p className="text-sm text-foreground">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border mt-4">
        <Button
          onClick={handleComplete}
          disabled={isPending}
          variant={session.completed ? 'outline' : 'default'}
          className={`w-full h-12 font-semibold rounded-xl transition-colors ${
            !session.completed && allDone
              ? 'bg-green-500 hover:bg-green-600 text-white border-0'
              : ''
          }`}
        >
          {isPending
            ? s.completing
            : session.completed
              ? s.completedBtn
              : allDone && hasEffortData
                ? s.adaptTitle
                : allDone
                  ? s.completeBtn
                  : s.completeBtn}
        </Button>
      </div>
    </div>
  )
}
