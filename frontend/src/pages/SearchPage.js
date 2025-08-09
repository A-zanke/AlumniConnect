import React from 'react';
import Search from '../components/Search';
import PrivateRoute from '../components/PrivateRoute';

const SearchPage = () => {
    return (
        <PrivateRoute>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8">Search Alumni</h1>
                <Search />
            </div>
        </PrivateRoute>
    );
};

export default SearchPage; 