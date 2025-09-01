import React from 'react';
import Search from '../components/Search';
import PrivateRoute from '../components/PrivateRoute';

const SearchPage = () => {
    return (
        <PrivateRoute>
            <div className="container mx-auto px-4 py-8">
                <div className="theme-card p-6 mb-6 float-in">
                    <h1 className="text-2xl font-extrabold gradient-text">Search</h1>
                    <p className="text-gray-600">Find people by role, branch, skills, company, location</p>
                </div>
                <Search />
            </div>
        </PrivateRoute>
    );
};

export default SearchPage; 