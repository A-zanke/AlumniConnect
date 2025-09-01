import React from 'react';
import { Link } from 'react-router-dom';
import { getAvatarUrl } from '../utils/helpers';

const SearchResults = ({ results }) => {
  return (
    <div className="search-results">
      {results.map((user) => (
        <Link
          key={user._id}
          to={`/profile/${user.username}`}
          className="search-result-item"
        >
          <div className="flex items-center p-4 hover:bg-gray-50 rounded-lg transition-colors">
            {user.avatarUrl ? (
              <img
                src={getAvatarUrl(user.avatarUrl)}
                alt={user.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-500">@{user.username}</p>
              {user.role && (
                <p className="text-sm text-gray-500 capitalize">{user.role}</p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

 