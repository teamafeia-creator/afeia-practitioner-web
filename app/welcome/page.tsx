'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Calendar,
  MessageSquare,
  Shield,
  Activity,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Slide {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  illustration: React.ReactNode;
}

const slides: Slide[] = [
  {
    id: 1,
    title: 'Bienvenue sur AFEIA',
    description:
      'La plateforme qui connecte les naturopathes à leurs consultants pour un accompagnement holistique et personnalisé.',
    icon: <Sparkles className="w-8 h-8 text-white" />,
    gradient: 'from-teal via-teal-deep to-emerald-700',
    illustration: (
      <WelcomeIllustration />
    )
  },
  {
    id: 2,
    title: 'Gérez vos rendez-vous',
    description:
      'Un calendrier intuitif avec rappels automatiques pour ne jamais manquer une consultation.',
    icon: <Calendar className="w-8 h-8 text-white" />,
    gradient: 'from-primary-500 via-primary-600 to-primary-700',
    illustration: (
      <CalendarIllustration />
    )
  },
  {
    id: 3,
    title: 'Communiquez en sécurité',
    description:
      'Messagerie sécurisée conforme RGPD pour échanger avec vos consultants en toute confidentialité.',
    icon: <MessageSquare className="w-8 h-8 text-white" />,
    gradient: 'from-emerald-500 via-emerald-600 to-teal',
    illustration: (
      <MessagingIllustration />
    )
  },
  {
    id: 4,
    title: 'Suivez les progrès',
    description:
      'Tableaux de bord et métriques pour accompagner efficacement le parcours de santé de vos consultants.',
    icon: <Activity className="w-8 h-8 text-white" />,
    gradient: 'from-accent-pink via-purple-600 to-primary-600',
    illustration: (
      <ProgressIllustration />
    )
  }
];

// SVG Illustrations as components
function WelcomeIllustration() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative w-64 h-64"
    >
      {/* Central circle */}
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute inset-0 m-auto w-40 h-40 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
      >
        <div className="w-28 h-28 rounded-full bg-white/30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl">
            <span className="text-3xl font-bold text-teal">A</span>
          </div>
        </div>
      </motion.div>

      {/* Floating orbs */}
      <motion.div
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute top-4 right-8 w-8 h-8 rounded-full bg-emerald-400/50"
      />
      <motion.div
        animate={{ y: [10, -10, 10] }}
        transition={{ duration: 3.5, repeat: Infinity }}
        className="absolute bottom-8 left-4 w-6 h-6 rounded-full bg-accent-orange/50"
      />
      <motion.div
        animate={{ y: [-5, 15, -5] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute top-16 left-8 w-4 h-4 rounded-full bg-accent-pink/50"
      />
    </motion.div>
  );
}

function CalendarIllustration() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative w-64 h-64 flex items-center justify-center"
    >
      <div className="w-48 h-56 bg-white/20 backdrop-blur-sm rounded-2xl p-4 shadow-xl">
        {/* Calendar header */}
        <div className="h-8 bg-white/30 rounded-lg mb-3 flex items-center px-3">
          <div className="w-2 h-2 rounded-full bg-teal mr-2" />
          <div className="w-16 h-2 bg-white/50 rounded" />
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.02 }}
              className={`aspect-square rounded-md ${
                i === 15 || i === 22
                  ? 'bg-emerald-400'
                  : i === 8
                  ? 'bg-accent-orange'
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function MessagingIllustration() {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative w-64 h-64 flex items-center justify-center"
    >
      <div className="w-52 h-48 space-y-3">
        {/* Message bubbles */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-end gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-white/30" />
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl rounded-bl-none px-4 py-3 max-w-[70%]">
            <div className="w-24 h-2 bg-white/50 rounded mb-1" />
            <div className="w-16 h-2 bg-white/30 rounded" />
          </div>
        </motion.div>

        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-end"
        >
          <div className="bg-white/30 backdrop-blur-sm rounded-2xl rounded-br-none px-4 py-3 max-w-[70%]">
            <div className="w-20 h-2 bg-white/60 rounded mb-1" />
            <div className="w-28 h-2 bg-white/40 rounded" />
          </div>
        </motion.div>

        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-end gap-2"
        >
          <div className="w-8 h-8 rounded-full bg-white/30" />
          <div className="bg-emerald-400/40 backdrop-blur-sm rounded-2xl rounded-bl-none px-4 py-3">
            <div className="w-32 h-2 bg-white/60 rounded" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ProgressIllustration() {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="relative w-64 h-64 flex items-center justify-center"
    >
      <div className="w-52 h-52 bg-white/20 backdrop-blur-sm rounded-2xl p-4">
        {/* Chart area */}
        <div className="h-32 flex items-end gap-2 border-b border-white/20 pb-2">
          {[40, 65, 45, 80, 60, 75, 90].map((height, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ delay: 0.4 + i * 0.1, duration: 0.5 }}
              className={`flex-1 rounded-t-md ${
                i === 6 ? 'bg-emerald-400' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
        {/* Stats */}
        <div className="mt-3 flex justify-between">
          <div>
            <div className="w-8 h-8 rounded-full bg-emerald-400/50 flex items-center justify-center mb-1">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="w-12 h-2 bg-white/40 rounded" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">+24%</div>
            <div className="w-16 h-2 bg-white/30 rounded" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function WelcomePage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      router.push('/login');
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const skipOnboarding = () => {
    router.push('/login');
  };

  const currentSlideData = slides[currentSlide];

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 bg-gradient-to-br ${currentSlideData.gradient}`}
        />
      </AnimatePresence>

      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-black/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Image
                src="/afeia_symbol.svg"
                alt="AFEIA"
                width={24}
                height={24}
                className="brightness-0 invert"
              />
            </div>
            <span className="text-white font-semibold text-lg">AFEIA</span>
          </div>
          <button
            onClick={skipOnboarding}
            className="text-white/80 hover:text-white text-sm transition-colors"
          >
            Passer
          </button>
        </header>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="text-center max-w-md"
            >
              {/* Illustration */}
              <div className="mb-8 flex justify-center">
                {currentSlideData.illustration}
              </div>

              {/* Icon badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-6"
              >
                {currentSlideData.icon}
              </motion.div>

              {/* Text content */}
              <h1 className="text-3xl font-bold text-white mb-4">
                {currentSlideData.title}
              </h1>
              <p className="text-lg text-white/80 leading-relaxed">
                {currentSlideData.description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer navigation */}
        <footer className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/20 to-transparent">
          {/* Pagination dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentSlide
                    ? 'w-8 bg-white'
                    : 'w-2 bg-white/40 hover:bg-white/60'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-4 max-w-md mx-auto">
            {currentSlide > 0 && (
              <Button
                variant="ghost"
                onClick={prevSlide}
                className="flex-1 bg-white/10 text-white hover:bg-white/20 border-0"
              >
                Précédent
              </Button>
            )}
            <Button
              onClick={nextSlide}
              className="flex-1 bg-white text-charcoal hover:bg-white/90 shadow-xl"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              {currentSlide === slides.length - 1 ? 'Commencer' : 'Suivant'}
            </Button>
          </div>
        </footer>
      </div>
    </main>
  );
}
