import React from 'react';
import { FaLinkedin, FaFacebook, FaInstagram, FaYoutube, FaTwitter } from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About Section */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold mb-4 text-indigo-400">Maharashtra Institute of Technology</h3>
            <p className="text-gray-300 text-sm mb-3">An Autonomous Institute</p>
            <p className="text-gray-400 text-sm leading-relaxed">
              AICTE Approved institution dedicated to excellence in technical education and fostering innovation.
            </p>
            <div className="mt-4">
              <a 
                href="https://mit.asia" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm font-medium"
              >
                Visit MIT Website →
              </a>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-indigo-400">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="text-gray-300">
                <span className="font-medium text-white">Address:</span><br />
                <span className="text-gray-400">Beed Bypass Road, Satara Parisar,<br />Aurangabad - 431010, Maharashtra, India</span>
              </li>
              <li className="text-gray-300">
                <span className="font-medium text-white">Phone:</span><br />
                <span className="text-gray-400">+91-240-2375135, 164, 171</span>
              </li>
              <li className="text-gray-300">
                <span className="font-medium text-white">Fax:</span> <span className="text-gray-400">+91-240-2376154</span>
              </li>
              <li className="text-gray-300">
                <span className="font-medium text-white">Email:</span>{' '}
                <a href="mailto:admissions@mit.asia" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                  admissions@mit.asia
                </a>
              </li>
              <li className="text-gray-300">
                <span className="font-medium text-white">Toll Free:</span> <span className="text-gray-400">1800 233 5181, 191</span>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-indigo-400">Connect With Us</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.linkedin.com/school/15138113"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-indigo-600 p-3 rounded-lg transition-all duration-300 transform hover:scale-110"
                title="LinkedIn"
              >
                <FaLinkedin className="h-6 w-6" />
              </a>
              <a
                href="https://www.instagram.com/mit.chhatrapati_sambhajinagar/"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-pink-600 p-3 rounded-lg transition-all duration-300 transform hover:scale-110"
                title="Instagram"
              >
                <FaInstagram className="h-6 w-6" />
              </a>
              <a
                href="https://www.youtube.com/@mitaurangabad334"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-red-600 p-3 rounded-lg transition-all duration-300 transform hover:scale-110"
                title="YouTube"
              >
                <FaYoutube className="h-6 w-6" />
              </a>
              <a
                href="https://x.com/MIT_Updates"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-blue-500 p-3 rounded-lg transition-all duration-300 transform hover:scale-110"
                title="Twitter/X"
              >
                <FaTwitter className="h-6 w-6" />
              </a>
              <a
                href="https://www.facebook.com/Aurangabad.mit"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-800 hover:bg-blue-700 p-3 rounded-lg transition-all duration-300 transform hover:scale-110"
                title="Facebook"
              >
                <FaFacebook className="h-6 w-6" />
              </a>
            </div>
            <div className="mt-6 text-sm text-gray-400">
              <p className="leading-relaxed">
                Stay connected with the MIT alumni community and never miss important updates, events, and opportunities.
              </p>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm text-center md:text-left">
              &copy; {new Date().getFullYear()} MIT Alumni Connect - Maharashtra Institute of Technology, Aurangabad. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-gray-400">
              <button className="hover:text-indigo-400 transition-colors">Privacy Policy</button>
              <button className="hover:text-indigo-400 transition-colors">Terms of Service</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;