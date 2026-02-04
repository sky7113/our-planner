'use client';

import { motion } from 'framer-motion';
import { Target, Code, Layout, Briefcase, CheckCircle2, Circle, Clock } from 'lucide-react';

const goals = [
    {
        title: 'Master Python for Data Science',
        status: 'In Progress',
        icon: Code,
        statusIcon: Clock,
        color: 'text-amber-400',
        statusColor: 'text-amber-400 bg-amber-400/10'
    },
    {
        title: 'Build Personal Web Dev Portfolio',
        status: 'Pending',
        icon: Layout,
        statusIcon: Circle,
        color: 'text-slate-400',
        statusColor: 'text-slate-400 bg-slate-400/10'
    },
    {
        title: 'Internship Applications',
        status: 'Targeting',
        icon: Briefcase,
        statusIcon: Target,
        color: 'text-teal-400',
        statusColor: 'text-teal-400 bg-teal-400/10'
    }
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.2
        }
    }
};

const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
};

export default function CareerRoadmap() {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="w-full max-w-md p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl"
        >
            <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                    <Target size={24} />
                </div>
                <h2 className="text-xl font-medium text-slate-100">
                    The Path to Victory <span className="text-sm text-slate-400 font-normal ml-1">(4th Sem)</span>
                </h2>
            </div>

            <div className="space-y-4">
                {goals.map((goal, idx) => (
                    <motion.div
                        key={idx}
                        variants={item}
                        className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors duration-300"
                    >
                        {/* Icon Box */}
                        <div className={`p-3 rounded-xl bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 ${goal.color}`}>
                            <goal.icon size={20} />
                        </div>

                        {/* details */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-slate-200 font-medium truncate">{goal.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${goal.statusColor}`}>
                                    <goal.statusIcon size={12} />
                                    {goal.status}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
