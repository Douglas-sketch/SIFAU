import { motion } from 'framer-motion';
import Logo from './Logo';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex flex-col items-center justify-center z-[9999]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onAnimationComplete={() => {
        setTimeout(onFinish, 3000);
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 100, delay: 0.2 }}
      >
        <Logo size={140} showText={false} />
      </motion.div>

      <motion.h1
        className="text-white text-4xl font-bold mt-6 tracking-widest"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        SIFAU
      </motion.h1>

      <motion.p
        className="text-blue-200 text-sm mt-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        Sistema Inteligente de Fiscalização e Atividades Urbanas
      </motion.p>

      <motion.div
        className="mt-10 w-48 h-1.5 bg-white/20 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="h-full bg-white rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, delay: 1.5, ease: 'easeInOut' }}
        />
      </motion.div>

      <motion.p
        className="text-blue-300 text-xs mt-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
      >
        Carregando sistema...
      </motion.p>
    </motion.div>
  );
}
