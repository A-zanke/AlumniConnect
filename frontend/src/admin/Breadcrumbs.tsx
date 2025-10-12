import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaChevronRight, FaHome } from 'react-icons/fa';

const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  const formatLabel = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, ' ');
  };

  return (
    <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
      <Link to="/admin" className="flex items-center gap-1 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">
        <FaHome />
        <span>Admin</span>
      </Link>
      
      {pathnames.slice(1).map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 2).join('/')}`;
        const isLast = index === pathnames.length - 2;
        
        return (
          <React.Fragment key={name}>
            <FaChevronRight className="text-gray-400 text-xs" />
            {isLast ? (
              <span className="text-gray-900 dark:text-white font-medium">{formatLabel(name)}</span>
            ) : (
              <Link to={routeTo} className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors">
                {formatLabel(name)}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;