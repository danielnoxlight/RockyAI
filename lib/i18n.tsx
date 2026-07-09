'use client'

import { createContext, useContext, useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Lang = 'en' | 'ru'

type Dict = typeof en

// ─── English dictionary (primary / default) ───────────────────────────────────

const en = {
  // Bottom nav
  nav: {
    home:     'Home',
    calendar: 'Calendar',
    coach:    'Coach',
    progress: 'Progress',
    profile:  'Profile',
  },

  // Auth
  auth: {
    signIn:           'Sign in to your account',
    signUp:           'Create an account and start training',
    nameLabel:        'Full Name',
    namePlaceholder:  'Alex Johnson',
    emailLabel:       'Email',
    passwordLabel:    'Password',
    passwordHint:     'At least 8 characters',
    loading:          'Loading...',
    createAccount:    'Create Account',
    signInBtn:        'Sign In',
    alreadyHave:      'Already have an account? ',
    noAccount:        "Don't have an account? ",
    signInLink:       'Sign In',
    signUpLink:       'Sign Up',
  },

  // Home page
  home: {
    greetingMorning:   'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening:   'Good evening',
    // No plan CTA
    createPlanTitle: 'Create Your Plan',
    createPlanDesc:  'Tell AI your goals and get a personalized training program with a full schedule',
    generateBtn:     'Generate AI Plan',
    featureExercises: 'Exercises',
    featureExercisesSub: 'Any fitness level',
    featureSchedule:  'Schedule',
    featureScheduleSub: 'Your own pace',
    featureProgress:  'Progress',
    featureProgressSub: 'Track your gains',
    // Profile incomplete
    fillProfile: 'Complete your profile',
    fillProfileDesc: 'To generate a plan, please fill in: ',
    goToProfile: 'Go to Profile',
    // Has plan
    activePlan:    'Active Plan',
    progressLabel: 'Progress',
    // Stats
    statDone:    'Done',
    statStreak:  'Week streak',
    statSuccess: 'Success',
    // Sections
    today:    'Today',
    upcoming: 'Upcoming Workouts',
    restDay:      'Rest day today',
    restDaySub:   'Recovery is part of training too',
    completed:    'Completed',
    scheduled:    'Scheduled',
    exercises:    (n: number) => `${n} exercise${n !== 1 ? 's' : ''}`,
    // Goal labels
    goals: {
      weight_loss:  'Weight Loss',
      muscle_gain:  'Muscle Gain',
      endurance:    'Endurance',
      strength:     'Strength',
      toning:       'Toning',
    },
    planMeta: (weeks: number, sessions: number) => `${weeks} wks · ${sessions}x / week`,
  },

  // Calendar
  calendar: {
    title:          'Calendar',
    plans:          'plans',
    noActivePlan:   'No active plan',
    noActivePlanSub:'Create a training plan on the home page',
    thisMonth:      'Workouts this month',
    noSessionsMonth:'No workouts this month',
    // Legend
    planned:   'Planned',
    partial:   'Partial',
    done:      'Done',
    multiple:  'Multiple workouts',
    // Day drawer
    sessionsToday: 'Workouts for this day',
    exercises:     'exercises',
    // Day headers
    days:   ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    months: ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'],
  },

  // Progress
  progress: {
    title:          'Progress',
    noData:         'No data to display',
    noDataSub:      'Create a training plan and start tracking progress',
    done:           'Done',
    missed:         'Missed',
    planned:        'Planned',
    statDone:       'Completed',
    statOf:         (n: number) => `of ${n} workouts`,
    statRate:       'Success Rate',
    statOfPlan:     'of plan',
    statDuration:   'Duration',
    statWeeks:      'weeks',
    statPerWeek:    'Per week',
    statSessions:   'workouts',
    overallProgress:'Overall Progress',
    doneDone:       'Completed workouts',
    remaining:      'Remaining',
    weeklyActivity: 'Activity by week',
    weekLabel:      'Week',
    historyTitle:   'Workout history',
    noHistory:      'No past workouts',
    noHistorySub:   'Complete workouts and track progress in calendar',
    goals: {
      weight_loss:  'Weight Loss',
      muscle_gain:  'Muscle Gain',
      endurance:    'Endurance',
      strength:     'Strength',
      toning:       'Toning',
    },
  },

  // Profile
  profile: {
    title:        'Profile',
    signOut:      'Sign Out',
    bmi:          'Body Mass Index (BMI)',
    bmiNormal:    'Normal',
    bmiUnder:     'Underweight',
    bmiOver:      'Overweight',
    bmiObese:     'Obese',
    physicalData: 'Physical Data',
    genderLabel:  'Gender',
    genderMale:   'Male',
    genderFemale: 'Female',
    ageLabel:     'Age (years)',
    heightLabel:  'Height (cm)',
    weightLabel:  'Weight (kg)',
    fitnessTitle: 'Fitness Level',
    fitnessLevels: {
      beginner:     { label: 'Beginner',     desc: 'Less than 6 months experience' },
      intermediate: { label: 'Intermediate', desc: '6 months – 2 years' },
      advanced:     { label: 'Advanced',     desc: 'More than 2 years experience' },
    },
    // Flat keys for profile-view
    levelBeginner:        'Beginner',
    levelBeginnerDesc:    'Less than 6 months experience',
    levelIntermediate:    'Intermediate',
    levelIntermediateDesc:'6 months – 2 years',
    levelAdvanced:        'Advanced',
    levelAdvancedDesc:    'More than 2 years experience',
    male:                 'Male',
    female:               'Female',
    bmiLabel:             'BMI',
    fitnessLevel:         'Fitness Level',
    saveBtn:    'Save Profile',
    saving:     'Saving...',
    saved:      'Saved!',
    language:   'Language',
    langEn:     'English',
    langRu:     'Russian',
  },

  // Coach chat
  coach: {
    title:         'AI Coach',
    defaultTitle:  'AI Coach',
    emptyTitle:    'Your Personal Coach',
    emptyDesc:     'Chat, edit, or completely rebuild your training plan — your coach will handle any change.',
    noPlanWarning: 'You have no active plan yet. Create one in the generator so the coach can edit it.',
    noPlan:        'No plan attached',
    noPlanSub:     'General fitness questions',
    pickPlan:      'Choose training plan',
    inputPlaceholder: 'Message your coach...',
    sendBtn:       'Send',
    nowLabel:      'now',
    chatsTitle:    'Coach chats',
    newChat:       'New chat',
    noChats:       'No chats — start your first!',
    closeChat:     'Close',
    switchChat:    'Switch chat',
    renameChat:    'Rename chat',
    deleteChat:    'Delete chat',
    clearHistory:  'Clear history',
    suggestions: [
      'Rebuild my entire plan for weight loss',
      'Swap day 1 and day 3',
      'Add a core exercise to the first day',
      'Remove any jumping exercises — bad knees',
      'Change my plan goal to muscle gain',
    ],
    tools: {
      'tool-addExercise':    'Adding exercise',
      'tool-removeExercise': 'Removing exercise',
      'tool-updateExercise': 'Updating exercise',
      'tool-listWorkouts':   'Reading plan',
      'tool-swapDays':       'Swapping days',
      'tool-setDayFocus':    'Changing day focus',
      'tool-setPlanGoal':    'Changing plan goal',
      'tool-replaceAllDays': 'Rebuilding entire plan',
      'tool-regeneratePlan': 'Regenerating plan',
      addedPrefix:   'Added',
      removedPrefix: 'Removed',
      updatedPrefix: 'Updated',
      swapDaysDone:  (a: unknown, b: unknown) => `Days ${a ?? '?'} and ${b ?? '?'} swapped`,
      goalChanged:   'Goal changed',
      replaceAllDone: (n: number) => `Plan replaced (${n} days)`,
      regenDone:     'Plan regenerated by AI',
      failed:        'Failed to execute',
    },
  },

  // Generate plan form
  generatePlan: {
    title:       'Plan Generator',
    stepOf:      (s: number, total: number) => `Step ${s} of ${total}`,
    // Steps
    step1Title:  'What is your goal?',
    step2Title:  'Which muscles to train?',
    step3Title:  'What equipment do you have?',
    step4ProgramDuration: 'Program duration',
    step4SessionsPerWeek: 'Sessions per week',
    step4TrainingDays:    'Training days',
    step4StartDate:       'Start date',
    step5Title:    'Wishes & notes',
    step5Desc:     'Write any wishes or restrictions — they will be taken into account.',
    step5Placeholder: 'E.g.: knee issues, prefer standing exercises, focus on glutes, no running...',
    step6Title:    'Build your plan',
    step6DescAI:   'Groq AI optimized the plan for your parameters and goals. Edit as needed.',
    step6Desc:     'We suggested exercises for each workout. Check what to keep and add more — fully flexible.',
    aiImproved:    'AI improved',
    // Schedule
    weeks:         (n: number) => `${n} wk`,
    selectedDays:  (n: number, total: number) => `Selected ${n} of ${total} — choose exactly ${total}`,
    chooseDays:    (n: number) => `Please choose exactly ${n} day${n !== 1 ? 's' : ''}`,
    // Equipment
    equipmentHint:   'Mark all available equipment — workouts will be adapted to it. If nothing is selected, all will be used.',
    noneSelected:    'Nothing selected — all equipment types will be used',
    selected:        'Selected:',
    customEquipment: 'Your own equipment',
    customEquipmentPlaceholder: 'E.g.: TRX, resistance bands, chair, step platform...',
    customEquipmentHint: 'List any equipment not in the list — AI will include it in the plan.',
    // Summary
    summaryTitle:  'Plan summary',
    rowGoal:       'Goal',
    rowMuscles:    'Muscles',
    rowEquipment:  'Equipment',
    rowSchedule:   'Schedule',
    rowWishes:     'Wishes',
    anyEquipment:  'Any',
    // Buttons
    back:          'Back',
    next:          'Next',
    toConstructor: 'To constructor',
    aiImproving:   'AI improving plan...',
    building:      'Building plan...',
    createPlan:    'Create Plan',
    creating:      'Creating...',
    errorFallback: 'Failed to create plan',
    // Goals
    goals: {
      weight_loss:  'Weight Loss',
      muscle_gain:  'Muscle Gain',
      endurance:    'Endurance',
      strength:     'Strength',
      toning:       'Toning',
    },
    // Muscles
    muscles: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Glutes', 'Full Body'],
    // Weekdays short
    weekdaysShort: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    weekdaysFull:  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    // Equipment groups
    equipGroups: {
      freeWeights: 'Free Weights',
      machines:    'Machines',
      cardio:      'Cardio',
      other:       'Other',
    },
    extraEquipment: 'Additional equipment:',
    scheduleValue: (weeks: number, sessions: number, days: string) => `${weeks} wk · ${sessions}×/wk · ${days}`,
  },

  // Session detail
  session: {
    musclesUsed:     'Muscles used',
    exercises:       'exercises',
    sets:            'sets',
    approxMin:       (n: number) => `~${n}`,
    minutes:         'min',
    reps:            'reps',
    rest:            'rest',
    seconds:         's',
    movementTech:    'Movement technique',
    howTo:           'How to perform',
    sets_label:      'Sets',
    reps_label:      'Reps',
    rest_label:      'Rest',
    // SetFeedback
    setFeedbackTitle: (i: number) => `Set ${i + 1} completed?`,
    yesDid:          'Yes, done',
    notFull:         'Not fully',
    difficulty:      'How hard was it',
    easy:            '1 — easy',
    max:             '10 — max',
    backBtn:         'Back',
    saveBtn:         'Save',
    repsDone:        'Reps completed:',
    // Summary chip
    doneSummary:     'Done',
    notDoneSummary:  'Not fully',
    editBtn:         'edit',
    // Phase labels
    phases: {
      warmup:   'Warm-up',
      main:     'Main',
      cooldown: 'Cool-down',
    },
    phaseSublabels: {
      warmup:   'Joint and muscle preparation',
      strength: 'Main training load',
      cardio:   'Cardiovascular load',
      cooldown: 'Stretching and recovery',
    },
    phaseLabels: {
      warmup:   'Warm-up',
      strength: 'Strength Block',
      cardio:   'Cardio',
      cooldown: 'Cool-down',
    },
    // Completion
    notesPlaceholder: 'How did the session go? Notes...',
    notesLabel:       'Notes (optional)',
    notesCompletedLabel: 'Notes',
    completeBtn:      'Complete Workout',
    completedBtn:     'Mark Incomplete',
    completing:       'Saving...',
    workoutTitle:     'Workout',
    workoutDoneBadge: 'Workout completed',
    progressLabel:    'Workout progress',
    readyLabel:       'ready!',
    // Adaptations
    analyzing:        'Analyzing workout...',
    analyzingSub:     'AI is generating recommendations',
    adaptTitle:       'AI Recommendations',
    adaptSubtitle:    'Based on your performance:',
    adaptClose:       'Got it!',
    noAdaptations:    'No specific changes — load is optimal',
    // Muscle map
    noMuscleData:     'No muscle data',
    muscleLabels: {
      Chest: 'Chest', Back: 'Back', Legs: 'Legs', Shoulders: 'Shoulders',
      Arms: 'Arms', Core: 'Core', Glutes: 'Glutes', 'Full Body': 'Full Body', Cardio: 'Cardio',
    },
    setRow:           (si: number, reps: string) => `Set ${si + 1} — ${reps} reps`,
    restRow:          (s: number) => `rest ${s}s`,
  },
}

// ─── Russian dictionary (secondary) ───────────────────────────────────────────

const ru: Dict = {
  nav: {
    home:     'Главная',
    calendar: 'Календарь',
    coach:    'Тренер',
    progress: 'Прогресс',
    profile:  'Профиль',
  },

  auth: {
    signIn:           'Войдите в аккаунт',
    signUp:           'Создай аккаунт и начни тренироваться',
    nameLabel:        'Полное имя',
    namePlaceholder:  'Алекс Иванов',
    emailLabel:       'Email',
    passwordLabel:    'Пароль',
    passwordHint:     'Минимум 8 символов',
    loading:          'Загрузка...',
    createAccount:    'Создать аккаунт',
    signInBtn:        'Войти',
    alreadyHave:      'Уже есть аккаунт? ',
    noAccount:        'Нет аккаунта? ',
    signInLink:       'Войти',
    signUpLink:       'Зарегистрироваться',
  },

  home: {
    greetingMorning:   'Доброе утро',
    greetingAfternoon: 'Добрый день',
    greetingEvening:   'Добрый вечер',
    createPlanTitle: 'Создай свой план',
    createPlanDesc:  'Расскажи AI о целях и получи персональную программу с полным расписанием',
    generateBtn:     'Сгенерировать план',
    featureExercises: 'Упражнения',
    featureExercisesSub: 'Для любого уровня',
    featureSchedule:  'Расписание',
    featureScheduleSub: 'В своём темпе',
    featureProgress:  'Прогресс',
    featureProgressSub: 'Отслеживай результаты',
    fillProfile: 'Заполни профиль',
    fillProfileDesc: 'Для генерации плана нужно указать: ',
    goToProfile: 'Перейти в профиль',
    activePlan:    'Активный план',
    progressLabel: 'Прогресс',
    statDone:    'Выполнено',
    statStreak:  'Недель подряд',
    statSuccess: 'Успешность',
    today:    'Сегодня',
    upcoming: 'Предстоящие тренировки',
    restDay:      'Сегодня день отдыха',
    restDaySub:   'Восстановление — тоже часть тренировки',
    completed:    'Выполнено',
    scheduled:    'Запланиро��ано',
    exercises:    (n: number) => `${n} упражнений`,
    goals: {
      weight_loss:  'Похудение',
      muscle_gain:  'Набор массы',
      endurance:    'Выносливость',
      strength:     'Сила',
      toning:       'Рельеф',
    },
    planMeta: (weeks: number, sessions: number) => `${weeks} нед · ${sessions}×/нед`,
  },

  calendar: {
    title:          'Календарь',
    plans:          'плана',
    noActivePlan:   'Нет активного плана',
    noActivePlanSub:'Создай план тренировок на главной странице',
    thisMonth:      'Тренировки в этом месяце',
    noSessionsMonth:'Нет тренировок в этом месяце',
    planned:   'Запланировано',
    partial:   'Частично',
    done:      'Выполнено',
    multiple:  'Несколько тренировок',
    sessionsToday: 'Тренировки за этот день',
    exercises:     'упражнений',
    days:   ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    months: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  },

  progress: {
    title:          'Прогресс',
    noData:         'Нет данных для отображения',
    noDataSub:      'Создай план тренировок и начни отмечать прогресс',
    done:           'Выполнено',
    missed:         'Пропущено',
    planned:        'Запланировано',
    statDone:       'Выполнено',
    statOf:         (n: number) => `из ${n} тренировок`,
    statRate:       'Успешность',
    statOfPlan:     'от плана',
    statDuration:   'Длительность',
    statWeeks:      'недель',
    statPerWeek:    'В неделю',
    statSessions:   'тренировок',
    overallProgress:'Общий прогресс',
    doneDone:       'Выполнено тренировок',
    remaining:      'Осталось',
    weeklyActivity: 'Активность по неделям',
    weekLabel:      'Неделя',
    historyTitle:   'История тренировок',
    noHistory:      'Нет прошедших тренировок',
    noHistorySub:   'Выполняй тренировки и отмечай прогресс в календаре',
    goals: {
      weight_loss:  'Похудение',
      muscle_gain:  'Набор массы',
      endurance:    'Выносливость',
      strength:     'Сила',
      toning:       'Рельеф',
    },
  },

  profile: {
    title:        'Профиль',
    signOut:      'Выйти',
    bmi:          'Индекс массы тела (BMI)',
    bmiNormal:    'Норма',
    bmiUnder:     'Недовес',
    bmiOver:      'Избыток',
    bmiObese:     'Ожирение',
    physicalData: 'Физические данные',
    genderLabel:  'Пол',
    genderMale:   'Мужской',
    genderFemale: 'Женский',
    ageLabel:     'Возраст (лет)',
    heightLabel:  'Рост (см)',
    weightLabel:  'Вес (кг)',
    fitnessTitle: 'Уровень подготовки',
    fitnessLevels: {
      beginner:     { label: 'Начинающий',   desc: 'Менее 6 месяцев опыта' },
      intermediate: { label: 'Средний',       desc: '6 месяцев — 2 года' },
      advanced:     { label: 'Продвинутый',   desc: 'Более 2 лет опыта' },
    },
    // Flat keys for profile-view
    levelBeginner:        'Начинающий',
    levelBeginnerDesc:    'Менее 6 месяцев опыта',
    levelIntermediate:    'Средний',
    levelIntermediateDesc:'6 месяцев — 2 года',
    levelAdvanced:        'Продвинутый',
    levelAdvancedDesc:    'Более 2 лет опыта',
    male:                 'Мужской',
    female:               'Женский',
    bmiLabel:             'ИМТ',
    fitnessLevel:         'Уровень подготовки',
    saveBtn:    'Сохранить данные',
    saving:     'Сохраняем...',
    saved:      'Сохранено!',
    language:   'Язык',
    langEn:     'English',
    langRu:     'Русский',
  },

  coach: {
    title:         'AI Тренер',
    defaultTitle:  'AI Тренер',
    emptyTitle:    'Твой личный тренер',
    emptyDesc:     'Общайся, редактируй или полностью переделывай план тренировок — тренер выполнит любое изменение.',
    noPlanWarning: 'У тебя пока нет активного плана. Создай его в генераторе, чтобы тренер мог его редактировать.',
    noPlan:        'Без привязки к плану',
    noPlanSub:     'Общие вопросы о тренировках',
    pickPlan:      'Выбрать план тренировок',
    inputPlaceholder: 'Напиши тренеру...',
    sendBtn:       'Отправить',
    nowLabel:      'сейчас',
    chatsTitle:    'Чаты с тренером',
    newChat:       'Новый чат',
    noChats:       'Нет чатов — создай первый!',
    closeChat:     'Закрыть',
    switchChat:    'Переключить чат',
    renameChat:    'Переименовать чат',
    deleteChat:    'Удалить чат',
    clearHistory:  'Очистить историю',
    suggestions: [
      'Переделай весь план под похудение',
      'Поменяй местами день 1 и день 3',
      'Добавь упражнение на пресс в первый день',
      'Убери упражнения с прыжками — болят колени',
      'Измени цель плана на набор массы',
    ],
    tools: {
      'tool-addExercise':    'Добавляю упражнение',
      'tool-removeExercise': 'Убираю упражнение',
      'tool-updateExercise': 'Меняю упражнение',
      'tool-listWorkouts':   'Смотрю план',
      'tool-swapDays':       'Меняю дни местами',
      'tool-setDayFocus':    'Меняю фокус дня',
      'tool-setPlanGoal':    'Меняю цель плана',
      'tool-replaceAllDays': 'Переделываю весь план',
      'tool-regeneratePlan': 'Перегенерирую план',
      addedPrefix:   'Добавлено',
      removedPrefix: 'Убрано',
      updatedPrefix: 'Изменено',
      swapDaysDone:  (a: unknown, b: unknown) => `Дни ${a ?? '?'} и ${b ?? '?'} поменяны`,
      goalChanged:   'Цель изменена',
      replaceAllDone: (n: number) => `План заменён (${n} дней)`,
      regenDone:     'План перегенерирован AI',
      failed:        'Не удалось выполнить',
    },
  },

  generatePlan: {
    title:       'Генератор плана',
    stepOf:      (s: number, total: number) => `Шаг ${s} из ${total}`,
    step1Title:  'Какова твоя цель?',
    step2Title:  'Какие мышцы прорабатываем?',
    step3Title:  'Какое оборудование есть?',
    step4ProgramDuration: 'Длительность программы',
    step4SessionsPerWeek: 'Тренировок в неделю',
    step4TrainingDays:    'Дни тренировок',
    step4StartDate:       'Дата начала',
    step5Title:    'Пожелания к тренировке',
    step5Desc:     'Напиши любые пожелания или ограничения — они будут учтены при составлении плана.',
    step5Placeholder: 'Например: проблемы с коленями, предпочитаю упражнения стоя, акцент на ягодицы, не люблю бег...',
    step6Title:    'Собери свой план',
    step6DescAI:   'Groq AI оптимизировал план специально под твои параметры и цели. Отредактируй при необходимости.',
    step6Desc:     'Мы предложили упражнения для каждой тренировки. Отметь галочкой те, что оставить, и добавь дополнительные — всё гибко.',
    aiImproved:    'AI улучшил',
    weeks:         (n: number) => `${n} нед`,
    selectedDays:  (n: number, total: number) => `Выбрано ${n} из ${total} — нужно выбрать ровно ${total}`,
    chooseDays:    (n: number) => {
      const forms = ['день', 'дня', 'дней']
      const f = n === 1 ? 0 : n < 5 ? 1 : 2
      return `Пожалуйста, выбери ровно ${n} ${forms[f]}`
    },
    equipmentHint:   'Отметь весь доступный инвентарь — тренировки адаптируются под него. Если ничего не выбрано, используется всё.',
    noneSelected:    'Ничего не выбрано — будут использоваться все виды оборудования',
    selected:        'Выбрано:',
    customEquipment: 'Своё оборудование',
    customEquipmentPlaceholder: 'Например: TRX, резиновые петли, стул, степ-платформа...',
    customEquipmentHint: 'Укажи любой инвентарь, которого нет в списке — AI учтёт его при составлении плана.',
    summaryTitle:  'Итог плана',
    rowGoal:       'Цель',
    rowMuscles:    'Мышцы',
    rowEquipment:  'Инвентарь',
    rowSchedule:   'Расписание',
    rowWishes:     'Пожелания',
    anyEquipment:  'Любой',
    back:          'Назад',
    next:          'Далее',
    toConstructor: 'К конструктору',
    aiImproving:   'AI улучшает план...',
    building:      'Собираем план...',
    createPlan:    'Создать план',
    creating:      'Создаём...',
    errorFallback: 'Не удалось создать план',
    goals: {
      weight_loss:  'Похудение',
      muscle_gain:  'Набор массы',
      endurance:    'Выносливость',
      strength:     'Сила',
      toning:       'Рельеф',
    },
    muscles: ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Пресс', 'Ягодицы', 'Всё тело'],
    weekdaysShort: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    weekdaysFull:  ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
    equipGroups: {
      freeWeights: 'Свободные веса',
      machines:    'Тренажеры',
      cardio:      'Кардио',
      other:       'Прочее',
    },
    extraEquipment: 'Дополнительное оборудование:',
    scheduleValue: (weeks: number, sessions: number, days: string) => `${weeks} нед · ${sessions}×/нед · ${days}`,
  },

  session: {
    musclesUsed:     'Задействованные мышцы',
    exercises:       'упражнений',
    sets:            'подходов',
    approxMin:       (n: number) => `~${n}`,
    minutes:         'мин',
    reps:            'повт',
    rest:            'отдых',
    seconds:         'с',
    movementTech:    'Техника движения',
    howTo:           'Как выполнять',
    sets_label:      'Подходы',
    reps_label:      'Повторы',
    rest_label:      'Отдых',
    setFeedbackTitle: (i: number) => `Подход ${i + 1} выполнен?`,
    yesDid:          'Да, сделал',
    notFull:         'Не до конца',
    difficulty:      'Насколько тяжело',
    easy:            '1 — легко',
    max:             '10 — максимум',
    backBtn:         'Назад',
    saveBtn:         'Сохранить',
    repsDone:        'Сделал повторений:',
    doneSummary:     'Сделано',
    notDoneSummary:  'Не до конца',
    editBtn:         'изменить',
    phases: {
      warmup:   'Разминка',
      main:     'Основная',
      cooldown: 'Заминка',
    },
    phaseSublabels: {
      warmup:   'Подготовка суставов и мышц',
      strength: 'Основная тренировочная нагрузка',
      cardio:   'Сердечно-сосудистая нагрузка',
      cooldown: 'Растяжка и восстановление',
    },
    phaseLabels: {
      warmup:   'Разминка',
      strength: 'Силовой блок',
      cardio:   'Кардио',
      cooldown: 'Заминка',
    },
    notesPlaceholder: 'Как прошла тренировка? Заметки...',
    notesLabel:       'Заметки (необязательно)',
    notesCompletedLabel: 'Заметки',
    completeBtn:      'Завершить тренировку',
    completedBtn:     'Отменить выполнение',
    completing:       'Сохраняем...',
    workoutTitle:     'Тренировка',
    workoutDoneBadge: 'Тренировка выполнена',
    progressLabel:    'Прогресс тренировки',
    readyLabel:       'готово!',
    analyzing:        'Анализируем тренировку...',
    analyzingSub:     'AI подбирает рекомендации',
    adaptTitle:       'Рекомендации AI',
    adaptSubtitle:    'На основе твоей тренировки:',
    adaptClose:       'Отлично, понял!',
    noAdaptations:    'Нет конкретных изменений — нагрузка оптимальна',
    noMuscleData:     'Данные о мышцах не указаны',
    muscleLabels: {
      Chest: 'Грудь', Back: 'Спина', Legs: 'Ноги', Shoulders: 'Плечи',
      Arms: 'Руки', Core: 'Пресс', Glutes: 'Ягодицы', 'Full Body': 'Всё тело', Cardio: 'Кардио',
    },
    setRow:           (si: number, reps: string) => `Подход ${si + 1} — ${reps} повт`,
    restRow:          (s: number) => `отдых ${s}с`,
  },
}

// ─── Context ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'fitai_lang'

type LangContextValue = {
  lang: Lang
  t: Dict
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangContextValue>({
  lang: 'en',
  t: en,
  setLang: () => {},
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored === 'ru' || stored === 'en') setLangState(stored)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  const t = lang === 'ru' ? ru : en

  return (
    <LangContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LangContext)
}
