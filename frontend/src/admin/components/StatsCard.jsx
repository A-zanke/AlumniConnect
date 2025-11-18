import React from 'react';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, trend, gradient }) => {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient}`}>
          <Icon className="text-2xl text-white" />
        </div>
        {trend && (
          <span className={`text-sm font-semibold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <h3 className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </motion.div>
  );
};

export default StatsCard;
