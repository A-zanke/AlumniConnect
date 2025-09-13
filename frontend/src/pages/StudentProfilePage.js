import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProfileHeader from '../components/profile/ProfileHeader';
import ProfileTabs from '../components/profile/ProfileTabs';
import SkillsBadges from '../components/profile/SkillsBadges';
import ConnectionsPreview from '../components/profile/ConnectionsPreview';
import PostsFeed from '../components/profile/PostsFeed';
import { userAPI } from '../components/utils/api';

const StudentProfilePage = () => {
  const { userId, username } = useParams();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        let res;
        if (username) res = await userAPI.getUserByUsername(username);
        else if (userId) res = await userAPI.getUserById(userId);
        setUser(res.data?.data || res.data);
      } catch (_) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId, username]);

  if (loading) return <div className="flex justify-center py-20">Loading...</div>;
  if (!user) return <div className="flex justify-center py-20">Profile not found</div>;

  const About = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {user.bio && (
          <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
            <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">About</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 dark:text-gray-200 leading-relaxed">{user.bio}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
            <h3 className="text-lg font-semibold">Academic & Goals</h3>
          </div>
          <div className="p-6 space-y-4">
            {user.specialization && <Info label="Specialization" value={user.specialization} />}
            {user.projects?.length > 0 && <Chips label="Projects" items={user.projects} />}
            {user.desired_roles?.length > 0 && <Chips label="Desired Roles" items={user.desired_roles} />}
            {user.preferred_industries?.length > 0 && <Chips label="Preferred Industries" items={user.preferred_industries} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.higher_studies_interest && <Info label="Higher Studies" value={user.higher_studies_interest} />}    
              {user.entrepreneurship_interest && <Info label="Entrepreneurship" value={user.entrepreneurship_interest} />}
            </div>
          </div>
        </div>

        <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
            <h3 className="text-lg font-semibold">Experience</h3>
          </div>
          <div className="p-6 space-y-4">
            {user.internships?.length > 0 && <Chips label="Internships" items={user.internships} />}
            {user.hackathons?.length > 0 && <Chips label="Hackathons" items={user.hackathons} />}
            {user.research_papers?.length > 0 && <Chips label="Research Papers" items={user.research_papers} />}
          </div>
        </div>

        {user.mentorship_needs?.length > 0 && (
          <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
            <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
              <h3 className="text-lg font-semibold">Mentorship Needs</h3>
            </div>
            <div className="p-6">
              <Chips items={user.mentorship_needs} />
            </div>
          </div>
        )}
      </div>
      <div className="space-y-6">
        <SkillsBadges skills={user.skills} />
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const Skills = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <SkillsBadges skills={user.skills} />
      </div>
      <div className="space-y-6">
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const Experience = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="rounded-2xl shadow bg-white dark:bg-gray-900">
          <div className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
            <h3 className="text-lg font-semibold">Experience</h3>
          </div>
          <div className="p-6 space-y-4">
            {user.projects?.length > 0 && <Chips label="Projects" items={user.projects} />}
            {user.internships?.length > 0 && <Chips label="Internships" items={user.internships} />}
            {user.hackathons?.length > 0 && <Chips label="Hackathons" items={user.hackathons} />}
            {user.research_papers?.length > 0 && <Chips label="Research Papers" items={user.research_papers} />}
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const Posts = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <PostsFeed userId={user._id} />
      </div>
      <div className="space-y-6">
        <ConnectionsPreview userId={user._id} />
      </div>
    </div>
  );

  const tabs = [
    { id: 'about', label: 'About', content: About },
    { id: 'skills', label: 'Skills', content: Skills },
    { id: 'experience', label: 'Experience', content: Experience },
    { id: 'posts', label: 'Posts', content: Posts }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8">
      <div className="container">
        <ProfileHeader user={user} />
        <ProfileTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  );
};

const Info = ({ label, value }) => (
  <div>
    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</span>
    <p className="text-gray-900 dark:text-gray-100">{value}</p>
  </div>
);

const Chips = ({ label, items }) => (
  <div>
    {label && <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</span>}
    <div className="flex flex-wrap gap-2 mt-2">
      {(items || []).map((item, idx) => (
        <span key={`${item}-${idx}`} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
          {item}
        </span>
      ))}
    </div>
  </div>
);

export default StudentProfilePage;

