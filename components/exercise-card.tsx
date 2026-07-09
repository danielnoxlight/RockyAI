import { Dumbbell, Clock, Repeat, Weight } from 'lucide-react'

export type Exercise = {
  name: string
  sets: number
  reps: string
  restSeconds: number
  muscleGroup: string
  equipment: string
  description: string
}

const muscleColors: Record<string, string> = {
  Chest: 'text-red-400 bg-red-400/10 border-red-400/20',
  Back: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  Legs: 'text-green-400 bg-green-400/10 border-green-400/20',
  Shoulders: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  Arms: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Triceps: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Biceps: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  Core: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Abs: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  Cardio: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  Glutes: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  Hamstrings: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  Quadriceps: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
}

function getMuscleColor(muscle: string) {
  for (const [key, val] of Object.entries(muscleColors)) {
    if (muscle.toLowerCase().includes(key.toLowerCase())) return val
  }
  return 'text-primary bg-primary/10 border-primary/20'
}

export function ExerciseCard({ exercise, index }: { exercise: Exercise; index: number }) {
  const color = getMuscleColor(exercise.muscleGroup)

  return (
    <div className="bg-secondary border border-border rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${color}`}>
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
            <h3 className="text-sm font-semibold text-foreground leading-snug">{exercise.name}</h3>
          </div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${color} flex-shrink-0`}>
          {exercise.muscleGroup}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl p-2.5 flex flex-col items-center gap-1 border border-border">
          <Repeat className="w-3.5 h-3.5 text-primary" />
          <span className="text-base font-bold text-foreground leading-none">{exercise.sets}</span>
          <span className="text-[10px] text-muted-foreground">подхода</span>
        </div>
        <div className="bg-card rounded-xl p-2.5 flex flex-col items-center gap-1 border border-border">
          <Weight className="w-3.5 h-3.5 text-accent" />
          <span className="text-base font-bold text-foreground leading-none">{exercise.reps}</span>
          <span className="text-[10px] text-muted-foreground">повторов</span>
        </div>
        <div className="bg-card rounded-xl p-2.5 flex flex-col items-center gap-1 border border-border">
          <Clock className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-base font-bold text-foreground leading-none">{exercise.restSeconds}с</span>
          <span className="text-[10px] text-muted-foreground">отдых</span>
        </div>
      </div>

      {exercise.description && (
        <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
          {exercise.description}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="bg-card border border-border rounded-full px-2 py-0.5">{exercise.equipment}</span>
      </div>
    </div>
  )
}
