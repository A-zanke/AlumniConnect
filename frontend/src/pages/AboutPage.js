import React from 'react';
import { motion } from 'framer-motion';

const AboutPage = () => {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-50">
      <section className="max-w-6xl mx-auto py-16 px-4">
        <motion.h1
          className="text-4xl md:text-5xl font-extrabold text-center bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-transparent bg-clip-text"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          About AlumniConnect
        </motion.h1>
        <motion.p
          className="mt-6 text-center text-gray-700 max-w-3xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          AlumniConnect bridges students, teachers, and alumni through networking, events, and mentorship.
        </motion.p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[1,2,3].map((i) => (
            <motion.div key={i} className="bg-white/80 rounded-2xl p-6 shadow border border-cyan-100"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2">Our Mission #{i}</h3>
              <p className="text-gray-600">We empower connections, share opportunities, and foster growth.</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AboutPage;

