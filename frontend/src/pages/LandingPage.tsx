import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Users, Trophy, Zap, Shield, Globe, Sparkles, Gamepad2, Crown, Swords } from 'lucide-react';
import { useLineraStore } from '../stores/lineraStore';
import WalletConnect from '../components/WalletConnect';

export default function LandingPage() {
  const { isConnected } = useLineraStore();
  
  const games = [
    { name: 'Chess', emoji: '♟️', color: 'from-amber-500 to-orange-600' },
    { name: 'Connect Four', emoji: '🔴', color: 'from-red-500 to-pink-600' },
    { name: 'Reversi', emoji: '⚫', color: 'from-emerald-500 to-teal-600' },
    { name: 'Gomoku', emoji: '⭕', color: 'from-violet-500 to-purple-600' },
    { name: 'Battleship', emoji: '🚢', color: 'from-blue-500 to-indigo-600' },
    { name: 'Mancala', emoji: '🥣', color: 'from-yellow-500 to-amber-600' },
  ];
  
  const features = [
    {
      icon: Shield,
      title: '100% On-Chain',
      description: 'Every move is verified by Linera smart contracts. No cheating, no disputes.',
      color: 'text-neon-cyan',
    },
    {
      icon: Globe,
      title: 'Cross-Chain Multiplayer',
      description: 'Challenge players across different chains with seamless cross-chain messaging.',
      color: 'text-neon-magenta',
    },
    {
      icon: Zap,
      title: 'Instant Finality',
      description: 'Powered by Linera microchains for lightning-fast game state updates.',
      color: 'text-neon-blue',
    },
    {
      icon: Trophy,
      title: 'Competitive Rankings',
      description: 'Climb the leaderboard, earn XP, and prove your strategic mastery.',
      color: 'text-neon-green',
    },
  ];
  
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -top-1/2 -right-1/2 w-full h-full opacity-5"
            style={{
              background: 'conic-gradient(from 0deg, var(--neon-cyan), var(--neon-magenta), var(--neon-blue), var(--neon-cyan))',
              borderRadius: '50%',
            }}
          />
        </div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 mb-8"
          >
            <Sparkles className="w-4 h-4 text-neon-cyan" />
            <span className="text-sm font-medium text-neon-cyan">Powered by Linera Protocol</span>
          </motion.div>
          
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6"
          >
            <span className="text-white">CHAIN</span>
            <span className="text-neon-cyan text-glow-cyan">CYCLES</span>
          </motion.h1>
          
          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl md:text-2xl lg:text-3xl text-gray-300 mb-4 font-display font-light"
          >
            The Ultimate On-Chain Game Arcade
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="text-base md:text-lg text-gray-400 mb-10 max-w-2xl mx-auto"
          >
            Six classic strategy games, fully decentralized. Challenge friends to Chess, Connect Four, 
            Reversi, Gomoku, Battleship, or Mancala — all verified on-chain.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            {isConnected ? (
              <Link to="/lobby" className="btn-neon flex items-center gap-2 text-lg px-8 py-4">
                <Gamepad2 className="w-6 h-6" />
                Start Playing
              </Link>
            ) : (
              <WalletConnect />
            )}
            
            <Link to="/lobby" className="btn-neon btn-neon-magenta flex items-center gap-2 text-lg px-8 py-4">
              <Users className="w-6 h-6" />
              Browse Games
            </Link>
          </motion.div>
          
          {/* Game Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {games.map((game, i) => (
              <motion.div
                key={game.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className={`px-4 py-2 rounded-full bg-gradient-to-r ${game.color} text-white font-medium text-sm shadow-lg cursor-default`}
              >
                <span className="mr-2">{game.emoji}</span>
                {game.name}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 px-4 border-t border-panel-border bg-panel-bg/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Why</span>{' '}
              <span className="text-neon-cyan">ChainCycles?</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Classic games meet cutting-edge blockchain technology. Fair, transparent, and unstoppable.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="panel panel-glow p-6 hover:border-neon-cyan/50 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-lg bg-neon-cyan/10 flex items-center justify-center mb-4">
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="font-display font-bold text-xl mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* How to Play */}
      <section className="py-20 px-4 border-t border-panel-border">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Get Started in</span>{' '}
              <span className="text-neon-magenta">Seconds</span>
            </h2>
            <p className="text-gray-400 text-lg">
              No complex setup. Just connect and play.
            </p>
          </motion.div>
          
          <div className="space-y-8">
            {[
              {
                step: '01',
                title: 'Pick Your Game',
                description: 'Choose from Chess, Connect Four, Reversi, Gomoku, Battleship, or Mancala. Each game runs entirely on-chain.',
                icon: Gamepad2,
                color: 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan',
              },
              {
                step: '02',
                title: 'Create or Join a Room',
                description: 'Host a new game room or join an existing one. Share your room code with friends for private matches.',
                icon: Users,
                color: 'bg-neon-magenta/10 border-neon-magenta/30 text-neon-magenta',
              },
              {
                step: '03',
                title: 'Battle It Out',
                description: 'Take turns making moves. Every action is verified on-chain for guaranteed fair play.',
                icon: Swords,
                color: 'bg-neon-blue/10 border-neon-blue/30 text-neon-blue',
              },
              {
                step: '04',
                title: 'Claim Victory',
                description: 'Outplay your opponent, win the match, and climb the rankings. Your victories are recorded forever.',
                icon: Crown,
                color: 'bg-neon-green/10 border-neon-green/30 text-neon-green',
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="flex items-start gap-6 group"
              >
                <div className={`flex-shrink-0 w-16 h-16 rounded-xl ${item.color} border flex items-center justify-center transition-transform group-hover:scale-110`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs font-bold text-gray-500 font-mono">STEP {item.step}</span>
                  </div>
                  <h3 className="font-display font-bold text-2xl mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-lg">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Final CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16"
          >
            <Link to="/lobby" className="btn-neon inline-flex items-center gap-2 text-xl px-10 py-5">
              <Play className="w-6 h-6" />
              Play Now — It's Free
            </Link>
          </motion.div>
        </div>
      </section>
      
      {/* Footer Stats */}
      <section className="py-12 px-4 border-t border-panel-border bg-panel-bg/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <div className="font-display text-4xl font-black text-neon-cyan mb-2">6</div>
              <div className="text-gray-400 text-sm uppercase tracking-wider">Classic Games</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="font-display text-4xl font-black text-neon-magenta mb-2">100%</div>
              <div className="text-gray-400 text-sm uppercase tracking-wider">On-Chain</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="font-display text-4xl font-black text-neon-green mb-2">∞</div>
              <div className="text-gray-400 text-sm uppercase tracking-wider">Fun</div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
